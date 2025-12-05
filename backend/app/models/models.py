from sqlalchemy import Column, Integer, BigInteger, String, Float, DateTime, Boolean, ForeignKey, Text, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class User(Base):
    __tablename__ = "users"
    
    user_id = Column(BigInteger, primary_key=True, index=True)
    telegram_chat_id = Column(BigInteger, unique=True, index=True, nullable=False)
    username = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    language_code = Column(String, default="ru")
    timezone = Column(String, default="Asia/Bishkek")
    is_active = Column(Boolean, default=True)
    last_activity = Column(DateTime)
    registered_date = Column(DateTime, server_default=func.now())
    preferred_currency = Column(String, default="KGS")
    usage_type = Column(String, nullable=True)  # personal, business
    monthly_budget = Column(Float, nullable=True)
    occupation = Column(String, nullable=True)
    country = Column(String, default="Кыргызстан")
    onboarding_completed = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=0)
    onboarding_started_at = Column(DateTime(timezone=True), nullable=True)
    onboarding_completed_at = Column(DateTime(timezone=True), nullable=True)
    registration_source = Column(String, default="telegram")
    
    # Relationships
    expenses = relationship("Expense", back_populates="user")
    income = relationship("Income", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    categories = relationship("Category", back_populates="user")


class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="KGS")
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    operation_type = Column(String, default="расход")
    source = Column(String, default="telegram")  # telegram, bank_parser, manual
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="expenses")


class Income(Base):
    __tablename__ = "income"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="KGS")
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    operation_type = Column(String, default="доход")
    source = Column(String, default="telegram")  # telegram, bank_parser, manual
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="income")


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=True)  # NULL для дефолтных
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # 'expense' или 'income'
    icon = Column(String(10), default="📁")
    color = Column(String(7), default="#6B7280")
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="categories")


class Budget(Base):
    __tablename__ = "budgets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    month = Column(String, nullable=False)  # Format: YYYY-MM
    budget_amount = Column(Float, nullable=False)
    currency = Column(String, default="KGS")
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="budgets")


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    from_currency = Column(String, nullable=False)
    to_currency = Column(String, nullable=False)
    rate = Column(Float, nullable=False)
    source = Column(String, default="NBKR")  # NBKR, ExchangeRate-API, etc
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, nullable=False)
    notification_type = Column(String, nullable=False)  # budget_warning, recurring_reminder, etc.
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    related_transaction_id = Column(Integer, nullable=True)
    related_recurring_id = Column(Integer, ForeignKey("recurring_payments.id"), nullable=True)
    related_category = Column(String, nullable=True)
    priority = Column(String, default="normal")  # low, normal, high, urgent
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    extra_data = Column("metadata", JSON, nullable=True)  # дополнительные данные


class RecurringPayment(Base):
    __tablename__ = "recurring_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    title = Column(String, nullable=False)  # Netflix, Аренда, и т.д.
    amount = Column(Float, nullable=False)
    currency = Column(String, default="KGS")
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    transaction_type = Column(String, default="expense")  # expense или income
    frequency = Column(String, nullable=False)  # daily, weekly, monthly, yearly
    interval_value = Column(Integer, default=1)  # каждые N периодов
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    next_payment_date = Column(Date, nullable=False)
    last_payment_date = Column(Date, nullable=True)
    remind_days_before = Column(Integer, default=3)
    auto_create = Column(Boolean, default=False)
    last_reminder_sent_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    last_executed_at = Column(DateTime, nullable=True)
    total_executions = Column(Integer, default=0)


# OnboardingState - таблица user_onboarding_answers не существует в БД
# Онбординг хранится в полях users: onboarding_completed, onboarding_step, etc.


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    action_type = Column(String, nullable=False)  # create, update, delete, invite, etc.
    entity_type = Column(String, nullable=True)  # expense, income, budget, member, etc.
    entity_id = Column(Integer, nullable=True)
    changes = Column(JSON, nullable=True)  # {"old_value": ..., "new_value": ...}
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AnalyticsCache(Base):
    __tablename__ = "analytics_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String, nullable=False)
    cache_type = Column(String, nullable=False)
    data = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, unique=True, nullable=False)
    theme = Column(String, default="light")  # light, dark, auto
    language = Column(String, default="ru")
    timezone = Column(String, default="Asia/Bishkek")
    notification_settings = Column(JSON, default={"email": False, "telegram": True, "push": True})
    ui_preferences = Column(JSON, default={})
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SavedReport(Base):
    __tablename__ = "saved_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    report_type = Column(String, nullable=False)  # weekly, monthly, period
    title = Column(String, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    pdf_url = Column(Text, nullable=True)  # URL от APITemplate.io
    format = Column(String, default="pdf")  # pdf, csv, excel
    report_data = Column(JSON, nullable=True)  # сохраненные данные отчета
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # когда истечет PDF URL
    
    # Relationships
    user = relationship("User")


# ============================================
# GAMIFICATION MODELS
# ============================================

class Achievement(Base):
    """Справочник достижений"""
    __tablename__ = "achievements"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=True)
    name_ky = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    description_ky = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # tracking, savings, analytics, goals, debts, special, rare
    icon = Column(String(10), default='🏆')
    xp_reward = Column(Integer, default=0)
    rarity = Column(String(20), default='common')  # common, rare, epic, legendary
    condition_type = Column(String(50), nullable=False)  # count, streak, percentage, combo
    condition_value = Column(Integer, default=1)
    condition_extra = Column(JSON, nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class UserGamification(Base):
    """Профиль геймификации пользователя"""
    __tablename__ = "user_gamification"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Уровень и опыт
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    total_xp = Column(Integer, default=0)
    
    # Streak
    current_streak = Column(Integer, default=0)
    max_streak = Column(Integer, default=0)
    last_activity_date = Column(Date, nullable=True)
    grace_used_this_month = Column(Boolean, default=False)
    
    # Статистика
    total_transactions = Column(Integer, default=0)
    total_achievements = Column(Integer, default=0)
    
    # Настройки
    notifications_enabled = Column(Boolean, default=True)
    show_on_home = Column(Boolean, default=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")


class UserAchievement(Base):
    """Достижения пользователя"""
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(String(50), ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    progress = Column(Integer, default=0)
    max_progress = Column(Integer, default=1)
    unlocked_at = Column(DateTime, nullable=True)
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User")
    achievement = relationship("Achievement")


class DailyQuest(Base):
    """Ежедневные задания"""
    __tablename__ = "daily_quests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    quest_date = Column(Date, nullable=False)
    quests = Column(JSON, nullable=False, default=[])
    all_completed = Column(Boolean, default=False)
    bonus_claimed = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User")


class XPHistory(Base):
    """История начисления XP"""
    __tablename__ = "xp_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    amount = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False)  # transaction, achievement, daily_quest, streak_bonus
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User")
