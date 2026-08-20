import json
import logging
from typing import AsyncIterator, List, Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from app.core.config import settings
from app.services.ai.base import AIProvider

logger = logging.getLogger(__name__)

class OpenAICompatibleProvider(AIProvider):
    def __init__(self, base_url: str = None, api_key: str = None, model: str = None):
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> AsyncIterator[str]:
        full_messages = [{"role": "system", "content": system_prompt}]
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
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, json=payload, headers=self._get_headers()) as response:
                    if response.status_code != 200:
                        detail = await response.aread()
                        detail_str = detail.decode()
                        logger.error(f"OpenAI compatible API returned {response.status_code}: {detail_str}")
                        error_msg = f"AI Provider returned error code: {response.status_code}"
                        try:
                            error_data = json.loads(detail_str)
                            if "error" in error_data and "message" in error_data["error"]:
                                error_msg = f"AI Provider Error: {error_data['error']['message']}"
                            elif "detail" in error_data:
                                error_msg = f"AI Provider Detail: {error_data['detail']}"
                        except Exception:
                            pass
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
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
                                content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                continue
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI-compatible AI provider is unreachable."
            )
        except Exception as e:
            logger.error(f"Error communicating with OpenAI-compatible API: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OpenAI-compatible communication failed: {str(e)}"
            )

    async def generate_embeddings(self, text: str) -> List[float]:
        url = f"{self.base_url}/embeddings"
        payload = {
            "model": "text-embedding-3-small" if "gpt" in self.model else self.model,
            "input": text
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=self._get_headers())
                if response.status_code != 200:
                    # Fallback standard model
                    payload["model"] = "text-embedding-ada-002"
                    response = await client.post(url, json=payload, headers=self._get_headers())
                    
                if response.status_code != 200:
                    detail_str = response.text
                    error_msg = f"Failed to generate embeddings. AI Provider returned code: {response.status_code}"
                    try:
                        error_data = response.json()
                        if "error" in error_data and "message" in error_data["error"]:
                            error_msg = f"Embedding Error: {error_data['error']['message']}"
                        elif "detail" in error_data:
                            error_msg = f"Embedding Detail: {error_data['detail']}"
                    except Exception:
                        pass
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=error_msg
                    )
                
                data = response.json()
                return data["data"][0]["embedding"]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OpenAI-compatible embedding failed: {str(e)}"
            )

    async def list_models(self) -> List[str]:
        url = f"{self.base_url}/models"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code != 200:
                    return [self.model]
                data = response.json()
                return [m["id"] for m in data.get("data", [])]
        except Exception:
            return [self.model]
