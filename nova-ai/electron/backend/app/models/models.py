import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "user"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    settings: Mapped["UserSettings"] = relationship("UserSettings", back_populates="user", cascade="all, delete-orphan", uselist=False)
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    files: Mapped[List["UploadedFile"]] = relationship("UploadedFile", back_populates="user", cascade="all, delete-orphan")

class UserSettings(Base):
    __tablename__ = "usersettings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme: Mapped[str] = mapped_column(String(50), default="dark")  # "dark" or "light"
    provider: Mapped[str] = mapped_column(String(50), default="ollama")  # "ollama" or "openai"
    model: Mapped[str] = mapped_column(String(100), default="llama3")
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, default=2048)
    system_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="settings")

class Conversation(Base):
    __tablename__ = "conversation"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="New Chat")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="conversations")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", passive_deletes=True)

class Message(Base):
    __tablename__ = "message"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(Integer, ForeignKey("conversation.id", ondelete="CASCADE"), nullable=False)
    sender: Mapped[str] = mapped_column(String(50), nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)
    user_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    citations_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-serialized list of sources
    
    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
    
    @property
    def citations(self) -> List[Dict[str, Any]]:
        if not self.citations_json:
            return []
        try:
            return json.loads(self.citations_json)
        except Exception:
            return []
            
    @citations.setter
    def citations(self, val: List[Dict[str, Any]]):
        self.citations_json = json.dumps(val)

class UploadedFile(Base):
    __tablename__ = "uploadedfile"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    filepath: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="files")
    chunks: Mapped[List["DocumentChunk"]] = relationship("DocumentChunk", back_populates="uploaded_file", cascade="all, delete-orphan", passive_deletes=True)

class DocumentChunk(Base):
    __tablename__ = "documentchunk"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    file_id: Mapped[int] = mapped_column(Integer, ForeignKey("uploadedfile.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_json: Mapped[str] = mapped_column(Text, nullable=False)  # JSON list of floats
    
    # Relationships
    uploaded_file: Mapped["UploadedFile"] = relationship("UploadedFile", back_populates="chunks")
    
    @property
    def embedding(self) -> List[float]:
        try:
            return json.loads(self.embedding_json)
        except Exception:
            return []
            
    @embedding.setter
    def embedding(self, val: List[float]):
        self.embedding_json = json.dumps(val)
