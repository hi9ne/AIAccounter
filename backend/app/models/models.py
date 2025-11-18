from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    telegram_chat_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    language_code = Column(String, default="ru")
    timezone = Column(String, default="Asia/Bishkek")
    is_active = Column(Boolean, default=True)
    last_activity = Column(DateTime)
    
    # Relationships
    expenses = relationship("Expense", back_populates="user")
    income = relationship("Income", back_populates="user")
    budgets = relationship("Budget", back_populates="user")


class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="KGS")
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="expenses")


class Income(Base):
    __tablename__ = "income"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="KGS")
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="income")


class Budget(Base):
    __tablename__ = "budgets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    month = Column(String, nullable=False)  # Format: YYYY-MM
    budget_amount = Column(Float, nullable=False)
    currency = Column(String, default="KGS")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="budgets")


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    from_currency = Column(String, default="KGS")
    to_currency = Column(String, nullable=False)
    rate = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    type = Column(String, nullable=False)  # budget_alert, recurring_payment, etc.
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RecurringPayment(Base):
    __tablename__ = "recurring_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String, nullable=False)  # Netflix, Аренда, и т.д.
    amount = Column(Float, nullable=False)
    currency = Column(String, default="KGS")
    category = Column(String, nullable=False)
    frequency = Column(String, nullable=False)  # daily, weekly, monthly, yearly
    next_payment_date = Column(Date, nullable=False)
    reminder_days_before = Column(Integer, default=3)
    last_reminded_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class OnboardingState(Base):
    __tablename__ = "user_onboarding_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    question_key = Column(String, nullable=False)
    answer_value = Column(Text, nullable=False)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
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
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    metric_type = Column(String, nullable=False)  # income_expense_stats, top_categories, etc.
    metric_data = Column(JSON, nullable=False)  # Кешированные данные
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True, nullable=False)
    theme = Column(String, default="light")  # light, dark, auto
    language = Column(String, default="ru")
    timezone = Column(String, default="Asia/Bishkek")
    preferred_currency = Column(String, default="KGS")
    notification_settings = Column(JSON, default={"email": False, "telegram": True, "push": True})
    ui_preferences = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SavedReport(Base):
    __tablename__ = "saved_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    report_type = Column(String, nullable=False)  # weekly, monthly, period
    title = Column(String, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    pdf_url = Column(Text, nullable=True)  # URL от APITemplate.io
    format = Column(String, default="pdf")  # pdf, csv, excel
    file_size = Column(Integer, nullable=True)  # размер в байтах
    report_data = Column(JSON, nullable=True)  # сохраненные данные отчета
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # когда истечет PDF URL
    
    # Relationships
    user = relationship("User")
