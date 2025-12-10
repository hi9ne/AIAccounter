from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import date, timedelta, datetime

from ...database import get_db
from ...models.models import RecurringPayment, Expense, Income
from ...schemas.recurring import (
    RecurringPaymentCreate,
    RecurringPaymentUpdate,
    RecurringPaymentResponse,
    RecurringPaymentListResponse,
    MarkPaidRequest,
)
from ...utils.auth import get_current_user_id

router = APIRouter(prefix="/recurring", tags=["recurring-payments"])


def calculate_next_date(current_date: date, frequency: str, interval: int = 1) -> date:
    """Вычисляет следующую дату платежа на основе частоты"""
    if frequency == "daily":
        return current_date + timedelta(days=interval)
    elif frequency == "weekly":
        return current_date + timedelta(weeks=interval)
    elif frequency == "monthly":
        # Добавляем месяцы
        month = current_date.month - 1 + interval
        year = current_date.year + month // 12
        month = month % 12 + 1
        day = min(current_date.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
        return date(year, month, day)
    elif frequency == "yearly":
        try:
            return current_date.replace(year=current_date.year + interval)
        except ValueError:
            return current_date.replace(year=current_date.year + interval, day=28)
    return current_date


def payment_to_response(p: RecurringPayment, today: date) -> RecurringPaymentResponse:
    """Конвертирует модель в response"""
    return RecurringPaymentResponse(
        id=p.id,
        user_id=p.user_id,
        title=p.title,
        amount=float(p.amount),
        currency=p.currency,
        category=p.category,
        description=p.description,
        transaction_type=p.transaction_type or "expense",
        frequency=p.frequency,
        interval_value=p.interval_value or 1,
        start_date=p.start_date,
        end_date=p.end_date,
        next_payment_date=p.next_payment_date,
        last_payment_date=p.last_payment_date,
        remind_days_before=p.remind_days_before or 3,
        auto_create=p.auto_create or False,
        is_active=p.is_active,
        last_reminder_sent_at=p.last_reminder_sent_at,
        created_at=p.created_at,
        updated_at=p.updated_at,
        total_executions=p.total_executions or 0,
        days_until_payment=(p.next_payment_date - today).days if p.next_payment_date else None
    )


@router.get("", response_model=RecurringPaymentListResponse)
async def get_recurring_payments(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    active_only: bool = True,
):
    """Получить все повторяющиеся платежи пользователя"""
    query = select(RecurringPayment).where(RecurringPayment.user_id == user_id)
    
    if active_only:
        query = query.where(RecurringPayment.is_active == True)
    
    query = query.order_by(RecurringPayment.next_payment_date)
    
    result = await db.execute(query)
    payments = result.scalars().all()
    
    today = date.today()
    week_later = today + timedelta(days=7)
    
    items = [payment_to_response(p, today) for p in payments]
    
    active_count = sum(1 for p in payments if p.is_active)
    upcoming_count = sum(1 for p in payments if p.is_active and p.next_payment_date and p.next_payment_date <= week_later)
    
    return RecurringPaymentListResponse(
        items=items,
        total=len(payments),
        active_count=active_count,
        upcoming_count=upcoming_count
    )


@router.get("/upcoming/summary")
async def get_upcoming_summary(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    days: int = 30,
):
    """Получить сводку предстоящих платежей на N дней"""
    today = date.today()
    end_date = today + timedelta(days=days)
    
    query = select(RecurringPayment).where(
        RecurringPayment.user_id == user_id,
        RecurringPayment.is_active == True,
        RecurringPayment.next_payment_date <= end_date
    ).order_by(RecurringPayment.next_payment_date)
    
    result = await db.execute(query)
    payments = result.scalars().all()
    
    # Группируем по валюте
    totals_by_currency = {}
    for p in payments:
        if p.currency not in totals_by_currency:
            totals_by_currency[p.currency] = 0
        totals_by_currency[p.currency] += float(p.amount)
    
    # Ближайшие платежи
    upcoming = []
    for p in payments[:5]:
        upcoming.append({
            "id": p.id,
            "title": p.title,
            "amount": float(p.amount),
            "currency": p.currency,
            "category": p.category,
            "next_payment_date": p.next_payment_date.isoformat(),
            "days_until": (p.next_payment_date - today).days
        })
    
    return {
        "period_days": days,
        "total_payments": len(payments),
        "totals_by_currency": totals_by_currency,
        "upcoming": upcoming
    }


@router.get("/{payment_id}", response_model=RecurringPaymentResponse)
async def get_recurring_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Получить конкретный повторяющийся платёж"""
    query = select(RecurringPayment).where(
        RecurringPayment.id == payment_id,
        RecurringPayment.user_id == user_id
    )
    result = await db.execute(query)
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    
    return payment_to_response(payment, date.today())


@router.post("", response_model=RecurringPaymentResponse)
async def create_recurring_payment(
    data: RecurringPaymentCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Создать новый повторяющийся платёж"""
    start = data.start_date or data.next_payment_date
    
    payment = RecurringPayment(
        user_id=user_id,
        title=data.title,
        amount=data.amount,
        currency=data.currency,
        category=data.category,
        description=data.description,
        transaction_type=data.transaction_type,
        frequency=data.frequency,
        interval_value=data.interval_value,
        start_date=start,
        next_payment_date=data.next_payment_date,
        remind_days_before=data.remind_days_before,
        auto_create=data.auto_create,
        is_active=True,
    )
    
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    
    return payment_to_response(payment, date.today())


@router.put("/{payment_id}", response_model=RecurringPaymentResponse)
async def update_recurring_payment(
    payment_id: int,
    data: RecurringPaymentUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Обновить повторяющийся платёж"""
    query = select(RecurringPayment).where(
        RecurringPayment.id == payment_id,
        RecurringPayment.user_id == user_id
    )
    result = await db.execute(query)
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(payment, field, value)
    
    await db.commit()
    await db.refresh(payment)
    
    return payment_to_response(payment, date.today())


@router.delete("/{payment_id}")
async def delete_recurring_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Удалить (деактивировать) повторяющийся платёж"""
    query = select(RecurringPayment).where(
        RecurringPayment.id == payment_id,
        RecurringPayment.user_id == user_id
    )
    result = await db.execute(query)
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    
    payment.is_active = False
    await db.commit()
    
    return {"success": True, "message": f"Платёж '{payment.title}' деактивирован"}


@router.post("/{payment_id}/mark-paid", response_model=RecurringPaymentResponse)
async def mark_payment_as_paid(
    payment_id: int,
    data: MarkPaidRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Отметить платёж как оплаченный и передвинуть дату следующего платежа"""
    query = select(RecurringPayment).where(
        RecurringPayment.id == payment_id,
        RecurringPayment.user_id == user_id
    )
    result = await db.execute(query)
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    
    # Создаём транзакцию если нужно
    if data.create_expense:
        if payment.transaction_type == "income":
            transaction = Income(
                user_id=user_id,
                amount=payment.amount,
                currency=payment.currency,
                category=payment.category,
                description=f"Авто: {payment.title}",
                date=payment.next_payment_date,
            )
        else:
            transaction = Expense(
                user_id=user_id,
                amount=payment.amount,
                currency=payment.currency,
                category=payment.category,
                description=f"Авто: {payment.title}",
                date=payment.next_payment_date,
            )
        db.add(transaction)
    
    # Обновляем платёж
    payment.last_payment_date = payment.next_payment_date
    payment.next_payment_date = calculate_next_date(
        payment.next_payment_date, 
        payment.frequency, 
        payment.interval_value or 1
    )
    payment.last_reminder_sent_at = None
    payment.total_executions = (payment.total_executions or 0) + 1
    payment.last_executed_at = datetime.now()
    
    # Проверяем end_date
    if payment.end_date and payment.next_payment_date > payment.end_date:
        payment.is_active = False
    
    await db.commit()
    await db.refresh(payment)
    
    return payment_to_response(payment, date.today())
