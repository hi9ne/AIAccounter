"""
Pydantic schemas for Workspaces
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class WorkspaceCreate(BaseModel):
    """Создание нового workspace"""
    name: str = Field(..., min_length=1, max_length=100, description="Название workspace")
    description: Optional[str] = Field(None, max_length=500, description="Описание")
    currency: str = Field(default="KGS", description="Валюта по умолчанию (KGS, USD, EUR, RUB, KZT)")


class WorkspaceUpdate(BaseModel):
    """Обновление workspace"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    currency: Optional[str] = None


class WorkspaceSchema(BaseModel):
    """Полная информация о workspace"""
    workspace_id: int
    name: str
    description: Optional[str]
    currency: str
    owner_id: int
    created_at: datetime
    role: Optional[str] = None  # Роль текущего пользователя (owner, admin, editor, viewer)
    joined_at: Optional[datetime] = None  # Когда присоединился текущий пользователь

    class Config:
        from_attributes = True


class WorkspaceMemberSchema(BaseModel):
    """Участник workspace"""
    user_id: int
    first_name: str
    last_name: Optional[str]
    telegram_username: Optional[str]
    role: str  # owner, admin, editor, viewer
    joined_at: datetime

    class Config:
        from_attributes = True


class WorkspaceInviteCreate(BaseModel):
    """Создание приглашения"""
    role: str = Field(default="viewer", description="Роль (viewer, editor, admin, owner)")
    max_uses: int = Field(default=1, description="Максимальное количество использований")
    expires_in_days: Optional[int] = Field(default=7, description="Срок действия в днях (0 = бессрочно)")


class WorkspaceInviteAccept(BaseModel):
    """Принятие приглашения"""
    invite_code: str = Field(..., min_length=6, max_length=50, description="Код приглашения")


class WorkspaceInviteSchema(BaseModel):
    """Информация о приглашении"""
    id: int
    workspace_id: int
    workspace_name: Optional[str] = None
    invite_code: str
    role: str  # viewer, editor, admin, owner
    created_by: int
    created_by_name: Optional[str] = None
    max_uses: int
    used_count: int
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
