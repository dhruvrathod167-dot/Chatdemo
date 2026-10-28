import json
import logging
from typing import AsyncIterator, List, Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from app.core.config import settings
from app.services.ai.base import AIProvider

logger = logging.getLogger(__name__)

class GeminiProvider(AIProvider):
    def __init__(self, base_url: str = None, api_key: str = None, model: str = None):
        self.base_url = (base_url or settings.GEMINI_BASE_URL).rstrip("/")
        self.api_key = (
            (api_key.strip() if api_key and api_key.strip() else None)
            or (settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else None)
        )
        self.model = model or settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
        logger.info(f"GeminiProvider initialized: base_url={self.base_url}, model={self.model}, has_key={bool(self.api_key)}")

    def _get_api_key(self) -> str:
        if not self.api_key or not self.api_key.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Gemini API key is required. Please configure your Gemini API key in Settings or set GEMINI_API_KEY in backend/.env."
            )
        clean_key = self.api_key.strip()
        if clean_key in ["undefined", "null", "none"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Gemini API key. Please configure a valid Gemini API key in Settings or set GEMINI_API_KEY in backend/.env."
            )
        return clean_key

    def _get_headers(self) -> Dict[str, str]:
        clean_key = self._get_api_key()
        return {
            "Content-Type": "application/json",
            "x-goog-api-key": clean_key,
        }

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> AsyncIterator[str]:
        clean_key = self._get_api_key()
        headers = self._get_headers()

        # Build contents in Gemini format
        # Gemini roles are 'user' and 'model'
        contents = []
        for msg in messages:
            role = "user" if msg.get("role") == "user" else "model"
            content = msg.get("content", "")
            if content:
                contents.append({
                    "role": role,
                    "parts": [{"text": content}]
                })

        # Clean model name: strip "models/" prefix if present
        clean_model = self.model.replace("models/", "").strip()
        if not clean_model:
            clean_model = "gemini-3.5-flash-lite"

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            }
        }

        if system_prompt and system_prompt.strip():
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt.strip()}]
            }

        url = f"{self.base_url}/models/{clean_model}:streamGenerateContent?alt=sse&key={clean_key}"

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)) as client:
                async with client.stream("POST", url, json=payload, headers=headers) as response:
                    if response.status_code != 200:
                        detail = await response.aread()
                        detail_str = detail.decode(errors="replace")
                        logger.error(f"Gemini API returned status {response.status_code}: {detail_str}")
                        error_msg = f"Gemini API returned status {response.status_code}"
                        try:
                            error_data = json.loads(detail_str)
                            if "error" in error_data and "message" in error_data["error"]:
                                error_msg = f"AI Provider Error: {error_data['error']['message']}"
                        except Exception:
                            pass
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED if response.status_code == 401 else status.HTTP_502_BAD_GATEWAY,
                            detail=error_msg
                        )

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if line.startswith("data: "):
                            data_str = line[len("data: "):].strip()
                            try:
                                data = json.loads(data_str)
                                candidates = data.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    for part in parts:
                                        text_chunk = part.get("text", "")
                                        if text_chunk:
                                            yield text_chunk
                            except json.JSONDecodeError:
                                continue
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Gemini AI provider at {self.base_url} is unreachable."
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error communicating with Gemini API: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gemini communication failed: {str(e)}"
            )

    async def generate_embeddings(self, text: str) -> List[float]:
        if not self.api_key:
            return []
        try:
            clean_key = self._get_api_key()
            url = f"{self.base_url}/models/text-embedding-004:embedContent?key={clean_key}"
            payload = {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text}]}
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, json=payload, headers=self._get_headers())
                if response.status_code == 200:
                    data = response.json()
                    return data.get("embedding", {}).get("values", [])
                return []
        except Exception as e:
            logger.warning(f"Gemini embedding generation failed: {str(e)}")
            return []

    async def list_models(self) -> List[str]:
        default_models = [
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-1.5-flash"
        ]
        if not self.api_key:
            return default_models
        try:
            clean_key = self._get_api_key()
            url = f"{self.base_url}/models?key={clean_key}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    return default_models
                data = response.json()
                raw_models = []
                for m in data.get("models", []):
                    methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in methods:
                        name = m.get("name", "").replace("models/", "")
                        if "flash" in name or "pro" in name or "gemini" in name:
                            raw_models.append(name)
                return raw_models if raw_models else default_models
        except Exception:
            return default_models

