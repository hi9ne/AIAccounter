from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional
from datetime import date, datetime, timedelta

from ...database import get_db
from ...models.models import Expense, Income
from ...utils.auth import get_current_user_id

router = APIRouter(prefix="/debts", tags=["debts"])


# Временные модели для долгов (пока не добавлены в models.py)
from sqlalchemy import Column, Integer, BigInteger, String, Float, DateTime, Boolean, Text, Date, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from ...database import Base


class Debt(Base):
    __tablename__ = "debts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, nullable=False)
    person_name = Column(String(100), nullable=False)
    debt_type = Column(String(20), nullable=False)  # given, received
    original_amount = Column(Numeric, nullable=False)
    remaining_amount = Column(Numeric, nullable=False)
    currency = Column(String(10), default="KGS")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    due_date = Column(Date, nullable=True)
    is_settled = Column(Boolean, default=False)
    settled_at = Column(DateTime, nullable=True)
    remind_before_days = Column(Integer, default=3)
    last_reminder_sent_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    payments = relationship("DebtPayment", back_populates="debt", cascade="all, delete-orphan")


class DebtPayment(Base):
    __tablename__ = "debt_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    debt_id = Column(Integer, ForeignKey("debts.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric, nullable=False)
    payment_date = Column(Date, nullable=False, default=date.today)
    note = Column(Text, nullable=True)
    related_transaction_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    debt = relationship("Debt", back_populates="payments")


# Импортируем схемы
from ...schemas.debt import (
    DebtCreate, DebtUpdate, DebtResponse, DebtListResponse,
    DebtPaymentCreate, DebtPaymentResponse, DebtSummary
)


def debt_to_response(debt: Debt, today: date) -> DebtResponse:
    """Конвертирует модель долга в response"""
    paid_amount = float(debt.original_amount) - float(debt.remaining_amount)
    paid_percentage = (paid_amount / float(debt.original_amount) * 100) if float(debt.original_amount) > 0 else 0
    
    days_until_due = None
    is_overdue = False
    if debt.due_date:
        days_until_due = (debt.due_date - today).days
        is_overdue = days_until_due < 0 and not debt.is_settled
    
    payments = [
        DebtPaymentResponse(
            id=p.id,
            debt_id=p.debt_id,
            amount=float(p.amount),
            payment_date=p.payment_date,
            note=p.note,
            related_transaction_id=p.related_transaction_id,
            created_at=p.created_at
        )
        for p in (debt.payments or [])
    ]
    
    return DebtResponse(
        id=debt.id,
        user_id=debt.user_id,
        person_name=debt.person_name,
        debt_type=debt.debt_type,
        original_amount=float(debt.original_amount),
        remaining_amount=float(debt.remaining_amount),
        currency=debt.currency,
        description=debt.description,
        created_at=debt.created_at,
        due_date=debt.due_date,
        is_settled=debt.is_settled,
        settled_at=debt.settled_at,
        remind_before_days=debt.remind_before_days,
        updated_at=debt.updated_at,
        paid_amount=paid_amount,
        paid_percentage=round(paid_percentage, 1),
        days_until_due=days_until_due,
        is_overdue=is_overdue,
        payments=payments
    )


@router.get("/", response_model=DebtListResponse)
async def get_debts(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    settled: Optional[bool] = None,
    debt_type: Optional[str] = None,
):
    """Получить все долги пользователя"""
    query = select(Debt).where(Debt.user_id == user_id)
    
    if settled is not None:
        query = query.where(Debt.is_settled == settled)
    
    if debt_type:
        query = query.where(Debt.debt_type == debt_type)
    
    query = query.order_by(Debt.is_settled, Debt.due_date.nulls_last(), Debt.created_at.desc())
    
    result = await db.execute(query)
    debts = result.scalars().all()
    
    today = date.today()
    items = [debt_to_response(d, today) for d in debts]
    
    # Считаем суммы
    total_given = sum(float(d.original_amount) for d in debts if d.debt_type == "given")
    total_received = sum(float(d.original_amount) for d in debts if d.debt_type == "received")
    total_given_remaining = sum(float(d.remaining_amount) for d in debts if d.debt_type == "given" and not d.is_settled)
    total_received_remaining = sum(float(d.remaining_amount) for d in debts if d.debt_type == "received" and not d.is_settled)
    
    return DebtListResponse(
        items=items,
        total=len(debts),
        total_given=total_given,
        total_received=total_received,
        total_given_remaining=total_given_remaining,
        total_received_remaining=total_received_remaining,
        net_balance=total_given_remaining - total_received_remaining
    )


@router.get("/summary", response_model=DebtSummary)
async def get_debt_summary(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Получить сводку по долгам"""
    query = select(Debt).where(Debt.user_id == user_id)
    result = await db.execute(query)
    debts = result.scalars().all()
    
    today = date.today()
    week_later = today + timedelta(days=7)
    
    active_debts = [d for d in debts if not d.is_settled]
    
    total_given = sum(float(d.original_amount) for d in debts if d.debt_type == "given")
    total_received = sum(float(d.original_amount) for d in debts if d.debt_type == "received")
    total_given_remaining = sum(float(d.remaining_amount) for d in active_debts if d.debt_type == "given")
    total_received_remaining = sum(float(d.remaining_amount) for d in active_debts if d.debt_type == "received")
    
    overdue_count = sum(1 for d in active_debts if d.due_date and d.due_date < today)
    due_soon_count = sum(1 for d in active_debts if d.due_date and today <= d.due_date <= week_later)
    
    return DebtSummary(
        total_given=total_given,
        total_received=total_received,
        total_given_remaining=total_given_remaining,
        total_received_remaining=total_received_remaining,
        net_balance=total_given_remaining - total_received_remaining,
        active_debts_count=len(active_debts),
        overdue_count=overdue_count,
        due_soon_count=due_soon_count
    )


@router.get("/{debt_id}", response_model=DebtResponse)
async def get_debt(
    debt_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Получить конкретный долг"""
    query = select(Debt).where(Debt.id == debt_id, Debt.user_id == user_id)
    result = await db.execute(query)
    debt = result.scalar_one_or_none()
    
    if not debt:
        raise HTTPException(status_code=404, detail="Долг не найден")
    
    return debt_to_response(debt, date.today())


@router.post("/", response_model=DebtResponse)
async def create_debt(
    data: DebtCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Создать новый долг"""
    debt = Debt(
        user_id=user_id,
        person_name=data.person_name,
        debt_type=data.debt_type,
        original_amount=data.original_amount,
        remaining_amount=data.original_amount,
        currency=data.currency,
        description=data.description,
        due_date=data.due_date,
        remind_before_days=data.remind_before_days,
    )
    
    db.add(debt)
    await db.commit()
    await db.refresh(debt)
    
    return debt_to_response(debt, date.today())


@router.put("/{debt_id}", response_model=DebtResponse)
async def update_debt(
    debt_id: int,
    data: DebtUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Обновить долг"""
    query = select(Debt).where(Debt.id == debt_id, Debt.user_id == user_id)
    result = await db.execute(query)
    debt = result.scalar_one_or_none()
    
    if not debt:
        raise HTTPException(status_code=404, detail="Долг не найден")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(debt, field, value)
    
    await db.commit()
    await db.refresh(debt)
    
    return debt_to_response(debt, date.today())


@router.delete("/{debt_id}")
async def delete_debt(
    debt_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Удалить долг"""
    query = select(Debt).where(Debt.id == debt_id, Debt.user_id == user_id)
    result = await db.execute(query)
    debt = result.scalar_one_or_none()
    
    if not debt:
        raise HTTPException(status_code=404, detail="Долг не найден")
    
    await db.delete(debt)
    await db.commit()
    
    return {"success": True, "message": f"Долг '{debt.person_name}' удалён"}


@router.post("/{debt_id}/payments", response_model=DebtResponse)
async def add_payment(
    debt_id: int,
    data: DebtPaymentCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Добавить платёж по долгу (частичный или полный возврат)"""
    query = select(Debt).where(Debt.id == debt_id, Debt.user_id == user_id)
    result = await db.execute(query)
    debt = result.scalar_one_or_none()
    
    if not debt:
        raise HTTPException(status_code=404, detail="Долг не найден")
    
    if debt.is_settled:
        raise HTTPException(status_code=400, detail="Долг уже погашен")
    
    if data.amount > float(debt.remaining_amount):
        raise HTTPException(
            status_code=400, 
            detail=f"Сумма платежа ({data.amount}) превышает остаток долга ({debt.remaining_amount})"
        )
    
    # Создаём платёж
    payment = DebtPayment(
        debt_id=debt_id,
        amount=data.amount,
        payment_date=data.payment_date or date.today(),
        note=data.note,
    )
    
    # Создаём транзакцию если нужно
    if data.create_transaction:
        if debt.debt_type == "given":
            # Нам вернули долг = доход
            transaction = Income(
                user_id=user_id,
                amount=data.amount,
                currency=debt.currency,
                category="Возврат долга",
                description=f"Возврат от {debt.person_name}" + (f": {data.note}" if data.note else ""),
                date=data.payment_date or date.today(),
            )
        else:
            # Мы вернули долг = расход
            transaction = Expense(
                user_id=user_id,
                amount=data.amount,
                currency=debt.currency,
                category="Возврат долга",
                description=f"Возврат {debt.person_name}" + (f": {data.note}" if data.note else ""),
                date=data.payment_date or date.today(),
            )
        db.add(transaction)
        await db.flush()
        payment.related_transaction_id = transaction.id
    
    db.add(payment)
    
    # Обновляем остаток долга
    debt.remaining_amount = float(debt.remaining_amount) - data.amount
    
    # Если погашен полностью
    if debt.remaining_amount <= 0:
        debt.is_settled = True
        debt.settled_at = datetime.now()
        debt.remaining_amount = 0
    
    await db.commit()
    await db.refresh(debt)
    
    return debt_to_response(debt, date.today())


@router.post("/{debt_id}/settle", response_model=DebtResponse)
async def settle_debt(
    debt_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Отметить долг как погашенный (без создания платежа)"""
    query = select(Debt).where(Debt.id == debt_id, Debt.user_id == user_id)
    result = await db.execute(query)
    debt = result.scalar_one_or_none()
    
    if not debt:
        raise HTTPException(status_code=404, detail="Долг не найден")
    
    debt.is_settled = True
    debt.settled_at = datetime.now()
    debt.remaining_amount = 0
    
    await db.commit()
    await db.refresh(debt)
    
    return debt_to_response(debt, date.today())
