"""
Pydantic schemas for Exchange Rates
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from decimal import Decimal


class ExchangeRateCreate(BaseModel):
    """Создание нового курса валюты"""
    from_currency: str = Field(..., min_length=3, max_length=3, description="Базовая валюта (USD, EUR, ...)")
    to_currency: str = Field(..., min_length=3, max_length=3, description="Целевая валюта")
    rate: Decimal = Field(..., gt=0, description="Курс конвертации")
    rate_date: date = Field(..., description="Дата курса")
    source: Optional[str] = Field(None, max_length=100, description="Источник данных (например, 'NBKR', 'manual')")


class ExchangeRateSchema(BaseModel):
    """Информация о курсе валюты"""
    rate_id: int
    from_currency: str
    to_currency: str
    rate: Decimal
    rate_date: date
    source: Optional[str]
    created_at: Optional[date] = None

    class Config:
        from_attributes = True


class ConversionRequest(BaseModel):
    """Запрос на конвертацию валюты"""
    from_currency: str = Field(..., min_length=3, max_length=3, description="Из валюты")
    to_currency: str = Field(..., min_length=3, max_length=3, description="В валюту")
    amount: Decimal = Field(..., gt=0, description="Сумма для конвертации")


class ConversionResponse(BaseModel):
    """Результат конвертации"""
    from_currency: str
    to_currency: str
    amount: Decimal
    converted_amount: Decimal
    rate: Decimal
    rate_date: date
