from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, extract, func
from typing import Optional

from ...database import get_db
from ...models import Budget, Expense, User
from ...schemas import BudgetCreate, BudgetUpdate, Budget as BudgetSchema
from ...utils.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=BudgetSchema, status_code=201)
async def create_budget(
    budget: BudgetCreate,
    user_id: int,  # TODO: получать из JWT токена
    db: AsyncSession = Depends(get_db)
):
    """Создать или обновить бюджет на месяц"""
    # Проверяем, есть ли уже бюджет на этот месяц
    query = select(Budget).where(
        and_(
            Budget.user_id == current_user.user_id,
            Budget.month == budget.month,
            Budget.workspace_id == budget.workspace_id
        )
    )
    result = await db.execute(query)
    existing_budget = result.scalar_one_or_none()
    
    if existing_budget:
        # Обновляем существующий
        existing_budget.budget_amount = budget.budget_amount
        existing_budget.currency = budget.currency
        await db.commit()
        await db.refresh(existing_budget)
        return existing_budget
    
    # Создаём новый
    db_budget = Budget(
        user_id=user_id,
        workspace_id=budget.workspace_id,
        month=budget.month,
        budget_amount=budget.budget_amount,
        currency=budget.currency,
    )
    db.add(db_budget)
    await db.commit()
    await db.refresh(db_budget)
    return db_budget


@router.get("/{month}", response_model=BudgetSchema)
async def get_budget(
    month: str,  # Format: YYYY-MM
    user_id: int,  # TODO: получать из JWT токена
    workspace_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить бюджет на конкретный месяц"""
    query = select(Budget).where(
        and_(
            Budget.user_id == current_user.user_id,
            Budget.month == month
        )
    )
    
    if workspace_id:
        query = query.where(Budget.workspace_id == workspace_id)
    
    result = await db.execute(query)
    budget = result.scalar_one_or_none()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return budget


@router.get("/{month}/status")
async def get_budget_status(
    month: str,  # Format: YYYY-MM
    user_id: int,  # TODO: получать из JWT токена
    workspace_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить статус бюджета с расходами"""
    # Получаем бюджет
    budget_query = select(Budget).where(
        and_(
            Budget.user_id == current_user.user_id,
            Budget.month == month
        )
    )
    
    if workspace_id:
        budget_query = budget_query.where(Budget.workspace_id == workspace_id)
    
    budget_result = await db.execute(budget_query)
    budget = budget_result.scalar_one_or_none()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Получаем сумму расходов за месяц
    year, month_num = month.split("-")
    expenses_query = select(
        func.sum(Expense.amount).label("total_spent"),
        func.count(Expense.id).label("transaction_count")
    ).where(
        and_(
            Expense.user_id == current_user.user_id,
            Expense.deleted_at.is_(None),
            extract('year', Expense.date) == int(year),
            extract('month', Expense.date) == int(month_num)
        )
    )
    
    if workspace_id:
        expenses_query = expenses_query.where(Expense.workspace_id == workspace_id)
    
    expenses_result = await db.execute(expenses_query)
    expenses_data = expenses_result.one()
    
    total_spent = float(expenses_data.total_spent or 0)
    transaction_count = expenses_data.transaction_count or 0
    remaining = budget.budget_amount - total_spent
    percentage_used = (total_spent / budget.budget_amount * 100) if budget.budget_amount > 0 else 0
    
    return {
        "budget_amount": budget.budget_amount,
        "currency": budget.currency,
        "month": budget.month,
        "total_spent": total_spent,
        "remaining": remaining,
        "percentage_used": round(percentage_used, 1),
        "transaction_count": transaction_count,
        "status": "over_budget" if remaining < 0 else "on_track" if percentage_used < 80 else "warning"
    }


@router.put("/{month}", response_model=BudgetSchema)
async def update_budget(
    month: str,
    budget_update: BudgetUpdate,
    user_id: int,  # TODO: получать из JWT токена
    workspace_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Обновить бюджет"""
    query = select(Budget).where(
        and_(
            Budget.user_id == current_user.user_id,
            Budget.month == month
        )
    )
    
    if workspace_id:
        query = query.where(Budget.workspace_id == workspace_id)
    
    result = await db.execute(query)
    budget = result.scalar_one_or_none()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = budget_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
    
    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/{month}")
async def delete_budget(
    month: str,
    user_id: int,  # TODO: получать из JWT токена
    workspace_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Удалить бюджет"""
    query = select(Budget).where(
        and_(
            Budget.user_id == current_user.user_id,
            Budget.month == month
        )
    )
    
    if workspace_id:
        query = query.where(Budget.workspace_id == workspace_id)
    
    result = await db.execute(query)
    budget = result.scalar_one_or_none()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    await db.delete(budget)
    await db.commit()
    
    return {"message": "Budget deleted successfully", "success": True}
