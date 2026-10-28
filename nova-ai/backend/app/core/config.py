import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
NOVA_AI_DIR = BACKEND_DIR.parent
DEFAULT_DB_PATH = (BACKEND_DIR / "nova_ai.db").as_posix()

class Settings(BaseSettings):
    PROJECT_NAME: str = "NOVA AI"
    API_V1_STR: str = "/api"
    BACKEND_PORT: int = 8002
    
    # JWT & Authentication
    SECRET_KEY: str = Field(default="super_secret_nova_ai_key_change_me_in_production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = Field(default=f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}")
    
    # Default AI Provider ("openrouter", "openai", "gemini", or "ollama")
    AI_PROVIDER: str = Field(default="openrouter")
    
    # OpenRouter settings
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str = Field(default="https://openrouter.ai/api/v1")
    OPENROUTER_MODEL: str = Field(default="nvidia/nemotron-3.5-lightning:free")
    
    # OpenAI settings
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: str = Field(default="https://api.openai.com/v1")
    OPENAI_MODEL: str = Field(default="gpt-4o")
    
    # Gemini settings
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_BASE_URL: str = Field(default="https://generativelanguage.googleapis.com/v1beta")
    GEMINI_MODEL: str = Field(default="gemini-3.5-flash-lite")
    
    # Ollama settings (Local LLM)
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    OLLAMA_MODEL: str = Field(default="llama3")
    
    # RAG Settings
    UPLOAD_DIR: str = Field(default=str(BACKEND_DIR / "uploads"))
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    
    # Default system prompt
    DEFAULT_SYSTEM_PROMPT: str = (
        "You are NOVA AI, a professional general-purpose AI assistant. "
        "Answer clearly, explain technical topics accurately, write and debug code, "
        "summarize documents, and follow user instructions. "
        "Admit uncertainty instead of inventing facts. "
        "When responding to questions based on uploaded documents, cite your sources."
    )
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        "http://localhost:8002",
        "http://127.0.0.1:8002",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3003",
        "http://127.0.0.1:3003"
    ]

    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = [
            str(BACKEND_DIR / ".env"),
            str(NOVA_AI_DIR / ".env"),
            ".env"
        ]

settings = Settings()

# Ensure DATABASE_URL is valid for SQLAlchemy async engine
if not settings.DATABASE_URL.startswith(("sqlite+aiosqlite", "postgresql+asyncpg")):
    settings.DATABASE_URL = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"

# Fallback resolution for keys from OS environment if not populated via .env
if not settings.OPENROUTER_API_KEY:
    env_or = os.environ.get("OPENROUTER_API_KEY")
    if env_or and env_or.strip():
        settings.OPENROUTER_API_KEY = env_or.strip()
    elif settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("sk-or-"):
        settings.OPENROUTER_API_KEY = settings.OPENAI_API_KEY.strip()
    elif os.environ.get("ANTHROPIC_API_KEY", "").startswith("sk-or-"):
        settings.OPENROUTER_API_KEY = os.environ.get("ANTHROPIC_API_KEY").strip()

if not settings.GEMINI_API_KEY:
    env_gem = os.environ.get("GEMINI_API_KEY")
    if env_gem and env_gem.strip():
        settings.GEMINI_API_KEY = env_gem.strip()

if not settings.OPENAI_API_KEY:
    env_oai = os.environ.get("OPENAI_API_KEY")
    if env_oai and env_oai.strip():
        settings.OPENAI_API_KEY = env_oai.strip()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
