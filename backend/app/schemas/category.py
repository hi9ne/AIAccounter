"""
Category Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern="^(expense|income)$")
    icon: Optional[str] = Field(default="📁", max_length=10)
    color: Optional[str] = Field(default="#6B7280", pattern="^#[0-9A-Fa-f]{6}$")


class CategoryCreate(CategoryBase):
    """Схема для создания категории"""
    pass


class CategoryUpdate(BaseModel):
    """Схема для обновления категории"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = Field(None, max_length=10)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class CategoryResponse(CategoryBase):
    """Схема ответа категории"""
    id: int
    user_id: Optional[int] = None
    is_default: bool
    is_active: bool
    sort_order: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CategoryListResponse(BaseModel):
    """Список категорий"""
    expense_categories: list[CategoryResponse]
    income_categories: list[CategoryResponse]
    total_expense: int
    total_income: int
