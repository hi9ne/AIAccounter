from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from ...database import get_db
from ...models import User, Expense, Income
from ...schemas import User as UserSchema
from ...utils.auth import get_current_user

router = APIRouter()

class SubscriptionUpdate(BaseModel):
    days: int = 30

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
    subscription_update: SubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Продлить подписку пользователю или отозвать (если days < 0)
    """
    query = select(User).where(User.user_id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    days = subscription_update.days
    
    # Если days отрицательное - отзываем подписку (ставим вчерашнюю дату)
    if days < 0:
        user.subscription_expires_at = now - timedelta(days=1)
        await db.commit()
        return {
            "status": "revoked",
            "user_id": user.user_id,
            "new_expiry": user.subscription_expires_at
        }
    
    # Ensure subscription_expires_at is also naive for comparison
    expires_at = user.subscription_expires_at
    if expires_at and expires_at.tzinfo is not None:
        expires_at = expires_at.replace(tzinfo=None)
    
    # Если подписка уже есть и активна, продлеваем от текущей даты окончания
    # Если нет или истекла - от текущего момента
    if expires_at and expires_at > now:
        start_date = expires_at
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
    Расширенная статистика для админки
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Общее количество пользователей
    total_users = await db.scalar(select(func.count(User.user_id)))
    
    # Активные подписки (без админов)
    active_subs = await db.scalar(
        select(func.count(User.user_id))
        .where(
            (User.subscription_expires_at > now) &
            (User.is_admin == False)
        )
    )
    
    # Новые пользователи за неделю
    new_users_week = await db.scalar(
        select(func.count(User.user_id))
        .where(User.last_activity >= week_ago)
    )
    
    # Новые пользователи за месяц
    new_users_month = await db.scalar(
        select(func.count(User.user_id))
        .where(User.last_activity >= month_ago)
    )
    
    # Истекшие подписки
    expired_subs = await db.scalar(
        select(func.count(User.user_id))
        .where(
            (User.subscription_expires_at.isnot(None)) &
            (User.subscription_expires_at <= now)
        )
    )
    
    # Админы
    admin_count = await db.scalar(
        select(func.count(User.user_id))
        .where(User.is_admin == True)
    )
    
    # Доход (активные подписки * 300 сом)
    SUBSCRIPTION_PRICE = 300
    monthly_revenue = (active_subs or 0) * SUBSCRIPTION_PRICE
    
    return {
        "total_users": total_users,
        "active_subscriptions": active_subs,
        "expired_subscriptions": expired_subs,
        "new_users_week": new_users_week,
        "new_users_month": new_users_month,
        "admin_count": admin_count,
        "monthly_revenue": monthly_revenue,
        "conversion_rate": round((active_subs / total_users * 100) if total_users > 0 else 0, 1)
    }

@router.get("/users/{user_id}/stats")
async def get_user_stats(
    user_id: int,
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> Dict[str, Any]:
    """
    Получить детальную статистику пользователя
    """
    # Check if user exists
    query = select(User).where(User.user_id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate date range
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=30)
    
    # Get expenses
    expenses_result = await db.execute(
        select(func.sum(Expense.amount), func.count(Expense.id))
        .where(
            (Expense.user_id == user_id) &
            (Expense.created_at >= start_date) &
            (Expense.deleted_at.is_(None))
        )
    )
    total_expenses, expense_count = expenses_result.first() or (0, 0)
    
    # Get income
    income_result = await db.execute(
        select(func.sum(Income.amount), func.count(Income.id))
        .where(
            (Income.user_id == user_id) &
            (Income.created_at >= start_date) &
            (Income.deleted_at.is_(None))
        )
    )
    total_income, income_count = income_result.first() or (0, 0)
    
    # Get top category (by string, not by category_id)
    top_category_result = await db.execute(
        select(Expense.category, func.sum(Expense.amount).label('total'))
        .where(
            (Expense.user_id == user_id) &
            (Expense.created_at >= start_date) &
            (Expense.deleted_at.is_(None))
        )
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
        .limit(1)
    )
    top_category_row = top_category_result.first()
    top_category = top_category_row[0] if top_category_row else None
    
    # Calculate stats
    total_expenses = float(total_expenses or 0)
    total_income = float(total_income or 0)
    balance = total_income - total_expenses
    total_transactions = (expense_count or 0) + (income_count or 0)
    average_expense = total_expenses / expense_count if expense_count > 0 else 0
    
    return {
        "balance": balance,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "total_transactions": total_transactions,
        "average_expense": average_expense,
        "top_category": top_category
    }
