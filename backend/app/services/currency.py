"""
Currency conversion service
Works with exchange_rates table updated by n8n workflow
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import date
from typing import Dict, Optional
import logging

from app.models.models import ExchangeRate

logger = logging.getLogger(__name__)


class CurrencyService:
    """Service for currency conversion using database rates"""
    
    @classmethod
    async def get_rate(
        cls,
        db: AsyncSession,
        from_currency: str,
        to_currency: str,
        rate_date: Optional[date] = None
    ) -> Optional[float]:
        """
        Get exchange rate from database
        
        Args:
            db: Database session
            from_currency: Source currency code
            to_currency: Target currency code
            rate_date: Specific date (default: latest)
            
        Returns:
            Exchange rate or None if not found
        """
        if from_currency == to_currency:
            return 1.0
        
        query = select(ExchangeRate).where(
            and_(
                ExchangeRate.from_currency == from_currency.upper(),
                ExchangeRate.to_currency == to_currency.upper()
            )
        )
        
        if rate_date:
            query = query.where(ExchangeRate.date == rate_date)
        
        query = query.order_by(desc(ExchangeRate.date)).limit(1)
        
        result = await db.execute(query)
        rate_obj = result.scalar_one_or_none()
        
        if rate_obj:
            logger.info(f"💱 Found rate {from_currency}/{to_currency}: {rate_obj.rate}")
            return float(rate_obj.rate)
        
        # Try reverse rate
        query_reverse = select(ExchangeRate).where(
            and_(
                ExchangeRate.from_currency == to_currency.upper(),
                ExchangeRate.to_currency == from_currency.upper()
            )
        )
        
        if rate_date:
            query_reverse = query_reverse.where(ExchangeRate.date == rate_date)
        
        query_reverse = query_reverse.order_by(desc(ExchangeRate.date)).limit(1)
        
        result_reverse = await db.execute(query_reverse)
        rate_obj_reverse = result_reverse.scalar_one_or_none()
        
        if rate_obj_reverse:
            reverse_rate = 1.0 / float(rate_obj_reverse.rate)
            logger.info(f"💱 Found reverse rate {from_currency}/{to_currency}: {reverse_rate}")
            return reverse_rate
        
        logger.warning(f"⚠️ No rate found for {from_currency}/{to_currency}")
        return None
    
    @classmethod
    async def convert(
        cls,
        db: AsyncSession,
        amount: float,
        from_currency: str,
        to_currency: str,
        rate_date: Optional[date] = None
    ) -> Optional[float]:
        """
        Convert amount from one currency to another
        
        Args:
            db: Database session
            amount: Amount to convert
            from_currency: Source currency code
            to_currency: Target currency code
            rate_date: Specific date (default: latest)
            
        Returns:
            Converted amount or None if rate not found
        """
        if from_currency == to_currency:
            return amount
        
        rate = await cls.get_rate(db, from_currency, to_currency, rate_date)
        
        if rate is None:
            logger.error(f"❌ Cannot convert: no rate for {from_currency}/{to_currency}")
            return None
        
        result = amount * rate
        logger.info(f"💱 Converted {amount} {from_currency} = {result:.2f} {to_currency}")
        return round(result, 2)
    
    @classmethod
    async def get_all_rates(
        cls,
        db: AsyncSession,
        from_currency: Optional[str] = None
    ) -> Dict[str, Dict[str, float]]:
        """
        Get all latest rates as nested dict
        
        Returns:
            Dict[from_currency][to_currency] = rate
        """
        # Get latest date for each currency pair
        query = select(ExchangeRate).order_by(desc(ExchangeRate.date))
        
        if from_currency:
            query = query.where(ExchangeRate.from_currency == from_currency.upper())
        
        result = await db.execute(query)
        rates_list = result.scalars().all()
        
        # Build nested dict
        rates_dict: Dict[str, Dict[str, float]] = {}
        seen_pairs = set()
        
        for rate_obj in rates_list:
            pair = (rate_obj.from_currency, rate_obj.to_currency)
            if pair not in seen_pairs:
                if rate_obj.from_currency not in rates_dict:
                    rates_dict[rate_obj.from_currency] = {}
                rates_dict[rate_obj.from_currency][rate_obj.to_currency] = float(rate_obj.rate)
                seen_pairs.add(pair)
        
        logger.info(f"✅ Loaded {len(seen_pairs)} exchange rates from database")
        return rates_dict
    
    @classmethod
    async def get_rates_for_pairs(
        cls,
        db: AsyncSession,
        pairs: list[tuple[str, str]],
        rate_date: Optional[date] = None
    ) -> Dict[tuple[str, str], float]:
        """
        Get rates for multiple currency pairs efficiently
        
        Args:
            db: Database session
            pairs: List of (from_currency, to_currency) tuples
            rate_date: Specific date (default: latest)
            
        Returns:
            Dict of (from, to) -> rate
        """
        if not pairs:
            return {}
        
        # Собираем уникальные валюты
        currencies = set()
        for from_curr, to_curr in pairs:
            currencies.add(from_curr.upper())
            currencies.add(to_curr.upper())
        
        # Получаем все нужные курсы одним запросом
        query = select(ExchangeRate).where(
            and_(
                ExchangeRate.from_currency.in_(currencies),
                ExchangeRate.to_currency.in_(currencies)
            )
        )
        
        if rate_date:
            query = query.where(ExchangeRate.date == rate_date)
        
        query = query.order_by(desc(ExchangeRate.date))
        
        result = await db.execute(query)
        rates_list = result.scalars().all()
        
        # Строим lookup словарь с учетом reverse rates
        rates_dict: Dict[tuple[str, str], float] = {}
        seen_pairs = set()
        
        for rate_obj in rates_list:
            pair = (rate_obj.from_currency, rate_obj.to_currency)
            if pair not in seen_pairs:
                rates_dict[pair] = float(rate_obj.rate)
                # Добавляем обратный курс
                reverse_pair = (rate_obj.to_currency, rate_obj.from_currency)
                rates_dict[reverse_pair] = 1.0 / float(rate_obj.rate)
                seen_pairs.add(pair)
        
        # Добавляем одинаковые валюты (rate = 1.0)
        for currency in currencies:
            rates_dict[(currency, currency)] = 1.0
        
        logger.info(f"✅ Loaded rates for {len(pairs)} pairs ({len(rates_dict)} total with reverse)")
        return rates_dict
    
    @classmethod
    async def convert_batch(
        cls,
        db: AsyncSession,
        conversions: list[tuple[float, str, str]],
        rate_date: Optional[date] = None
    ) -> list[Optional[float]]:
        """
        Convert multiple amounts efficiently with single DB query
        
        Args:
            db: Database session
            conversions: List of (amount, from_currency, to_currency) tuples
            rate_date: Specific date (default: latest)
            
        Returns:
            List of converted amounts (None if rate not found)
        """
        if not conversions:
            return []
        
        # Извлекаем уникальные пары валют
        pairs = list(set((from_curr, to_curr) for _, from_curr, to_curr in conversions))
        
        # Получаем все курсы одним запросом
        rates = await cls.get_rates_for_pairs(db, pairs, rate_date)
        
        # Конвертируем все суммы
        results = []
        for amount, from_curr, to_curr in conversions:
            pair = (from_curr.upper(), to_curr.upper())
            rate = rates.get(pair)
            
            if rate is not None:
                results.append(round(amount * rate, 2))
            else:
                logger.warning(f"⚠️ No rate for {from_curr}/{to_curr}")
                results.append(None)
        
        logger.info(f"💱 Batch converted {len(conversions)} amounts")
        return results
