import json
import logging
from typing import AsyncIterator, List, Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from app.core.config import settings
from app.services.ai.base import AIProvider

logger = logging.getLogger(__name__)

class OpenRouterProvider(AIProvider):
    def __init__(self, base_url: str = None, api_key: str = None, model: str = None):
        self.base_url = (base_url or settings.OPENROUTER_BASE_URL).rstrip("/")
        # Resolve key from parameter, config, or environment
        self.api_key = (
            (api_key.strip() if api_key and api_key.strip() else None)
            or (settings.OPENROUTER_API_KEY.strip() if settings.OPENROUTER_API_KEY else None)
            or (settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("sk-or-") else None)
        )
        self.model = model or settings.OPENROUTER_MODEL or "nvidia/nemotron-3.5-lightning:free"
        logger.info(f"OpenRouterProvider initialized: base_url={self.base_url}, model={self.model}, has_key={bool(self.api_key)}")

    def _get_headers(self) -> Dict[str, str]:
        if not self.api_key or not self.api_key.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="OpenRouter API key is required. Even free models hosted on OpenRouter require an OpenRouter API key. Please configure your key in Settings or set OPENROUTER_API_KEY in backend/.env."
            )
        clean_key = self.api_key.strip()
        if clean_key in ["undefined", "null", "none"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid OpenRouter API key. Please configure a valid OpenRouter API key in Settings or set OPENROUTER_API_KEY in backend/.env."
            )
        return {
            "Content-Type": "application/json",
            "Accept": "text/event-stream, application/json",
            "Authorization": f"Bearer {clean_key}",
            "HTTP-Referer": "https://github.com/nova-ai",
            "X-Title": "NOVA AI",
        }

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> AsyncIterator[str]:
        # Validate authentication upfront
        headers = self._get_headers()

        full_messages = []
        if system_prompt and system_prompt.strip():
            full_messages.append({"role": "system", "content": system_prompt.strip()})
        full_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": full_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        url = f"{self.base_url}/chat/completions"
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)) as client:
                async with client.stream("POST", url, json=payload, headers=headers) as response:
                    if response.status_code != 200:
                        detail = await response.aread()
                        detail_str = detail.decode(errors="replace")
                        logger.error(f"OpenRouter API returned status {response.status_code}: {detail_str}")
                        error_msg = f"AI Provider returned error code {response.status_code}"
                        try:
                            error_data = json.loads(detail_str)
                            if "error" in error_data:
                                if isinstance(error_data["error"], dict) and "message" in error_data["error"]:
                                    error_msg = f"AI Provider Error: {error_data['error']['message']}"
                                elif isinstance(error_data["error"], str):
                                    error_msg = f"AI Provider Error: {error_data['error']}"
                            elif "detail" in error_data:
                                error_msg = f"AI Provider Detail: {error_data['detail']}"
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
                            if data_str == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                choices = data.get("choices")
                                if choices and len(choices) > 0:
                                    delta = choices[0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"OpenRouter AI provider at {self.base_url} is unreachable."
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error communicating with OpenRouter API: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OpenRouter communication failed: {str(e)}"
            )

    async def generate_embeddings(self, text: str) -> List[float]:
        url = f"{self.base_url}/embeddings"
        payload = {
            "model": "text-embedding-3-small",
            "input": text
        }
        try:
            headers = self._get_headers()
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return data["data"][0]["embedding"]
                return []
        except Exception as e:
            logger.warning(f"OpenRouter embedding generation skipped or failed: {str(e)}")
            return []

    async def list_models(self) -> List[str]:
        default_models = [
            "nvidia/nemotron-3.5-lightning:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "google/gemini-2.0-flash-exp:free",
            "deepseek/deepseek-r1:free",
            "openai/gpt-4o-mini",
            "anthropic/claude-3.5-sonnet",
        ]
        if not self.api_key:
            return default_models
        url = f"{self.base_url}/models"
        try:
            headers = self._get_headers()
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code != 200:
                    return default_models
                data = response.json()
                raw_models = [m["id"] for m in data.get("data", [])]
                return raw_models if raw_models else default_models
        except Exception:
            return default_models

