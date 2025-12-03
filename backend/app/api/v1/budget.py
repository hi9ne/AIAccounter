from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, extract, func, desc
from typing import Optional, List
from datetime import datetime

from ...database import get_db
from ...models import Budget, Expense, User
from ...schemas import BudgetCreate, BudgetUpdate, Budget as BudgetSchema
from ...utils.auth import get_current_user

router = APIRouter()


# ===== GET /budget — Список всех бюджетов =====
@router.get("/", response_model=List[BudgetSchema])
async def get_budgets(
    current_user: User = Depends(get_current_user),
    limit: int = Query(12, ge=1, le=36, description="Количество месяцев"),
    db: AsyncSession = Depends(get_db)
):
    """Получить все бюджеты пользователя (последние N месяцев)"""
    query = select(Budget).where(
        Budget.user_id == current_user.user_id
    ).order_by(desc(Budget.month)).limit(limit)
    
    result = await db.execute(query)
    budgets = result.scalars().all()
    
    return budgets


# ===== GET /budget/current/status — Статус текущего месяца =====
@router.get("/current/status")
async def get_current_budget_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить статус бюджета текущего месяца"""
    current_month = datetime.now().strftime("%Y-%m")
    
    # Получаем бюджет
    budget_query = select(Budget).where(
        and_(
            Budget.user_id == current_user.user_id,
            Budget.month == current_month
        )
    )
    
    budget_result = await db.execute(budget_query)
    budget = budget_result.scalar_one_or_none()
    
    # Если бюджет не установлен, проверяем monthly_budget из профиля
    if not budget:
        if current_user.monthly_budget:
            # Создаём бюджет на текущий месяц из профиля
            budget = Budget(
                user_id=current_user.user_id,
                month=current_month,
                budget_amount=current_user.monthly_budget,
                currency=current_user.preferred_currency or "KGS"
            )
            db.add(budget)
            await db.commit()
            await db.refresh(budget)
        else:
            return {
                "has_budget": False,
                "month": current_month,
                "month_name": get_month_name(current_month),
                "message": "Бюджет не установлен"
            }
    
    # Получаем сумму расходов за месяц
    year, month_num = current_month.split("-")
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
    
    expenses_result = await db.execute(expenses_query)
    expenses_data = expenses_result.one()
    
    total_spent = float(expenses_data.total_spent or 0)
    transaction_count = expenses_data.transaction_count or 0
    budget_amount = float(budget.budget_amount)
    remaining = budget_amount - total_spent
    percentage_used = (total_spent / budget_amount * 100) if budget_amount > 0 else 0
    
    # Определяем статус
    if remaining < 0:
        status = "over_budget"
    elif percentage_used >= 80:
        status = "warning"
    else:
        status = "on_track"
    
    return {
        "has_budget": True,
        "budget_id": budget.id,
        "budget_amount": budget_amount,
        "currency": budget.currency,
        "month": budget.month,
        "month_name": get_month_name(budget.month),
        "total_spent": total_spent,
        "remaining": remaining,
        "percentage_used": round(percentage_used, 1),
        "transaction_count": transaction_count,
        "status": status
    }


def get_month_name(month_str: str) -> str:
    """Получить название месяца на русском"""
    months = {
        "01": "Январь", "02": "Февраль", "03": "Март",
        "04": "Апрель", "05": "Май", "06": "Июнь",
        "07": "Июль", "08": "Август", "09": "Сентябрь",
        "10": "Октябрь", "11": "Ноябрь", "12": "Декабрь"
    }
    _, month_num = month_str.split("-")
    return months.get(month_num, month_str)


# ===== POST /budget — Создать бюджет =====
@router.post("/", response_model=BudgetSchema, status_code=201)
async def create_budget(
    budget: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Создать или обновить бюджет на месяц"""
    user_id = current_user.user_id
    
    # Проверяем, есть ли уже бюджет на этот месяц
    query = select(Budget).where(
        and_(
            Budget.user_id == user_id,
            Budget.month == budget.month
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
        month=budget.month,
        budget_amount=budget.budget_amount,
        currency=budget.currency,
    )
    db.add(db_budget)
    await db.commit()
    await db.refresh(db_budget)
    return db_budget


# ===== GET /budget/{month} — Бюджет на месяц =====
@router.get("/{month}", response_model=BudgetSchema)
async def get_budget(
    month: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить бюджет на конкретный месяц"""
    query = select(Budget).where(
        and_(
            Budget.user_id == current_user.user_id,
            Budget.month == month
        )
    )
    
    result = await db.execute(query)
    budget = result.scalar_one_or_none()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return budget


# ===== GET /budget/{month}/status — Статус бюджета =====
@router.get("/{month}/status")
async def get_budget_status(
    month: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить статус бюджета с расходами"""
    user_id = current_user.user_id
    
    # Получаем бюджет
    budget_query = select(Budget).where(
        and_(
            Budget.user_id == user_id,
            Budget.month == month
        )
    )
    
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
            Expense.user_id == user_id,
            Expense.deleted_at.is_(None),
            extract('year', Expense.date) == int(year),
            extract('month', Expense.date) == int(month_num)
        )
    )
    
    expenses_result = await db.execute(expenses_query)
    expenses_data = expenses_result.one()
    
    total_spent = float(expenses_data.total_spent or 0)
    transaction_count = expenses_data.transaction_count or 0
    budget_amount = float(budget.budget_amount)
    remaining = budget_amount - total_spent
    percentage_used = (total_spent / budget_amount * 100) if budget_amount > 0 else 0
    
    return {
        "budget_amount": budget_amount,
        "currency": budget.currency,
        "month": budget.month,
        "month_name": get_month_name(budget.month),
        "total_spent": total_spent,
        "remaining": remaining,
        "percentage_used": round(percentage_used, 1),
        "transaction_count": transaction_count,
        "status": "over_budget" if remaining < 0 else "on_track" if percentage_used < 80 else "warning"
    }


# ===== PUT /budget/{month} — Обновить бюджет =====
@router.put("/{month}", response_model=BudgetSchema)
async def update_budget(
    month: str,
    budget_update: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновить бюджет"""
    query = select(Budget).where(
        and_(
            Budget.user_id == current_user.user_id,
            Budget.month == month
        )
    )
    
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


# ===== DELETE /budget/{month} — Удалить бюджет =====
@router.delete("/{month}")
async def delete_budget(
    month: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удалить бюджет"""
    query = select(Budget).where(
        and_(
            Budget.user_id == current_user.user_id,
            Budget.month == month
        )
    )
    
    result = await db.execute(query)
    budget = result.scalar_one_or_none()
    
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    await db.delete(budget)
    await db.commit()
    
    return {"message": "Budget deleted successfully", "success": True}
