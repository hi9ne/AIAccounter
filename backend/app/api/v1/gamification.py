"""
Gamification API endpoints
API для геймификации: профиль, достижения, ежедневные задания
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.models import User
from app.utils.auth import get_current_user
from app.services.gamification import GamificationService

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/profile")
async def get_gamification_profile(
    lang: str = Query("ru", description="Language: ru, en, ky"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить профиль геймификации пользователя
    
    Возвращает:
    - level: текущий уровень
    - level_name: название уровня
    - xp: общий XP
    - xp_progress: прогресс до следующего уровня
    - xp_for_level: XP необходимый для следующего уровня
    - xp_percentage: процент заполнения
    - current_streak: текущий streak
    - max_streak: максимальный streak
    - total_transactions: всего транзакций
    - total_achievements: разблокированных достижений
    """
    service = GamificationService(db)
    profile = await service.get_profile_data(current_user.user_id, lang)
    
    return {
        "success": True,
        "data": profile
    }


@router.get("/achievements")
async def get_achievements(
    lang: str = Query("ru", description="Language: ru, en, ky"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить все достижения пользователя
    
    Категории:
    - tracking: Учёт и дисциплина
    - savings: Накопления и экономия
    - analytics: Аналитика и контроль
    - debts: Долги и подписки
    - special: Особые достижения
    - rare: Редкие достижения
    """
    service = GamificationService(db)
    achievements = await service.get_achievements(current_user.user_id, lang)
    
    # Фильтруем по категории если указана
    if category:
        achievements = [a for a in achievements if a["category"] == category]
    
    # Группируем по категориям
    categories = {}
    for ach in achievements:
        cat = ach["category"]
        if cat not in categories:
            categories[cat] = {
                "achievements": [],
                "unlocked": 0,
                "total": 0
            }
        categories[cat]["achievements"].append(ach)
        categories[cat]["total"] += 1
        if ach["unlocked"]:
            categories[cat]["unlocked"] += 1
    
    # Общая статистика
    total_unlocked = sum(1 for a in achievements if a["unlocked"])
    total = len(achievements)
    
    return {
        "success": True,
        "data": {
            "achievements": achievements,
            "categories": categories,
            "stats": {
                "unlocked": total_unlocked,
                "total": total,
                "percentage": int((total_unlocked / total) * 100) if total > 0 else 0
            }
        }
    }


@router.get("/achievements/{achievement_id}")
async def get_achievement_detail(
    achievement_id: str,
    lang: str = Query("ru", description="Language: ru, en, ky"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить детали конкретного достижения"""
    service = GamificationService(db)
    achievements = await service.get_achievements(current_user.user_id, lang)
    
    achievement = next((a for a in achievements if a["id"] == achievement_id), None)
    
    if not achievement:
        return {
            "success": False,
            "error": "Achievement not found"
        }
    
    return {
        "success": True,
        "data": achievement
    }


@router.get("/daily-quests")
async def get_daily_quests(
    lang: str = Query("ru", description="Language: ru, en, ky"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить ежедневные задания
    
    Возвращает:
    - date: дата заданий
    - quests: список заданий с прогрессом
    - all_completed: все ли выполнены
    - bonus_claimed: получен ли бонус
    """
    service = GamificationService(db)
    quests = await service.get_daily_quests(current_user.user_id, lang)
    
    return {
        "success": True,
        "data": quests
    }


@router.get("/xp-history")
async def get_xp_history(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить историю начисления XP"""
    from sqlalchemy import select
    from app.models.models import XPHistory
    
    result = await db.execute(
        select(XPHistory)
        .where(XPHistory.user_id == current_user.user_id)
        .order_by(XPHistory.created_at.desc())
        .limit(limit)
    )
    history = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": h.id,
                "amount": h.amount,
                "reason": h.reason,
                "details": h.details,
                "created_at": h.created_at.isoformat() if h.created_at else None
            }
            for h in history
        ]
    }


@router.post("/settings")
async def update_gamification_settings(
    notifications_enabled: Optional[bool] = None,
    show_on_home: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновить настройки геймификации"""
    service = GamificationService(db)
    profile = await service.get_or_create_profile(current_user.user_id)
    
    if notifications_enabled is not None:
        profile.notifications_enabled = notifications_enabled
    
    if show_on_home is not None:
        profile.show_on_home = show_on_home
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Settings updated",
        "data": {
            "notifications_enabled": profile.notifications_enabled,
            "show_on_home": profile.show_on_home
        }
    }


@router.get("/leaderboard")
async def get_leaderboard(
    period: str = Query("week", description="Period: week, month, all"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить лидерборд (анонимный)
    
    Показывает только уровни и streak других пользователей
    """
    from sqlalchemy import select, desc
    from app.models.models import UserGamification
    
    result = await db.execute(
        select(UserGamification)
        .order_by(desc(UserGamification.total_xp))
        .limit(limit)
    )
    leaders = result.scalars().all()
    
    # Находим позицию текущего пользователя
    user_position = None
    for i, leader in enumerate(leaders):
        if leader.user_id == current_user.user_id:
            user_position = i + 1
            break
    
    # Если пользователя нет в топе, находим его позицию
    if user_position is None:
        count_result = await db.execute(
            select(func.count())
            .select_from(UserGamification)
            .where(UserGamification.total_xp > (
                select(UserGamification.total_xp)
                .where(UserGamification.user_id == current_user.user_id)
                .scalar_subquery()
            ))
        )
        from sqlalchemy import func
        user_position = (count_result.scalar() or 0) + 1
    
    from app.services.gamification import LEVEL_NAMES
    
    return {
        "success": True,
        "data": {
            "leaders": [
                {
                    "position": i + 1,
                    "level": l.level,
                    "level_name": LEVEL_NAMES.get(l.level, {}).get("ru", ""),
                    "total_xp": l.total_xp,
                    "current_streak": l.current_streak,
                    "is_current_user": l.user_id == current_user.user_id
                }
                for i, l in enumerate(leaders)
            ],
            "user_position": user_position
        }
    }
