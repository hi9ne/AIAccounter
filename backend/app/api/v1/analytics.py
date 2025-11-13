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

router = APIRouter()


@router.get("/stats", response_model=IncomeExpenseStatsSchema)
async def get_income_expense_statistics(
    workspace_id: int = Query(..., description="ID workspace"),
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить базовую статистику доходов и расходов
    """
    # Direct SQL query with proper aggregation
    query = text("""
        SELECT 
            COALESCE((SELECT SUM(amount) FROM income 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as total_income,
            COALESCE((SELECT SUM(amount) FROM expenses 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as total_expense,
            COALESCE((SELECT SUM(amount) FROM income 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) - 
            COALESCE((SELECT SUM(amount) FROM expenses 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as balance,
            (SELECT COUNT(*) FROM income 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL) as income_count,
            (SELECT COUNT(*) FROM expenses 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL) as expense_count
    """)
    
    result = await db.execute(query, {
        "workspace_id": workspace_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    stats = result.fetchone()
    
    if not stats:
        return {
            "total_income": 0,
            "total_expense": 0,
            "balance": 0,
            "income_count": 0,
            "expense_count": 0
        }
    
    return {
        "total_income": float(stats[0]),
        "total_expense": float(stats[1]),
        "balance": float(stats[2]),
        "income_count": int(stats[3]),
        "expense_count": int(stats[4])
    }


@router.get("/categories/top", response_model=list[TopCategorySchema])
async def get_top_expense_categories(
    workspace_id: int = Query(..., description="ID workspace"),
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    limit: int = Query(10, ge=1, le=50, description="Количество категорий"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить топ категорий расходов
    """
    query = text("""
        WITH total AS (
            SELECT COALESCE(SUM(amount), 0) as total_amount
            FROM expenses
            WHERE workspace_id = :workspace_id
                AND date >= :start_date
                AND date <= :end_date
                AND deleted_at IS NULL
        )
        SELECT 
            e.category,
            SUM(e.amount) as total_amount,
            COUNT(*) as transaction_count,
            CASE WHEN t.total_amount > 0 
                THEN (SUM(e.amount) / t.total_amount * 100)
                ELSE 0 
            END as percentage
        FROM expenses e, total t
        WHERE e.workspace_id = :workspace_id
            AND e.date >= :start_date
            AND e.date <= :end_date
            AND e.deleted_at IS NULL
        GROUP BY e.category, t.total_amount
        ORDER BY total_amount DESC
        LIMIT :limit
    """)
    
    result = await db.execute(query, {
        "workspace_id": workspace_id,
        "start_date": start_date,
        "end_date": end_date,
        "limit": limit
    })
    
    categories = result.fetchall()
    
    return [
        {
            "category": cat[0],
            "total_amount": float(cat[1]),
            "transaction_count": int(cat[2]),
            "percentage": float(cat[3])
        }
        for cat in categories
    ]


@router.get("/chart/balance-trend", response_model=list[BalanceTrendSchema])
async def get_balance_trend(
    workspace_id: int = Query(..., description="ID workspace"),
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить тренд баланса по дням
    """
    # Check workspace access
    query_check = text("""
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :user_id
        WHERE w.id = :workspace_id 
        AND (w.owner_id = :user_id OR wm.user_id = :user_id)
        LIMIT 1
    """)
    result_check = await db.execute(query_check, {"workspace_id": workspace_id, "user_id": current_user.user_id})
    if not result_check.fetchone():
        raise HTTPException(status_code=403, detail="You don't have access to this workspace")
    
    # Simple aggregation by day - без generate_series для совместимости
    query = text("""
        SELECT 
            COALESCE(i.date, e.date) as date,
            COALESCE(i.amount, 0) - COALESCE(e.amount, 0) as balance,
            COALESCE(i.amount, 0) as income,
            COALESCE(e.amount, 0) as expense
        FROM (
            SELECT date, SUM(amount) as amount
            FROM income
            WHERE workspace_id = :workspace_id
                AND date >= :start_date
                AND date <= :end_date
                AND deleted_at IS NULL
            GROUP BY date
        ) i
        FULL OUTER JOIN (
            SELECT date, SUM(amount) as amount
            FROM expenses
            WHERE workspace_id = :workspace_id
                AND date >= :start_date
                AND date <= :end_date
                AND deleted_at IS NULL
            GROUP BY date
        ) e ON i.date = e.date
        ORDER BY COALESCE(i.date, e.date)
    """)
    
    result = await db.execute(query, {
        "workspace_id": workspace_id,
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
    workspace_id: int = Query(..., description="ID workspace"),
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    group_by: str = Query("day", description="Группировка: day, week, month"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить данные для графика доходов/расходов
    """
    # Check workspace access
    query_check = text("""
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :user_id
        WHERE w.id = :workspace_id 
        AND (w.owner_id = :user_id OR wm.user_id = :user_id)
        LIMIT 1
    """)
    result_check = await db.execute(query_check, {"workspace_id": workspace_id, "user_id": current_user.user_id})
    if not result_check.fetchone():
        raise HTTPException(status_code=403, detail="You don't have access to this workspace")
    
    # Generate chart data without generate_series
    query = text("""
        SELECT 
            COALESCE(i.date, e.date) as date,
            COALESCE(i.amount, 0) as income,
            COALESCE(e.amount, 0) as expense
        FROM (
            SELECT date, SUM(amount) as amount
            FROM income
            WHERE workspace_id = :workspace_id
                AND date >= :start_date
                AND date <= :end_date
                AND deleted_at IS NULL
            GROUP BY date
        ) i
        FULL OUTER JOIN (
            SELECT date, SUM(amount) as amount
            FROM expenses
            WHERE workspace_id = :workspace_id
                AND date >= :start_date
                AND date <= :end_date
                AND deleted_at IS NULL
            GROUP BY date
        ) e ON i.date = e.date
        ORDER BY COALESCE(i.date, e.date)
    """)
    
    result = await db.execute(query, {
        "workspace_id": workspace_id,
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
    workspace_id: int = Query(..., description="ID workspace"),
    start_date: date = Query(..., description="Начальная дата"),
    end_date: date = Query(..., description="Конечная дата"),
    transaction_type: str = Query("expense", description="Тип транзакций: income или expense"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить данные для круговой диаграммы по категориям
    """
    # Check workspace access
    query_check = text("""
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :user_id
        WHERE w.id = :workspace_id 
        AND (w.owner_id = :user_id OR wm.user_id = :user_id)
        LIMIT 1
    """)
    result_check = await db.execute(query_check, {"workspace_id": workspace_id, "user_id": current_user.user_id})
    if not result_check.fetchone():
        raise HTTPException(status_code=403, detail="You don't have access to this workspace")
    
    # Get category breakdown
    table_name = "expenses" if transaction_type == "expense" else "income"
    query = text(f"""
        SELECT category, SUM(amount) as total
        FROM {table_name}
        WHERE workspace_id = :workspace_id
            AND date >= :start_date
            AND date <= :end_date
            AND deleted_at IS NULL
        GROUP BY category
        ORDER BY total DESC
    """)
    
    result = await db.execute(query, {
        "workspace_id": workspace_id,
        "start_date": start_date,
        "end_date": end_date
    })
    
    data = result.fetchall()
    
    return {cat[0]: float(cat[1]) for cat in data}


@router.get("/patterns", response_model=list[SpendingPatternSchema])
async def get_spending_patterns(
    workspace_id: int = Query(..., description="ID workspace"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить паттерны трат (регулярные платежи, подписки и т.д.)
    """
    # Check workspace access
    query_check = text("""
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :user_id
        WHERE w.id = :workspace_id 
        AND (w.owner_id = :user_id OR wm.user_id = :user_id)
        LIMIT 1
    """)
    result_check = await db.execute(query_check, {"workspace_id": workspace_id, "user_id": current_user.user_id})
    if not result_check.fetchone():
        raise HTTPException(status_code=403, detail="You don't have access to this workspace")
    
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
        WHERE workspace_id = :workspace_id
            AND deleted_at IS NULL
            AND date >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY category
        HAVING COUNT(*) >= 3
        ORDER BY AVG(amount) DESC
        LIMIT 10
    """)
    
    result = await db.execute(query, {"workspace_id": workspace_id})
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


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_data(
    workspace_id: int = Query(..., description="ID workspace"),
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
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as total_income,
            COALESCE((SELECT SUM(amount) FROM expenses 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as total_expense,
            COALESCE((SELECT SUM(amount) FROM income 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) - 
            COALESCE((SELECT SUM(amount) FROM expenses 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as balance,
            (SELECT COUNT(*) FROM income 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL) as income_count,
            (SELECT COUNT(*) FROM expenses 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL) as expense_count
    """)
    stats_result = await db.execute(stats_query, {
        "workspace_id": workspace_id,
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
        WHERE e.workspace_id = :workspace_id
            AND e.date >= :start_date
            AND e.date <= :end_date
            AND e.deleted_at IS NULL
        GROUP BY e.category
        ORDER BY total DESC
        LIMIT 5
    """)
    top_cat_result = await db.execute(top_cat_query, {
        "workspace_id": workspace_id,
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
    workspace_id: int = Query(..., description="ID workspace"),
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
    # Check workspace access
    query_check = text("""
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :user_id
        WHERE w.id = :workspace_id 
        AND (w.owner_id = :user_id OR wm.user_id = :user_id)
        LIMIT 1
    """)
    result_check = await db.execute(query_check, {"workspace_id": workspace_id, "user_id": current_user.user_id})
    if not result_check.fetchone():
        raise HTTPException(status_code=403, detail="You don't have access to this workspace")
    
    query = text("""
        SELECT 
            COALESCE((SELECT SUM(amount) FROM income 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as total_income,
            COALESCE((SELECT SUM(amount) FROM expenses 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as total_expense,
            COALESCE((SELECT SUM(amount) FROM income 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) - 
            COALESCE((SELECT SUM(amount) FROM expenses 
                WHERE workspace_id = :workspace_id 
                AND date >= :start_date 
                AND date <= :end_date 
                AND deleted_at IS NULL), 0) as balance
    """)
    
    # Период 1
    result1 = await db.execute(query, {
        "workspace_id": workspace_id,
        "start_date": period1_start,
        "end_date": period1_end
    })
    stats1 = result1.fetchone()
    
    # Период 2
    result2 = await db.execute(query, {
        "workspace_id": workspace_id,
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
