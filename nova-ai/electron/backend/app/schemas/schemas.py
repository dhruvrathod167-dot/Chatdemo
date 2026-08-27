from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, EmailStr, Field

# Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

# User Settings Schemas
class UserSettingsBase(BaseModel):
    theme: str = "dark"
    provider: str = "ollama"
    model: str = "llama3"
    temperature: float = 0.7
    max_tokens: int = 2048
    system_prompt: Optional[str] = None

class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    system_prompt: Optional[str] = None

class UserSettingsResponse(UserSettingsBase):
    user_id: int

    class Config:
        from_attributes = True

# Message Schemas
class MessageBase(BaseModel):
    sender: str  # "user" or "assistant"
    content: str

class MessageCreate(BaseModel):
    content: str
    stream: bool = True

class MessageUpdate(BaseModel):
    content: str

class MessageResponse(MessageBase):
    id: int
    conversation_id: int
    created_at: datetime
    user_edited: bool
    citations: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

# Conversation Schemas
class ConversationBase(BaseModel):
    title: str

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ConversationUpdate(BaseModel):
    title: str

class ConversationResponse(ConversationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# File Schemas
class UploadedFileResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    content_type: str
    created_at: datetime

    class Config:
        from_attributes = True

# Settings Combined Output
class FullSettingsResponse(BaseModel):
    theme: str
    provider: str
    model: str
    temperature: float
    max_tokens: int
    system_prompt: Optional[str]
    email: str
    user_id: int
