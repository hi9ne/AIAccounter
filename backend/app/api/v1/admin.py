from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from ...database import get_db
from ...models import User
from ...schemas import User as UserSchema
from ...utils.auth import get_current_user

router = APIRouter()

async def get_current_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

@router.get("/users", response_model=List[UserSchema])
async def get_users(
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Получить список пользователей (только для админов)
    """
    query = select(User).order_by(User.user_id.desc()).limit(limit).offset(offset)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (User.username.ilike(search_term)) | 
            (User.first_name.ilike(search_term)) |
            (User.last_name.ilike(search_term))
        )
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/users/{user_id}/subscription")
async def extend_subscription(
    user_id: int,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Продлить подписку пользователю
    """
    query = select(User).where(User.user_id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    now = datetime.now(timezone.utc)
    
    # Если подписка уже есть и активна, продлеваем от текущей даты окончания
    # Если нет или истекла - от текущего момента
    if user.subscription_expires_at and user.subscription_expires_at > now:
        start_date = user.subscription_expires_at
    else:
        start_date = now
        
    user.subscription_expires_at = start_date + timedelta(days=days)
    await db.commit()
    
    return {
        "status": "success",
        "user_id": user.user_id,
        "new_expiry": user.subscription_expires_at
    }

@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Статистика для админки
    """
    total_users = await db.scalar(select(func.count(User.user_id)))
    
    now = datetime.now(timezone.utc)
    active_subs = await db.scalar(
        select(func.count(User.user_id))
        .where(User.subscription_expires_at > now)
    )
    
    return {
        "total_users": total_users,
        "active_subscriptions": active_subs
    }
