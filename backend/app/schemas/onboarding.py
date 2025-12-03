from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UsageType(str, Enum):
    PERSONAL = "personal"
    BUSINESS = "business"


class Currency(str, Enum):
    KGS = "KGS"
    USD = "USD"
    EUR = "EUR"
    RUB = "RUB"


# === Статус онбординга ===

class OnboardingStatus(BaseModel):
    """Статус онбординга пользователя"""
    completed: bool
    current_step: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    data: dict = {}


# === Шаги онбординга ===

class Step1Currency(BaseModel):
    """Шаг 1: Выбор валюты"""
    currency: Currency = Currency.KGS


class Step2UsageType(BaseModel):
    """Шаг 2: Тип использования"""
    usage_type: UsageType


class Step3Budget(BaseModel):
    """Шаг 3: Месячный бюджет"""
    monthly_budget: float = Field(ge=0)


class Step4Categories(BaseModel):
    """Шаг 4: Выбор категорий"""
    selected_categories: List[str]


class NotificationSettings(BaseModel):
    """Настройки уведомлений"""
    daily_summary: bool = False
    daily_summary_time: str = "21:00"
    weekly_report: bool = True
    monthly_report: bool = True
    budget_warning: bool = True
    budget_warning_threshold: int = 80
    large_expense: bool = True
    large_expense_threshold: int = 10
    debt_reminder: bool = True
    debt_reminder_days: int = 3
    recurring_reminder: bool = True
    recurring_reminder_days: int = 3


class Step5Notifications(BaseModel):
    """Шаг 5: Настройки уведомлений"""
    notifications: NotificationSettings


# === Категории ===

class CategoryTemplate(BaseModel):
    """Шаблон категории"""
    name: str
    type: str  # expense или income
    icon: str
    color: str
    code: str  # уникальный код для выбора


class CategoryTemplates(BaseModel):
    """Список шаблонов категорий для типа использования"""
    expense_categories: List[CategoryTemplate]
    income_categories: List[CategoryTemplate]


# === Ответы ===

class OnboardingStepResponse(BaseModel):
    """Ответ на сохранение шага"""
    success: bool
    step: int
    message: str
    next_step: Optional[int] = None


class OnboardingCompleteResponse(BaseModel):
    """Ответ на завершение онбординга"""
    success: bool
    message: str
    redirect: str = "/home"
