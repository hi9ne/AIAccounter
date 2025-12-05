from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from typing import List, Optional
from datetime import datetime, date

from ...database import get_db
from ...models import Expense, User
from ...schemas import ExpenseCreate, ExpenseUpdate, Expense as ExpenseSchema, PaginatedResponse
from ...utils.auth import get_current_user
from ...services.cache import cache_service
from ...services.websocket import ws_manager
from ...services.gamification import GamificationService

router = APIRouter()


@router.post("/", response_model=ExpenseSchema, status_code=201)
async def create_expense(
    expense: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Создать новый расход"""
    db_expense = Expense(
        user_id=current_user.user_id,
        amount=expense.amount,
        currency=expense.currency,
        category=expense.category,
        description=expense.description,
        date=expense.date,
    )
    db.add(db_expense)
    await db.commit()
    await db.refresh(db_expense)
    
    # Инвалидация кэша аналитики
    await cache_service.delete_pattern(f"stats:{current_user.user_id}:*")
    await cache_service.delete_pattern(f"top_categories:{current_user.user_id}:*")
    await cache_service.delete_pattern(f"overview:{current_user.user_id}:*")
    
    # Геймификация
    gamification = GamificationService(db)
    gamification_result = await gamification.on_transaction_added(
        current_user.user_id,
        "expense",
        has_description=bool(expense.description)
    )
    
    # WebSocket уведомление
    await ws_manager.send_personal_message({
        "type": "transaction_created",
        "data": {
            "transaction_type": "expense",
            "id": db_expense.id,
            "amount": db_expense.amount,
            "currency": db_expense.currency,
            "category": db_expense.category,
            "date": db_expense.date.isoformat(),
            "gamification": gamification_result
        }
    }, current_user.user_id)
    
    return db_expense


@router.get("/", response_model=PaginatedResponse[ExpenseSchema])
async def get_expenses(
    current_user: User = Depends(get_current_user),
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1, description="Номер страницы"),
    page_size: int = Query(50, ge=1, le=100, description="Размер страницы"),
    db: AsyncSession = Depends(get_db)
):
    """Получить список расходов с пагинацией и фильтрами"""
    # Базовый запрос
    base_query = select(Expense).where(
        and_(
            Expense.user_id == current_user.user_id,
            Expense.deleted_at.is_(None)
        )
    )
    
    # Применяем фильтры
    if category:
        base_query = base_query.where(Expense.category == category)
    if start_date:
        base_query = base_query.where(Expense.date >= start_date)
    if end_date:
        base_query = base_query.where(Expense.date <= end_date)
    
    # Получаем общее количество
    count_query = select(func.count()).select_from(base_query.subquery())
    result = await db.execute(count_query)
    total = result.scalar()
    
    # Пагинированный запрос
    skip = (page - 1) * page_size
    query = base_query.order_by(Expense.date.desc()).offset(skip).limit(page_size)
    
    result = await db.execute(query)
    expenses = result.scalars().all()
    
    return {
        "items": expenses,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": skip + page_size < total,
        "has_prev": page > 1
    }


@router.get("/{expense_id}", response_model=ExpenseSchema)
async def get_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить конкретный расход"""
    query = select(Expense).where(
        and_(
            Expense.id == expense_id,
            Expense.user_id == current_user.user_id,
            Expense.deleted_at.is_(None)
        )
    )
    result = await db.execute(query)
    expense = result.scalar_one_or_none()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return expense


@router.put("/{expense_id}", response_model=ExpenseSchema)
async def update_expense(
    expense_id: int,
    expense_update: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновить расход"""
    query = select(Expense).where(
        and_(
            Expense.id == expense_id,
            Expense.user_id == current_user.user_id,
            Expense.deleted_at.is_(None)
        )
    )
    result = await db.execute(query)
    expense = result.scalar_one_or_none()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = expense_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)
    
    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удалить расход (мягкое удаление)"""
    query = select(Expense).where(
        and_(
            Expense.id == expense_id,
            Expense.user_id == current_user.user_id,
            Expense.deleted_at.is_(None)
        )
    )
    result = await db.execute(query)
    expense = result.scalar_one_or_none()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense.deleted_at = datetime.utcnow()
    await db.commit()
    
    # Инвалидация кэша аналитики
    await cache_service.delete_pattern(f"stats:{current_user.user_id}:*")
    await cache_service.delete_pattern(f"top_categories:{current_user.user_id}:*")
    await cache_service.delete_pattern(f"overview:{current_user.user_id}:*")
    
    # WebSocket уведомление
    await ws_manager.send_personal_message({
        "type": "transaction_deleted",
        "data": {
            "transaction_type": "expense",
            "id": expense_id
        }
    }, current_user.user_id)
    
    return {"message": "Expense deleted successfully"}


@router.get("/stats/summary")
async def get_expenses_summary(
    current_user: User = Depends(get_current_user),
    month: Optional[str] = None,  # Format: YYYY-MM
    db: AsyncSession = Depends(get_db)
):
    """Получить сводку по расходам"""
    query = select(
        func.sum(Expense.amount).label("total"),
        func.count(Expense.id).label("count"),
        Expense.currency
    ).where(
        and_(
            Expense.user_id == current_user.user_id,
            Expense.deleted_at.is_(None)
        )
    )
    
    if month:
        year, month_num = month.split("-")
        query = query.where(
            and_(
                extract('year', Expense.date) == int(year),
                extract('month', Expense.date) == int(month_num)
            )
        )
    
    query = query.group_by(Expense.currency)
    
    result = await db.execute(query)
    summary = result.all()
    
    return [
        {
            "total": float(row.total or 0),
            "count": row.count,
            "currency": row.currency
        }
        for row in summary
    ]


@router.get("/stats/by-category")
async def get_expenses_by_category(
    current_user: User = Depends(get_current_user),
    month: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить расходы по категориям"""
    query = select(
        Expense.category,
        func.sum(Expense.amount).label("total"),
        func.count(Expense.id).label("count"),
        Expense.currency
    ).where(
        and_(
            Expense.user_id == current_user.user_id,
            Expense.deleted_at.is_(None)
        )
    )
    
    if month:
        year, month_num = month.split("-")
        query = query.where(
            and_(
                extract('year', Expense.date) == int(year),
                extract('month', Expense.date) == int(month_num)
            )
        )
    
    query = query.group_by(Expense.category, Expense.currency).order_by(func.sum(Expense.amount).desc())
    
    result = await db.execute(query)
    categories = result.all()
    
    return [
        {
            "category": row.category,
            "total": float(row.total),
            "count": row.count,
            "currency": row.currency
        }
        for row in categories
    ]
