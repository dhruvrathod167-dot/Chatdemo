from app.services.ai.base import AIProvider
from app.services.ai.ollama import OllamaProvider
from app.services.ai.openai import OpenAICompatibleProvider
from app.models.models import UserSettings

def get_ai_provider(user_settings: UserSettings) -> AIProvider:
    """
    Returns the appropriate AIProvider based on user settings.
    """
    if user_settings.provider == "openai":
        return OpenAICompatibleProvider(model=user_settings.model)
    else:
        return OllamaProvider(model=user_settings.model)
