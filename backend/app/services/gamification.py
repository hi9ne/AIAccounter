"""
Gamification Service
Логика XP, уровней, streak, достижений
"""
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_
from sqlalchemy.orm import selectinload

from app.models.models import (
    User, UserGamification, Achievement, UserAchievement, 
    DailyQuest, XPHistory, Expense, Income
)


# ============================================
# КОНСТАНТЫ УРОВНЕЙ
# ============================================

LEVEL_THRESHOLDS = {
    1: 0,
    2: 100,
    3: 250,
    4: 450,
    5: 750,
    6: 1150,
    7: 1650,
    8: 2250,
    9: 3000,
    10: 4000,
    11: 5500,
    12: 7500,
    13: 10000,
    14: 15000,
    15: 25000
}

LEVEL_NAMES = {
    1: {"ru": "Новичок", "en": "Novice", "ky": "Жаңы баштаган"},
    2: {"ru": "Ученик", "en": "Apprentice", "ky": "Окуучу"},
    3: {"ru": "Практикант", "en": "Trainee", "ky": "Стажер"},
    4: {"ru": "Помощник", "en": "Assistant", "ky": "Жардамчы"},
    5: {"ru": "Бухгалтер", "en": "Accountant", "ky": "Бухгалтер"},
    6: {"ru": "Экономист", "en": "Economist", "ky": "Экономист"},
    7: {"ru": "Финансист", "en": "Financier", "ky": "Финансист"},
    8: {"ru": "Аналитик", "en": "Analyst", "ky": "Аналитик"},
    9: {"ru": "Эксперт", "en": "Expert", "ky": "Эксперт"},
    10: {"ru": "Мастер", "en": "Master", "ky": "Устат"},
    11: {"ru": "Гуру", "en": "Guru", "ky": "Гуру"},
    12: {"ru": "Магистр", "en": "Magister", "ky": "Магистр"},
    13: {"ru": "Грандмастер", "en": "Grandmaster", "ky": "Грандмастер"},
    14: {"ru": "Легенда", "en": "Legend", "ky": "Легенда"},
    15: {"ru": "Финансовый бог", "en": "Financial God", "ky": "Финансы кудайы"}
}

# Базовые XP за действия
XP_REWARDS = {
    "transaction": 5,
    "transaction_with_description": 7,
    "daily_quest": 5,
    "daily_all_completed": 10,
    "streak_7": 50,
    "streak_14": 100,
    "streak_30": 200,
    "streak_60": 300,
    "streak_90": 500,
    "streak_180": 1000,
    "streak_365": 2000
}

# Пул ежедневных заданий
DAILY_QUEST_POOL = [
    {"id": "add_expense", "title_ru": "Добавь расход", "title_en": "Add expense", "title_ky": "Чыгым кош", "target": 1, "xp": 5, "type": "expense"},
    {"id": "add_3_transactions", "title_ru": "Добавь 3 транзакции", "title_en": "Add 3 transactions", "title_ky": "3 транзакция кош", "target": 3, "xp": 15, "type": "transaction"},
    {"id": "add_description", "title_ru": "Добавь описание", "title_en": "Add description", "title_ky": "Сүрөттөмө кош", "target": 1, "xp": 5, "type": "description"},
    {"id": "check_analytics", "title_ru": "Посмотри аналитику", "title_en": "Check analytics", "title_ky": "Аналитиканы көр", "target": 1, "xp": 5, "type": "analytics"},
    {"id": "add_income", "title_ru": "Добавь доход", "title_en": "Add income", "title_ky": "Кирешеңди кош", "target": 1, "xp": 5, "type": "income"},
]


class GamificationService:
    """Сервис геймификации"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ============================================
    # ПРОФИЛЬ ГЕЙМИФИКАЦИИ
    # ============================================
    
    async def get_or_create_profile(self, user_id: int) -> UserGamification:
        """Получить или создать профиль геймификации"""
        result = await self.db.execute(
            select(UserGamification).where(UserGamification.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            profile = UserGamification(user_id=user_id)
            self.db.add(profile)
            await self.db.commit()
            await self.db.refresh(profile)
            
            # Инициализируем достижения для нового пользователя
            await self._init_achievements(user_id)
        
        return profile
    
    async def get_profile_data(self, user_id: int, lang: str = "ru") -> Dict[str, Any]:
        """Получить данные профиля для UI"""
        profile = await self.get_or_create_profile(user_id)
        
        # Вычисляем прогресс до следующего уровня
        current_level_xp = LEVEL_THRESHOLDS.get(profile.level, 0)
        next_level_xp = LEVEL_THRESHOLDS.get(profile.level + 1, LEVEL_THRESHOLDS[15])
        xp_for_level = next_level_xp - current_level_xp
        xp_progress = profile.total_xp - current_level_xp
        
        level_name = LEVEL_NAMES.get(profile.level, LEVEL_NAMES[1])
        
        return {
            "level": profile.level,
            "level_name": level_name.get(lang, level_name["ru"]),
            "xp": profile.total_xp,
            "xp_progress": xp_progress,
            "xp_for_level": xp_for_level,
            "xp_percentage": min(100, int((xp_progress / xp_for_level) * 100)) if xp_for_level > 0 else 100,
            "current_streak": profile.current_streak,
            "max_streak": profile.max_streak,
            "total_transactions": profile.total_transactions,
            "total_achievements": profile.total_achievements,
            "show_on_home": profile.show_on_home
        }
    
    # ============================================
    # XP И УРОВНИ
    # ============================================
    
    async def add_xp(self, user_id: int, amount: int, reason: str, details: Dict = None) -> Dict[str, Any]:
        """Начислить XP пользователю"""
        profile = await self.get_or_create_profile(user_id)
        
        # Применяем множитель streak
        multiplier = self._get_streak_multiplier(profile.current_streak)
        final_amount = int(amount * multiplier)
        
        # Обновляем XP
        old_level = profile.level
        profile.xp += final_amount
        profile.total_xp += final_amount
        
        # Проверяем повышение уровня
        new_level = self._calculate_level(profile.total_xp)
        level_up = new_level > old_level
        
        if level_up:
            profile.level = new_level
        
        await self.db.commit()
        
        # Записываем в историю
        history = XPHistory(
            user_id=user_id,
            amount=final_amount,
            reason=reason,
            details=details or {}
        )
        self.db.add(history)
        await self.db.commit()
        
        return {
            "xp_earned": final_amount,
            "multiplier": multiplier,
            "level_up": level_up,
            "new_level": new_level if level_up else None,
            "total_xp": profile.total_xp
        }
    
    def _get_streak_multiplier(self, streak: int) -> float:
        """Получить множитель XP на основе streak"""
        if streak >= 90:
            return 1.5
        elif streak >= 30:
            return 1.3
        elif streak >= 14:
            return 1.2
        elif streak >= 7:
            return 1.1
        return 1.0
    
    def _calculate_level(self, total_xp: int) -> int:
        """Вычислить уровень на основе XP"""
        level = 1
        for lvl, threshold in sorted(LEVEL_THRESHOLDS.items()):
            if total_xp >= threshold:
                level = lvl
            else:
                break
        return level
    
    # ============================================
    # STREAK
    # ============================================
    
    async def update_streak(self, user_id: int) -> Dict[str, Any]:
        """Обновить streak при добавлении транзакции"""
        profile = await self.get_or_create_profile(user_id)
        today = date.today()
        
        result = {
            "streak_continued": False,
            "streak_started": False,
            "streak_milestone": None,
            "bonus_xp": 0
        }
        
        if profile.last_activity_date is None:
            # Первая активность
            profile.current_streak = 1
            profile.last_activity_date = today
            result["streak_started"] = True
        elif profile.last_activity_date == today:
            # Уже была активность сегодня
            pass
        elif profile.last_activity_date == today - timedelta(days=1):
            # Продолжаем streak
            profile.current_streak += 1
            profile.last_activity_date = today
            result["streak_continued"] = True
            
            # Проверяем milestone
            milestone = self._check_streak_milestone(profile.current_streak)
            if milestone:
                result["streak_milestone"] = milestone
                result["bonus_xp"] = XP_REWARDS.get(f"streak_{milestone}", 0)
                await self.add_xp(user_id, result["bonus_xp"], "streak_bonus", {"milestone": milestone})
        else:
            # Streak сброшен
            profile.current_streak = 1
            profile.last_activity_date = today
            result["streak_started"] = True
        
        # Обновляем максимальный streak
        if profile.current_streak > profile.max_streak:
            profile.max_streak = profile.current_streak
        
        await self.db.commit()
        
        return result
    
    def _check_streak_milestone(self, streak: int) -> Optional[int]:
        """Проверить достижение milestone streak"""
        milestones = [365, 180, 90, 60, 30, 14, 7]
        for m in milestones:
            if streak == m:
                return m
        return None
    
    # ============================================
    # ДОСТИЖЕНИЯ
    # ============================================
    
    async def _init_achievements(self, user_id: int):
        """Инициализировать достижения для нового пользователя"""
        result = await self.db.execute(
            select(Achievement).where(Achievement.is_active == True)
        )
        achievements = result.scalars().all()
        
        for achievement in achievements:
            user_achievement = UserAchievement(
                user_id=user_id,
                achievement_id=achievement.id,
                progress=0,
                max_progress=achievement.condition_value
            )
            self.db.add(user_achievement)
        
        await self.db.commit()
    
    async def get_achievements(self, user_id: int, lang: str = "ru") -> List[Dict[str, Any]]:
        """Получить все достижения пользователя с актуальным прогрессом"""
        
        # Сначала пересчитываем прогресс
        await self._update_achievements_progress(user_id)
        
        result = await self.db.execute(
            select(UserAchievement, Achievement)
            .join(Achievement, UserAchievement.achievement_id == Achievement.id)
            .where(UserAchievement.user_id == user_id)
            .order_by(Achievement.sort_order)
        )
        rows = result.all()
        
        achievements = []
        for user_ach, ach in rows:
            name = getattr(ach, f"name_{lang}", None) or ach.name
            description = getattr(ach, f"description_{lang}", None) or ach.description
            
            achievements.append({
                "id": ach.id,
                "name": name,
                "description": description,
                "icon": ach.icon,
                "category": ach.category,
                "rarity": ach.rarity,
                "xp_reward": ach.xp_reward,
                "progress": user_ach.progress,
                "max_progress": user_ach.max_progress,
                "percentage": min(100, int((user_ach.progress / user_ach.max_progress) * 100)) if user_ach.max_progress > 0 else 0,
                "unlocked": user_ach.unlocked_at is not None,
                "unlocked_at": user_ach.unlocked_at.isoformat() if user_ach.unlocked_at else None
            })
        
        return achievements
    
    async def _update_achievements_progress(self, user_id: int):
        """Пересчитать прогресс всех достижений пользователя"""
        profile = await self.get_or_create_profile(user_id)
        
        # Получаем все незавершенные достижения
        result = await self.db.execute(
            select(UserAchievement, Achievement)
            .join(Achievement, UserAchievement.achievement_id == Achievement.id)
            .where(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.unlocked_at.is_(None)
                )
            )
        )
        rows = result.all()
        
        # Подсчитываем транзакции один раз
        expense_count = await self.db.execute(
            select(func.count()).select_from(Expense)
            .where(and_(Expense.user_id == user_id, Expense.deleted_at.is_(None)))
        )
        expense_count = expense_count.scalar() or 0
        
        income_count = await self.db.execute(
            select(func.count()).select_from(Income)
            .where(and_(Income.user_id == user_id, Income.deleted_at.is_(None)))
        )
        income_count = income_count.scalar() or 0
        
        total_transactions = expense_count + income_count
        
        for user_ach, ach in rows:
            new_progress = user_ach.progress
            should_unlock = False
            
            # Определяем прогресс в зависимости от типа достижения
            if ach.id == "first_expense":
                new_progress = min(expense_count, 1)
                should_unlock = expense_count >= 1
                
            elif ach.id == "first_income":
                new_progress = min(income_count, 1)
                should_unlock = income_count >= 1
                
            elif ach.id == "ten_expenses":
                new_progress = min(expense_count, 10)
                should_unlock = expense_count >= 10
                
            elif ach.id == "fifty_expenses":
                new_progress = min(expense_count, 50)
                should_unlock = expense_count >= 50
                
            elif ach.id == "century":
                new_progress = min(total_transactions, 100)
                should_unlock = total_transactions >= 100
                
            elif ach.id == "thousand":
                new_progress = min(total_transactions, 1000)
                should_unlock = total_transactions >= 1000
                
            elif ach.condition_type == "streak":
                new_progress = min(profile.current_streak, ach.condition_value)
                should_unlock = profile.current_streak >= ach.condition_value
            
            # Обновляем прогресс
            if new_progress != user_ach.progress:
                user_ach.progress = new_progress
            
            # Разблокируем если достигнуто
            if should_unlock and user_ach.unlocked_at is None:
                user_ach.unlocked_at = datetime.utcnow()
                profile.total_achievements += 1
                
                # Начисляем XP за достижение
                await self.add_xp(user_id, ach.xp_reward, "achievement", {"achievement_id": ach.id})
        
        await self.db.commit()

    async def check_achievements(self, user_id: int, event: str, data: Dict = None) -> List[Dict[str, Any]]:
        """Проверить и разблокировать достижения"""
        unlocked = []
        profile = await self.get_or_create_profile(user_id)
        
        # Получаем незавершенные достижения
        result = await self.db.execute(
            select(UserAchievement, Achievement)
            .join(Achievement, UserAchievement.achievement_id == Achievement.id)
            .where(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.unlocked_at.is_(None)
                )
            )
        )
        rows = result.all()
        
        for user_ach, ach in rows:
            should_unlock = False
            new_progress = user_ach.progress
            
            # Проверяем условия в зависимости от типа
            if ach.condition_type == "count":
                new_progress = await self._get_count_progress(user_id, ach.id, event, data)
                if new_progress >= ach.condition_value:
                    should_unlock = True
                    
            elif ach.condition_type == "streak":
                if profile.current_streak >= ach.condition_value:
                    should_unlock = True
                    new_progress = profile.current_streak
                else:
                    new_progress = profile.current_streak
                    
            elif ach.condition_type == "percentage":
                new_progress = await self._get_savings_percentage(user_id)
                if new_progress >= ach.condition_value:
                    should_unlock = True
            
            # Обновляем прогресс
            if new_progress != user_ach.progress:
                user_ach.progress = new_progress
            
            # Разблокируем достижение
            if should_unlock:
                user_ach.unlocked_at = datetime.utcnow()
                profile.total_achievements += 1
                
                # Начисляем XP
                await self.add_xp(user_id, ach.xp_reward, "achievement", {"achievement_id": ach.id})
                
                unlocked.append({
                    "id": ach.id,
                    "name": ach.name,
                    "icon": ach.icon,
                    "xp_reward": ach.xp_reward,
                    "rarity": ach.rarity
                })
        
        await self.db.commit()
        return unlocked
    
    async def _get_count_progress(self, user_id: int, achievement_id: str, event: str, data: Dict) -> int:
        """Получить прогресс для count-достижений"""
        
        if achievement_id == "first_expense":
            result = await self.db.execute(
                select(func.count()).select_from(Expense)
                .where(and_(Expense.user_id == user_id, Expense.deleted_at.is_(None)))
            )
            return result.scalar() or 0
            
        elif achievement_id == "first_income":
            result = await self.db.execute(
                select(func.count()).select_from(Income)
                .where(and_(Income.user_id == user_id, Income.deleted_at.is_(None)))
            )
            return result.scalar() or 0
            
        elif achievement_id in ["century", "thousand"]:
            # Общее количество транзакций
            expenses = await self.db.execute(
                select(func.count()).select_from(Expense)
                .where(and_(Expense.user_id == user_id, Expense.deleted_at.is_(None)))
            )
            incomes = await self.db.execute(
                select(func.count()).select_from(Income)
                .where(and_(Income.user_id == user_id, Income.deleted_at.is_(None)))
            )
            return (expenses.scalar() or 0) + (incomes.scalar() or 0)
            
        elif achievement_id == "detailed_tracker":
            # Транзакции с описанием
            expenses = await self.db.execute(
                select(func.count()).select_from(Expense)
                .where(and_(
                    Expense.user_id == user_id, 
                    Expense.deleted_at.is_(None),
                    Expense.description.isnot(None),
                    Expense.description != ""
                ))
            )
            incomes = await self.db.execute(
                select(func.count()).select_from(Income)
                .where(and_(
                    Income.user_id == user_id, 
                    Income.deleted_at.is_(None),
                    Income.description.isnot(None),
                    Income.description != ""
                ))
            )
            return (expenses.scalar() or 0) + (incomes.scalar() or 0)
            
        elif achievement_id == "multi_currency":
            # Количество использованных валют
            result = await self.db.execute(
                select(func.count(func.distinct(Expense.currency)))
                .where(and_(Expense.user_id == user_id, Expense.deleted_at.is_(None)))
            )
            return result.scalar() or 0
        
        return 0
    
    async def _get_savings_percentage(self, user_id: int) -> int:
        """Получить процент экономии за текущий месяц"""
        today = date.today()
        first_day = today.replace(day=1)
        
        # Доходы за месяц
        income_result = await self.db.execute(
            select(func.coalesce(func.sum(Income.amount), 0))
            .where(and_(
                Income.user_id == user_id,
                Income.date >= first_day,
                Income.deleted_at.is_(None)
            ))
        )
        total_income = income_result.scalar() or 0
        
        # Расходы за месяц
        expense_result = await self.db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0))
            .where(and_(
                Expense.user_id == user_id,
                Expense.date >= first_day,
                Expense.deleted_at.is_(None)
            ))
        )
        total_expenses = expense_result.scalar() or 0
        
        if total_income <= 0:
            return 0
        
        savings = total_income - total_expenses
        percentage = int((savings / total_income) * 100)
        return max(0, percentage)
    
    # ============================================
    # ЕЖЕДНЕВНЫЕ ЗАДАНИЯ
    # ============================================
    
    async def get_daily_quests(self, user_id: int, lang: str = "ru") -> Dict[str, Any]:
        """Получить ежедневные задания"""
        today = date.today()
        
        result = await self.db.execute(
            select(DailyQuest).where(
                and_(DailyQuest.user_id == user_id, DailyQuest.quest_date == today)
            )
        )
        daily = result.scalar_one_or_none()
        
        if not daily:
            # Генерируем новые задания
            daily = await self._generate_daily_quests(user_id)
        
        quests = daily.quests or []
        localized_quests = []
        
        for quest in quests:
            title_key = f"title_{lang}"
            title = quest.get(title_key, quest.get("title_ru", ""))
            
            localized_quests.append({
                "id": quest["id"],
                "title": title,
                "progress": quest.get("progress", 0),
                "target": quest.get("target", 1),
                "xp": quest.get("xp", 5),
                "completed": quest.get("completed", False)
            })
        
        return {
            "date": today.isoformat(),
            "quests": localized_quests,
            "all_completed": daily.all_completed,
            "bonus_claimed": daily.bonus_claimed
        }
    
    async def _generate_daily_quests(self, user_id: int) -> DailyQuest:
        """Сгенерировать ежедневные задания"""
        import random
        
        # Выбираем 3 случайных задания
        selected = random.sample(DAILY_QUEST_POOL, min(3, len(DAILY_QUEST_POOL)))
        
        quests = []
        for quest in selected:
            quests.append({
                **quest,
                "progress": 0,
                "completed": False
            })
        
        daily = DailyQuest(
            user_id=user_id,
            quest_date=date.today(),
            quests=quests
        )
        self.db.add(daily)
        await self.db.commit()
        await self.db.refresh(daily)
        
        return daily
    
    async def update_daily_quest_progress(self, user_id: int, quest_type: str) -> Dict[str, Any]:
        """Обновить прогресс ежедневного задания"""
        today = date.today()
        
        result = await self.db.execute(
            select(DailyQuest).where(
                and_(DailyQuest.user_id == user_id, DailyQuest.quest_date == today)
            )
        )
        daily = result.scalar_one_or_none()
        
        if not daily:
            return {"updated": False}
        
        quests = daily.quests or []
        quest_completed = None
        all_now_completed = True
        
        for quest in quests:
            if quest.get("type") == quest_type and not quest.get("completed", False):
                quest["progress"] = quest.get("progress", 0) + 1
                if quest["progress"] >= quest.get("target", 1):
                    quest["completed"] = True
                    quest_completed = quest
                    await self.add_xp(user_id, quest.get("xp", 5), "daily_quest", {"quest_id": quest["id"]})
            
            if not quest.get("completed", False):
                all_now_completed = False
        
        daily.quests = quests
        
        # Проверяем выполнение всех заданий
        bonus_earned = False
        if all_now_completed and not daily.all_completed:
            daily.all_completed = True
            daily.bonus_claimed = True
            await self.add_xp(user_id, XP_REWARDS["daily_all_completed"], "daily_all_completed", {})
            bonus_earned = True
        
        await self.db.commit()
        
        return {
            "updated": True,
            "quest_completed": quest_completed,
            "all_completed": all_now_completed,
            "bonus_earned": bonus_earned
        }
    
    # ============================================
    # ОБРАБОТКА ТРАНЗАКЦИЙ
    # ============================================
    
    async def on_transaction_added(self, user_id: int, transaction_type: str, has_description: bool = False) -> Dict[str, Any]:
        """Обработать добавление транзакции"""
        result = {
            "xp": None,
            "streak": None,
            "achievements": [],
            "daily_quest": None
        }
        
        # 1. Обновляем streak
        result["streak"] = await self.update_streak(user_id)
        
        # 2. Начисляем XP
        xp_amount = XP_REWARDS["transaction_with_description"] if has_description else XP_REWARDS["transaction"]
        result["xp"] = await self.add_xp(user_id, xp_amount, "transaction", {"type": transaction_type})
        
        # 3. Обновляем счетчик транзакций
        profile = await self.get_or_create_profile(user_id)
        profile.total_transactions += 1
        await self.db.commit()
        
        # 4. Проверяем достижения
        result["achievements"] = await self.check_achievements(
            user_id, 
            "transaction_added",
            {"type": transaction_type, "has_description": has_description}
        )
        
        # 5. Обновляем ежедневные задания
        quest_type = "expense" if transaction_type == "expense" else "income"
        result["daily_quest"] = await self.update_daily_quest_progress(user_id, quest_type)
        
        # Также обновляем для общих транзакций
        await self.update_daily_quest_progress(user_id, "transaction")
        
        if has_description:
            await self.update_daily_quest_progress(user_id, "description")
        
        return result
