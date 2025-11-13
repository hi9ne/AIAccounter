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
