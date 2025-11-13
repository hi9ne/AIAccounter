from fastapi import APIRouter
from typing import List, Dict

router = APIRouter()


# Категории расходов (из БД миграций)
EXPENSE_CATEGORIES = [
    {"id": "food", "name": "🍔 Еда", "emoji": "🍔"},
    {"id": "housing", "name": "🏠 Жилье", "emoji": "🏠"},
    {"id": "transport", "name": "🚗 Транспорт", "emoji": "🚗"},
    {"id": "health", "name": "💊 Здоровье", "emoji": "💊"},
    {"id": "education", "name": "🎓 Образование", "emoji": "🎓"},
    {"id": "entertainment", "name": "🎭 Развлечения", "emoji": "🎭"},
    {"id": "clothing", "name": "👗 Одежда", "emoji": "👗"},
    {"id": "communication", "name": "📱 Связь", "emoji": "📱"},
    {"id": "bank_fees", "name": "🏦 Банк/Комиссии", "emoji": "🏦"},
    {"id": "gifts", "name": "🎁 Подарки", "emoji": "🎁"},
    {"id": "sport", "name": "🏋️ Спорт", "emoji": "🏋️"},
    {"id": "travel", "name": "✈️ Путешествия", "emoji": "✈️"},
    {"id": "beauty", "name": "💄 Красота", "emoji": "💄"},
    {"id": "pets", "name": "🐕 Питомцы", "emoji": "🐕"},
    {"id": "books", "name": "📚 Книги", "emoji": "📚"},
    {"id": "restaurants", "name": "🍽️ Рестораны", "emoji": "🍽️"},
    {"id": "cafe", "name": "☕ Кафе", "emoji": "☕"},
    {"id": "groceries", "name": "🛒 Продукты", "emoji": "🛒"},
    {"id": "utilities", "name": "⚡ Коммуналка", "emoji": "⚡"},
    {"id": "taxi", "name": "🚕 Такси", "emoji": "🚕"},
    {"id": "debts", "name": "💳 Долги", "emoji": "💳"},
    {"id": "medicine", "name": "🏥 Лекарства", "emoji": "🏥"},
    {"id": "games", "name": "🎮 Игры", "emoji": "🎮"},
    {"id": "subscriptions", "name": "🎬 Подписки", "emoji": "🎬"},
    {"id": "shopping", "name": "📦 Покупки", "emoji": "📦"},
    {"id": "repair", "name": "🔧 Ремонт", "emoji": "🔧"},
    {"id": "car", "name": "🚙 Авто", "emoji": "🚙"},
    {"id": "rent", "name": "🏠 Аренда", "emoji": "🏠"},
    {"id": "internet_tv", "name": "📺 Интернет/ТВ", "emoji": "📺"},
    {"id": "hobby", "name": "🎪 Хобби", "emoji": "🎪"},
    {"id": "documents", "name": "📄 Документы", "emoji": "📄"},
    {"id": "cleaning", "name": "🧹 Уборка", "emoji": "🧹"},
    {"id": "business", "name": "💼 Бизнес", "emoji": "💼"},
    {"id": "gambling", "name": "🎰 Азарт", "emoji": "🎰"},
    {"id": "other", "name": "🤷 Другое", "emoji": "🤷"},
]

# Категории доходов
INCOME_CATEGORIES = [
    {"id": "salary", "name": "💰 Зарплата", "emoji": "💰"},
    {"id": "freelance", "name": "💼 Фриланс", "emoji": "💼"},
    {"id": "investment", "name": "📈 Инвестиции", "emoji": "📈"},
    {"id": "gifts", "name": "🎁 Подарки", "emoji": "🎁"},
    {"id": "debt_return", "name": "💸 Возврат долга", "emoji": "💸"},
    {"id": "bonus", "name": "🏆 Бонусы", "emoji": "🏆"},
    {"id": "dividends", "name": "🤝 Дивиденды", "emoji": "🤝"},
    {"id": "premium", "name": "🎯 Премия", "emoji": "🎯"},
    {"id": "cashback", "name": "💳 Кэшбэк", "emoji": "💳"},
    {"id": "sale", "name": "🏪 Продажа", "emoji": "🏪"},
    {"id": "rental", "name": "🏠 Аренда", "emoji": "🏠"},
    {"id": "other_income", "name": "📊 Прочее", "emoji": "📊"},
    {"id": "passive", "name": "💎 Пассивный доход", "emoji": "💎"},
    {"id": "scholarship", "name": "🎓 Стипендия", "emoji": "🎓"},
    {"id": "alimony", "name": "👨‍👩‍👧 Алименты", "emoji": "👨‍👩‍👧"},
]

# Валюты
CURRENCIES = [
    {"code": "KGS", "name": "Кыргызский сом", "symbol": "сом", "flag": "🇰🇬"},
    {"code": "USD", "name": "Доллар США", "symbol": "$", "flag": "🇺🇸"},
    {"code": "EUR", "name": "Евро", "symbol": "€", "flag": "🇪🇺"},
    {"code": "RUB", "name": "Российский рубль", "symbol": "₽", "flag": "🇷🇺"},
]


@router.get("/expenses", response_model=List[Dict])
async def get_expense_categories():
    """
    Получить список всех категорий расходов
    
    Возвращает 35 категорий с эмодзи и переводами.
    """
    return EXPENSE_CATEGORIES


@router.get("/income", response_model=List[Dict])
async def get_income_categories():
    """
    Получить список всех категорий доходов
    
    Возвращает 15 категорий с эмодзи и переводами.
    """
    return INCOME_CATEGORIES


@router.get("/currencies", response_model=List[Dict])
async def get_currencies():
    """
    Получить список поддерживаемых валют
    
    Возвращает 4 валюты: KGS, USD, EUR, RUB
    """
    return CURRENCIES


@router.get("/all")
async def get_all_categories():
    """
    Получить все категории и валюты одним запросом
    
    Удобно для инициализации приложения.
    """
    return {
        "expense_categories": EXPENSE_CATEGORIES,
        "income_categories": INCOME_CATEGORIES,
        "currencies": CURRENCIES,
        "total_expense_categories": len(EXPENSE_CATEGORIES),
        "total_income_categories": len(INCOME_CATEGORIES),
        "total_currencies": len(CURRENCIES),
    }
