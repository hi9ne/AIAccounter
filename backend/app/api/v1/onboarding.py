"""
API эндпоинты для онбординга пользователей
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, update
from datetime import datetime
import json

from ...database import get_db
from ...models import User
from ...utils.auth import get_current_user
from ...schemas.onboarding import (
    OnboardingStatus,
    Step1Currency,
    Step2UsageType,
    Step3Budget,
    Step4Categories,
    Step5Notifications,
    OnboardingStepResponse,
    OnboardingCompleteResponse,
    CategoryTemplates,
    CategoryTemplate,
    UsageType,
    NotificationSettings
)

router = APIRouter()


# === Шаблоны категорий ===

PERSONAL_EXPENSE_CATEGORIES = [
    CategoryTemplate(name="Еда и продукты", type="expense", icon="🍔", color="#EF4444", code="food"),
    CategoryTemplate(name="Транспорт", type="expense", icon="🚗", color="#3B82F6", code="transport"),
    CategoryTemplate(name="Жильё и ЖКХ", type="expense", icon="🏠", color="#8B5CF6", code="housing"),
    CategoryTemplate(name="Связь и интернет", type="expense", icon="📱", color="#06B6D4", code="utilities"),
    CategoryTemplate(name="Развлечения", type="expense", icon="🎬", color="#F59E0B", code="entertainment"),
    CategoryTemplate(name="Здоровье", type="expense", icon="💊", color="#10B981", code="health"),
    CategoryTemplate(name="Одежда", type="expense", icon="👕", color="#EC4899", code="clothes"),
    CategoryTemplate(name="Образование", type="expense", icon="📚", color="#6366F1", code="education"),
    CategoryTemplate(name="Путешествия", type="expense", icon="✈️", color="#14B8A6", code="travel"),
    CategoryTemplate(name="Подарки", type="expense", icon="🎁", color="#F97316", code="gifts"),
    CategoryTemplate(name="Подписки", type="expense", icon="💳", color="#8B5CF6", code="subscriptions"),
    CategoryTemplate(name="Другое", type="expense", icon="📦", color="#6B7280", code="other"),
]

PERSONAL_INCOME_CATEGORIES = [
    CategoryTemplate(name="Зарплата", type="income", icon="💰", color="#10B981", code="salary"),
    CategoryTemplate(name="Подработка", type="income", icon="💵", color="#3B82F6", code="freelance"),
    CategoryTemplate(name="Подарки", type="income", icon="🎁", color="#F97316", code="gifts_income"),
    CategoryTemplate(name="Кэшбэк", type="income", icon="💳", color="#8B5CF6", code="cashback"),
    CategoryTemplate(name="Инвестиции", type="income", icon="📈", color="#06B6D4", code="investments"),
    CategoryTemplate(name="Другое", type="income", icon="📦", color="#6B7280", code="other_income"),
]

BUSINESS_EXPENSE_CATEGORIES = [
    CategoryTemplate(name="Офис и аренда", type="expense", icon="🏢", color="#8B5CF6", code="office"),
    CategoryTemplate(name="Оборудование", type="expense", icon="💻", color="#3B82F6", code="equipment"),
    CategoryTemplate(name="Реклама и маркетинг", type="expense", icon="📢", color="#F59E0B", code="marketing"),
    CategoryTemplate(name="Зарплаты сотрудникам", type="expense", icon="👥", color="#10B981", code="salaries"),
    CategoryTemplate(name="Налоги и сборы", type="expense", icon="📋", color="#EF4444", code="taxes"),
    CategoryTemplate(name="Транспорт", type="expense", icon="🚗", color="#06B6D4", code="transport"),
    CategoryTemplate(name="Связь и интернет", type="expense", icon="📱", color="#14B8A6", code="utilities"),
    CategoryTemplate(name="Закупки товаров", type="expense", icon="📦", color="#F97316", code="inventory"),
    CategoryTemplate(name="Подписки и сервисы", type="expense", icon="💳", color="#6366F1", code="subscriptions"),
    CategoryTemplate(name="Другое", type="expense", icon="📦", color="#6B7280", code="other"),
]

BUSINESS_INCOME_CATEGORIES = [
    CategoryTemplate(name="Продажи", type="income", icon="💰", color="#10B981", code="sales"),
    CategoryTemplate(name="Услуги", type="income", icon="🛠️", color="#3B82F6", code="services"),
    CategoryTemplate(name="Консалтинг", type="income", icon="📊", color="#8B5CF6", code="consulting"),
    CategoryTemplate(name="Комиссии", type="income", icon="💵", color="#F59E0B", code="commissions"),
    CategoryTemplate(name="Инвестиции", type="income", icon="📈", color="#06B6D4", code="investments"),
    CategoryTemplate(name="Другое", type="income", icon="📦", color="#6B7280", code="other_income"),
]


def get_categories_for_type(usage_type: str) -> CategoryTemplates:
    """Получить шаблоны категорий для типа использования"""
    if usage_type == "business":
        return CategoryTemplates(
            expense_categories=BUSINESS_EXPENSE_CATEGORIES,
            income_categories=BUSINESS_INCOME_CATEGORIES
        )
    else:
        return CategoryTemplates(
            expense_categories=PERSONAL_EXPENSE_CATEGORIES,
            income_categories=PERSONAL_INCOME_CATEGORIES
        )


# === API Endpoints ===

@router.get("/status", response_model=OnboardingStatus)
async def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить статус онбординга пользователя"""
    return OnboardingStatus(
        completed=current_user.onboarding_completed or False,
        current_step=current_user.onboarding_step or 0,
        started_at=current_user.onboarding_started_at,
        completed_at=current_user.onboarding_completed_at,
        data={
            "currency": current_user.preferred_currency,
            "usage_type": current_user.usage_type,
            "monthly_budget": float(current_user.monthly_budget) if current_user.monthly_budget else None
        }
    )


@router.get("/categories/{usage_type}", response_model=CategoryTemplates)
async def get_category_templates(
    usage_type: str,
    current_user: User = Depends(get_current_user)
):
    """Получить шаблоны категорий для типа использования"""
    if usage_type not in ["personal", "business"]:
        raise HTTPException(status_code=400, detail="Invalid usage type")
    return get_categories_for_type(usage_type)


@router.post("/step/1", response_model=OnboardingStepResponse)
async def save_step1_currency(
    data: Step1Currency,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Шаг 1: Сохранить выбранную валюту"""
    query = text("""
        UPDATE users 
        SET preferred_currency = :currency,
            onboarding_step = 1,
            onboarding_started_at = COALESCE(onboarding_started_at, NOW())
        WHERE user_id = :user_id
    """)
    
    await db.execute(query, {
        "currency": data.currency.value,
        "user_id": current_user.user_id
    })
    await db.commit()
    
    return OnboardingStepResponse(
        success=True,
        step=1,
        message="Валюта сохранена",
        next_step=2
    )


@router.post("/step/2", response_model=OnboardingStepResponse)
async def save_step2_usage_type(
    data: Step2UsageType,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Шаг 2: Сохранить тип использования"""
    query = text("""
        UPDATE users 
        SET usage_type = :usage_type,
            onboarding_step = 2
        WHERE user_id = :user_id
    """)
    
    await db.execute(query, {
        "usage_type": data.usage_type.value,
        "user_id": current_user.user_id
    })
    await db.commit()
    
    return OnboardingStepResponse(
        success=True,
        step=2,
        message="Тип использования сохранён",
        next_step=3
    )


@router.post("/step/3", response_model=OnboardingStepResponse)
async def save_step3_budget(
    data: Step3Budget,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Шаг 3: Сохранить месячный бюджет"""
    
    # Получаем текущую валюту пользователя
    currency = current_user.preferred_currency or "KGS"
    current_month = datetime.now().strftime("%Y-%m")
    
    # Обновляем пользователя
    update_user = text("""
        UPDATE users 
        SET monthly_budget = :budget,
            onboarding_step = 3
        WHERE user_id = :user_id
    """)
    
    await db.execute(update_user, {
        "budget": data.monthly_budget,
        "user_id": current_user.user_id
    })
    
    # Создаём или обновляем запись бюджета на текущий месяц
    # Сначала проверяем существует ли бюджет
    check_budget = text("""
        SELECT id FROM budgets WHERE user_id = :user_id AND month = :month
    """)
    result = await db.execute(check_budget, {
        "user_id": current_user.user_id,
        "month": current_month
    })
    existing = result.scalar()
    
    if existing:
        update_budget = text("""
            UPDATE budgets SET budget_amount = :amount, currency = :currency, last_updated = NOW()
            WHERE user_id = :user_id AND month = :month
        """)
        await db.execute(update_budget, {
            "user_id": current_user.user_id,
            "month": current_month,
            "amount": data.monthly_budget,
            "currency": currency
        })
    else:
        insert_budget = text("""
            INSERT INTO budgets (user_id, month, budget_amount, currency)
            VALUES (:user_id, :month, :amount, :currency)
        """)
        await db.execute(insert_budget, {
            "user_id": current_user.user_id,
            "month": current_month,
            "amount": data.monthly_budget,
            "currency": currency
        })
    
    await db.commit()
    
    return OnboardingStepResponse(
        success=True,
        step=3,
        message="Бюджет сохранён",
        next_step=4
    )


@router.post("/step/4", response_model=OnboardingStepResponse)
async def save_step4_categories(
    data: Step4Categories,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Шаг 4: Создать категории на основе выбора"""
    
    # Получаем тип использования
    usage_type = current_user.usage_type or "personal"
    templates = get_categories_for_type(usage_type)
    
    # Удаляем старые пользовательские категории (если есть)
    delete_old = text("""
        DELETE FROM categories WHERE user_id = :user_id
    """)
    await db.execute(delete_old, {"user_id": current_user.user_id})
    
    # Создаём категории расходов
    sort_order = 1
    for cat in templates.expense_categories:
        is_selected = cat.code in data.selected_categories
        order = sort_order if is_selected else sort_order + 100
        
        insert_cat = text("""
            INSERT INTO categories (user_id, name, type, icon, color, is_default, is_active, sort_order)
            VALUES (:user_id, :name, :type, :icon, :color, false, true, :sort_order)
        """)
        
        await db.execute(insert_cat, {
            "user_id": current_user.user_id,
            "name": cat.name,
            "type": cat.type,
            "icon": cat.icon,
            "color": cat.color,
            "sort_order": order
        })
        
        if is_selected:
            sort_order += 1
    
    # Создаём категории доходов
    sort_order = 1
    for cat in templates.income_categories:
        insert_cat = text("""
            INSERT INTO categories (user_id, name, type, icon, color, is_default, is_active, sort_order)
            VALUES (:user_id, :name, :type, :icon, :color, false, true, :sort_order)
        """)
        
        await db.execute(insert_cat, {
            "user_id": current_user.user_id,
            "name": cat.name,
            "type": cat.type,
            "icon": cat.icon,
            "color": cat.color,
            "sort_order": sort_order
        })
        sort_order += 1
    
    # Обновляем шаг
    update_step = text("""
        UPDATE users SET onboarding_step = 4 WHERE user_id = :user_id
    """)
    await db.execute(update_step, {"user_id": current_user.user_id})
    
    await db.commit()
    
    return OnboardingStepResponse(
        success=True,
        step=4,
        message=f"Создано категорий: {len(templates.expense_categories) + len(templates.income_categories)}",
        next_step=5
    )


@router.post("/step/5", response_model=OnboardingStepResponse)
async def save_step5_notifications(
    data: Step5Notifications,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Шаг 5: Сохранить настройки уведомлений"""
    
    notification_json = json.dumps(data.notifications.model_dump())
    
    # Проверяем есть ли запись
    check_query = text("""
        SELECT id FROM user_preferences WHERE user_id = :user_id
    """)
    result = await db.execute(check_query, {"user_id": current_user.user_id})
    existing = result.scalar()
    
    if existing:
        # Update existing
        update_prefs = text("""
            UPDATE user_preferences 
            SET notification_settings = CAST(:settings AS jsonb), updated_at = NOW()
            WHERE user_id = :user_id
        """)
        await db.execute(update_prefs, {
            "user_id": current_user.user_id,
            "settings": notification_json
        })
    else:
        # Insert new
        insert_prefs = text("""
            INSERT INTO user_preferences (user_id, notification_settings)
            VALUES (:user_id, CAST(:settings AS jsonb))
        """)
        await db.execute(insert_prefs, {
            "user_id": current_user.user_id,
            "settings": notification_json
        })
    
    # Обновляем шаг
    update_step = text("""
        UPDATE users SET onboarding_step = 5 WHERE user_id = :user_id
    """)
    await db.execute(update_step, {"user_id": current_user.user_id})
    
    await db.commit()
    
    return OnboardingStepResponse(
        success=True,
        step=5,
        message="Настройки уведомлений сохранены",
        next_step=None
    )


@router.post("/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Завершить онбординг"""
    
    # Проверяем что все шаги пройдены
    if (current_user.onboarding_step or 0) < 5:
        raise HTTPException(
            status_code=400, 
            detail=f"Не все шаги завершены. Текущий шаг: {current_user.onboarding_step}"
        )
    
    # Отмечаем онбординг как завершённый
    complete_query = text("""
        UPDATE users 
        SET onboarding_completed = true,
            onboarding_completed_at = NOW()
        WHERE user_id = :user_id
    """)
    
    await db.execute(complete_query, {"user_id": current_user.user_id})
    await db.commit()
    
    return OnboardingCompleteResponse(
        success=True,
        message="Онбординг завершён! Добро пожаловать!",
        redirect="/home"
    )


@router.get("/summary")
async def get_onboarding_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить сводку настроек после онбординга"""
    
    # Получаем количество категорий
    cat_query = text("""
        SELECT COUNT(*) as count FROM categories WHERE user_id = :user_id
    """)
    result = await db.execute(cat_query, {"user_id": current_user.user_id})
    cat_count = result.scalar() or 0
    
    # Получаем настройки уведомлений
    prefs_query = text("""
        SELECT notification_settings FROM user_preferences WHERE user_id = :user_id
    """)
    result = await db.execute(prefs_query, {"user_id": current_user.user_id})
    prefs = result.scalar()
    
    notifications_enabled = False
    if prefs:
        try:
            settings = json.loads(prefs) if isinstance(prefs, str) else prefs
            notifications_enabled = any([
                settings.get("weekly_report"),
                settings.get("monthly_report"),
                settings.get("budget_warning"),
                settings.get("debt_reminder")
            ])
        except:
            pass
    
    # Название типа использования
    usage_type_names = {
        "personal": "Личные финансы",
        "business": "Бизнес"
    }
    
    # Символы валют
    currency_symbols = {
        "KGS": "сом",
        "USD": "$",
        "EUR": "€",
        "RUB": "₽"
    }
    
    currency = current_user.preferred_currency or "KGS"
    budget = current_user.monthly_budget
    
    return {
        "currency": currency,
        "currency_display": f"{currency} ({currency_symbols.get(currency, currency)})",
        "usage_type": current_user.usage_type or "personal",
        "usage_type_display": usage_type_names.get(current_user.usage_type, "Личные финансы"),
        "monthly_budget": float(budget) if budget else 0,
        "monthly_budget_display": f"{int(budget):,}".replace(",", " ") + f" {currency_symbols.get(currency, currency)}/мес" if budget else "Не указан",
        "categories_count": cat_count,
        "notifications_enabled": notifications_enabled
    }


@router.post("/reset")
async def reset_onboarding(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Сбросить онбординг для тестирования"""
    
    # Сбрасываем флаги онбординга
    update_query = text("""
        UPDATE users 
        SET onboarding_completed = FALSE,
            onboarding_step = 0,
            onboarding_started_at = NULL,
            onboarding_completed_at = NULL
        WHERE telegram_chat_id = :user_id
    """)
    await db.execute(update_query, {"user_id": current_user.user_id})
    await db.commit()
    
    return {"success": True, "message": "Onboarding reset successfully"}
