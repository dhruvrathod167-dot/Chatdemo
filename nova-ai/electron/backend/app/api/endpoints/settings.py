from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.models import User, UserSettings
from app.schemas.schemas import UserSettingsUpdate, FullSettingsResponse
from app.api.endpoints.auth import get_current_user
from app.services.ai.factory import get_ai_provider

router = APIRouter()

@router.get("", response_model=FullSettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch settings
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == current_user.id))
    user_settings = result.scalar_one_or_none()
    
    if not user_settings:
        # Fallback creation
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)
        await db.commit()
        await db.refresh(user_settings)
        
    return FullSettingsResponse(
        theme=user_settings.theme,
        provider=user_settings.provider,
        model=user_settings.model,
        temperature=user_settings.temperature,
        max_tokens=user_settings.max_tokens,
        system_prompt=user_settings.system_prompt,
        email=current_user.email,
        user_id=current_user.id
    )

@router.patch("", response_model=FullSettingsResponse)
async def update_settings(
    settings_in: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == current_user.id))
    user_settings = result.scalar_one_or_none()
    
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)
        
    update_data = settings_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user_settings, field, value)
        
    await db.commit()
    await db.refresh(user_settings)
    
    return FullSettingsResponse(
        theme=user_settings.theme,
        provider=user_settings.provider,
        model=user_settings.model,
        temperature=user_settings.temperature,
        max_tokens=user_settings.max_tokens,
        system_prompt=user_settings.system_prompt,
        email=current_user.email,
        user_id=current_user.id
    )

@router.get("/models", response_model=List[str])
async def get_available_models(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == current_user.id))
    user_settings = result.scalar_one_or_none()
    
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)
        await db.commit()
        await db.refresh(user_settings)
        
    provider = get_ai_provider(user_settings)
    try:
        models = await provider.list_models()
        return models
    except Exception as e:
        # Fallback to configured model if list fails
        return [user_settings.model]
