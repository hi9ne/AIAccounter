"""
Pydantic schemas for Exchange Rates
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date as date_type, datetime


class ExchangeRateCreate(BaseModel):
    """Создание нового курса валюты"""
    from_currency: str = Field(..., min_length=3, max_length=3, description="Базовая валюта (USD, EUR, ...)")
    to_currency: str = Field(..., min_length=3, max_length=3, description="Целевая валюта")
    rate: float = Field(..., gt=0, description="Курс конвертации")
    date: date_type = Field(..., description="Дата курса")


class ExchangeRateSchema(BaseModel):
    """Информация о курсе валюты"""
    id: int
    from_currency: str
    to_currency: str
    rate: float
    date: date_type
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversionRequest(BaseModel):
    """Запрос на конвертацию валюты"""
    from_currency: str = Field(..., min_length=3, max_length=3, description="Из валюты")
    to_currency: str = Field(..., min_length=3, max_length=3, description="В валюту")
    amount: float = Field(..., gt=0, description="Сумма для конвертации")


class ConversionResponse(BaseModel):
    """Результат конвертации"""
    from_currency: str
    to_currency: str
    amount: float
    converted_amount: float
    rate: float
    date: date_type
