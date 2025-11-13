from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


# Auth Schemas
class TelegramAuthData(BaseModel):
    """Данные для аутентификации через Telegram Mini App"""
    telegram_chat_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    language_code: Optional[str] = "ru"


class Token(BaseModel):
    """JWT токен"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenData(BaseModel):
    """Данные внутри токена"""
    user_id: Optional[int] = None
    telegram_chat_id: Optional[str] = None
