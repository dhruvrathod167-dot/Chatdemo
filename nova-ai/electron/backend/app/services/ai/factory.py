from app.services.ai.base import AIProvider
from app.services.ai.ollama import OllamaProvider
from app.services.ai.openai import OpenAICompatibleProvider
from app.models.models import UserSettings
from app.core.config import settings

def get_ai_provider(user_settings: UserSettings) -> AIProvider:
    """
    Returns the appropriate AIProvider based on user settings and environment configuration.
    """
    if user_settings.provider == "openai":
        return OpenAICompatibleProvider(
            base_url=settings.OPENAI_BASE_URL,
            api_key=user_settings.api_key or settings.OPENAI_API_KEY,
            model=user_settings.model or settings.OPENAI_MODEL
        )
    else:
        return OllamaProvider(
            base_url=settings.OLLAMA_BASE_URL,
            model=user_settings.model or settings.OLLAMA_MODEL
        )
