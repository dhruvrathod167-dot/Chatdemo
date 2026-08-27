import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, desc
from pydantic import BaseModel

from app.db.session import get_db, SessionLocal
from app.models.models import User, Conversation, Message, UserSettings, get_utc_now
from app.schemas.schemas import ConversationResponse, ConversationCreate, ConversationUpdate, MessageResponse
from app.api.endpoints.auth import get_current_user
from app.services.ai.factory import get_ai_provider
from app.services.rag.rag_service import retrieve_relevant_contexts
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    conversation_id: int
    content: str

# CONVERSATION ENDPOINTS

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(desc(Conversation.updated_at))
    )
    return result.scalars().all()

@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conv_in: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    title = conv_in.title or "New Chat"
    conv = Conversation(user_id=current_user.id, title=title)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv

@router.get("/conversations/{id}", response_model=ConversationResponse)
async def get_conversation(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == id, Conversation.user_id == current_user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv

@router.patch("/conversations/{id}", response_model=ConversationResponse)
async def update_conversation(
    id: int,
    conv_in: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == id, Conversation.user_id == current_user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        
    conv.title = conv_in.title
    await db.commit()
    await db.refresh(conv)
    return conv

@router.delete("/conversations/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == id, Conversation.user_id == current_user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        
    await db.delete(conv)
    await db.commit()
    return None

@router.get("/conversations/{id}/messages", response_model=List[MessageResponse])
async def list_messages(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify owner
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == id, Conversation.user_id == current_user.id)
    )
    if not conv_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    
    # Map to schema manually to load citations property correctly
    response = []
    for msg in messages:
        response.append(MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender=msg.sender,
            content=msg.content,
            created_at=msg.created_at,
            user_edited=msg.user_edited,
            citations=msg.citations
        ))
    return response

# CHAT STREAM ENDPOINT

@router.post("/chat")
async def chat_completion(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify owner of conversation
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == payload.conversation_id, Conversation.user_id == current_user.id)
    )
    conversation = conv_result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        

    # 2. Get user settings
    settings_result = await db.execute(select(UserSettings).where(UserSettings.user_id == current_user.id))
    user_settings = settings_result.scalar_one_or_none()
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)
        await db.flush()
        
    # Read settings into local variables BEFORE commit to prevent lazy-loading issues later
    system_prompt = user_settings.system_prompt or settings.DEFAULT_SYSTEM_PROMPT
    temperature = user_settings.temperature
    max_tokens = user_settings.max_tokens
    provider = get_ai_provider(user_settings)

    # 3. Retrieve matching contexts (RAG)
    contexts = await retrieve_relevant_contexts(db, current_user.id, payload.content, user_settings)
    
    citations = []
    rag_context_str = ""
    if contexts:
        rag_context_str = "\nContext from uploaded files:\n"
        for chunk, score, filename in contexts:
            rag_context_str += f"[Source: {filename}] (Score: {score:.2f})\n{chunk}\n---\n"
            citations.append({"filename": filename, "snippet": chunk})
            
    # 4. Save user message to database
    user_msg = Message(
        conversation_id=payload.conversation_id,
        sender="user",
        content=payload.content
    )
    db.add(user_msg)
    
    # Touch conversation updated_at
    conversation.updated_at = get_utc_now()
    await db.commit()
    
    # 5. Fetch recent chat history for context (up to 10 messages)
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == payload.conversation_id)
        .order_by(desc(Message.created_at))
        .limit(10)
    )
    history_msgs = reversed(history_result.scalars().all())
    
    messages_payload = []
    for msg in history_msgs:
        messages_payload.append({
            "role": "user" if msg.sender == "user" else "assistant",
            "content": msg.content
        })
        
    # Prepend context to the last user message if context exists
    if rag_context_str and messages_payload:
        messages_payload[-1]["content"] = (
            f"User Query: {payload.content}\n\n"
            f"{rag_context_str}\n"
            f"Answer the user query based on the above context. If the context does not contain the answer, "
            f"explain what you know but specify that the context does not contain the answer. "
            f"Always cite the source files [Source: filename] when utilizing their contents."
        )

    async def event_generator():
        # Yield thinking status
        yield f"data: {json.dumps({'status': 'thinking'})}\n\n"
        
        full_assistant_response = ""
        try:
            async for chunk in provider.generate_stream(
                messages=messages_payload,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            ):
                full_assistant_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                
            # Stream finalized: Save to DB in a separate clean session context
            async with SessionLocal() as local_db:
                assistant_msg = Message(
                    conversation_id=payload.conversation_id,
                    sender="assistant",
                    content=full_assistant_response
                )
                if citations:
                    assistant_msg.citations = citations
                local_db.add(assistant_msg)
                
                # Also update updated_at on the conversation
                await local_db.execute(
                    update(Conversation)
                    .where(Conversation.id == payload.conversation_id)
                    .values(updated_at=get_utc_now())
                )
                await local_db.commit()
                await local_db.refresh(assistant_msg)
                
                yield f"data: {json.dumps({
                    'status': 'done',
                    'message_id': assistant_msg.id,
                    'citations': assistant_msg.citations,
                    'content': full_assistant_response
                })}\n\n"
                
        except Exception as e:
            logger.error(f"Error during AI stream generation: {str(e)}")
            yield f"data: {json.dumps({'status': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
