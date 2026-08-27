import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "NOVA AI"
    API_V1_STR: str = "/api"
    
    # JWT & Authentication
    SECRET_KEY: str = Field(default="super_secret_nova_ai_key_change_me_in_production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    # Standard postgres or local sqlite fallback
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./nova_ai.db")
    
    # AI Config
    AI_PROVIDER: str = Field(default="ollama")  # "ollama" or "openai"
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    OLLAMA_MODEL: str = Field(default="tinyllama")
    
    OPENAI_BASE_URL: str = Field(default="https://api.openai.com/v1")
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = Field(default="gpt-4o")
    
    # RAG Settings
    UPLOAD_DIR: str = Field(default="uploads")
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
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
