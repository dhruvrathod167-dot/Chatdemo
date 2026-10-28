import logging
from app.services.ai.base import AIProvider
from app.services.ai.ollama import OllamaProvider
from app.services.ai.openai import OpenAICompatibleProvider
from app.services.ai.openrouter import OpenRouterProvider
from app.services.ai.gemini import GeminiProvider
from app.models.models import UserSettings
from app.core.config import settings

logger = logging.getLogger(__name__)

def _is_dummy_key(key: str | None) -> bool:
    """Check if an API key looks like a placeholder or dummy value."""
    if not key:
        return True
    k = key.strip()
    if not k or k in ["123456", "12345678", "test", "dummy", "undefined", "null", "none"]:
        return True
    return False

def get_ai_provider(user_settings: UserSettings) -> AIProvider:
    """
    Returns the appropriate AIProvider based on user settings and environment configuration.
    Supports OpenRouter, OpenAI, Gemini, and Ollama.
    """
    provider = (user_settings.provider or settings.AI_PROVIDER or "openrouter").lower().strip()
    model = (user_settings.model or "").strip()
    user_key = (user_settings.api_key or "").strip() or None

    # Ignore dummy / placeholder keys saved in DB, falling back to environment key
    if _is_dummy_key(user_key):
        user_key = None

    # Check if this should be routed to OpenRouter
    is_openrouter = (
        provider == "openrouter"
        or (provider == "openai" and (
            "openrouter" in (settings.OPENAI_BASE_URL or "").lower()
            or "free" in model.lower()
            or "nvidia/" in model.lower()
            or "meta-llama/" in model.lower()
            or "deepseek/" in model.lower()
            or (user_key and user_key.startswith("sk-or-"))
            or (settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY.startswith("sk-or-"))
        ))
    )

    if is_openrouter:
        openrouter_key = (
            user_key
            or (settings.OPENROUTER_API_KEY.strip() if settings.OPENROUTER_API_KEY else None)
            or (settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("sk-or-") else None)
        )
        target_model = model or settings.OPENROUTER_MODEL or "nvidia/nemotron-3.5-lightning:free"
        logger.info(f"Using OpenRouterProvider: model={target_model}, has_key={bool(openrouter_key)}")
        return OpenRouterProvider(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=openrouter_key,
            model=target_model
        )

    if provider == "gemini":
        gemini_key = (
            user_key
            or (settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else None)
        )
        target_model = model or settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
        logger.info(f"Using GeminiProvider: model={target_model}, has_key={bool(gemini_key)}")
        return GeminiProvider(
            base_url=settings.GEMINI_BASE_URL,
            api_key=gemini_key,
            model=target_model
        )

    if provider == "ollama":
        target_model = model or settings.OLLAMA_MODEL or "llama3"
        logger.info(f"Using OllamaProvider: base_url={settings.OLLAMA_BASE_URL}, model={target_model}")
        return OllamaProvider(
            base_url=settings.OLLAMA_BASE_URL,
            model=target_model
        )

    # Standard OpenAI Compatible
    openai_key = (
        user_key
        or (settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else None)
    )
    target_model = model or settings.OPENAI_MODEL or "gpt-4o"
    logger.info(f"Using OpenAICompatibleProvider: base_url={settings.OPENAI_BASE_URL}, model={target_model}, has_key={bool(openai_key)}")
    return OpenAICompatibleProvider(
        base_url=settings.OPENAI_BASE_URL,
        api_key=openai_key,
        model=target_model
    )
