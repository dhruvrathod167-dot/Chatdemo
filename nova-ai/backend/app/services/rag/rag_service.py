import os
import math
import logging
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
import docx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.models import UploadedFile, DocumentChunk, UserSettings
from app.services.ai.factory import get_ai_provider
from app.core.config import settings

logger = logging.getLogger(__name__)

def extract_text(filepath: str, content_type: str) -> str:
    """
    Extracts plain text from the file based on its mime type/extension.
    """
    if content_type == "application/pdf" or filepath.endswith(".pdf"):
        reader = PdfReader(filepath)
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        return text
    
    elif content_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"] or filepath.endswith(".docx"):
        doc = docx.Document(filepath)
        text = ""
        for para in doc.paragraphs:
            if para.text:
                text += para.text + "\n"
        return text
        
    else:
        # Default text extraction (for TXT, Markdown, etc.)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            with open(filepath, "r", encoding="latin-1") as f:
                return f.read()

def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """
    Splits text into overlapping chunks.
    """
    chunks = []
    if not text:
        return chunks
    
    # Simple character splitter with overlap
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == text_len:
            break
        start += chunk_size - chunk_overlap
        
    return chunks

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculates cosine similarity between two vectors.
    """
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    mag1 = math.sqrt(sum(a * a for a in vec1))
    mag2 = math.sqrt(sum(a * a for a in vec2))
    
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
        
    return dot_product / (mag1 * mag2)

async def process_and_index_file(
    db: AsyncSession,
    file_id: int,
    user_settings: UserSettings
) -> None:
    """
    Extracts text, splits it, generates embeddings, and saves DocumentChunks to the database.
    """
    # 1. Fetch file record
    result = await db.execute(select(UploadedFile).where(UploadedFile.id == file_id))
    uploaded_file = result.scalar_one_or_none()
    if not uploaded_file:
        logger.error(f"File {file_id} not found during index generation.")
        return
        
    # 2. Extract text
    text = extract_text(uploaded_file.filepath, uploaded_file.content_type)
    if not text.strip():
        logger.warning(f"No text extracted from file {uploaded_file.filename}")
        return
        
    # 3. Create chunks
    chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
    if not chunks:
        return
        
    # 4. Generate embeddings and save chunks
    provider = get_ai_provider(user_settings)
    
    for chunk_content in chunks:
        try:
            # Embed chunk
            embedding = await provider.generate_embeddings(chunk_content)
            
            # Create chunk model
            chunk = DocumentChunk(
                file_id=uploaded_file.id,
                content=chunk_content,
            )
            chunk.embedding = embedding
            
            db.add(chunk)
        except Exception as e:
            logger.error(f"Failed to generate embedding for chunk in file {uploaded_file.filename}: {str(e)}")
            
    await db.commit()

async def retrieve_relevant_contexts(
    db: AsyncSession,
    user_id: int,
    query: str,
    user_settings: UserSettings,
    top_k: int = 4
) -> List[Tuple[str, float, str]]:
    """
    Generates embedding for query, performs cosine similarity match against all of user's chunks,
    and returns list of (chunk_content, score, filename).
    """
    # 1. Generate query embedding
    provider = get_ai_provider(user_settings)
    try:
        query_vector = await provider.generate_embeddings(query)
    except Exception as e:
        logger.error(f"Failed to embed query for retrieval: {str(e)}")
        return []
        
    # 2. Fetch user's files and document chunks
    stmt = (
        select(DocumentChunk, UploadedFile.filename)
        .join(UploadedFile)
        .where(UploadedFile.user_id == user_id)
    )
    result = await db.execute(stmt)
    chunks_with_filenames = result.all()
    
    # 3. Calculate similarities
    scored_chunks = []
    for chunk, filename in chunks_with_filenames:
        score = cosine_similarity(query_vector, chunk.embedding)
        if score > 0.3:  # Lower similarity threshold to capture context
            scored_chunks.append((chunk.content, score, filename))
            
    # 4. Sort and return top K
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    return scored_chunks[:top_k]
