# 📊 Существующая структура БД AIAccounter

## Таблицы

### Основные транзакции
- ✅ **users** - Пользователи Telegram
  - Поля: user_id, telegram_user_id, first_name, last_name, username, preferred_currency, language_code, created_at, updated_at
  
- ✅ **expenses** - Расходы
  - Поля: id, user_id, workspace_id, amount, currency, category, description, date, created_at, updated_at, deleted_at
  - Индексы: user_id, workspace_id, date, deleted_at
  
- ✅ **income** - Доходы
  - Поля: id, user_id, workspace_id, amount, currency, category, description, date, created_at, updated_at, deleted_at
  - Индексы: user_id, workspace_id, date, deleted_at
  
- ✅ **budgets** - Бюджеты
  - Поля: id, user_id, workspace_id, month, budget_amount, currency, created_at, updated_at
  - Индексы: user_id, workspace_id

### Workspaces (Multi-tenancy)
- ✅ **workspaces** - Рабочие пространства
  - Поля: id, name, description, currency, owner_id, is_active, settings (JSONB), created_at, updated_at
  
- ✅ **workspace_members** - Участники workspace
  - Поля: id, workspace_id, user_id, role (owner/admin/editor/viewer), is_active, joined_at, last_activity_at
  
- ✅ **workspace_invites** - Приглашения
  - Поля: id, workspace_id, invite_code, role, created_by, expires_at, max_uses, used_count, is_active, created_at
  
- ✅ **invite_uses** - История использования приглашений
  - Поля: id, invite_id, user_id, used_at, ip_address, user_agent

### Система уведомлений и подписок
- ✅ **notifications** - Уведомления
  - Поля: id, user_id, workspace_id, type, title, message, is_read, created_at
  
- ✅ **recurring_payments** - Повторяющиеся платежи (подписки)
  - Поля: id, user_id, workspace_id, name, amount, currency, category, frequency, next_payment_date, reminder_days_before, is_active, created_at

### Аналитика
- ✅ **analytics_cache** - Кэш аналитики для производительности
  - Поля: id, user_id, workspace_id, metric_type, metric_data (JSONB), period_start, period_end, created_at, expires_at
  
- ✅ **budget_forecasts** - Прогнозы бюджета
  - Поля: id, user_id, workspace_id, month, predicted_amount, confidence_score, created_at

### Прочее
- ✅ **audit_logs** - Журнал действий
  - Поля: id, workspace_id, user_id, action_type, entity_type, entity_id, changes (JSONB), ip_address, user_agent, created_at
  
- ✅ **user_preferences** - Настройки пользователей
  - Поля: id, user_id, theme, language, timezone, default_workspace_id, notification_settings (JSONB), ui_preferences (JSONB)
  
- ✅ **exchange_rates** - Курсы валют
  - Поля: id, date, from_currency, to_currency, rate, created_at
  
- ✅ **onboarding_state** - Состояние онбординга
  - Поля: id, user_id, current_step, data (JSONB), completed_at, created_at

## Функции PostgreSQL

### Workspaces
- ✅ `create_workspace_with_owner(name, owner_id, description, currency)` → workspace_id
- ✅ `check_workspace_permission(workspace_id, user_id, required_role)` → boolean
- ✅ `get_user_workspaces(user_id)` → TABLE(workspace_id, name, role, member_count)
- ✅ `accept_workspace_invite(invite_code, user_id)` → workspace_id
- ✅ `remove_workspace_member(workspace_id, user_id, removed_by)` → boolean
- ✅ `update_workspace_timestamp()` - trigger для updated_at
- ✅ `update_member_activity()` - trigger для last_activity_at

### Аналитика
- ✅ `get_income_expense_stats(user_id, workspace_id, date_from, date_to)` → TABLE(income_total, expense_total, balance, transaction_count)
- ✅ `get_top_expense_categories(user_id, workspace_id, date_from, date_to, limit)` → TABLE(category, total_amount, percentage)
- ✅ `get_income_expense_chart_data(user_id, workspace_id, period_type, date_from, date_to)` → TABLE(date, income, expense)
- ✅ `get_category_pie_chart_data(user_id, workspace_id, date_from, date_to)` → TABLE(category, amount, percentage, color)
- ✅ `update_analytics_cache(user_id, workspace_id, metric_type, metric_data, period_start, period_end)` → void
- ✅ `get_cached_analytics(user_id, workspace_id, metric_type, period_start, period_end)` → JSONB
- ✅ `cleanup_expired_cache()` → void
- ✅ `invalidate_analytics_cache()` - trigger для инвалидации кэша
- ✅ `get_budget_forecast(user_id)` → TABLE(month, predicted, confidence)
- ✅ `get_spending_patterns(user_id, workspace_id)` → TABLE(pattern_type, data)
- ✅ `get_balance_trend(user_id, workspace_id, days)` → TABLE(date, balance)

### Транзакции
- ✅ `log_transaction_change()` - trigger для audit_logs
- ✅ `get_last_transaction(user_id, transaction_type)` → TABLE(id, amount, category, description, date)
- ✅ `find_transaction_by_amount(user_id, amount, days_back)` → TABLE(id, type, amount, category, date)
- ✅ `transaction_exists(user_id, amount, category, date)` → boolean
- ✅ `safe_update_transaction(transaction_type, transaction_id, user_id, new_amount, new_category, new_description, new_date)` → boolean

### Пользователи
- ✅ `get_user_settings(user_id)` → TABLE(user_id, preferred_currency, currency_symbol, language_code)
- ✅ `update_user_currency(user_id, new_currency)` → boolean
- ✅ `format_amount_with_currency(amount, currency)` → TEXT
- ✅ `get_user_profile(user_id)` → TABLE(user info + stats)

### Онбординг
- ✅ `check_onboarding_completed(user_id)` → boolean
- ✅ `get_onboarding_step(user_id)` → TABLE(current_step, data)
- ✅ `save_onboarding_answer(user_id, step, answer_data)` → void
- ✅ `reset_onboarding(user_id)` → void

### Подписки
- ✅ `create_recurring_payment(...)` → recurring_id
- ✅ `execute_recurring_payment(recurring_id)` → expense_id
- ✅ `get_pending_reminders()` → TABLE(recurring payments to notify)
- ✅ `mark_reminder_sent(recurring_id)` → void

### Audit
- ✅ `log_audit_event(workspace_id, user_id, action_type, entity_type, entity_id, changes)` → void

## Категории (из миграций)

### Расходы (35 категорий)
🍔 Еда, 🏠 Жилье, 🚗 Транспорт, 💊 Здоровье, 🎓 Образование, 🎭 Развлечения, 
👗 Одежда, 📱 Связь, 🏦 Банк/Комиссии, 🎁 Подарки, 🏋️ Спорт, ✈️ Путешествия,
💄 Красота, 🐕 Питомцы, 📚 Книги, 🍽️ Рестораны, ☕ Кафе, 🛒 Продукты, 
⚡ Коммуналка, 🚕 Такси, 💳 Долги, 🏥 Лекарства, 🎮 Игры, 🎬 Подписки,
📦 Покупки, 🔧 Ремонт, 🚙 Авто, 🏠 Аренда, 📺 Интернет/ТВ, 🎪 Хобби,
📄 Документы, 🧹 Уборка, 💼 Бизнес, 🎰 Азарт, 🤷 Другое

### Доходы (15 категорий)
💰 Зарплата, 💼 Фриланс, 📈 Инвестиции, 🎁 Подарки, 💸 Возврат долга,
🏆 Бонусы, 🤝 Дивиденды, 🎯 Премия, 💳 Кэшбэк, 🏪 Продажа, 
🏠 Аренда, 📊 Прочее, 💎 Пассивный доход, 🎓 Стипендия, 👨‍👩‍👧 Алименты

## Валюты
- KGS (сом) - основная
- USD ($)
- EUR (€)
- RUB (₽)

## Индексы (оптимизация)
Созданы индексы для:
- user_id, workspace_id на всех основных таблицах
- date для транзакций (expenses, income)
- deleted_at для soft delete
- is_active для активных записей
- created_at DESC для audit_logs

## Триггеры
- `update_workspace_timestamp` - автообновление updated_at в workspaces
- `update_member_activity` - автообновление last_activity_at в workspace_members
- `invalidate_analytics_cache` - инвалидация кэша при изменении транзакций
- `log_transaction_change` - автологирование изменений в audit_logs
- `update_forecast_actual_value` - обновление прогноза бюджета

---

**Вывод:** БД очень хорошо структурирована! Есть все основные таблицы, много готовых функций для аналитики, workspaces, аудита. 

Для FastAPI нужно:
1. ✅ Модели SQLAlchemy уже созданы, но нужно дополнить недостающие (notifications, recurring_payments, exchange_rates)
2. Создать JWT аутентификацию
3. Создать API endpoints для:
   - User Profile
   - Workspaces
   - Categories (статический список)
   - Exchange Rates
   - Analytics (используя готовые функции БД)
   - Reports (PDF генерация)
