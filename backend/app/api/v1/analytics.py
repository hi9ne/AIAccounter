"""
Analytics API endpoints
Статистика, графики и аналитика
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Dict, Any
from datetime import date, datetime, timedelta

from app.database import get_db
from app.models.models import User
from app.schemas.analytics import (
    IncomeExpenseStatsSchema,
    TopCategorySchema,
    ChartDataResponse,
    SpendingPatternSchema,
    BalanceTrendSchema
)
from app.utils.auth import get_current_user
from app.services.cache import cache_service

router = APIRouter()


@router.get("/stats", response_model=IncomeExpenseStatsSchema)
async def get_income_expense_statistics(
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить базовую статистику доходов и расходов
    """
    # Проверяем кэш
    cache_key = cache_service.make_key("stats", current_user.user_id, str(start_date), str(end_date))
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    # Direct SQL query with proper aggregation and currency conversion
    query = text("""
        WITH latest_rates AS (
            SELECT DISTINCT ON (from_currency, to_currency) 
                from_currency, to_currency, rate
            FROM exchange_rates 
            ORDER BY from_currency, to_currency, date DESC
        )
        SELECT 
            COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN i.currency = 'KGS' THEN i.amount
                        ELSE i.amount * COALESCE(
                            (SELECT rate FROM latest_rates WHERE from_currency = i.currency AND to_currency = 'KGS'),
                            1
                        )
                    END
                )
                FROM income i
                WHERE i.user_id = :user_id 
                AND i.date >= :start_date 
                AND i.date <= :end_date 
                AND i.deleted_at IS NULL
            ), 0) as total_income,
            COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN e.currency = 'KGS' THEN e.amount
                        ELSE e.amount * COALESCE(
                            (SELECT rate FROM latest_rates WHERE from_currency = e.currency AND to_currency = 'KGS'),
                            1
                        )
                    END
                )
                FROM expenses e
                WHERE e.user_id = :user_id 
                AND e.date >= :start_date 
                AND e.date <= :end_date 
                AND e.deleted_at IS NULL
            ), 0) as total_expense,
            (SELECT COUNT(*) FROM income 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL) as income_count,
            (SELECT COUNT(*) FROM expenses 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL) as expense_count
    """)
    
    result = await db.execute(query, {
        "user_id": current_user.user_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    stats = result.fetchone()
    
    if not stats:
        return {
            "total_income": 0,
            "total_expense": 0,
            "balance": 0,
            "currency": "KGS",
            "income_count": 0,
            "expense_count": 0
        }
    
    total_income = float(stats[0])
    total_expense = float(stats[1])
    
    result_data = {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
        "currency": "KGS",
        "income_count": int(stats[2]),
        "expense_count": int(stats[3])
    }
    
    # Сохраняем в кэш (TTL: 5 минут)
    await cache_service.set(cache_key, result_data, ttl=300)
    
    return result_data


@router.get("/categories/top", response_model=list[TopCategorySchema])
async def get_top_expense_categories(
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    limit: int = Query(10, ge=1, le=50, description="Количество категорий"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить топ категорий расходов
    """
    # Проверяем кэш
    cache_key = cache_service.make_key("top_categories", current_user.user_id, str(start_date), str(end_date), limit)
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    query = text("""
        WITH latest_rates AS (
            SELECT DISTINCT ON (from_currency, to_currency) 
                from_currency, to_currency, rate
            FROM exchange_rates 
            ORDER BY from_currency, to_currency, date DESC
        ),
        converted_expenses AS (
            SELECT 
                category,
                CASE 
                    WHEN currency = 'KGS' THEN amount
                    ELSE amount * COALESCE(
                        (SELECT rate FROM latest_rates WHERE from_currency = e.currency AND to_currency = 'KGS'),
                        1
                    )
                END as amount_kgs
            FROM expenses e
            WHERE user_id = :user_id
                AND date >= :start_date
                AND date <= :end_date
                AND deleted_at IS NULL
        ),
        total AS (
            SELECT COALESCE(SUM(amount_kgs), 0) as total_amount
            FROM converted_expenses
        )
        SELECT 
            ce.category,
            SUM(ce.amount_kgs) as total_amount,
            COUNT(*) as transaction_count,
            CASE WHEN t.total_amount > 0 
                THEN (SUM(ce.amount_kgs) / t.total_amount * 100)
                ELSE 0 
            END as percentage
        FROM converted_expenses ce, total t
        GROUP BY ce.category, t.total_amount
        ORDER BY total_amount DESC
        LIMIT :limit
    """)
    
    result = await db.execute(query, {
        "user_id": current_user.user_id,
        "start_date": start_date,
        "end_date": end_date,
        "limit": limit
    })
    
    categories = result.fetchall()
    
    result_data = [
        {
            "category": cat[0],
            "total_amount": float(cat[1]),
            "currency": "KGS",
            "transaction_count": int(cat[2]),
            "percentage": float(cat[3])
        }
        for cat in categories
    ]
    
    # Сохраняем в кэш (TTL: 5 минут)
    await cache_service.set(cache_key, result_data, ttl=300)
    
    return result_data


@router.get("/chart/balance-trend", response_model=list[BalanceTrendSchema])
async def get_balance_trend(
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить тренд баланса по дням (с конвертацией валют)
    """
    query = text("""
        WITH latest_rates AS (
            SELECT DISTINCT ON (from_currency, to_currency) 
                from_currency, to_currency, rate
            FROM exchange_rates 
            ORDER BY from_currency, to_currency, date DESC
        )
        SELECT 
            COALESCE(i.date, e.date) as date,
            COALESCE(i.amount, 0) - COALESCE(e.amount, 0) as balance,
            COALESCE(i.amount, 0) as income,
            COALESCE(e.amount, 0) as expense
        FROM (
            SELECT date, SUM(
                CASE 
                    WHEN currency = 'KGS' THEN amount
                    ELSE amount * COALESCE(
                        (SELECT rate FROM latest_rates WHERE from_currency = inc.currency AND to_currency = 'KGS'),
                        1
                    )
                END
            ) as amount
            FROM income inc
            WHERE user_id = :user_id
                AND date >= :start_date
                AND date <= :end_date
                AND deleted_at IS NULL
            GROUP BY date
        ) i
        FULL OUTER JOIN (
            SELECT date, SUM(
                CASE 
                    WHEN currency = 'KGS' THEN amount
                    ELSE amount * COALESCE(
                        (SELECT rate FROM latest_rates WHERE from_currency = exp.currency AND to_currency = 'KGS'),
                        1
                    )
                END
            ) as amount
            FROM expenses exp
            WHERE user_id = :user_id
                AND date >= :start_date
                AND date <= :end_date
                AND deleted_at IS NULL
            GROUP BY date
        ) e ON i.date = e.date
        ORDER BY COALESCE(i.date, e.date)
    """)
    
    result = await db.execute(query, {
        "user_id": current_user.user_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    trend = result.fetchall()
    
    return [
        {
            "date": str(t[0]),
            "balance": float(t[1]),
            "income": float(t[2]),
            "expense": float(t[3])
        }
        for t in trend
    ]


@router.get("/chart/income-expense", response_model=ChartDataResponse)
async def get_income_expense_chart(
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    group_by: str = Query("day", description="Группировка: day, week, month"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить данные для графика доходов/расходов (с конвертацией валют)
    """
    query = text("""
        WITH latest_rates AS (
            SELECT DISTINCT ON (from_currency, to_currency) 
                from_currency, to_currency, rate
            FROM exchange_rates 
            ORDER BY from_currency, to_currency, date DESC
        )
        SELECT 
            COALESCE(i.date, e.date) as date,
            COALESCE(i.amount, 0) as income,
            COALESCE(e.amount, 0) as expense
        FROM (
            SELECT date, SUM(
                CASE 
                    WHEN currency = 'KGS' THEN amount
                    ELSE amount * COALESCE(
                        (SELECT rate FROM latest_rates WHERE from_currency = inc.currency AND to_currency = 'KGS'),
                        1
                    )
                END
            ) as amount
            FROM income inc
            WHERE user_id = :user_id
                AND date >= :start_date
                AND date <= :end_date
                AND deleted_at IS NULL
            GROUP BY date
        ) i
        FULL OUTER JOIN (
            SELECT date, SUM(
                CASE 
                    WHEN currency = 'KGS' THEN amount
                    ELSE amount * COALESCE(
                        (SELECT rate FROM latest_rates WHERE from_currency = exp.currency AND to_currency = 'KGS'),
                        1
                    )
                END
            ) as amount
            FROM expenses exp
            WHERE user_id = :user_id
                AND date >= :start_date
                AND date <= :end_date
                AND deleted_at IS NULL
            GROUP BY date
        ) e ON i.date = e.date
        ORDER BY COALESCE(i.date, e.date)
    """)
    
    result = await db.execute(query, {
        "user_id": current_user.user_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    data = result.fetchall()
    
    return {
        "labels": [str(d[0]) for d in data],
        "income": [float(d[1]) for d in data],
        "expense": [float(d[2]) for d in data]
    }


@router.get("/chart/category-pie", response_model=Dict[str, float])
async def get_category_pie_chart(
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    transaction_type: str = Query("expense", description="Тип транзакций: income или expense"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить данные для круговой диаграммы по категориям (с конвертацией валют)
    """
    table_name = "expenses" if transaction_type == "expense" else "income"
    query = text(f"""
        WITH latest_rates AS (
            SELECT DISTINCT ON (from_currency, to_currency) 
                from_currency, to_currency, rate
            FROM exchange_rates 
            ORDER BY from_currency, to_currency, date DESC
        )
        SELECT category, SUM(
            CASE 
                WHEN currency = 'KGS' THEN amount
                ELSE amount * COALESCE(
                    (SELECT rate FROM latest_rates WHERE from_currency = t.currency AND to_currency = 'KGS'),
                    1
                )
            END
        ) as total
        FROM {table_name} t
        WHERE user_id = :user_id
            AND date >= :start_date
            AND date <= :end_date
            AND deleted_at IS NULL
        GROUP BY category
        ORDER BY total DESC
    """)
    
    result = await db.execute(query, {
        "user_id": current_user.user_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    data = result.fetchall()
    
    return {cat[0]: float(cat[1]) for cat in data}


@router.get("/patterns", response_model=list[SpendingPatternSchema])
async def get_spending_patterns(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить паттерны трат (регулярные платежи, подписки и т.д.)
    """
    # Simple pattern detection - find recurring expenses (same category, similar amounts)
    query = text("""
        SELECT 
            'recurring' as pattern_type,
            category as pattern_name,
            'Регулярный платеж' as description,
            'monthly' as frequency,
            AVG(amount) as avg_amount,
            category,
            0.8 as confidence_score
        FROM expenses
        WHERE user_id = :user_id
            AND deleted_at IS NULL
            AND date >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY category
        HAVING COUNT(*) >= 3
        ORDER BY AVG(amount) DESC
        LIMIT 10
    """)
    
    result = await db.execute(query, {"user_id": current_user.user_id})
    patterns = result.fetchall()
    
    return [
        {
            "pattern_type": p[0],
            "pattern_name": p[1],
            "description": p[2],
            "frequency": p[3],
            "avg_amount": float(p[4]),
            "category": p[5],
            "confidence_score": float(p[6])
        }
        for p in patterns
    ]


@router.get("/overview-old", response_model=Dict[str, Any])
async def get_dashboard_data_old(
    period: str = Query("month", description="Период: week, month, year"),
    start_date: Optional[date] = Query(None, description="Начальная дата"),
    end_date: Optional[date] = Query(None, description="Конечная дата"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить все данные для дашборда одним запросом
    """
    # Определяем даты на основе периода или используем переданные
    if not end_date:
        end_date = date.today()
    
    if not start_date:
        if period == "week":
            start_date = end_date - timedelta(days=7)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
    
    # Базовая статистика - прямой SQL с подзапросами
    stats_query = text("""
        SELECT 
            COALESCE((SELECT SUM(amount) FROM income 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as total_income,
            COALESCE((SELECT SUM(amount) FROM expenses 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as total_expense,
            COALESCE((SELECT SUM(amount) FROM income 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) - 
            COALESCE((SELECT SUM(amount) FROM expenses 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as balance,
            (SELECT COUNT(*) FROM income 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL) as income_count,
            (SELECT COUNT(*) FROM expenses 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL) as expense_count
    """)
    stats_result = await db.execute(stats_query, {
        "user_id": current_user.user_id,
        "start_date": start_date,
        "end_date": end_date
    })
    stats = stats_result.fetchone()
    
    # Топ категории расходов
    top_cat_query = text("""
        SELECT 
            e.category,
            SUM(e.amount) as total,
            COUNT(*) as count
        FROM expenses e
        WHERE e.user_id = :user_id
            AND e.date >= :start_date
            AND e.date <= :end_date
            AND e.deleted_at IS NULL
        GROUP BY e.category
        ORDER BY total DESC
        LIMIT 5
    """)
    top_cat_result = await db.execute(top_cat_query, {
        "user_id": current_user.user_id,
        "start_date": start_date,
        "end_date": end_date
    })
    top_categories = top_cat_result.fetchall()
    
    # Формируем ответ
    return {
        "stats": {
            "total_income": float(stats[0]) if stats else 0,
            "total_expense": float(stats[1]) if stats else 0,
            "balance": float(stats[2]) if stats else 0,
            "income_count": int(stats[3]) if stats else 0,
            "expense_count": int(stats[4]) if stats else 0
        },
        "top_categories": [
            {
                "category": cat[0],
                "total": float(cat[1]),
                "count": int(cat[2])
            }
            for cat in top_categories
        ],
        "period": {
            "start_date": str(start_date),
            "end_date": str(end_date),
            "period_type": period
        }
    }


@router.get("/compare-periods")
async def compare_periods(
    period1_start: date = Query(..., description="Начало первого периода"),
    period1_end: date = Query(..., description="Конец первого периода"),
    period2_start: date = Query(..., description="Начало второго периода"),
    period2_end: date = Query(..., description="Конец второго периода"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Сравнить два периода
    """
    query = text("""
        SELECT 
            COALESCE((SELECT SUM(amount) FROM income 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as total_income,
            COALESCE((SELECT SUM(amount) FROM expenses 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as total_expense,
            COALESCE((SELECT SUM(amount) FROM income 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) - 
            COALESCE((SELECT SUM(amount) FROM expenses 
                WHERE user_id = :user_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as balance
    """)
    
    # Период 1
    result1 = await db.execute(query, {
        "user_id": current_user.user_id,
        "start_date": period1_start,
        "end_date": period1_end
    })
    stats1 = result1.fetchone()
    
    # Период 2
    result2 = await db.execute(query, {
        "user_id": current_user.user_id,
        "start_date": period2_start,
        "end_date": period2_end
    })
    stats2 = result2.fetchone()
    
    if not stats1 or not stats2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data for comparison"
        )
    
    return {
        "period1": {
            "start": str(period1_start),
            "end": str(period1_end),
            "income": float(stats1[0]),
            "expense": float(stats1[1]),
            "balance": float(stats1[2])
        },
        "period2": {
            "start": str(period2_start),
            "end": str(period2_end),
            "income": float(stats2[0]),
            "expense": float(stats2[1]),
            "balance": float(stats2[2])
        },
        "changes": {
            "income_change": float(stats2[0] - stats1[0]),
            "expense_change": float(stats2[1] - stats1[1]),
            "balance_change": float(stats2[2] - stats1[2]),
            "income_change_percent": round(((stats2[0] - stats1[0]) / stats1[0] * 100) if stats1[0] > 0 else 0, 2),
            "expense_change_percent": round(((stats2[1] - stats1[1]) / stats1[1] * 100) if stats1[1] > 0 else 0, 2)
        }
    }


@router.get("/dashboard")
async def get_dashboard_data(
    period: str = Query("month", description="Период: day, week, month, quarter, year"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    🚀 ОПТИМИЗИРОВАННЫЙ эндпоинт - все данные для главного экрана
    
    Использует asyncio.gather() для параллельного выполнения независимых запросов
    """
    import asyncio
    from zoneinfo import ZoneInfo
    from app.models.models import Expense, Income, ExchangeRate
    from sqlalchemy import select, func, and_, desc
    
    # Определяем даты на основе периода (в timezone пользователя)
    user_tz = ZoneInfo("Asia/Bishkek")
    today = datetime.now(user_tz).date()
    
    if period == "day":
        start_date = today
    elif period == "week":
        start_date = today - timedelta(days=7)
    elif period == "month":
        start_date = today - timedelta(days=30)
    elif period == "quarter":
        start_date = today - timedelta(days=90)
    elif period == "year":
        start_date = today - timedelta(days=365)
    else:
        start_date = today - timedelta(days=30)  # default: month
    
    week_ago = today - timedelta(days=7)
    
    try:
        # Создаём все запросы с конвертацией валют в KGS
        stats_query = text("""
            WITH latest_rates AS (
                SELECT DISTINCT ON (from_currency, to_currency) 
                    from_currency, to_currency, rate
                FROM exchange_rates 
                ORDER BY from_currency, to_currency, date DESC
            )
            SELECT 
                COALESCE((
                    SELECT SUM(
                        CASE 
                            WHEN i.currency = 'KGS' THEN i.amount
                            ELSE i.amount * COALESCE(
                                (SELECT rate FROM latest_rates WHERE from_currency = i.currency AND to_currency = 'KGS'),
                                1
                            )
                        END
                    )
                    FROM income i
                    WHERE i.user_id = :user_id 
                    AND i.date >= :start_date 
                    AND i.date <= :end_date 
                    AND i.deleted_at IS NULL
                ), 0) as total_income,
                COALESCE((
                    SELECT SUM(
                        CASE 
                            WHEN e.currency = 'KGS' THEN e.amount
                            ELSE e.amount * COALESCE(
                                (SELECT rate FROM latest_rates WHERE from_currency = e.currency AND to_currency = 'KGS'),
                                1
                            )
                        END
                    )
                    FROM expenses e
                    WHERE e.user_id = :user_id 
                    AND e.date >= :start_date 
                    AND e.date <= :end_date 
                    AND e.deleted_at IS NULL
                ), 0) as total_expense,
                (SELECT COUNT(*) FROM income 
                    WHERE user_id = :user_id 
                    AND date >= :start_date 
                    AND date <= :end_date 
                    AND deleted_at IS NULL) as income_count,
                (SELECT COUNT(*) FROM expenses 
                    WHERE user_id = :user_id 
                    AND date >= :start_date 
                    AND date <= :end_date 
                    AND deleted_at IS NULL) as expense_count
        """)
        
        recent_expenses_query = select(Expense).where(
            and_(
                Expense.user_id == current_user.user_id,
                Expense.deleted_at.is_(None),
                Expense.date >= week_ago,
                Expense.date <= today
            )
        ).order_by(desc(Expense.date), desc(Expense.created_at)).limit(5)
        
        recent_income_query = select(Income).where(
            and_(
                Income.user_id == current_user.user_id,
                Income.deleted_at.is_(None),
                Income.date >= week_ago,
                Income.date <= today
            )
        ).order_by(desc(Income.date), desc(Income.created_at)).limit(3)
        
        rates_subquery = (
            select(
                ExchangeRate.from_currency,
                ExchangeRate.to_currency,
                func.max(ExchangeRate.date).label("max_date")
            )
            .group_by(ExchangeRate.from_currency, ExchangeRate.to_currency)
            .subquery()
        )
        
        rates_query = (
            select(ExchangeRate)
            .join(
                rates_subquery,
                and_(
                    ExchangeRate.from_currency == rates_subquery.c.from_currency,
                    ExchangeRate.to_currency == rates_subquery.c.to_currency,
                    ExchangeRate.date == rates_subquery.c.max_date
                )
            )
            .order_by(ExchangeRate.from_currency, ExchangeRate.to_currency)
        )
        
        # Выполняем все запросы ПАРАЛЛЕЛЬНО
        stats_result, expenses_result, income_result, rates_result = await asyncio.gather(
            db.execute(stats_query, {"user_id": current_user.user_id, "start_date": start_date, "end_date": today}),
            db.execute(recent_expenses_query),
            db.execute(recent_income_query),
            db.execute(rates_query)
        )
        
        # 4. Обрабатываем результаты
        stats = stats_result.fetchone()
        recent_expenses = expenses_result.scalars().all()
        recent_income = income_result.scalars().all()
        exchange_rates = rates_result.scalars().all()
        
        total_income = float(stats[0]) if stats else 0
        total_expense = float(stats[1]) if stats else 0
        balance = total_income - total_expense
        
        # Формируем ответ
        return {
            "balance": {
                "total_income": total_income,
                "total_expense": total_expense,
                "balance": balance,
                "currency": "KGS",  # Все суммы конвертированы в KGS
                "income_count": int(stats[2]) if stats else 0,
                "expense_count": int(stats[3]) if stats else 0,
                "period": {
                    "start": str(start_date),
                    "end": str(today)
                }
            },
            "recent_transactions": {
                "expenses": [
                    {
                        "id": e.id,
                        "amount": float(e.amount),
                        "currency": e.currency,
                        "category": e.category,
                        "description": e.description,
                        "date": str(e.date),
                        "created_at": e.created_at.isoformat() if e.created_at else None
                    }
                    for e in recent_expenses
                ],
                "income": [
                    {
                        "id": i.id,
                        "amount": float(i.amount),
                        "currency": i.currency,
                        "category": i.category,
                        "description": i.description,
                        "date": str(i.date),
                        "created_at": i.created_at.isoformat() if i.created_at else None
                    }
                    for i in recent_income
                ]
            },
            "exchange_rates": [
                {
                    "from_currency": rate.from_currency,
                    "to_currency": rate.to_currency,
                    "rate": float(rate.rate),
                    "date": str(rate.date)
                }
                for rate in exchange_rates
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard data: {str(e)}"
        )


@router.get("/trends")
async def get_spending_trends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить тренды: сравнение текущего месяца с прошлым,
    динамика по неделям, изменения по категориям
    """
    today = date.today()
    
    # Текущий месяц
    current_month_start = today.replace(day=1)
    current_month_end = today
    
    # Прошлый месяц
    last_month_end = current_month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    
    # Количество дней в текущем месяце (для корректного сравнения)
    days_in_current = (today - current_month_start).days + 1
    
    try:
        # Запрос сравнения месяцев
        comparison_query = text("""
            WITH latest_rates AS (
                SELECT DISTINCT ON (from_currency, to_currency) 
                    from_currency, to_currency, rate
                FROM exchange_rates 
                ORDER BY from_currency, to_currency, date DESC
            ),
            current_month AS (
                SELECT 
                    COALESCE(SUM(
                        CASE 
                            WHEN currency = 'KGS' THEN amount
                            ELSE amount * COALESCE(
                                (SELECT rate FROM latest_rates WHERE from_currency = e.currency AND to_currency = 'KGS'), 1
                            )
                        END
                    ), 0) as total,
                    COUNT(*) as count
                FROM expenses e
                WHERE user_id = :user_id 
                AND date >= :current_start AND date <= :current_end
                AND deleted_at IS NULL
            ),
            last_month AS (
                SELECT 
                    COALESCE(SUM(
                        CASE 
                            WHEN currency = 'KGS' THEN amount
                            ELSE amount * COALESCE(
                                (SELECT rate FROM latest_rates WHERE from_currency = e.currency AND to_currency = 'KGS'), 1
                            )
                        END
                    ), 0) as total,
                    COUNT(*) as count
                FROM expenses e
                WHERE user_id = :user_id 
                AND date >= :last_start AND date <= :last_end
                AND deleted_at IS NULL
            ),
            current_income AS (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN currency = 'KGS' THEN amount
                        ELSE amount * COALESCE(
                            (SELECT rate FROM latest_rates WHERE from_currency = i.currency AND to_currency = 'KGS'), 1
                        )
                    END
                ), 0) as total
                FROM income i
                WHERE user_id = :user_id 
                AND date >= :current_start AND date <= :current_end
                AND deleted_at IS NULL
            ),
            last_income AS (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN currency = 'KGS' THEN amount
                        ELSE amount * COALESCE(
                            (SELECT rate FROM latest_rates WHERE from_currency = i.currency AND to_currency = 'KGS'), 1
                        )
                    END
                ), 0) as total
                FROM income i
                WHERE user_id = :user_id 
                AND date >= :last_start AND date <= :last_end
                AND deleted_at IS NULL
            )
            SELECT 
                (SELECT total FROM current_month) as current_expenses,
                (SELECT count FROM current_month) as current_count,
                (SELECT total FROM last_month) as last_expenses,
                (SELECT count FROM last_month) as last_count,
                (SELECT total FROM current_income) as current_income,
                (SELECT total FROM last_income) as last_income
        """)
        
        result = await db.execute(comparison_query, {
            "user_id": current_user.user_id,
            "current_start": current_month_start,
            "current_end": current_month_end,
            "last_start": last_month_start,
            "last_end": last_month_end
        })
        comparison = result.fetchone()
        
        current_expenses = float(comparison[0] or 0)
        current_count = int(comparison[1] or 0)
        last_expenses = float(comparison[2] or 0)
        last_count = int(comparison[3] or 0)
        current_income = float(comparison[4] or 0)
        last_income = float(comparison[5] or 0)
        
        # Расчёт изменений в процентах
        expense_change = ((current_expenses - last_expenses) / last_expenses * 100) if last_expenses > 0 else 0
        income_change = ((current_income - last_income) / last_income * 100) if last_income > 0 else 0
        
        # Средние траты в день
        avg_daily_current = current_expenses / days_in_current if days_in_current > 0 else 0
        days_in_last = (last_month_end - last_month_start).days + 1
        avg_daily_last = last_expenses / days_in_last if days_in_last > 0 else 0
        
        # Прогноз на конец месяца
        days_left = (current_month_start.replace(month=current_month_start.month % 12 + 1, day=1) - timedelta(days=1) - today).days
        projected_total = current_expenses + (avg_daily_current * days_left)
        
        # Сравнение по категориям (топ-5 с изменениями)
        category_comparison_query = text("""
            WITH latest_rates AS (
                SELECT DISTINCT ON (from_currency, to_currency) 
                    from_currency, to_currency, rate
                FROM exchange_rates 
                ORDER BY from_currency, to_currency, date DESC
            ),
            current_cats AS (
                SELECT category,
                    SUM(CASE 
                        WHEN currency = 'KGS' THEN amount
                        ELSE amount * COALESCE(
                            (SELECT rate FROM latest_rates WHERE from_currency = e.currency AND to_currency = 'KGS'), 1
                        )
                    END) as total
                FROM expenses e
                WHERE user_id = :user_id 
                AND date >= :current_start AND date <= :current_end
                AND deleted_at IS NULL
                GROUP BY category
            ),
            last_cats AS (
                SELECT category,
                    SUM(CASE 
                        WHEN currency = 'KGS' THEN amount
                        ELSE amount * COALESCE(
                            (SELECT rate FROM latest_rates WHERE from_currency = e.currency AND to_currency = 'KGS'), 1
                        )
                    END) as total
                FROM expenses e
                WHERE user_id = :user_id 
                AND date >= :last_start AND date <= :last_end
                AND deleted_at IS NULL
                GROUP BY category
            )
            SELECT 
                COALESCE(c.category, l.category) as category,
                COALESCE(c.total, 0) as current_total,
                COALESCE(l.total, 0) as last_total
            FROM current_cats c
            FULL OUTER JOIN last_cats l ON c.category = l.category
            ORDER BY COALESCE(c.total, 0) DESC
            LIMIT 5
        """)
        
        cat_result = await db.execute(category_comparison_query, {
            "user_id": current_user.user_id,
            "current_start": current_month_start,
            "current_end": current_month_end,
            "last_start": last_month_start,
            "last_end": last_month_end
        })
        categories = cat_result.fetchall()
        
        category_trends = []
        for cat in categories:
            cat_name = cat[0] or "Без категории"
            current_total = float(cat[1] or 0)
            last_total = float(cat[2] or 0)
            change = ((current_total - last_total) / last_total * 100) if last_total > 0 else (100 if current_total > 0 else 0)
            category_trends.append({
                "category": cat_name,
                "current": current_total,
                "previous": last_total,
                "change_percent": round(change, 1),
                "trend": "up" if change > 5 else ("down" if change < -5 else "stable")
            })
        
        return {
            "period": {
                "current": {
                    "start": str(current_month_start),
                    "end": str(current_month_end),
                    "label": current_month_start.strftime("%B %Y")
                },
                "previous": {
                    "start": str(last_month_start),
                    "end": str(last_month_end),
                    "label": last_month_start.strftime("%B %Y")
                }
            },
            "expenses": {
                "current": current_expenses,
                "previous": last_expenses,
                "change_percent": round(expense_change, 1),
                "trend": "up" if expense_change > 5 else ("down" if expense_change < -5 else "stable"),
                "current_count": current_count,
                "previous_count": last_count
            },
            "income": {
                "current": current_income,
                "previous": last_income,
                "change_percent": round(income_change, 1),
                "trend": "up" if income_change > 5 else ("down" if income_change < -5 else "stable")
            },
            "daily_average": {
                "current": round(avg_daily_current, 0),
                "previous": round(avg_daily_last, 0)
            },
            "projection": {
                "estimated_total": round(projected_total, 0),
                "days_left": days_left
            },
            "category_trends": category_trends,
            "currency": "KGS"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trends: {str(e)}"
        )


@router.get("/patterns")
async def get_spending_patterns(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить паттерны трат: по дням недели, по времени суток
    """
    today = date.today()
    # Берём последние 3 месяца для анализа паттернов
    start_date = today - timedelta(days=90)
    
    try:
        # Средние траты по дням недели
        weekday_query = text("""
            WITH latest_rates AS (
                SELECT DISTINCT ON (from_currency, to_currency) 
                    from_currency, to_currency, rate
                FROM exchange_rates 
                ORDER BY from_currency, to_currency, date DESC
            )
            SELECT 
                EXTRACT(DOW FROM date) as day_of_week,
                AVG(CASE 
                    WHEN currency = 'KGS' THEN amount
                    ELSE amount * COALESCE(
                        (SELECT rate FROM latest_rates WHERE from_currency = e.currency AND to_currency = 'KGS'), 1
                    )
                END) as avg_amount,
                SUM(CASE 
                    WHEN currency = 'KGS' THEN amount
                    ELSE amount * COALESCE(
                        (SELECT rate FROM latest_rates WHERE from_currency = e.currency AND to_currency = 'KGS'), 1
                    )
                END) as total_amount,
                COUNT(*) as transaction_count
            FROM expenses e
            WHERE user_id = :user_id 
            AND date >= :start_date
            AND deleted_at IS NULL
            GROUP BY EXTRACT(DOW FROM date)
            ORDER BY day_of_week
        """)
        
        result = await db.execute(weekday_query, {
            "user_id": current_user.user_id,
            "start_date": start_date
        })
        weekday_data = result.fetchall()
        
        # Названия дней недели
        day_names = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
        day_names_short = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
        
        weekday_stats = []
        max_avg = 0
        max_day = 0
        
        for row in weekday_data:
            dow = int(row[0])
            avg = float(row[1] or 0)
            total = float(row[2] or 0)
            count = int(row[3] or 0)
            
            if avg > max_avg:
                max_avg = avg
                max_day = dow
            
            weekday_stats.append({
                "day_index": dow,
                "day_name": day_names[dow],
                "day_short": day_names_short[dow],
                "average": round(avg, 0),
                "total": round(total, 0),
                "count": count
            })
        
        # Заполняем пропущенные дни
        existing_days = {s["day_index"] for s in weekday_stats}
        for i in range(7):
            if i not in existing_days:
                weekday_stats.append({
                    "day_index": i,
                    "day_name": day_names[i],
                    "day_short": day_names_short[i],
                    "average": 0,
                    "total": 0,
                    "count": 0
                })
        
        # Сортируем по дню недели (Пн=1 первый)
        weekday_stats = sorted(weekday_stats, key=lambda x: (x["day_index"] + 6) % 7)
        
        # Топ дни с максимальными тратами за последний месяц
        top_days_query = text("""
            WITH latest_rates AS (
                SELECT DISTINCT ON (from_currency, to_currency) 
                    from_currency, to_currency, rate
                FROM exchange_rates 
                ORDER BY from_currency, to_currency, date DESC
            )
            SELECT 
                date,
                SUM(CASE 
                    WHEN currency = 'KGS' THEN amount
                    ELSE amount * COALESCE(
                        (SELECT rate FROM latest_rates WHERE from_currency = e.currency AND to_currency = 'KGS'), 1
                    )
                END) as total_amount,
                COUNT(*) as transaction_count
            FROM expenses e
            WHERE user_id = :user_id 
            AND date >= :start_date
            AND deleted_at IS NULL
            GROUP BY date
            ORDER BY total_amount DESC
            LIMIT 5
        """)
        
        top_result = await db.execute(top_days_query, {
            "user_id": current_user.user_id,
            "start_date": today - timedelta(days=30)
        })
        top_days = top_result.fetchall()
        
        peak_days = []
        for row in top_days:
            d = row[0]
            peak_days.append({
                "date": str(d),
                "day_name": day_names[d.weekday() + 1 if d.weekday() < 6 else 0],
                "total": round(float(row[1] or 0), 0),
                "count": int(row[2] or 0)
            })
        
        return {
            "period": {
                "start": str(start_date),
                "end": str(today),
                "days_analyzed": 90
            },
            "weekday_patterns": weekday_stats,
            "insights": {
                "most_expensive_day": day_names[max_day] if max_avg > 0 else None,
                "most_expensive_avg": round(max_avg, 0),
                "recommendation": f"Больше всего вы тратите в {day_names[max_day].lower()}. Попробуйте планировать крупные покупки на другие дни." if max_avg > 0 else None
            },
            "peak_days": peak_days,
            "currency": "KGS"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get patterns: {str(e)}"
        )
