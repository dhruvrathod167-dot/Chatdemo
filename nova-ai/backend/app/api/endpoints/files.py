import os
import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db, SessionLocal
from app.models.models import User, UploadedFile, UserSettings
from app.schemas.schemas import UploadedFileResponse
from app.api.endpoints.auth import get_current_user
from app.services.rag.rag_service import process_and_index_file
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Max file size: 15MB
MAX_FILE_SIZE = 15 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".markdown"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown"
}

async def bg_process_and_index_file(file_id: int, user_settings_id: int):
    """
    Background worker task to extract, split, embed, and store document contents.
    Creates its own async DB session for thread safety.
    """
    async with SessionLocal() as db:
        try:
            result = await db.execute(select(UserSettings).where(UserSettings.id == user_settings_id))
            user_settings = result.scalar_one_or_none()
            if not user_settings:
                logger.error(f"User settings {user_settings_id} not found during background index job.")
                return
            await process_and_index_file(db, file_id, user_settings)
        except Exception as e:
            logger.error(f"Background indexing task failed for file {file_id}: {str(e)}")

@router.post("/upload", response_model=UploadedFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate file extension
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Supported formats: PDF, DOCX, TXT, MD"
        )
        
    # 2. Check file size
    # Spool file to verify size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large. Maximum allowed size is 15MB."
        )
        
    # 3. Create unique path and save file
    unique_filename = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    try:
        with open(save_path, "wb") as f:
            f.write(file.file.read())
    except Exception as e:
        logger.error(f"Failed to write file to disk: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save file to disk."
        )
        
    # 4. Create database entry
    uploaded_file = UploadedFile(
        user_id=current_user.id,
        filename=filename,
        filepath=save_path,
        file_size=file_size,
        content_type=file.content_type or "text/plain"
    )
    db.add(uploaded_file)
    await db.flush()  # Flush to get uploaded_file.id
    
    # 5. Fetch user settings to pass to RAG provider
    settings_result = await db.execute(select(UserSettings).where(UserSettings.user_id == current_user.id))
    user_settings = settings_result.scalar_one_or_none()
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)
        await db.flush()
        
    await db.commit()
    await db.refresh(uploaded_file)
    
    # 6. Trigger background parsing and indexing
    background_tasks.add_task(bg_process_and_index_file, uploaded_file.id, user_settings.id)
    
    return uploaded_file
