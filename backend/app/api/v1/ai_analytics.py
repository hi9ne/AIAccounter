from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
import json

from ...database import get_db
from ...models.models import Expense, Income
from ...utils.auth import get_current_user_id
from ...schemas.debt import (
    AIAnalyticsRequest, AIAnalyticsResponse, 
    SpendingForecast, SpendingAnomaly, AIRecommendation,
    AIInsightResponse, AIInsightsListResponse
)

router = APIRouter(prefix="/ai-analytics", tags=["ai-analytics"])


# ===== HELPER FUNCTIONS =====

async def get_spending_stats(db: AsyncSession, user_id: int, start_date: date, end_date: date) -> dict:
    """Получить статистику расходов за период"""
    # Расходы по категориям
    expenses_query = select(
        Expense.category,
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).where(
        Expense.user_id == user_id,
        Expense.date >= start_date,
        Expense.date <= end_date,
        Expense.deleted_at.is_(None)
    ).group_by(Expense.category)
    
    result = await db.execute(expenses_query)
    expenses_by_category = {row.category: {'total': float(row.total), 'count': row.count} for row in result.fetchall()}
    
    # Доходы
    income_query = select(func.sum(Income.amount)).where(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date <= end_date,
        Income.deleted_at.is_(None)
    )
    income_result = await db.execute(income_query)
    total_income = float(income_result.scalar() or 0)
    
    total_expenses = sum(cat['total'] for cat in expenses_by_category.values())
    
    return {
        'total_expenses': total_expenses,
        'total_income': total_income,
        'balance': total_income - total_expenses,
        'expenses_by_category': expenses_by_category,
        'categories_count': len(expenses_by_category),
        'period_days': (end_date - start_date).days + 1
    }


async def get_historical_averages(db: AsyncSession, user_id: int, months: int = 3) -> dict:
    """Получить средние значения за последние N месяцев"""
    end_date = date.today()
    start_date = end_date - timedelta(days=months * 30)
    
    # Средние расходы по категориям
    query = select(
        Expense.category,
        func.avg(Expense.amount).label('avg_amount'),
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).where(
        Expense.user_id == user_id,
        Expense.date >= start_date,
        Expense.date <= end_date,
        Expense.deleted_at.is_(None)
    ).group_by(Expense.category)
    
    result = await db.execute(query)
    
    averages = {}
    for row in result.fetchall():
        monthly_avg = float(row.total) / months
        averages[row.category] = {
            'avg_transaction': float(row.avg_amount),
            'monthly_avg': monthly_avg,
            'total': float(row.total),
            'count': row.count
        }
    
    return averages


def detect_anomalies(current_stats: dict, historical_averages: dict, threshold: float = 0.5) -> List[SpendingAnomaly]:
    """Обнаружить аномалии в расходах"""
    anomalies = []
    
    for category, current in current_stats.get('expenses_by_category', {}).items():
        if category in historical_averages:
            avg = historical_averages[category]['monthly_avg']
            current_amount = current['total']
            
            if avg > 0:
                deviation = (current_amount - avg) / avg
                
                if abs(deviation) > threshold:
                    severity = "low" if abs(deviation) < 1 else ("medium" if abs(deviation) < 2 else "high")
                    direction = "больше" if deviation > 0 else "меньше"
                    
                    anomalies.append(SpendingAnomaly(
                        category=category,
                        current_amount=current_amount,
                        average_amount=avg,
                        deviation_percentage=round(deviation * 100, 1),
                        severity=severity,
                        message=f"Расходы на '{category}' на {abs(round(deviation * 100))}% {direction} среднего"
                    ))
    
    return sorted(anomalies, key=lambda x: abs(x.deviation_percentage), reverse=True)


def generate_recommendations(stats: dict, anomalies: List[SpendingAnomaly], averages: dict) -> List[AIRecommendation]:
    """Генерировать рекомендации на основе анализа"""
    recommendations = []
    
    # Рекомендация по балансу
    if stats['balance'] < 0:
        recommendations.append(AIRecommendation(
            type="budget_alert",
            title="Отрицательный баланс",
            message=f"Ваши расходы превышают доходы на {abs(stats['balance']):.0f}. Рекомендуем сократить траты.",
            priority="high"
        ))
    
    # Рекомендации по аномалиям
    for anomaly in anomalies[:3]:  # Топ 3 аномалии
        if anomaly.deviation_percentage > 50:
            potential_saving = anomaly.current_amount - anomaly.average_amount
            recommendations.append(AIRecommendation(
                type="saving_opportunity",
                title=f"Высокие траты: {anomaly.category}",
                message=anomaly.message,
                potential_saving=potential_saving if potential_saving > 0 else None,
                category=anomaly.category,
                priority="medium" if anomaly.severity == "low" else "high"
            ))
    
    # Топ категория расходов
    if stats['expenses_by_category']:
        top_category = max(stats['expenses_by_category'].items(), key=lambda x: x[1]['total'])
        percentage = (top_category[1]['total'] / stats['total_expenses'] * 100) if stats['total_expenses'] > 0 else 0
        
        if percentage > 40:
            recommendations.append(AIRecommendation(
                type="pattern_insight",
                title=f"Основные траты: {top_category[0]}",
                message=f"Категория '{top_category[0]}' составляет {percentage:.0f}% всех расходов.",
                category=top_category[0],
                priority="low"
            ))
    
    return recommendations


def generate_forecast(stats: dict, averages: dict, days_ahead: int = 30) -> List[SpendingForecast]:
    """Генерировать прогноз расходов"""
    forecasts = []
    
    # Простой прогноз на основе среднего
    total_monthly_avg = sum(cat['monthly_avg'] for cat in averages.values())
    
    if total_monthly_avg > 0:
        # Прогноз по категориям
        breakdown = {cat: data['monthly_avg'] for cat, data in averages.items()}
        
        forecasts.append(SpendingForecast(
            period="next_month",
            predicted_amount=total_monthly_avg,
            confidence=0.7,  # Базовая уверенность
            breakdown_by_category=breakdown,
            comparison_with_previous=0  # TODO: сравнение с предыдущим месяцем
        ))
    
    return forecasts


# ===== API ENDPOINTS =====

@router.get("/analyze", response_model=AIAnalyticsResponse)
async def analyze_spending(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    period_days: int = 30,
):
    """Получить полный AI анализ расходов"""
    end_date = date.today()
    start_date = end_date - timedelta(days=period_days)
    
    # Получаем данные
    current_stats = await get_spending_stats(db, user_id, start_date, end_date)
    historical_averages = await get_historical_averages(db, user_id, months=3)
    
    # Анализ
    anomalies = detect_anomalies(current_stats, historical_averages)
    recommendations = generate_recommendations(current_stats, anomalies, historical_averages)
    forecasts = generate_forecast(current_stats, historical_averages)
    
    # Формируем сводку
    summary = {
        "period": f"{start_date.isoformat()} - {end_date.isoformat()}",
        "total_expenses": current_stats['total_expenses'],
        "total_income": current_stats['total_income'],
        "balance": current_stats['balance'],
        "top_categories": sorted(
            current_stats['expenses_by_category'].items(),
            key=lambda x: x[1]['total'],
            reverse=True
        )[:5],
        "daily_average": current_stats['total_expenses'] / period_days if period_days > 0 else 0,
        "anomalies_count": len(anomalies),
        "recommendations_count": len(recommendations)
    }
    
    return AIAnalyticsResponse(
        generated_at=datetime.now(),
        period_analyzed=f"{period_days} дней",
        summary=summary,
        forecasts=forecasts,
        anomalies=anomalies,
        recommendations=recommendations,
        insights=[]
    )


@router.get("/insights", response_model=AIInsightsListResponse)
async def get_insights(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    limit: int = 10,
):
    """Получить AI инсайты для пользователя"""
    # Генерируем инсайты на лету (в будущем можно кешировать)
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    current_stats = await get_spending_stats(db, user_id, start_date, end_date)
    historical_averages = await get_historical_averages(db, user_id, months=3)
    
    insights = []
    
    # Инсайт по балансу
    if current_stats['total_expenses'] > 0:
        savings_rate = ((current_stats['total_income'] - current_stats['total_expenses']) / current_stats['total_income'] * 100) if current_stats['total_income'] > 0 else 0
        
        insights.append(AIInsightResponse(
            id=1,
            insight_type="savings_rate",
            title="Норма сбережений",
            message=f"Вы сберегаете {savings_rate:.0f}% от дохода. " + 
                   ("Отлично!" if savings_rate > 20 else "Попробуйте увеличить до 20%."),
            category="savings",
            priority="normal" if savings_rate > 10 else "high",
            is_read=False,
            created_at=datetime.now()
        ))
    
    # Инсайт по частоте трат
    total_transactions = sum(cat['count'] for cat in current_stats['expenses_by_category'].values())
    if total_transactions > 0:
        avg_per_day = total_transactions / 30
        insights.append(AIInsightResponse(
            id=2,
            insight_type="frequency",
            title="Частота покупок",
            message=f"В среднем {avg_per_day:.1f} покупок в день. " +
                   ("Много мелких трат могут накапливаться." if avg_per_day > 3 else "Хороший контроль!"),
            category="behavior",
            priority="low",
            is_read=False,
            created_at=datetime.now()
        ))
    
    return AIInsightsListResponse(
        items=insights[:limit],
        total=len(insights),
        unread_count=len([i for i in insights if not i.is_read])
    )


@router.get("/trends")
async def get_trends(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    months: int = 6,
):
    """Получить тренды расходов/доходов по месяцам"""
    end_date = date.today()
    
    trends = []
    
    for i in range(months):
        # Считаем для каждого месяца
        month_end = end_date.replace(day=1) - timedelta(days=1) if i > 0 else end_date
        month_end = month_end - timedelta(days=30 * (i - 1)) if i > 1 else month_end
        month_start = month_end.replace(day=1)
        
        # Упрощённый расчёт
        month_offset = i
        current_month = end_date.month - month_offset
        current_year = end_date.year
        
        while current_month <= 0:
            current_month += 12
            current_year -= 1
        
        month_start = date(current_year, current_month, 1)
        if current_month == 12:
            month_end = date(current_year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(current_year, current_month + 1, 1) - timedelta(days=1)
        
        # Расходы
        expenses_query = select(func.sum(Expense.amount)).where(
            Expense.user_id == user_id,
            Expense.date >= month_start,
            Expense.date <= month_end,
            Expense.deleted_at.is_(None)
        )
        expenses_result = await db.execute(expenses_query)
        total_expenses = float(expenses_result.scalar() or 0)
        
        # Доходы
        income_query = select(func.sum(Income.amount)).where(
            Income.user_id == user_id,
            Income.date >= month_start,
            Income.date <= month_end,
            Income.deleted_at.is_(None)
        )
        income_result = await db.execute(income_query)
        total_income = float(income_result.scalar() or 0)
        
        trends.append({
            "month": month_start.strftime("%Y-%m"),
            "month_name": month_start.strftime("%B %Y"),
            "expenses": total_expenses,
            "income": total_income,
            "balance": total_income - total_expenses
        })
    
    return {
        "trends": list(reversed(trends)),
        "period_months": months
    }
