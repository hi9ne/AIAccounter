from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ...database import get_db
from ...models import User
from ...schemas import User as UserSchema, UserUpdate, MessageResponse
from ...utils.auth import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserSchema)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить профиль текущего пользователя
    
    Использует готовую функцию БД get_user_profile() для получения
    детальной информации включая статистику.
    """
    # Используем готовую функцию PostgreSQL
    query = text("""
        SELECT * FROM get_user_profile(:user_id)
    """)
    
    result = await db.execute(query, {"user_id": current_user.user_id})
    profile_data = result.fetchone()
    
    if profile_data:
        # Функция возвращает подробную статистику
        return {
            "user_id": current_user.user_id,
            "telegram_chat_id": str(current_user.telegram_chat_id),  # Конвертируем в строку
            "username": current_user.username,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "language_code": current_user.language_code,
            "timezone": current_user.timezone,
            "is_active": current_user.is_active,
            "last_activity": current_user.last_activity,
            "created_at": current_user.last_activity,  # Используем last_activity как created_at
        }
    
    # Если функция не вернула данные, возвращаем базовую информацию
    return {
        "user_id": current_user.user_id,
        "telegram_chat_id": str(current_user.telegram_chat_id),
        "username": current_user.username,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "language_code": current_user.language_code,
        "timezone": current_user.timezone,
        "is_active": current_user.is_active,
        "last_activity": current_user.last_activity,
        "created_at": current_user.last_activity,
    }

@router.put("/me", response_model=UserSchema)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Обновить профиль текущего пользователя
    
    Можно обновить: first_name, last_name, language, timezone
    """
    update_data = user_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.get("/me/stats")
async def get_user_statistics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить детальную статистику пользователя
    
    Использует функцию get_user_profile() для получения:
    - Общая статистика расходов/доходов
    - Количество транзакций
    - Средние значения
    - Топ категории
    """
    query = text("""
        SELECT 
            user_id,
            first_name,
            total_expenses,
            total_income,
            balance,
            transaction_count,
            expense_count,
            income_count,
            avg_expense,
            avg_income,
            top_expense_category,
            top_expense_amount,
            current_month_expenses,
            current_month_income
        FROM get_user_profile(:user_id)
    """)
    
    result = await db.execute(query, {"user_id": current_user.user_id})
    stats = result.fetchone()
    
    if not stats:
        return {
            "message": "No statistics available yet",
            "user_id": current_user.user_id
        }
    
    return {
        "user_id": stats.user_id,
        "first_name": stats.first_name,
        "total_expenses": float(stats.total_expenses or 0),
        "total_income": float(stats.total_income or 0),
        "balance": float(stats.balance or 0),
        "transaction_count": stats.transaction_count or 0,
        "expense_count": stats.expense_count or 0,
        "income_count": stats.income_count or 0,
        "avg_expense": float(stats.avg_expense or 0),
        "avg_income": float(stats.avg_income or 0),
        "top_expense_category": stats.top_expense_category,
        "top_expense_amount": float(stats.top_expense_amount or 0),
        "current_month_expenses": float(stats.current_month_expenses or 0),
        "current_month_income": float(stats.current_month_income or 0),
    }
