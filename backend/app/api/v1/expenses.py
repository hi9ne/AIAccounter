from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from typing import List, Optional
from datetime import datetime, date

from ...database import get_db
from ...models import Expense, User
from ...schemas import ExpenseCreate, ExpenseUpdate, Expense as ExpenseSchema
from ...utils.auth import get_current_user

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
        workspace_id=expense.workspace_id,
        amount=expense.amount,
        currency=expense.currency,
        category=expense.category,
        description=expense.description,
        date=expense.date,
    )
    db.add(db_expense)
    await db.commit()
    await db.refresh(db_expense)
    return db_expense


@router.get("/", response_model=List[ExpenseSchema])
async def get_expenses(
    current_user: User = Depends(get_current_user),
    workspace_id: Optional[int] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Получить список расходов с фильтрами"""
    query = select(Expense).where(
        and_(
            Expense.user_id == current_user.user_id,
            Expense.deleted_at.is_(None)
        )
    )
    
    if workspace_id:
        query = query.where(Expense.workspace_id == workspace_id)
    if category:
        query = query.where(Expense.category == category)
    if start_date:
        query = query.where(Expense.date >= start_date)
    if end_date:
        query = query.where(Expense.date <= end_date)
    
    query = query.order_by(Expense.date.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    expenses = result.scalars().all()
    return expenses


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
    
    return {"message": "Expense deleted successfully", "success": True}


@router.get("/stats/summary")
async def get_expenses_summary(
    current_user: User = Depends(get_current_user),
    workspace_id: Optional[int] = None,
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
    
    if workspace_id:
        query = query.where(Expense.workspace_id == workspace_id)
    
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
    workspace_id: Optional[int] = None,
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
    
    if workspace_id:
        query = query.where(Expense.workspace_id == workspace_id)
    
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
