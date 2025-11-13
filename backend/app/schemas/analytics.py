"""
Pydantic schemas for Analytics
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date
from decimal import Decimal


class IncomeExpenseStatsSchema(BaseModel):
    """Базовая статистика доходов и расходов"""
    total_income: float
    total_expense: float
    balance: float
    income_count: int
    expense_count: int


class TopCategorySchema(BaseModel):
    """Топ категория"""
    category: str
    total_amount: float
    transaction_count: int
    percentage: float


class BalanceTrendSchema(BaseModel):
    """Тренд баланса по дням"""
    date: date
    balance: float
    income: float = 0
    expense: float = 0


class ChartDataResponse(BaseModel):
    """Данные для графиков"""
    labels: List[str]
    income: List[float]
    expense: List[float]


class SpendingPatternSchema(BaseModel):
    """Паттерн трат"""
    pattern_type: str
    pattern_name: str
    description: str
    frequency: str
    avg_amount: float
    category: str
    confidence_score: float


class CategoryAnalyticsSchema(BaseModel):
    """Аналитика по категории"""
    category_name: str
    total_amount: float
    transaction_count: int
    avg_transaction: float
    trend_direction: Optional[str]
    trend_percentage: Optional[float]


class DashboardDataSchema(BaseModel):
    """Данные для дашборда"""
    period: str
    start_date: str
    end_date: str
    stats: IncomeExpenseStatsSchema
    top_categories: List[TopCategorySchema]
    balance_trend: List[BalanceTrendSchema]
