# 🔄 Changelog - AI Accounter

## [2.4.0-hotfix] - 31.10.2025 - Telegram API Compatibility Fix 🔧

**Статус:** ✅ COMPLETE  
**Документация:** `docs/HOTFIX_TELEGRAM_API.md`

### 🐛 Bug Fixes
- ✅ **Telegram WebApp API Compatibility** - Добавлена поддержка старых версий (v6.0+)
  - Fallback для `tg.showAlert()` → `alert()`
  - Fallback для `tg.MainButton` API
  - Mock Telegram WebApp для локального тестирования
  - Fallback User ID (123456789) для разработки
- ✅ **Graceful Degradation** - Приложение работает в любом окружении:
  - Обычный браузер (Chrome/Firefox/Safari)
  - Telegram Desktop/Mobile (v6.0+)
  - Telegram Web App (все версии)
- ✅ **Error Handling** - Try-catch блоки для всех Telegram API вызовов
- ✅ **Logging** - Подробное логирование в console для отладки

### 📝 Changed Files
- `miniapp/app.js` - 4 функции исправлены (~70 строк кода)
- `docs/HOTFIX_TELEGRAM_API.md` - Документация hotfix

---

## [2.4.0] - В разработке - Workspaces & Analytics 👥📊

**Статус:** � 50% Complete (4/8 phases)  
**Документация:** `docs/ROADMAP_v2.4.md`, `docs/PROGRESS_v2.4.0.md`, `docs/ANALYTICS_API_v2.4.md`  
**Планируемый релиз:** Q1 2026 (Январь-Февраль)

### 🎯 Главные фичи (Completed)

#### 👥 Multi-tenancy & Workspaces ✅
- ✅ Создание рабочих пространств (личный, семейный, бизнес)
- ✅ Роли и права доступа: Owner, Admin, Editor, Viewer
- ✅ Приглашения участников через invite links
- ✅ Audit log - история всех действий в workspace
- ✅ Управление участниками (добавление/удаление/изменение ролей)

#### 📊 Advanced Analytics ✅
- ✅ Chart.js интеграция (Line, Pie, Bar charts)
- ✅ Дашборд с метриками (доходы, расходы, баланс, накопления)
- ✅ График "Доходы vs Расходы"
- ✅ Круговая диаграмма "Расходы по категориям"
- ✅ Тренд баланса
- ✅ Топ категорий расходов с процентами
- ✅ **Analytics API** - 10 endpoints для графиков и статистики
- ✅ Кэширование аналитики для оптимизации
- ✅ Персонализация графиков (сохранение конфигураций)
- ✅ Обнаружение паттернов трат (recurring, anomaly, seasonal)

#### ⚙️ User Preferences & Settings ✅
- ✅ Темы оформления: Light, Dark, Auto
- ✅ Мультиязычность: Русский, English, Кыргызча
- ✅ Настройка валюты по умолчанию
- ✅ Часовой пояс
- ✅ Управление уведомлениями (Telegram, Push, Email)

### 🎯 Главные фичи (In Progress)

#### 📄 Reports Generation 🔄
- ⏳ PDF отчёты (Puppeteer)
- ⏳ Excel экспорт (ExcelJS)
- ⏳ CSV экспорт
- ⏳ Автоматическая генерация (scheduled)
- ⏳ Отправка на email

#### 🤖 ML Forecasting 🔄
- ⏳ Python Flask микросервис
- ⏳ Prophet для сезонного прогнозирования
- ⏳ ARIMA для временных рядов
- ⏳ Confidence intervals (95%)
- ⏳ Прогноз на 1-12 месяцев вперёд

### 🗄️ База данных

#### Новые таблицы (7)
- ✅ `workspaces` - рабочие пространства
- ✅ `workspace_members` - участники с ролями
- ✅ `workspace_invites` - пригласительные ссылки
- ✅ `invite_uses` - история активаций
- ✅ `audit_logs` - журнал действий
- ✅ `user_preferences` - настройки пользователей
- ✅ `analytics_cache` - кэш аналитики
- ✅ `reports` - сгенерированные отчёты
- ✅ `ml_forecasts` - ML прогнозы
- ✅ `chart_configs` - сохранённые графики
- ✅ `category_analytics` - аналитика по категориям
- ✅ `spending_patterns` - паттерны расходов

#### Обновлённые таблицы
- ✅ `income` - добавлен `workspace_id`
- ✅ `expenses` - добавлен `workspace_id`
- ✅ `budgets` - добавлен `workspace_id`
- ✅ `recurring_payments` - добавлен `workspace_id`
- ✅ `notifications` - добавлен `workspace_id`

#### SQL функции (22)
- ✅ `create_workspace_with_owner()` - создать workspace
- ✅ `check_workspace_permission()` - проверить права RBAC
- ✅ `get_user_workspaces()` - список workspaces
- ✅ `accept_workspace_invite()` - принять приглашение
- ✅ `remove_workspace_member()` - удалить участника
- ✅ `get_income_expense_stats()` - статистика за период
- ✅ `get_top_expense_categories()` - топ категории
- ✅ `get_income_expense_chart_data()` - данные для Chart.js
- ✅ `get_category_pie_chart_data()` - данные для pie chart
- ✅ `update_analytics_cache()` - обновить кэш
- ✅ `get_cached_analytics()` - получить из кэша
- ✅ `cleanup_expired_cache()` - очистить устаревший кэш
- ⏳ +10 функций для reports и forecasting

### 🔌 API

#### Workspace Management API ✅
**Файл:** `Workspace_API.json` (31 нода, 15 endpoints)

Endpoints:
- ✅ `POST /create_workspace` - создать workspace
- ✅ `POST /get_workspaces` - список workspaces
- ✅ `POST /update_workspace` - обновить workspace
- ✅ `POST /delete_workspace` - удалить workspace
- ✅ `POST /get_members` - участники workspace
- ✅ `POST /create_invite` - создать приглашение
- ✅ `POST /accept_invite` - принять приглашение
- ✅ `POST /remove_member` - удалить участника
- ✅ `POST /update_member_role` - изменить роль
- ✅ `POST /check_permission` - проверить права
- ✅ `POST /get_audit_logs` - история действий
- ✅ `POST /switch_workspace` - переключить workspace
- ✅ `POST /get_user_preferences` - получить настройки
- ✅ `POST /update_preferences` - сохранить настройки

#### Analytics API ✅
**Файл:** `Analytics_API.json` (32 ноды, 10 endpoints)  
**Документация:** `docs/ANALYTICS_API_v2.4.md`

Endpoints:
- ✅ `POST /get_income_expense_stats` - статистика доходов/расходов
- ✅ `POST /get_chart_data` - данные для Line chart (доходы vs расходы)
- ✅ `POST /get_top_categories` - топ категории для Pie chart
- ✅ `POST /get_category_analytics` - детальная аналитика по категориям
- ✅ `POST /get_spending_patterns` - обнаруженные паттерны трат
- ✅ `POST /get_balance_trend` - тренд баланса с cumulative sum
- ✅ `POST /update_analytics_cache` - сохранить кэш
- ✅ `POST /get_cached_analytics` - получить из кэша
- ✅ `POST /save_chart_config` - сохранить конфигурацию графика
- ✅ `POST /get_chart_configs` - получить сохранённые графики

### 📱 Mini App

#### Новые вкладки (4)
- ✅ **📈 Analytics** - графики и дашборд
- ✅ **👥 Team** - управление командой
- ✅ **📄 Reports** - генерация отчётов (UI готов, backend в разработке)
- ✅ **⚙️ Settings** - настройки приложения

**Всего вкладок:** 10 (было 6)

#### Chart.js интеграция ✅
- ✅ Line Chart - доходы vs расходы (interval: day/month)
- ✅ Pie Chart - категории расходов (топ 10)
- ✅ Line Chart - динамика баланса (cumulative)
- ✅ Responsive дизайн
- ✅ Адаптация для мобильных
- ✅ Интеграция с Analytics API

#### Dark Mode ✅
- ✅ Светлая тема (по умолчанию)
- ✅ Тёмная тема
- ✅ Auto режим (следует за системой)
- ✅ Адаптивные цвета для всех компонентов

#### UI Компоненты ✅
- ✅ Metrics grid (4 карточки с метриками)
- ✅ Chart containers
- ✅ Workspace selector
- ✅ Member cards с role badges
- ✅ Invite link generator
- ✅ Audit log UI
- ✅ Settings sections
- ✅ Responsive tabs scrolling

### 📝 Обновлённые файлы

#### Frontend
- ✅ `miniapp/index.html` (+200 строк) - 4 новые вкладки
- ✅ `miniapp/style.css` (+550 строк) - Dark Mode, новые стили
- ✅ `miniapp/app.js` (+750 строк) - 20+ новых функций

#### Backend
- ✅ `migrations/v2.4.0_workspaces.sql` (650 строк, 11 функций)
- ✅ `migrations/v2.4.0_analytics.sql` (550 строк, 11 функций)
- ✅ `Workspace_API.json` (31 нода)
- ⏳ `Analytics_API.json` (в разработке)
- ⏳ `Report_Generator.json` (планируется)

#### Documentation
- ✅ `docs/ROADMAP_v2.4.md` - план релиза
- ✅ `docs/PROGRESS_v2.4.0.md` - текущий прогресс

### 🤖 AI Tools & Workflows

#### Новые AI tools (планируется)
- ⏳ `Create_workspace` - создать workspace через AI
- ⏳ `Invite_member` - пригласить участника
- ⏳ `Get_analytics` - получить аналитику
- ⏳ `Generate_report` - сгенерировать отчёт
- ⏳ `Get_forecast` - получить ML прогноз

#### Новые workflows (планируется)
- ⏳ `Analytics_Cache_Updater.json` - обновление кэша (hourly)
- ⏳ `Report_Generator.json` - генерация отчётов
- ⏳ `ML_Forecast_Updater.json` - обновление прогнозов (daily)

### 📊 Статистика

**Код:**
- SQL: 1200+ строк, 22 функции
- JavaScript: 750+ строк, 20+ функций
- HTML: 200+ строк
- CSS: 550+ строк
- JSON (n8n): 31 нода

**База данных:**
- Новые таблицы: 7
- Обновлённые таблицы: 5
- SQL функции: 22

**API:**
- Endpoints: 15 (реализовано)
- Ноды n8n: 31

**UI:**
- Вкладки: 10 (было 6)
- Графики: 3 типа
- Темы: 3 режима

### 🔜 Что дальше?

**Phase 4:** Analytics API (в разработке)  
**Phase 5:** Reports Generation (планируется)  
**Phase 6:** ML Forecasting Service (планируется)  
**Phase 7:** AI Tools & Workflows (планируется)  
**Phase 8:** Testing & Documentation (планируется)

**Прогресс:** 3/8 фаз (37.5%)  
**Оценка:** 6-7 недель до завершения

---

## [2.3.0] - 31 октября 2025 - Напоминания и уведомления 🔔

**Статус:** 🟢 Production Ready  
**Документация:** `docs/RELEASE_v2.3.md`, `docs/QUICKSTART_v2.3.md`

### 🎯 Главные фичи

#### 🔔 Повторяющиеся платежи (Recurring Payments)
- ✅ Создание подписок: Netflix, Spotify, аренда, налоги
- ✅ Поддержка частоты: daily, weekly, monthly, yearly
- ✅ Гибкие интервалы: каждые 2 недели, каждые 3 месяца
- ✅ Автоматическое создание транзакций (опционально)
- ✅ Напоминания за N дней до платежа
- ✅ Команды: "Добавь подписку Netflix $12.99 ежемесячно"

#### 📊 Прогноз бюджета
- ✅ Прогнозирование расходов до конца месяца
- ✅ Рекомендуемый дневной лимит
- ✅ Статусы: ok, warning, critical
- ✅ Команды: "Сколько осталось до конца месяца?"

#### 🚨 Умные уведомления
- ✅ Алерты о превышении бюджета (80%, 100%)
- ✅ Уведомления по лимитам категорий
- ✅ Детектор необычных трат (ML-анализ)
- ✅ Настраиваемые пороги уведомлений
- ✅ Тихие часы (не беспокоить ночью)

#### 📈 ML-анализ трат (Spending Patterns)
- ✅ Автоматический анализ паттернов расходов
- ✅ Вычисление средних значений по категориям
- ✅ Определение необычных трат (2σ от среднего)
- ✅ Еженедельное обновление статистики

### 🗄️ Новые таблицы БД

#### recurring_payments
```sql
CREATE TABLE recurring_payments (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KGS',
    category VARCHAR(100) NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
    interval_value INTEGER DEFAULT 1,
    start_date DATE NOT NULL,
    next_payment_date DATE NOT NULL,
    remind_days_before INTEGER DEFAULT 3,
    auto_create BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### notifications
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- budget_warning, limit_exceeded, etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    is_sent BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB
);
```

#### budget_alerts_config
```sql
CREATE TABLE budget_alerts_config (
    user_id BIGINT PRIMARY KEY,
    budget_warning_threshold NUMERIC(5,2) DEFAULT 80.00,
    budget_critical_threshold NUMERIC(5,2) DEFAULT 100.00,
    max_alerts_per_day INTEGER DEFAULT 5,
    quiet_hours_start TIME DEFAULT '23:00',
    quiet_hours_end TIME DEFAULT '08:00'
);
```

#### spending_patterns
```sql
CREATE TABLE spending_patterns (
    user_id BIGINT NOT NULL,
    category VARCHAR(100) NOT NULL,
    avg_monthly_amount NUMERIC(12,2),
    std_deviation NUMERIC(12,2),
    unusual_threshold NUMERIC(12,2), -- avg + 2*stddev
    data_points_count INTEGER,
    UNIQUE(user_id, category)
);
```

### ⚙️ Новые SQL функции

1. **create_recurring_payment()** - создание повторяющихся платежей
2. **execute_recurring_payment()** - выполнение recurring payment
3. **get_pending_reminders()** - получить платежи требующие напоминания
4. **mark_reminder_sent()** - отметить отправку напоминания
5. **check_budget_alerts()** - проверка превышения бюджета
6. **check_category_limit_alert()** - проверка лимитов категорий
7. **detect_unusual_spending()** - детектор необычных трат
8. **update_spending_patterns()** - обновление ML-паттернов
9. **get_budget_forecast()** - прогноз бюджета до конца месяца

### 🤖 Новые AI инструменты

1. **Create_recurring_payment** - создание подписок через AI
2. **List_recurring_payments** - показать все подписки
3. **Cancel_recurring_payment** - отменить подписку
4. **Get_budget_forecast** - прогноз расходов
5. **Get_notifications** - получить уведомления
6. **Configure_alerts** - настроить пороги алертов

### 📊 Примеры использования

```
User: Добавь подписку Netflix $12.99 каждый месяц
Bot: ✅ Подписка создана!
     📅 Netflix - $12.99 / месяц
     🔔 Напомню за 3 дня
     📆 Следующий платеж: 1 декабря 2025

User: Сколько осталось до конца месяца?
Bot: 💰 Прогноз на октябрь:
     Потрачено: 32,500 / 50,000 сом (65%)
     Осталось: 7 дней
     📈 Прогноз: ~51,000 сом (превышение 2%)
     💡 Рекомендую сократить траты на 1,000 сом

User: Покажи мои подписки
Bot: 📋 Ваши подписки:
     1. Аренда офиса - 15,000 с (1 ноября)
     2. Netflix - $12.99 (15 ноября)
     3. Spotify - 169 ₽ (20 ноября)
     💰 Итого: ~17,500 сом/месяц

User: Настрой уведомления: предупреждать при 75%
Bot: ✅ Настройки обновлены!
     ⚠️ Предупреждение при 75% бюджета
     🚨 Критическое при 100%
```

### 🔧 Технические изменения

**Миграция:** `migrations/add_notifications_recurring_v2.3.sql`
- 4 новые таблицы
- 9 SQL функций
- 14+ индексов для производительности
- Проверки и ограничения (CHECK constraints)

**Документация:** `docs/AI_TOOLS_v2.3.md`
- Детальное описание всех 6 AI инструментов
- Примеры запросов пользователей
- Правила распознавания для AI
- Тестовые сценарии

**N8N Workflows (планируются):**
- Recurring_Payments_Checker.json - проверка напоминаний (ежедневно 09:00)
- Budget_Alert_Checker.json - проверка бюджетов (каждый час)
- Spending_Pattern_Analyzer.json - ML-анализ (еженедельно)

### 📈 Метрики релиза

- **Новых таблиц БД:** 4
- **SQL функций:** 9
- **AI инструментов:** 6 (всего станет 16)
- **Индексов:** 14+
- **Строк SQL кода:** 1200+
- **Поддерживаемых команд:** 20+

### 🚀 Roadmap

- [ ] n8n workflows для автоматических проверок
- [ ] Интеграция в Mini App (вкладки Подписки, Уведомления, Бюджет)
- [ ] Push-уведомления через Telegram Bot API
- [ ] Email уведомления (опционально)

---

## [2.2.0] - 30 октября 2025 - Управление транзакциями

### 🎯 Главная фича: Редактирование, удаление и восстановление транзакций

#### ✏️ Редактирование транзакций
- ✅ Изменение любых полей: сумма, категория, описание, дата, валюта
- ✅ Поиск транзакций по ID или слову "last"
- ✅ Команды: "Измени последний расход на 1500", "Поменяй категорию транзакции 15 на продукты"
- ✅ Полная история изменений в аудит-журнале

#### 🗑️ Мягкое удаление
- ✅ Транзакции не удаляются физически из БД
- ✅ Возможность восстановления в любой момент
- ✅ Команды: "Удали последний расход", "Удали транзакцию номер 25"
- ✅ Удалённые транзакции не показываются в статистике

#### 🔄 Восстановление
- ✅ Восстановление удалённых транзакций одной командой
- ✅ Команды: "Верни последнюю удалённую транзакцию", "Восстанови расход 12"
- ✅ Автоматическая очистка метки deleted_at

#### 📜 Аудит и история
- ✅ Полная история изменений каждой транзакции
- ✅ Отслеживание: создание, изменение, удаление, восстановление
- ✅ Команды: "Покажи историю транзакции 15", "История последнего расхода"
- ✅ Хранится: какое поле изменено, старое/новое значение, кто и когда

### 🗄️ Новая архитектура данных

#### Таблица transaction_history
```sql
CREATE TABLE transaction_history (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(10) NOT NULL,
    transaction_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    field_changed VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    changed_by BIGINT NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    details JSONB
);
```

#### Soft Delete Pattern
```sql
-- Добавлены столбцы в expenses и income
ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN deleted_by BIGINT;
ALTER TABLE income ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE income ADD COLUMN deleted_by BIGINT;
```

#### Представления активных транзакций
```sql
CREATE VIEW v_active_expenses AS
SELECT * FROM expenses WHERE deleted_at IS NULL;

CREATE VIEW v_active_income AS
SELECT * FROM income WHERE deleted_at IS NULL;
```

#### SQL Функции
```sql
-- Логирование изменений
CREATE FUNCTION log_transaction_change(
    p_transaction_type VARCHAR(10),
    p_transaction_id INTEGER,
    p_action VARCHAR(20),
    p_field_changed VARCHAR(50),
    p_old_value TEXT,
    p_new_value TEXT,
    p_changed_by BIGINT
) RETURNS INTEGER;

-- Поиск последней транзакции
CREATE FUNCTION get_last_transaction(
    p_user_id BIGINT,
    p_type VARCHAR(10)
) RETURNS INTEGER;

-- Поиск по сумме
CREATE FUNCTION find_transaction_by_amount(
    p_user_id BIGINT,
    p_amount NUMERIC,
    p_type VARCHAR(10)
) RETURNS INTEGER;

-- Проверка существования
CREATE FUNCTION transaction_exists(
    p_id INTEGER,
    p_type VARCHAR(10),
    p_user_id BIGINT
) RETURNS BOOLEAN;
```

### 🤖 Новые инструменты AI Agent

**Edit_transaction** (Postgres Tool)
```sql
-- Изменение полей транзакции с логированием
UPDATE expenses SET 
  amount = CASE WHEN field='amount' THEN new_value::NUMERIC ELSE amount END,
  category = CASE WHEN field='category' THEN new_value ELSE category END,
  description = CASE WHEN field='description' THEN new_value ELSE description END,
  date = CASE WHEN field='date' THEN new_value::TIMESTAMP ELSE date END,
  currency = CASE WHEN field='currency' THEN new_value ELSE currency END
WHERE id = found_transaction_id AND deleted_at IS NULL
```

**Delete_transaction** (Postgres Tool)
```sql
-- Мягкое удаление с логированием
UPDATE expenses 
SET deleted_at = NOW(), deleted_by = user_id
WHERE id = transaction_id AND deleted_at IS NULL
```

**Restore_transaction** (Postgres Tool)
```sql
-- Восстановление с логированием
UPDATE expenses 
SET deleted_at = NULL, deleted_by = NULL
WHERE id = transaction_id AND deleted_at IS NOT NULL
```

**Get_transaction_history** (Postgres Tool)
```sql
-- Просмотр истории изменений
SELECT 
  action, field_changed, old_value, new_value, 
  changed_at, details
FROM transaction_history
WHERE transaction_id = id AND transaction_type = type
ORDER BY changed_at DESC
LIMIT 50
```

### 📊 Примеры использования

```
✅ "Измени последний расход на 1500 сом"
   → ✏️ Транзакция изменена: сумма обновлена на 1,500 KGS

✅ "Поменяй категорию транзакции 15 на транспорт"
   → ✏️ Транзакция изменена: категория обновлена на 'транспорт'

✅ "Удали последний расход"
   → 🗑️ Транзакция удалена (можно восстановить)

✅ "Покажи все расходы за октябрь"
   → 📊 (удалённые не показываются)

✅ "Верни последнюю удалённую транзакцию"
   → 🔄 Транзакция восстановлена

✅ "Покажи историю транзакции 15"
   → 📜 История изменений:
      30.10.2025 12:00 - Создана (сумма: 500 KGS)
      30.10.2025 12:15 - Изменена сумма: 500 → 750 KGS
      30.10.2025 12:30 - Удалена
      30.10.2025 12:45 - Восстановлена
```

### 🔧 Технические изменения

#### Миграция базы данных
```bash
# Файл: migrations/add_transaction_management.sql
- Таблица transaction_history (10 полей)
- Столбцы deleted_at, deleted_by в expenses/income
- 4 SQL функции
- 2 представления (v_active_expenses, v_active_income)
- 5 индексов для быстрого поиска
```

#### Обновление AI Agent
```javascript
// AnaliziFinance.json
+ Edit_transaction (Postgres Tool)
+ Delete_transaction (Postgres Tool)
+ Restore_transaction (Postgres Tool)
+ Get_transaction_history (Postgres Tool)
+ Обновлён System Message с инструкциями управления транзакциями
+ Добавлены 4 новых ai_tool connections
```

### ⚡ Производительность

- Индексы на deleted_at для быстрой фильтрации активных транзакций
- Индексы на transaction_history для быстрого поиска истории
- View для исключения удалённых из выборок

### 🔐 Безопасность

- Soft delete: данные не теряются
- Проверка владельца транзакции перед изменением
- Аудит: полная история кто, что и когда изменил

### ✅ Тестирование

**Test Suite:**
- [ ] Тест 1: Создание транзакции
- [ ] Тест 2: Изменение суммы последней транзакции
- [ ] Тест 3: Удаление транзакции
- [ ] Тест 4: Проверка что удалённая не показывается в статистике
- [ ] Тест 5: Восстановление транзакции
- [ ] Тест 6: Просмотр истории изменений
- [ ] Тест 7: Изменение категории по ID
- [ ] Тест 8: Удаление по ID

### 📚 Новая документация

- ➕ `v2.2_SUMMARY.md` - краткая инструкция по развёртыванию
- ➕ `migrations/add_transaction_management.sql` - SQL миграция

---

# Changelog

## [2.2.0] - 2025-10-30

### Added
- ✏️ **Transaction Management**: редактирование, удаление и восстановление транзакций
- 📜 **Audit Log**: полная история изменений в таблице `transaction_history`
- 🔍 **Smart Search**: функция поиска последней транзакции по типу
- 🗑️ **Soft Delete**: безопасное удаление с возможностью восстановления

### Fixed
- ✅ Функция `get_last_transaction()` возвращает INTEGER вместо TABLE
- ✅ Исправлены имена колонок: `user_id` вместо `telegram_user_id`
- ✅ User ID берётся из Telegram триггера автоматически
- ✅ Добавлена поддержка 'last' через NULLIF для безопасного CAST
- ✅ Исправлено преобразование даты: TO_TIMESTAMP вместо ::TIMESTAMP
- ✅ Финальный SELECT возвращает row_to_json() вместо *

### Database
- Добавлена таблица `transaction_history` (8 полей)
- Добавлены колонки `deleted_at`, `deleted_by` в `expenses` и `income`
- 4 новых SQL функции для управления транзакциями

### AI Tools
- `Edit_transaction` - редактирование полей транзакции
- `Delete_transaction` - мягкое удаление
- `Restore_transaction` - восстановление удалённых
- `Get_transaction_history` - история изменений

### Tested
- ✅ Редактирование суммы последнего расхода
- ✅ Функция get_last_transaction() работает корректно
- ✅ История записывается в transaction_history

---

## [2.1.0] - 2025-10-29

### 🎯 Главная фича: Автоматическая конвертация валют

#### 💱 Конвертация в реальном времени
- ✅ Автоматическая конвертация между KGS, USD, EUR, RUB
- ✅ Актуальные курсы обновляются ежедневно в 10:00
- ✅ Команды: "Конвертируй 1000 сом в доллары", "Какой курс евро?"
- ✅ Статистика в любой валюте: "Покажи статистику в долларах"
- ✅ Кросс-конвертация: EUR→RUB, USD→EUR и т.д.

#### 🗄️ Новая архитектура данных
```sql
-- Таблица курсов валют
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(10, 6) NOT NULL,
    source VARCHAR(50) DEFAULT 'exchangerate-api.com',
    UNIQUE(date, from_currency, to_currency)
);

-- Функция получения курса
CREATE FUNCTION get_exchange_rate(
    p_from VARCHAR(3),
    p_to VARCHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC;

-- Функция конвертации
CREATE FUNCTION convert_amount(
    p_amount NUMERIC,
    p_from VARCHAR(3),
    p_to VARCHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC;

-- View актуальных курсов
CREATE VIEW v_latest_rates AS
SELECT * FROM exchange_rates 
WHERE date = (SELECT MAX(date) FROM exchange_rates);
```

#### 🤖 Новые инструменты AI Agent

**Convert_currency** (Postgres Tool)
```sql
-- Конвертация суммы с актуальным курсом
SELECT 
    {{ $fromAI("amount") }} as original_amount,
    UPPER('{{ $fromAI("from_currency") }}') as from_currency,
    UPPER('{{ $fromAI("to_currency") }}') as to_currency,
    get_exchange_rate(...) as rate,
    convert_amount(...) as converted_amount
```

**Get_exchange_rates** (Postgres Tool)
```sql
-- Просмотр всех актуальных курсов
SELECT 
    from_currency,
    to_currency,
    rate,
    date
FROM v_latest_rates
ORDER BY from_currency, to_currency;
```

#### 🔄 Новый workflow: ExchangeRates_Daily

**Cron Schedule:** Ежедневно в 10:00 (Asia/Bishkek)

**Workflow:**
1. HTTP Request → ExchangeRate-API
2. JavaScript → Трансформация данных
3. Postgres → INSERT с ON CONFLICT DO UPDATE
4. Telegram → Уведомление администратору

**Источник данных:** https://api.exchangerate-api.com/v4/latest/KGS

**Поддерживаемые пары:** 16+ комбинаций (KGS↔USD, KGS↔EUR, KGS↔RUB, USD↔EUR и т.д.)

### 📊 Примеры использования

#### Команды пользователя:
```
✅ "Конвертируй 1000 сом в доллары"
   → 💱 1,000 KGS = 11.50 USD (по курсу 87.00)

✅ "Какой курс евро?"
   → 💱 1 EUR = 94.50 KGS

✅ "Сколько будет 100 долларов в сомах?"
   → 💱 100 USD = 8,700 KGS

✅ "Переведи 50 евро в рубли"
   → 💱 50 EUR = 5,225 RUB (по курсу 104.50)

✅ "Покажи статистику в долларах"
   → 📊 Статистика за октябрь 2025 (в USD):
      💸 Расходы: 316.23 USD
      💰 Доходы: 1,179.46 USD
      📈 Прибыль: 863.23 USD

✅ "Все курсы"
   → 💱 Актуальные курсы на 30.10.2025:
      KGS → USD: 0.0115
      USD → KGS: 87.00
      ...
```

### 🔧 Технические изменения

#### Миграция базы данных
```bash
# Файл: migrations/add_exchange_rates.sql
- Таблица exchange_rates (6 полей)
- Функции get_exchange_rate() и convert_amount()
- View v_latest_rates для быстрого доступа
- Триггер auto_create_reverse_rate (автоматические обратные курсы)
- Начальные курсы (12+ записей)
```

#### Обновление AI Agent
```javascript
// AnaliziFinance.json
+ Convert_currency (Postgres Tool)
+ Get_exchange_rates (Postgres Tool)
+ Обновлён System Message с инструкциями конвертации
+ Добавлены ai_tool connections
```

### 📚 Новая документация

- ➕ `docs/CURRENCY_CONVERSION.md` - руководство пользователя
- ➕ `ROADMAP_v2.1.md` - план разработки
- ➕ `UPGRADE_TO_2.1.md` - инструкция обновления с v2.0
- ➕ `migrations/add_exchange_rates.sql` - SQL миграция

### 🐛 Исправления

- Исправлено: ошибки синтаксиса psql в документации (заменены на стандартный SQL)
- Улучшено: обработка ошибок при недоступности API курсов
- Улучшено: валидация валют перед конвертацией

### ⚡ Производительность

- View `v_latest_rates` для быстрого доступа к актуальным курсам
- Индексы на (date, from_currency, to_currency) для быстрого поиска
- Кэширование курсов в БД (не запрашиваем API каждый раз)

### 🔐 Безопасность

- ON CONFLICT DO UPDATE предотвращает дубликаты
- Валидация валют через CHECK constraints
- Rate limiting для API запросов (1 раз в день)

### 📊 Миграция с v2.0

**Время обновления:** ~20 минут

**Шаги:**
1. Выполните `migrations/add_exchange_rates.sql` в Supabase
2. Импортируйте `ExchangeRates_Daily.json` в n8n
3. Обновите `AnaliziFinance.json` в n8n
4. Протестируйте 6 команд конвертации

**Подробности:** См. `UPGRADE_TO_2.1.md`

### ✅ Тестирование

**Статус:** Готов к тестированию

**Test Suite:**
- [ ] Тест 1: Проверка курсов ("Какой курс доллара?")
- [ ] Тест 2: Конвертация ("Конвертируй 1000 сом в доллары")
- [ ] Тест 3: Обратная конвертация ("100 долларов в сомы")
- [ ] Тест 4: Кросс-конвертация ("50 евро в рубли")
- [ ] Тест 5: Статистика в валюте ("Статистика в долларах")
- [ ] Тест 6: Все курсы ("Все курсы")

---

## [2.0.0] - 28 января 2025 - Мультивалютность и улучшения

#### Мультивалютность
- 💱 Поддержка 4 валют: KGS (сом), USD, EUR, RUB
- 🏦 Автоматическое определение символа валюты
- 📊 Статистика с учётом валюты
- 📋 История с отображением валюты каждой транзакции

#### Улучшенные категории
- ➕ Добавлено 6 новых категорий расходов:
  - Кафе и рестораны
  - Медицина
  - Одежда
  - Развлечения
  - Хозяйственные товары
  - Образование
  - Благотворительность
  
- ➕ Добавлено 2 новые категории доходов:
  - Фриланс
  - Аренда имущества

#### Интеграция
- 🔗 Прямое подключение к Supabase (опционально)
- 🤖 Режим работы через Telegram Bot (по умолчанию)
- ⚙️ Конфигурационный файл для настроек

#### UI/UX улучшения
- 📱 Улучшенный адаптивный дизайн
- 🌙 Поддержка темной темы Telegram
- 📅 Отображение даты в истории транзакций
- 💫 Анимации и плавные переходы
- ✅ Информативные уведомления с символом валюты

### 🔧 Технические изменения

#### Архитектура
```javascript
// Новая структура данных транзакции
{
    type: 'income' | 'expense',
    amount: number,
    currency: 'KGS' | 'USD' | 'EUR' | 'RUB',
    category: string,
    description: string,
    date: string,
    time: string,
    telegram_user_id: number
}
```

#### Новые функции
- `updateCurrencyDisplay()` - обновление отображения валюты
- `sendToSupabase()` - прямая отправка в Supabase
- `resetForm()` - сброс формы с сохранением дефолтной валюты

#### API изменения
```javascript
// Для режима Supabase
POST /rest/v1/expenses
POST /rest/v1/income

Headers:
- apikey: SUPABASE_ANON_KEY
- Authorization: Bearer SUPABASE_ANON_KEY
- Content-Type: application/json

Body:
{
    "amount": 1000,
    "currency": "KGS",
    "category": "Продукты",
    "description": "Покупка в супермаркете",
    "date": "2025-01-28T14:30:00",
    "telegram_user_id": 123456789
}
```

### 🗃️ База данных

#### Требуемая миграция
```sql
-- Добавление поля currency
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KGS' NOT NULL;
ALTER TABLE income ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KGS' NOT NULL;

-- Ограничения
ALTER TABLE expenses ADD CONSTRAINT expenses_currency_check 
CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB'));

ALTER TABLE income ADD CONSTRAINT income_currency_check 
CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB'));

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency);
CREATE INDEX IF NOT EXISTS idx_income_currency ON income(currency);
```

### 📝 Миграция с версии 1.x

1. **Обновите базу данных:**
```bash
# Выполните SQL из migrations/add_currency_field.sql
psql -h your-supabase-host -U postgres -d postgres -f migrations/add_currency_field.sql
```

2. **Обновите n8n workflow:**
- Импортируйте обновлённый `AnaliziFinance.json`
- Или обновите вручную Add_expense и Add_income инструменты

3. **Обновите Mini App:**
- Замените `TelegramMiniApp.html` на новую версию
- Создайте `miniapp-config.js` из `miniapp-config.example.js`
- Загрузите на хостинг

4. **Проверьте совместимость:**
```javascript
// Старые транзакции без currency будут иметь 'KGS' по умолчанию
SELECT * FROM expenses WHERE currency IS NULL;
-- Должно быть пусто после миграции
```

### 🐛 Исправления

- Исправлено: форма не очищалась после отправки
- Исправлено: категория не сбрасывалась
- Исправлено: время не обновлялось автоматически
- Исправлено: статистика показывала ₽ вместо выбранной валюты
- Улучшено: обработка ошибок при отправке данных
- Улучшено: отображение пустой истории

### ⚡ Производительность

- Оптимизация: кэширование списка категорий
- Оптимизация: уменьшение размера HTML (сжатие CSS)
- Оптимизация: lazy loading для истории транзакций

### 🔐 Безопасность

- Добавлена проверка telegram_user_id
- Улучшена валидация форм
- Добавлена защита от SQL инъекций (через Supabase RLS)

### 📚 Документация

- ➕ Добавлен `MINIAPP_SETUP.md` - полное руководство по настройке
- ➕ Добавлен `miniapp-config.example.js` - пример конфигурации
- ➕ Добавлен `CHANGELOG.md` - этот файл
- 🔄 Обновлён `README.md` - упоминание мультивалютности

---

## [1.0.0] - Первый релиз

### Основные функции
- Добавление доходов/расходов
- Выбор категории
- Голосовой ввод
- Статистика
- История транзакций
- Интеграция с Telegram Bot

---

## 🔮 Планы на будущее (v2.2+)

### Приоритеты v2.2
- [ ] Редактирование транзакций
- [ ] Удаление транзакций (soft delete)
- [ ] Графики расходов по категориям
- [ ] Бюджеты по валютам с уведомлениями
- [ ] Прогноз курсов валют (ML)

### В разработке
- [ ] PDF отчёты с брендингом
- [ ] Recurring transactions (подписки)
- [ ] Множественные счета (кошельки)
- [ ] Тёмная тема (кастомная)
- [ ] Виджеты для быстрого доступа

### Идеи
- [ ] Геолокация для транзакций
- [ ] QR-сканер чеков
- [ ] OCR для чеков
- [ ] Импорт банковских выписок
- [ ] Экспорт в 1C
- [ ] Интеграция с CRM
- [ ] Мультипользовательский режим (семья/команда)
- [ ] Цели накоплений
- [ ] Инвестиционный портфель
- [ ] Уведомления о значительных изменениях курса валют

---

**📅 Последнее обновление:** 30 октября 2025  
**🏷️ Текущая версия:** 2.2.0  
**👨‍💻 Автор:** AI Accounter Team
