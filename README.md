# 🤖 AIAccounter - AI-Powered Financial Tracking Bot

<div align="center">

![Version](https://img.shields.io/badge/version-2.4.0-blue.svg)
![Status](https://img.shields.io/badge/status-production-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Telegram-blue.svg)

**Умный финансовый помощник для Telegram с AI-агентом и автоматизацией**

[Возможности](#-возможности) • [Деплой](#-деплой) • [Быстрый старт](#-быстрый-старт) • [Документация](#-документация)

</div>

---

## 🚀 Деплой

### Production Setup
- **Frontend**: Cloudflare Pages (бесплатно, CDN)
- **Backend**: Railway (бесплатно 500 часов/месяц)
- **База данных**: Supabase PostgreSQL (бесплатно)

📖 Полная инструкция: [DEPLOY.md](DEPLOY.md)

**Быстрый старт:**
```bash
# 1. Backend на Railway
railway.app → New Project → GitHub → backend/

# 2. Frontend на Cloudflare Pages
dash.cloudflare.com → Pages → GitHub → miniapp/

# 3. Обновите miniapp-config.js с URL от Railway
```

---

## 📋 О проекте

**AIAccounter** - это Telegram-бот с искусственным интеллектом для учёта личных и бизнес-финансов, специально адаптированный для Кыргызстана. Поддерживает естественный язык (русский, английский), автоматические уведомления, ML-анализ трат и работу с 4 валютами.

### 🎯 Для кого это решение

- 👤 **Фрилансеры** - учёт доходов и расходов
- 🏢 **Малый бизнес** - управление финансами компании
- 💼 **ИП в Кыргызстане** - отслеживание налогов и патентов
- 📊 **Все, кто хочет контролировать траты** - с AI-помощником

---

## ✨ Возможности

### 🤖 AI-Агент (GPT-4o-mini)
- 💬 Диалоговый интерфейс на естественном языке
- 🎤 Голосовой ввод транзакций
- 📊 Автоматическое распознавание категорий
- 💡 Умные рекомендации по бюджету

### 💰 Управление финансами
- ➕ Доходы и расходы (35+ категорий)
- 💱 4 валюты: KGS (сом), USD, EUR, RUB
- 📈 Статистика и отчёты (день/неделя/месяц/год)
- 🏷️ Категории, адаптированные для Кыргызстана
- 🗑️ Редактирование и удаление транзакций (soft delete)

### 🔔 Подписки и уведомления (v2.3.0)
- 📅 Регулярные платежи (Netflix, аренда, налоги)
- ⏰ Напоминания за N дней до оплаты
- 🚨 Алерты о превышении бюджета (настраиваемые пороги)
- 📊 ML-детектор необычных трат (2σ от среднего)
- 🔔 Система уведомлений с приоритетами

### 💰 Бюджет и прогноз (v2.3.0)
- 📈 Прогноз расходов до конца месяца
- 🎯 Рекомендуемый дневной лимит
- ⚠️ Статусы: ok / warning / critical
- 💡 Персонализированные советы

### 📱 Telegram Mini App
- 🎨 Красивый веб-интерфейс внутри Telegram
- 📊 6 вкладок: Добавить, Статистика, Подписки, Уведомления, Бюджет, История
- 📈 Графики и прогресс-бары
- 🔄 Real-time синхронизация с ботом

### 🤖 Автоматизация (n8n)
- ⏰ Ежедневная проверка подписок (09:00)
- 📊 Проверка бюджета каждый час
- 🧠 ML-анализ трат каждый понедельник
- 💱 Автообновление курсов валют

---

## 🏗️ Архитектура

```
┌─────────────────────────┐
│   Telegram User         │
└───────────┬─────────────┘
            │
    ┌───────┴──────┐
    │              │
┌───▼──────┐  ┌───▼────────────┐
│ Bot API  │  │ Mini App (Web) │
└───┬──────┘  └───┬────────────┘
    │             │
    │   ┌─────────▼─────────────┐
    │   │  MiniApp_API (n8n)    │
    │   └─────────┬─────────────┘
    │             │
┌───▼─────────────▼──────────────┐
│   AnaliziFinance (n8n)         │
│   - AI Agent (GPT-4o-mini)     │
│   - 16 AI Tools                │
└───────────┬────────────────────┘
            │
    ┌───────┴──────┐
    │              │
┌───▼──────────┐  ┌▼───────────────┐
│   Supabase   │  │ Background Jobs│
│  PostgreSQL  │  │ (3 workflows)  │
│  10 tables   │  └────────────────┘
│  9 functions │
└──────────────┘
```

---

## 🚀 Быстрый старт

### Предварительные требования

- 🤖 Telegram Bot Token (от [@BotFather](https://t.me/botfather))
- 🗄️ Supabase аккаунт (PostgreSQL)
- 🔄 n8n аккаунт (workflows)
- 🤖 OpenAI API Key (GPT-4o-mini)

### Установка за 5 шагов

#### 1️⃣ Создать базу данных

```sql
-- Выполни в Supabase SQL Editor
-- Файл: migrations/add_currency_field.sql
-- Файл: migrations/add_exchange_rates.sql
-- Файл: migrations/add_transaction_management.sql
-- Файл: migrations/add_notifications_recurring_v2.3.sql
```

📖 **Детали:** `docs/INSTALLATION_GUIDE.md`

#### 2️⃣ Импортировать workflows в n8n

```bash
# Импортируй эти файлы через n8n UI:
AnaliziFinance.json                 # Основной AI-бот
MiniApp_API.json                    # API для Mini App
Recurring_Payments_Checker.json    # Проверка подписок
Budget_Alert_Checker.json          # Проверка бюджета
Spending_Pattern_Analyzer.json     # ML-анализ
```

#### 3️⃣ Настроить credentials

В n8n добавь:
- **Telegram Bot Token** (от BotFather)
- **OpenAI API Key** (GPT-4o-mini)
- **PostgreSQL** (Supabase connection string)

#### 4️⃣ Деплой Mini App

```bash
# Залей файлы на хостинг:
miniapp/index.html
miniapp/style.css
miniapp/app.js
miniapp/miniapp-config.js
```

Обнови webhook URL в `app.js`:
```javascript
const webhookUrl = 'https://your-n8n.domain/webhook/miniapp';
```

#### 5️⃣ Настроить Telegram Bot

```
/setmenubutton
URL: https://your-domain.com/miniapp/
```

### 🎉 Готово!

Теперь можешь:
- Написать боту: "Добавь расход 500 сом на продукты"
- Открыть Mini App из меню бота
- Настроить подписку Netflix $12.99

📖 **Полная инструкция:** `docs/QUICKSTART_v2.3.md`

---

## 📚 Документация

### Для начала работы
- 📖 [QUICKSTART_v2.3.md](docs/QUICKSTART_v2.3.md) - быстрый старт
- 🛠️ [INSTALLATION_GUIDE.md](docs/INSTALLATION_GUIDE.md) - детальная установка
- 📋 [NEXT_STEPS.md](NEXT_STEPS.md) - что делать после клонирования

### Для разработчиков
- 🏗️ [RELEASE_v2.3.md](docs/RELEASE_v2.3.md) - полное описание v2.3.0 (5500+ слов)
- 🤖 [AI_TOOLS_v2.3.md](docs/AI_TOOLS_v2.3.md) - описание AI инструментов
- 📱 [MINIAPP_SETUP.md](docs/MINIAPP_SETUP.md) - настройка Mini App
- 🔄 [MINIAPP_API_IMPORT_v2.3.md](docs/MINIAPP_API_IMPORT_v2.3.md) - импорт API
- 💾 [SQL_QUERIES.md](docs/SQL_QUERIES.md) - SQL запросы и функции

### Бизнес-логика
- 💱 [MULTICURRENCY_GUIDE.md](docs/MULTICURRENCY_GUIDE.md) - работа с валютами
- 📊 [ROADMAP_v2.3.md](docs/ROADMAP_v2.3.md) - план развития

### История изменений
- 📝 [CHANGELOG.md](CHANGELOG.md) - все версии
- 📦 [SUMMARY_v2.3.md](docs/SUMMARY_v2.3.md) - итоговый summary v2.3.0

---

## 🎯 Релизы

### v2.3.0 - Notifications & Recurring Payments (31.10.2025) ✨ **LATEST**

**Новые возможности:**
- 🔔 Система подписок (recurring payments)
- 📊 Прогноз бюджета с рекомендациями
- 🚨 Умные уведомления с приоритетами
- 🤖 ML-детектор необычных трат (2σ)
- 📱 3 новые вкладки в Mini App

**Статистика:**
- +8 API endpoints (7 → 15)
- +6 AI tools (10 → 16)
- +4 таблицы БД (6 → 10)
- +9 SQL функций
- +3 автоматизации

📖 **Детали:** [docs/RELEASE_v2.3.md](docs/RELEASE_v2.3.md)

### v2.2.0 - Transaction Management (23.10.2025)

- ✏️ Редактирование транзакций
- 🗑️ Soft delete с возможностью восстановления
- 📜 История изменений транзакций
- 🔍 Продвинутые фильтры

📖 **Детали:** [docs/RELEASE_v2.2.md](docs/RELEASE_v2.2.md)

### v2.1.0 - Mini App UI (15.10.2025)

- 📱 Telegram Mini App интерфейс
- 🎨 6 вкладок: Add, Stats, History, Reports
- 🎤 Голосовой ввод
- 📊 Графики и статистика

📖 **Детали:** [docs/RELEASE_v2.1.md](docs/RELEASE_v2.1.md)

### v2.0.0 - Multi-Currency (07.10.2025)

- 💱 4 валюты: KGS, USD, EUR, RUB
- 🔄 Автообновление курсов NBK
- 🌍 Адаптация для Кыргызстана
- 📊 35+ категорий

📖 **Детали:** [docs/RELEASE_v2.0.md](docs/RELEASE_v2.0.md)

---

## 💻 Технологии

### Backend
- 🤖 **OpenAI GPT-4o-mini** - AI агент
- 🗄️ **Supabase (PostgreSQL)** - база данных
- 🔄 **n8n** - автоматизация и workflows
- 📱 **Telegram Bot API** - интеграция с Telegram

### Frontend
- 📱 **Telegram Mini App** - веб-интерфейс
- 🎨 **Vanilla JavaScript** - без фреймворков
- 🎨 **CSS3** - современные стили
- 📊 **Chart.js** - графики (планируется)

### Database Schema (v2.3.0)

**10 таблиц:**
- `income` - доходы
- `expenses` - расходы
- `budgets` - бюджеты
- `exchange_rates` - курсы валют
- `recurring_payments` ⭐ - подписки
- `notifications` ⭐ - уведомления
- `budget_alerts_config` ⭐ - настройки алертов
- `spending_patterns` ⭐ - ML паттерны трат
- `transaction_history` - история изменений
- `income_history` - история доходов

**9 SQL функций:**
- `create_recurring_payment()` ⭐
- `execute_recurring_payment()` ⭐
- `get_pending_reminders()` ⭐
- `mark_reminder_sent()` ⭐
- `check_budget_alerts()` ⭐
- `check_category_limit_alert()` ⭐
- `detect_unusual_spending()` ⭐
- `update_spending_patterns()` ⭐
- `get_budget_forecast()` ⭐

---

## 🎮 Примеры использования

### 💬 Через бота (естественный язык)

```
👤 Пользователь: Добавь расход 500 сом на продукты
🤖 AIAccounter: ✅ Расход добавлен! 500 KGS • Продукты питания

👤 Пользователь: Сколько я потратил в этом месяце?
🤖 AIAccounter: 📊 Статистика за октябрь:
    💰 Доходы: 50,000 с
    💸 Расходы: 32,500 с
    ✅ Прибыль: 17,500 с

👤 Пользователь: Добавь подписку Netflix $12.99 ежемесячно
🤖 AIAccounter: ✅ Подписка создана! 📅 Netflix - 12.99 USD / ежемесячно
    Напомню за 3 дня до оплаты

👤 Пользователь: Покажи прогноз бюджета
🤖 AIAccounter: 💰 Прогноз бюджета на октябрь:
    📊 Использовано: 65% (32,500 / 50,000 с)
    💵 Остаток: 17,500 с
    📈 Прогноз на конец месяца: 48,200 с
    ✅ Статус: В рамках бюджета
```

### 📱 Через Mini App

1. Открой **Mini App** из меню бота
2. Вкладка **Добавить** - быстрое добавление транзакции
3. Вкладка **Подписки** - управление регулярными платежами
4. Вкладка **Уведомления** - лента алертов
5. Вкладка **Бюджет** - прогресс-бар и прогноз
6. Вкладка **История** - все транзакции с фильтрами

---

## 🔧 Конфигурация

### Environment Variables (n8n)

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABC...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
DB_CONNECTION_STRING=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

### Mini App Config

```javascript
// miniapp/miniapp-config.js
const WEBHOOK_URL = 'https://your-n8n.domain/webhook/miniapp';
const API_TIMEOUT = 10000; // 10 seconds
```

---

## 📊 Поддерживаемые категории

### 💰 Доходы (12 категорий)
Зарплата, Продажи товаров, Продажи услуг, Подработка, Дивиденды от инвестиций, Возврат налогов, Кэшбек, Партнерские программы, Консалтинг, Обучение клиентов, Фриланс, Аренда имущества

### 💸 Расходы (23 категории)
Продукты питания, Транспорт, Аренда офиса, Зарплата сотрудников, Реклама и маркетинг, Налоги и сборы, Канцелярия и офис, Связь и интернет, Обучение персонала, Страхование, Банковские услуги, Консалтинг и аудит, Ремонт и обслуживание, Коммунальные услуги, IT-услуги и софт, Командировочные, Кафе и рестораны, Медицина, Одежда, Развлечения, Хозяйственные товары, Образование, Благотворительность, **Подписки** ⭐

---

## 🤝 Contributing

Вклад в проект приветствуется! 

### Как помочь проекту:

1. 🐛 **Сообщить о баге** - создай Issue
2. 💡 **Предложить фичу** - создай Issue с описанием
3. 📝 **Улучшить документацию** - создай Pull Request
4. 🔧 **Добавить фичу** - fork, develop, PR

### Development Setup

```bash
# Клонировать репозиторий
git clone https://github.com/hi9ne/AIAccounter.git
cd AIAccounter

# Следовать инструкции из INSTALLATION_GUIDE.md
```

---

## 📝 Лицензия

MIT License - свободно используй для личных и коммерческих проектов.

---

## 📞 Поддержка

- 📧 **Email:** support@aiaccounter.example
- 💬 **Telegram:** [@AIAccounterBot](https://t.me/your_bot)
- 📖 **Документация:** [docs/](docs/)
- 🐛 **Issues:** [GitHub Issues](https://github.com/hi9ne/AIAccounter/issues)

---

## 🏆 Roadmap

### v2.4.0 (Q1 2026) - Multi-tenancy & Analytics
- 👥 Командная работа (несколько пользователей)
- 📊 Продвинутая аналитика с Chart.js
- 📈 Экспорт в Excel/PDF
- 🔐 Права доступа

### v2.5.0 (Q2 2026) - Integrations
- 🏦 Интеграция с банками (Демир, KICB)
- 📱 Импорт SMS от банков
- 🔄 Синхронизация с облачными хранилищами
- 📊 Integration с 1C

📖 **Полный roadmap:** [docs/ROADMAP_v2.3.md](docs/ROADMAP_v2.3.md)

---

## 🌟 Благодарности

- 🤖 **OpenAI** - GPT-4o-mini API
- 📱 **Telegram** - Bot API и Mini Apps
- 🗄️ **Supabase** - PostgreSQL hosting
- 🔄 **n8n** - workflow automation
- 🇰🇬 **NBK (Национальный банк Кыргызстана)** - курсы валют

---

## 📈 Статистика проекта

- ⭐ **Строк кода:** ~15,000+
- 📁 **Файлов:** 50+
- 🗄️ **Таблиц БД:** 10
- 🤖 **AI Tools:** 16
- 🔄 **Workflows:** 8
- 📚 **Документов:** 15+
- 🎯 **Категорий:** 35+
- 💱 **Валют:** 4
- 🌍 **Языков:** 2 (RU, EN)

---

<div align="center">

**⭐ Если проект полезен - поставь звезду на GitHub! ⭐**

Made with ❤️ for Kyrgyzstan 🇰🇬

[⬆ Вернуться к началу](#-aiaccounter---ai-powered-financial-tracking-bot)

</div>
