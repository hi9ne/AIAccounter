from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, extract, func
from typing import List, Optional
from datetime import datetime, date

from ...database import get_db
from ...models import Income, User
from ...schemas import IncomeCreate, IncomeUpdate, Income as IncomeSchema, PaginatedResponse
from ...utils.auth import get_current_user
from ...services.cache import cache_service
from ...services.websocket import ws_manager

router = APIRouter()


@router.post("/", response_model=IncomeSchema, status_code=201)
async def create_income(
    income: IncomeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Создать новый доход"""
    db_income = Income(
        user_id=current_user.user_id,
        amount=income.amount,
        currency=income.currency,
        category=income.category,
        description=income.description,
        date=income.date,
    )
    db.add(db_income)
    await db.commit()
    await db.refresh(db_income)
    
    # Инвалидация кэша
    await cache_service.delete_pattern(f"stats:{current_user.user_id}:*")
    await cache_service.delete_pattern(f"overview:{current_user.user_id}:*")
    
    # WebSocket уведомление
    await ws_manager.send_personal_message({
        "type": "transaction_created",
        "data": {
            "transaction_type": "income",
            "id": db_income.id,
            "amount": db_income.amount,
            "currency": db_income.currency,
            "category": db_income.category,
            "date": db_income.date.isoformat()
        }
    }, current_user.user_id)
    
    return db_income


@router.get("/", response_model=PaginatedResponse[IncomeSchema])
async def get_income_list(
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1, description="Номер страницы"),
    page_size: int = Query(50, ge=1, le=100, description="Размер страницы"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить список доходов с пагинацией и фильтрами"""
    # Базовый запрос
    base_query = select(Income).where(
        and_(
            Income.user_id == current_user.user_id,
            Income.deleted_at.is_(None)
        )
    )
    
    # Применяем фильтры
    if category:
        base_query = base_query.where(Income.category == category)
    if start_date:
        base_query = base_query.where(Income.date >= start_date)
    if end_date:
        base_query = base_query.where(Income.date <= end_date)
    
    # Получаем общее количество
    count_query = select(func.count()).select_from(base_query.subquery())
    result = await db.execute(count_query)
    total = result.scalar()
    
    # Пагинированный запрос
    skip = (page - 1) * page_size
    query = base_query.order_by(Income.date.desc()).offset(skip).limit(page_size)
    
    result = await db.execute(query)
    income = result.scalars().all()
    
    return {
        "items": income,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": skip + page_size < total,
        "has_prev": page > 1
    }


@router.get("/{income_id}", response_model=IncomeSchema)
async def get_income(
    income_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить конкретный доход"""
    query = select(Income).where(
        and_(
            Income.id == income_id,
            Income.user_id == current_user.user_id,
            Income.deleted_at.is_(None)
        )
    )
    result = await db.execute(query)
    income = result.scalar_one_or_none()
    
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    
    return income


@router.put("/{income_id}", response_model=IncomeSchema)
async def update_income(
    income_id: int,
    income_update: IncomeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновить доход"""
    query = select(Income).where(
        and_(
            Income.id == income_id,
            Income.user_id == current_user.user_id,
            Income.deleted_at.is_(None)
        )
    )
    result = await db.execute(query)
    income = result.scalar_one_or_none()
    
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    
    update_data = income_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(income, field, value)
    
    await db.commit()
    await db.refresh(income)
    return income


@router.delete("/{income_id}")
async def delete_income(
    income_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удалить доход (мягкое удаление)"""
    query = select(Income).where(
        and_(
            Income.id == income_id,
            Income.user_id == current_user.user_id,
            Income.deleted_at.is_(None)
        )
    )
    result = await db.execute(query)
    income = result.scalar_one_or_none()
    
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    
    income.deleted_at = datetime.utcnow()
    await db.commit()
    
    # Инвалидация кэша
    await cache_service.delete_pattern(f"stats:{current_user.user_id}:*")
    await cache_service.delete_pattern(f"overview:{current_user.user_id}:*")
    
    # WebSocket уведомление
    await ws_manager.send_personal_message({
        "type": "transaction_deleted",
        "data": {
            "transaction_type": "income",
            "id": income_id
        }
    }, current_user.user_id)
    
    return {"message": "Income deleted successfully", "success": True}
