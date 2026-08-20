import json
import logging
from typing import AsyncIterator, List, Dict, Any
import httpx
from fastapi import HTTPException, status
from app.core.config import settings
from app.services.ai.base import AIProvider

logger = logging.getLogger(__name__)

class OllamaProvider(AIProvider):
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.model = model or settings.OLLAMA_MODEL

    async def _get_available_model(self) -> str:
        try:
            available = await self.list_models()
            if not available:
                return self.model
            req_clean = self.model.split(":")[0]
            for m in available:
                m_clean = m.split(":")[0]
                if m_clean == req_clean or m == self.model:
                    return m
            return available[0]
        except Exception:
            return self.model

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> AsyncIterator[str]:
        active_model = await self._get_available_model()
        # Formulate full conversation payload including system prompt
        full_messages = [{"role": "system", "content": system_prompt}]
        full_messages.extend(messages)
        
        payload = {
            "model": active_model,
            "messages": full_messages,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
            "stream": True,
        }
        
        url = f"{self.base_url}/api/chat"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        detail = await response.aread()
                        logger.error(f"Ollama returned status {response.status_code}: {detail.decode()}")
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=f"Ollama server returned error: {response.status_code}"
                        )
                    
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            # Ollama returns content in message object
                            content = data.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            logger.error("Could not connect to Ollama server.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Ollama provider is unavailable. Please make sure the Ollama service is running locally."
            )
        except Exception as e:
            logger.error(f"Error communicating with Ollama: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ollama communication failed: {str(e)}"
            )

    async def generate_embeddings(self, text: str) -> List[float]:
        active_model = await self._get_available_model()
        url = f"{self.base_url}/api/embeddings"
        payload = {
            "model": active_model,
            "prompt": text
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    # Fallback to newer /api/embed API if /api/embeddings fails
                    url_embed = f"{self.base_url}/api/embed"
                    payload_embed = {
                        "model": active_model,
                        "input": text
                    }
                    response = await client.post(url_embed, json=payload_embed)
                    
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Failed to generate embeddings from Ollama"
                    )
                
                data = response.json()
                # Support "embedding" (api/embeddings) or "embeddings" (api/embed)
                if "embedding" in data:
                    return data["embedding"]
                elif "embeddings" in data and len(data["embeddings"]) > 0:
                    return data["embeddings"][0]
                else:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Invalid embedding response from Ollama"
                    )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Ollama provider unavailable. Cannot generate embeddings."
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ollama embedding failed: {str(e)}"
            )

    async def list_models(self) -> List[str]:
        url = f"{self.base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    return [self.model]
                data = response.json()
                return [m["name"] for m in data.get("models", [])]
        except Exception:
            # Fallback to defaults
            return [self.model]
