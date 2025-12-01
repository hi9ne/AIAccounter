from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# ===== DEBT SCHEMAS =====

class DebtBase(BaseModel):
    person_name: str = Field(..., min_length=1, max_length=100)
    debt_type: str = Field(..., pattern="^(given|received)$")
    original_amount: float = Field(..., gt=0)
    currency: str = Field(default="KGS", pattern="^(KGS|USD|EUR|RUB)$")
    description: Optional[str] = None
    due_date: Optional[date] = None
    remind_before_days: int = Field(default=3, ge=0, le=30)


class DebtCreate(DebtBase):
    pass


class DebtUpdate(BaseModel):
    person_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    due_date: Optional[date] = None
    remind_before_days: Optional[int] = Field(None, ge=0, le=30)


class DebtPaymentCreate(BaseModel):
    amount: float = Field(..., gt=0)
    payment_date: Optional[date] = None
    note: Optional[str] = None
    create_transaction: bool = Field(default=True, description="Создать транзакцию автоматически")


class DebtPaymentResponse(BaseModel):
    id: int
    debt_id: int
    amount: float
    payment_date: date
    note: Optional[str] = None
    related_transaction_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DebtResponse(BaseModel):
    id: int
    user_id: int
    person_name: str
    debt_type: str
    original_amount: float
    remaining_amount: float
    currency: str
    description: Optional[str] = None
    created_at: datetime
    due_date: Optional[date] = None
    is_settled: bool
    settled_at: Optional[datetime] = None
    remind_before_days: int
    updated_at: Optional[datetime] = None
    
    # Computed fields
    paid_amount: float = 0
    paid_percentage: float = 0
    days_until_due: Optional[int] = None
    is_overdue: bool = False
    payments: List[DebtPaymentResponse] = []

    class Config:
        from_attributes = True


class DebtListResponse(BaseModel):
    items: List[DebtResponse]
    total: int
    total_given: float  # Сколько дали в долг
    total_received: float  # Сколько взяли в долг
    total_given_remaining: float
    total_received_remaining: float
    net_balance: float  # given - received


class DebtSummary(BaseModel):
    total_given: float
    total_received: float
    total_given_remaining: float
    total_received_remaining: float
    net_balance: float
    active_debts_count: int
    overdue_count: int
    due_soon_count: int  # В ближайшие 7 дней


# ===== AI INSIGHTS SCHEMAS =====

class AIInsightResponse(BaseModel):
    id: int
    insight_type: str
    title: str
    message: str
    category: Optional[str] = None
    priority: str
    data: Optional[dict] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AIInsightsListResponse(BaseModel):
    items: List[AIInsightResponse]
    total: int
    unread_count: int


class AIAnalyticsRequest(BaseModel):
    """Запрос на генерацию AI аналитики"""
    period_days: int = Field(default=30, ge=7, le=365)
    include_forecast: bool = True
    include_anomalies: bool = True
    include_recommendations: bool = True


class SpendingForecast(BaseModel):
    """Прогноз расходов"""
    period: str  # "next_week", "next_month"
    predicted_amount: float
    confidence: float  # 0-1
    breakdown_by_category: dict[str, float]
    comparison_with_previous: float  # процент изменения


class SpendingAnomaly(BaseModel):
    """Аномалия в расходах"""
    category: str
    current_amount: float
    average_amount: float
    deviation_percentage: float
    severity: str  # low, medium, high
    message: str


class AIRecommendation(BaseModel):
    """AI рекомендация"""
    type: str  # saving_opportunity, budget_alert, pattern_insight
    title: str
    message: str
    potential_saving: Optional[float] = None
    category: Optional[str] = None
    priority: str


class AIAnalyticsResponse(BaseModel):
    """Полный AI анализ"""
    generated_at: datetime
    period_analyzed: str
    
    # Сводка
    summary: dict
    
    # Прогнозы
    forecasts: List[SpendingForecast] = []
    
    # Аномалии
    anomalies: List[SpendingAnomaly] = []
    
    # Рекомендации
    recommendations: List[AIRecommendation] = []
    
    # Инсайты
    insights: List[AIInsightResponse] = []
