"""
Schemas for Savings Goals
Цели накоплений
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class ContributionType(str, Enum):
    deposit = "deposit"
    withdraw = "withdraw"


class ContributionSource(str, Enum):
    manual = "manual"
    auto = "auto"
    telegram = "telegram"


# ============================================
# BASE SCHEMAS
# ============================================

class GoalBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    target_amount: float = Field(..., gt=0)
    currency: str = Field(default="KGS", max_length=10)
    icon: str = Field(default="🎯", max_length=10)
    color: str = Field(default="#6366F1", max_length=7)
    deadline: Optional[date] = None
    auto_contribute: bool = False
    auto_contribute_percent: Optional[float] = Field(None, ge=0, le=100)


class ContributionBase(BaseModel):
    amount: float = Field(..., gt=0)
    type: ContributionType = ContributionType.deposit
    note: Optional[str] = None


# ============================================
# CREATE SCHEMAS
# ============================================

class GoalCreate(GoalBase):
    """Создание новой цели"""
    initial_amount: Optional[float] = Field(0, ge=0)


class ContributionCreate(ContributionBase):
    """Пополнение/снятие со цели"""
    source: ContributionSource = ContributionSource.manual


# ============================================
# UPDATE SCHEMAS
# ============================================

class GoalUpdate(BaseModel):
    """Обновление цели"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    icon: Optional[str] = Field(None, max_length=10)
    color: Optional[str] = Field(None, max_length=7)
    deadline: Optional[date] = None
    is_active: Optional[bool] = None
    auto_contribute: Optional[bool] = None
    auto_contribute_percent: Optional[float] = Field(None, ge=0, le=100)


# ============================================
# RESPONSE SCHEMAS
# ============================================

class ContributionResponse(BaseModel):
    id: int
    goal_id: int
    amount: float
    type: str
    note: Optional[str]
    source: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class GoalResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    target_amount: float
    current_amount: float
    currency: str
    icon: str
    color: str
    deadline: Optional[date]
    is_completed: bool
    completed_at: Optional[datetime]
    is_active: bool
    auto_contribute: bool
    auto_contribute_percent: Optional[float]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Computed fields
    progress_percent: float = 0
    remaining_amount: float = 0
    days_left: Optional[int] = None
    monthly_target: Optional[float] = None
    
    class Config:
        from_attributes = True


class GoalWithContributions(GoalResponse):
    """Цель с историей пополнений"""
    contributions: List[ContributionResponse] = []
    total_deposits: float = 0
    total_withdrawals: float = 0


class GoalListResponse(BaseModel):
    """Список целей"""
    items: List[GoalResponse]
    total: int
    active_count: int
    completed_count: int
    total_saved: float
    total_target: float


class GoalStatsResponse(BaseModel):
    """Статистика по целям"""
    total_goals: int
    active_goals: int
    completed_goals: int
    total_saved: float
    total_target: float
    overall_progress: float
    nearest_goal: Optional[GoalResponse] = None
    most_funded: Optional[GoalResponse] = None


# ============================================
# QUICK ACTIONS
# ============================================

class QuickDeposit(BaseModel):
    """Быстрое пополнение"""
    goal_id: int
    amount: float = Field(..., gt=0)
    note: Optional[str] = None


class QuickDepositResponse(BaseModel):
    """Ответ на быстрое пополнение"""
    success: bool
    goal: GoalResponse
    contribution: ContributionResponse
    new_balance: float
    progress_percent: float
    is_completed: bool
    xp_earned: int = 0
    message: str


# ============================================
# AI INTEGRATION
# ============================================

class AIGoalSuggestion(BaseModel):
    """AI подсказка по цели"""
    name: str
    target_amount: float
    monthly_contribution: float
    months_to_goal: int
    icon: str
    color: str
    reason: str


class AIGoalAnalysis(BaseModel):
    """AI анализ целей"""
    total_monthly_capacity: float  # Сколько можно откладывать в месяц
    recommended_distribution: List[dict]  # Рекомендуемое распределение
    achievable_goals: List[str]  # Достижимые цели
    at_risk_goals: List[str]  # Цели под риском
    tips: List[str]  # Советы
