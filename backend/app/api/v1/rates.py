"""
Exchange Rates API endpoints
Курсы валют и конвертация
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from typing import List, Optional
from datetime import date, datetime

from app.database import get_db
from app.models.models import User, ExchangeRate
from app.schemas.rate import ExchangeRateSchema, ExchangeRateCreate, ConversionRequest, ConversionResponse
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/latest", response_model=List[ExchangeRateSchema])
async def get_latest_rates(
    from_currency: Optional[str] = Query(None, description="Фильтр по базовой валюте"),
    to_currency: Optional[str] = Query(None, description="Фильтр по целевой валюте"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить актуальные курсы валют
    Возвращает последние курсы для каждой валютной пары
    """
    # Подзапрос для получения последней даты для каждой пары
    subquery = (
        select(
            ExchangeRate.from_currency,
            ExchangeRate.to_currency,
            desc(ExchangeRate.rate_date).label('max_date')
        )
        .group_by(ExchangeRate.from_currency, ExchangeRate.to_currency)
        .subquery()
    )
    
    # Основной запрос
    query = select(ExchangeRate).join(
        subquery,
        and_(
            ExchangeRate.from_currency == subquery.c.from_currency,
            ExchangeRate.to_currency == subquery.c.to_currency,
            ExchangeRate.rate_date == subquery.c.max_date
        )
    )
    
    # Применяем фильтры
    if from_currency:
        query = query.where(ExchangeRate.from_currency == from_currency.upper())
    if to_currency:
        query = query.where(ExchangeRate.to_currency == to_currency.upper())
    
    query = query.order_by(ExchangeRate.from_currency, ExchangeRate.to_currency)
    
    result = await db.execute(query)
    rates = result.scalars().all()
    
    return rates


@router.get("/history", response_model=List[ExchangeRateSchema])
async def get_rates_history(
    from_currency: str = Query(..., description="Базовая валюта"),
    to_currency: str = Query(..., description="Целевая валюта"),
    start_date: Optional[date] = Query(None, description="Начальная дата (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Конечная дата (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить историю курсов валют
    """
    query = select(ExchangeRate).where(
        and_(
            ExchangeRate.from_currency == from_currency.upper(),
            ExchangeRate.to_currency == to_currency.upper()
        )
    )
    
    if start_date:
        query = query.where(ExchangeRate.rate_date >= start_date)
    if end_date:
        query = query.where(ExchangeRate.rate_date <= end_date)
    
    query = query.order_by(desc(ExchangeRate.rate_date))
    
    result = await db.execute(query)
    rates = result.scalars().all()
    
    if not rates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No rates found for {from_currency}/{to_currency}"
        )
    
    return rates


@router.get("/{from_currency}/{to_currency}", response_model=ExchangeRateSchema)
async def get_rate(
    from_currency: str,
    to_currency: str,
    rate_date: Optional[date] = Query(None, description="Дата курса (по умолчанию - последний)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить курс для конкретной валютной пары
    """
    query = select(ExchangeRate).where(
        and_(
            ExchangeRate.from_currency == from_currency.upper(),
            ExchangeRate.to_currency == to_currency.upper()
        )
    )
    
    if rate_date:
        query = query.where(ExchangeRate.rate_date == rate_date)
    
    query = query.order_by(desc(ExchangeRate.rate_date)).limit(1)
    
    result = await db.execute(query)
    rate = result.scalar_one_or_none()
    
    if not rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rate not found for {from_currency}/{to_currency}"
        )
    
    return rate


@router.post("/convert", response_model=ConversionResponse)
async def convert_currency(
    conversion: ConversionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Конвертировать сумму из одной валюты в другую
    Использует последний доступный курс
    """
    # Если валюты совпадают
    if conversion.from_currency.upper() == conversion.to_currency.upper():
        return {
            "from_currency": conversion.from_currency.upper(),
            "to_currency": conversion.to_currency.upper(),
            "amount": conversion.amount,
            "converted_amount": conversion.amount,
            "rate": 1.0,
            "rate_date": datetime.now().date()
        }
    
    # Получаем курс
    query = select(ExchangeRate).where(
        and_(
            ExchangeRate.from_currency == conversion.from_currency.upper(),
            ExchangeRate.to_currency == conversion.to_currency.upper()
        )
    ).order_by(desc(ExchangeRate.rate_date)).limit(1)
    
    result = await db.execute(query)
    rate_obj = result.scalar_one_or_none()
    
    if not rate_obj:
        # Пробуем обратный курс
        query_reverse = select(ExchangeRate).where(
            and_(
                ExchangeRate.from_currency == conversion.to_currency.upper(),
                ExchangeRate.to_currency == conversion.from_currency.upper()
            )
        ).order_by(desc(ExchangeRate.rate_date)).limit(1)
        
        result_reverse = await db.execute(query_reverse)
        rate_obj_reverse = result_reverse.scalar_one_or_none()
        
        if not rate_obj_reverse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No rate found for {conversion.from_currency}/{conversion.to_currency}"
            )
        
        # Используем обратный курс
        rate = 1.0 / rate_obj_reverse.rate
        rate_date = rate_obj_reverse.rate_date
    else:
        rate = rate_obj.rate
        rate_date = rate_obj.rate_date
    
    converted_amount = round(conversion.amount * rate, 2)
    
    return {
        "from_currency": conversion.from_currency.upper(),
        "to_currency": conversion.to_currency.upper(),
        "amount": conversion.amount,
        "converted_amount": converted_amount,
        "rate": rate,
        "rate_date": rate_date
    }


@router.post("/", response_model=ExchangeRateSchema, status_code=status.HTTP_201_CREATED)
async def create_rate(
    rate_data: ExchangeRateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Добавить новый курс валют (для администраторов или автоматического обновления)
    """
    # Проверка на дубликат
    query = select(ExchangeRate).where(
        and_(
            ExchangeRate.from_currency == rate_data.from_currency.upper(),
            ExchangeRate.to_currency == rate_data.to_currency.upper(),
            ExchangeRate.rate_date == rate_data.rate_date
        )
    )
    
    result = await db.execute(query)
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rate for this date already exists"
        )
    
    rate = ExchangeRate(
        from_currency=rate_data.from_currency.upper(),
        to_currency=rate_data.to_currency.upper(),
        rate=rate_data.rate,
        rate_date=rate_data.rate_date,
        source=rate_data.source
    )
    
    db.add(rate)
    await db.commit()
    await db.refresh(rate)
    
    return rate


@router.get("/currencies/supported", response_model=List[str])
async def get_supported_currencies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить список поддерживаемых валют
    """
    # Получаем уникальные валюты из таблицы
    query = select(ExchangeRate.from_currency).distinct()
    result = await db.execute(query)
    currencies = [row[0] for row in result.fetchall()]
    
    # Добавляем стандартные валюты, если их нет
    standard_currencies = ["KGS", "USD", "EUR", "RUB", "KZT"]
    for currency in standard_currencies:
        if currency not in currencies:
            currencies.append(currency)
    
    return sorted(currencies)
