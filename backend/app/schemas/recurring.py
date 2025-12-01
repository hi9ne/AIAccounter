from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class RecurringPaymentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0)
    currency: str = Field(default="KGS", pattern="^(KGS|USD|EUR|RUB)$")
    category: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    transaction_type: str = Field(default="expense", pattern="^(expense|income)$")
    frequency: str = Field(..., pattern="^(daily|weekly|monthly|yearly)$")
    interval_value: int = Field(default=1, ge=1)
    next_payment_date: date
    remind_days_before: int = Field(default=3, ge=0, le=30)
    auto_create: bool = Field(default=False)


class RecurringPaymentCreate(RecurringPaymentBase):
    start_date: Optional[date] = None  # если не указано, будет next_payment_date


class RecurringPaymentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, pattern="^(KGS|USD|EUR|RUB)$")
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    transaction_type: Optional[str] = Field(None, pattern="^(expense|income)$")
    frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly|yearly)$")
    interval_value: Optional[int] = Field(None, ge=1)
    next_payment_date: Optional[date] = None
    end_date: Optional[date] = None
    remind_days_before: Optional[int] = Field(None, ge=0, le=30)
    auto_create: Optional[bool] = None
    is_active: Optional[bool] = None


class RecurringPaymentResponse(BaseModel):
    id: int
    user_id: int
    title: str
    amount: float
    currency: str
    category: str
    description: Optional[str] = None
    transaction_type: str
    frequency: str
    interval_value: int
    start_date: date
    end_date: Optional[date] = None
    next_payment_date: date
    last_payment_date: Optional[date] = None
    remind_days_before: int
    auto_create: bool
    is_active: bool
    last_reminder_sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_executions: int = 0
    days_until_payment: Optional[int] = None
    
    class Config:
        from_attributes = True


class RecurringPaymentListResponse(BaseModel):
    items: List[RecurringPaymentResponse]
    total: int
    active_count: int
    upcoming_count: int  # платежи в ближайшие 7 дней


class MarkPaidRequest(BaseModel):
    create_expense: bool = Field(default=True, description="Создать расход автоматически")
