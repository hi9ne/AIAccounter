from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, extract
from typing import List, Optional
from datetime import datetime, date

from ...database import get_db
from ...models import Income, User
from ...schemas import IncomeCreate, IncomeUpdate, Income as IncomeSchema
from ...utils.auth import get_current_user

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
    return db_income


@router.get("/", response_model=List[IncomeSchema])
async def get_income_list(
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить список доходов с фильтрами"""
    query = select(Income).where(
        and_(
            Income.user_id == current_user.user_id,
            Income.deleted_at.is_(None)
        )
    )
    
    if category:
        query = query.where(Income.category == category)
    if start_date:
        query = query.where(Income.date >= start_date)
    if end_date:
        query = query.where(Income.date <= end_date)
    
    query = query.order_by(Income.date.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    income = result.scalars().all()
    return income


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
    
    return {"message": "Income deleted successfully", "success": True}
