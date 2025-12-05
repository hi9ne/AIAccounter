from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
import logging

from ...database import get_db
from ...models import User
from ...schemas import TelegramAuthData, Token
from ...utils.auth import create_access_token, get_current_user, verify_token_only
from ...config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


@router.post("/telegram", response_model=Token)
async def telegram_auth(
    auth_data: TelegramAuthData,
    db: AsyncSession = Depends(get_db)
):
    """
    Аутентификация через Telegram Mini App
    """
    try:
        # Ищем пользователя по telegram_chat_id
        query = select(User).where(User.telegram_chat_id == int(auth_data.telegram_chat_id))
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        # Если пользователя нет - создаём автоматически
        if not user:
            user = User(
                telegram_chat_id=int(auth_data.telegram_chat_id),
                username=auth_data.username,
                first_name=auth_data.first_name,
                last_name=auth_data.last_name,
                language_code=auth_data.language_code,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # Обновляем данные пользователя если изменились
            updated = False
            if auth_data.username and auth_data.username != user.username:
                user.username = auth_data.username
                updated = True
            if auth_data.first_name and auth_data.first_name != user.first_name:
                user.first_name = auth_data.first_name
                updated = True
            if auth_data.last_name and auth_data.last_name != user.last_name:
                user.last_name = auth_data.last_name
                updated = True
            
            if updated:
                await db.commit()
        
        # Создаём JWT токен
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.user_id)},
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # в секундах
        )
    except Exception as e:
        logger.error(f"[AUTH] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Authentication error: {str(e)}"
        )


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Получить информацию о текущем пользователе
    Требует JWT токен в заголовке Authorization: Bearer <token>
    """
    return {
        "user_id": current_user.user_id,
        "telegram_chat_id": current_user.telegram_chat_id,
        "username": current_user.username,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "language_code": current_user.language_code,
        "is_active": current_user.is_active,
    }


@router.get("/verify")
async def verify_token(
    token: str = Depends(oauth2_scheme)
):
    """
    Быстрая проверка валидности токена БЕЗ запроса к БД.
    Только декодирует JWT и проверяет подпись.
    """
    return verify_token_only(token)

