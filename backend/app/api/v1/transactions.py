from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, union_all, func, literal, or_, update
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date
from decimal import Decimal

from app.database import get_db
from app.models.models import User, Expense, Income
from app.utils.auth import get_current_user
from app.schemas.schemas import PaginatedResponse
from app.services.memory_cache import hybrid_cache

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
async def get_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    type: Optional[str] = Query(None, description="Filter by type: 'expense' or 'income'"),
    category: Optional[str] = Query(None, description="Filter by category"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = Query(None, description="Search in description"),
    amount_min: Optional[float] = Query(None, description="Minimum amount"),
    amount_max: Optional[float] = Query(None, description="Maximum amount"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить объединенный список транзакций (expenses + income) с правильной пагинацией.
    Транзакции возвращаются отсортированными по дате (сначала новые).
    Конвертация валют выполняется на фронтенде.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Кэшируем только первую страницу без поиска (основной кейс)
    cache_key = None
    if page == 1 and not search and not amount_min and not amount_max:
        cache_key = hybrid_cache.make_key(
            "transactions", 
            current_user.user_id, 
            type or "all", 
            category or "all",
            str(start_date) if start_date else "none",
            str(end_date) if end_date else "none"
        )
        cached = await hybrid_cache.get(cache_key)
        if cached:
            logger.warning(f"[TRANSACTIONS] Cache HIT for user {current_user.user_id}")
            return cached
    
    # Базовый запрос для expenses
    expenses_query = select(
        Expense.id,
        Expense.amount,
        Expense.currency,
        Expense.category,
        Expense.description,
        Expense.date,
        Expense.created_at,
        literal("expense").label("type")
    ).where(
        Expense.user_id == current_user.user_id,
        Expense.deleted_at.is_(None)
    )
    
    # Базовый запрос для income
    income_query = select(
        Income.id,
        Income.amount,
        Income.currency,
        Income.category,
        Income.description,
        Income.date,
        Income.created_at,
        literal("income").label("type")
    ).where(
        Income.user_id == current_user.user_id,
        Income.deleted_at.is_(None)
    )
    
    # Применяем фильтры
    if type == "expense":
        # Только расходы
        if category:
            expenses_query = expenses_query.where(Expense.category == category)
        if start_date:
            expenses_query = expenses_query.where(Expense.date >= start_date)
        if end_date:
            expenses_query = expenses_query.where(Expense.date <= end_date)
        if search:
            expenses_query = expenses_query.where(Expense.description.ilike(f"%{search}%"))
        if amount_min is not None:
            expenses_query = expenses_query.where(Expense.amount >= Decimal(str(amount_min)))
        if amount_max is not None:
            expenses_query = expenses_query.where(Expense.amount <= Decimal(str(amount_max)))
        
        # Получаем общее количество
        count_query = select(func.count()).select_from(expenses_query.subquery())
        result = await db.execute(count_query)
        total = result.scalar()
        
        # Пагинированный запрос
        skip = (page - 1) * page_size
        final_query = expenses_query.order_by(Expense.date.desc()).offset(skip).limit(page_size)
        
    elif type == "income":
        # Только доходы
        if category:
            income_query = income_query.where(Income.category == category)
        if start_date:
            income_query = income_query.where(Income.date >= start_date)
        if end_date:
            income_query = income_query.where(Income.date <= end_date)
        if search:
            income_query = income_query.where(Income.description.ilike(f"%{search}%"))
        if amount_min is not None:
            income_query = income_query.where(Income.amount >= Decimal(str(amount_min)))
        if amount_max is not None:
            income_query = income_query.where(Income.amount <= Decimal(str(amount_max)))
        
        # Получаем общее количество
        count_query = select(func.count()).select_from(income_query.subquery())
        result = await db.execute(count_query)
        total = result.scalar()
        
        # Пагинированный запрос
        skip = (page - 1) * page_size
        final_query = income_query.order_by(Income.date.desc()).offset(skip).limit(page_size)
        
    else:
        # Применяем фильтры к отдельным запросам до объединения
        if category:
            expenses_query = expenses_query.where(Expense.category == category)
            income_query = income_query.where(Income.category == category)
        if start_date:
            expenses_query = expenses_query.where(Expense.date >= start_date)
            income_query = income_query.where(Income.date >= start_date)
        if end_date:
            expenses_query = expenses_query.where(Expense.date <= end_date)
            income_query = income_query.where(Income.date <= end_date)
        if search:
            expenses_query = expenses_query.where(Expense.description.ilike(f"%{search}%"))
            income_query = income_query.where(Income.description.ilike(f"%{search}%"))
        if amount_min is not None:
            expenses_query = expenses_query.where(Expense.amount >= Decimal(str(amount_min)))
            income_query = income_query.where(Income.amount >= Decimal(str(amount_min)))
        if amount_max is not None:
            expenses_query = expenses_query.where(Expense.amount <= Decimal(str(amount_max)))
            income_query = income_query.where(Income.amount <= Decimal(str(amount_max)))
        
        # Объединяем оба
        combined_subquery = union_all(expenses_query, income_query).subquery()
        combined_query = select(combined_subquery)
        
        # Получаем общее количество
        count_query = select(func.count()).select_from(combined_query.subquery())
        result = await db.execute(count_query)
        total = result.scalar()
        
        # Пагинированный запрос
        skip = (page - 1) * page_size
        final_query = combined_query.order_by(
            combined_subquery.c.date.desc()
        ).offset(skip).limit(page_size)
    
    result = await db.execute(final_query)
    transactions = result.fetchall()
    
    # Преобразуем в словари - возвращаем оригинальные данные
    items = []
    for row in transactions:
        item = {
            "id": row.id,
            "amount": float(row.amount),
            "currency": row.currency,
            "category": row.category,
            "description": row.description,
            "type": row.type
        }
        # Safely handle date conversion
        if hasattr(row.date, 'isoformat'):
            item["date"] = row.date.isoformat()
        else:
            item["date"] = str(row.date)
        
        if hasattr(row.created_at, 'isoformat'):
            item["created_at"] = row.created_at.isoformat()
        else:
            item["created_at"] = str(row.created_at)
        
        items.append(item)
    
    result_data = {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": skip + page_size < total,
        "has_prev": page > 1
    }
    
    # Кэшируем на 5 минут
    if cache_key:
        await hybrid_cache.set(cache_key, result_data, ttl=300)
        logger.warning(f"[TRANSACTIONS] Cached for user {current_user.user_id}")
    
    return result_data


@router.delete("")
async def delete_all_transactions(
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft-delete all transactions for the current user. Optional query param `type` = 'expense'|'income' to limit."""
    # Keep this for backwards-compatibility but delegate to /clear
    return await _clear_transactions(type, current_user, db)


@router.delete("/clear")
async def clear_transactions(
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear all transactions (soft-delete). Prefer calling /transactions/clear for clarity."""
    return await _clear_transactions(type, current_user, db)


async def _clear_transactions(type: Optional[str], current_user: User, db: AsyncSession):
    deleted_expenses = 0
    deleted_income = 0

    # Expenses
    if type is None or type == 'expense' or type == 'all':
        upd = (
            update(Expense)
            .where(Expense.user_id == current_user.user_id, Expense.deleted_at.is_(None))
            .values(deleted_at=datetime.utcnow())
        )
        res = await db.execute(upd)
        deleted_expenses = res.rowcount or 0

    # Income
    if type is None or type == 'income' or type == 'all':
        upd2 = (
            update(Income)
            .where(Income.user_id == current_user.user_id, Income.deleted_at.is_(None))
            .values(deleted_at=datetime.utcnow())
        )
        res2 = await db.execute(upd2)
        deleted_income = res2.rowcount or 0

    await db.commit()

    # Invalidate caches
    try:
        from ...services.cache import cache_service
        from ...services.memory_cache import hybrid_cache
        await cache_service.delete_pattern(f"stats:{current_user.user_id}:*")
        await cache_service.delete_pattern(f"overview:{current_user.user_id}:*")
        await hybrid_cache.delete_pattern(f"batch:{current_user.user_id}:*")
        await hybrid_cache.delete_pattern(f"transactions:{current_user.user_id}:*")
    except Exception:
        pass

    # Websocket notification
    try:
        from ...services.websocket import ws_manager
        await ws_manager.send_personal_message({
            "type": "transactions_cleared",
            "data": {"deleted_expenses": deleted_expenses, "deleted_income": deleted_income}
        }, current_user.user_id)
    except Exception:
        pass

    return {"deleted_expenses": deleted_expenses, "deleted_income": deleted_income}

