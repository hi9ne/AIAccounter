from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


# User Schemas
class UserBase(BaseModel):
    telegram_chat_id: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    language: str = "ru"
    timezone: str = "Asia/Bishkek"


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None


class User(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    user_id: int
    is_active: bool
    created_at: datetime
    last_activity: datetime


# Expense Schemas
class ExpenseBase(BaseModel):
    amount: float = Field(gt=0)
    currency: str = "KGS"
    category: str
    description: Optional[str] = None
    date: datetime


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None


class Expense(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]


# Income Schemas
class IncomeBase(BaseModel):
    amount: float = Field(gt=0)
    currency: str = "KGS"
    category: str
    description: Optional[str] = None
    date: datetime


class IncomeCreate(IncomeBase):
    pass


class IncomeUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None


class Income(IncomeBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]


# Budget Schemas
class BudgetBase(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")  # YYYY-MM format
    budget_amount: float = Field(gt=0)
    currency: str = "KGS"


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    budget_amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = None


class Budget(BudgetBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    created_at: datetime


# Response Schemas
class MessageResponse(BaseModel):
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    detail: str
    error: bool = True


# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class UserLogin(BaseModel):
    telegram_chat_id: str
    password: Optional[str] = None


class UserRegister(BaseModel):
    telegram_chat_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
