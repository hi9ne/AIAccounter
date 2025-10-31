# 🤖 AI Tools Documentation v2.3.0

Документация по AI инструментам для AnaliziFinance.json workflow.

---

## 📋 СПИСОК ИНСТРУМЕНТОВ v2.3.0

### Новые инструменты (6 штук):
1. **Create_recurring_payment** - создание повторяющихся платежей
2. **List_recurring_payments** - список всех подписок
3. **Cancel_recurring_payment** - отмена подписки
4. **Get_budget_forecast** - прогноз бюджета до конца месяца
5. **Get_notifications** - получить уведомления пользователя
6. **Configure_alerts** - настроить пороги уведомлений

---

## 1️⃣ Create_recurring_payment

**Назначение:** Создает повторяющийся платеж (аренда, подписки, зарплата)

**Тип:** Postgres Tool

**SQL Query:**
```sql
SELECT create_recurring_payment(
    {{ $('Telegram Bot Trigger').first().json.message.from.id }},
    '{{ $fromAI('title') }}',
    {{ $fromAI('amount', 'number') }},
    '{{ $fromAI('currency') }}',
    '{{ $fromAI('category') }}',
    '{{ $fromAI('frequency') }}',
    '{{ $fromAI('start_date') }}'::DATE,
    {{ $fromAI('description') || 'NULL' }},
    '{{ $fromAI('transaction_type') }}',
    {{ $fromAI('interval_value', 'number') || 1 }},
    {{ $fromAI('remind_days', 'number') || 3 }},
    {{ $fromAI('auto_create', 'boolean') || false }}
) as recurring_id;
```

**Параметры AI:**
- `title` (string) - название платежа (например "Netflix Premium")
- `amount` (number) - сумма
- `currency` (string) - валюта (KGS/USD/EUR/RUB)
- `category` (string) - категория
- `frequency` (string) - частота: **daily, weekly, monthly, yearly**
- `start_date` (string) - дата начала в формате YYYY-MM-DD
- `description` (string, optional) - описание
- `transaction_type` (string) - тип: **expense** или **income**
- `interval_value` (number, optional) - каждые N периодов (по умолчанию 1)
- `remind_days` (number, optional) - за сколько дней напомнить (по умолчанию 3)
- `auto_create` (boolean, optional) - автоматически создавать транзакцию (по умолчанию false)

**Примеры запросов пользователя:**
```
✅ "Добавь подписку Netflix $12.99 каждый месяц"
✅ "Создай напоминание: аренда офиса 15000 сом 1-го числа каждого месяца"
✅ "Подписка на Spotify Premium 169 рублей ежемесячно"
✅ "Зарплата 50000 сом каждые 2 недели с автоплатежом"
✅ "Налоги 5000 евро каждый квартал (каждые 3 месяца)"
```

**AI должен распознать:**
- Название: "Netflix", "Аренда офиса", "Spotify Premium", "Зарплата", "Налоги"
- Сумму и валюту
- Частоту: "каждый месяц" → monthly, "каждые 2 недели" → weekly + interval_value=2
- Категорию из контекста
- transaction_type: "подписка/аренда" → expense, "зарплата" → income

**Ответ AI:**
```
✅ Подписка создана!
📅 Netflix Premium - $12.99 / месяц
🔔 Напомню за 3 дня до платежа
📆 Следующий платеж: 1 декабря 2025
```

---

## 2️⃣ List_recurring_payments

**Назначение:** Показывает все активные повторяющиеся платежи пользователя

**Тип:** Postgres Tool

**SQL Query:**
```sql
SELECT 
    id,
    title,
    amount,
    currency,
    category,
    frequency,
    next_payment_date,
    remind_days_before,
    auto_create,
    transaction_type
FROM recurring_payments
WHERE user_id = {{ $('Telegram Bot Trigger').first().json.message.from.id }}
    AND is_active = TRUE
ORDER BY next_payment_date ASC;
```

**Параметры AI:** Нет (берет user_id из Telegram)

**Примеры запросов:**
```
✅ "Покажи мои подписки"
✅ "Какие у меня повторяющиеся платежи?"
✅ "Список всех автоплатежей"
✅ "Что мне нужно оплатить в этом месяце?"
```

**Ответ AI (пример):**
```
📋 Ваши подписки и повторяющиеся платежи:

1. 💸 Аренда офиса - 15,000 с
   📅 Каждый месяц
   📆 Следующий платеж: 1 ноября 2025
   
2. 💸 Netflix Premium - $12.99
   📅 Каждый месяц
   📆 Следующий платеж: 15 ноября 2025
   
3. 💰 Зарплата сотрудникам - 50,000 с
   📅 Каждые 2 недели
   📆 Следующий платеж: 5 ноября 2025
   ⚡ Автоплатеж включен

💰 Итого в месяц: ~82,500 сом
```

---

## 3️⃣ Cancel_recurring_payment

**Назначение:** Отменяет (деактивирует) повторяющийся платеж

**Тип:** Postgres Tool

**SQL Query:**
```sql
UPDATE recurring_payments
SET is_active = FALSE, updated_at = NOW()
WHERE id = {{ $fromAI('recurring_id', 'number') }}
    AND user_id = {{ $('Telegram Bot Trigger').first().json.message.from.id }}
RETURNING id, title, amount, currency;
```

**Параметры AI:**
- `recurring_id` (number) - ID подписки (из предыдущего списка)

**Примеры запросов:**
```
✅ "Отмени подписку Netflix"
✅ "Удали напоминание про аренду"
✅ "Останови автоплатеж номер 3"
✅ "Деактивируй подписку 15"
```

**AI должен:**
- Сначала вызвать List_recurring_payments, чтобы найти ID по названию
- Если пользователь сказал "отмени Netflix" - найти ID платежа с title содержащим "Netflix"
- Если пользователь указал номер "подписку 3" - использовать 3-й элемент из списка

**Ответ AI:**
```
✅ Подписка отменена
❌ Netflix Premium ($12.99/мес) больше не активна
💡 Напоминания больше не будут приходить
```

---

## 4️⃣ Get_budget_forecast

**Назначение:** Прогнозирует расходы до конца месяца на основе текущих трат

**Тип:** Postgres Tool

**SQL Query:**
```sql
SELECT * FROM get_budget_forecast(
    {{ $('Telegram Bot Trigger').first().json.message.from.id }}
);
```

**Параметры AI:** Нет

**Возвращает:**
- `current_spent` - уже потрачено в этом месяце
- `budget_amount` - установленный бюджет
- `percentage_used` - процент использования
- `projected_spending` - прогноз до конца месяца
- `remaining` - остаток бюджета
- `days_remaining` - дней до конца месяца
- `daily_average` - средний расход в день
- `recommended_daily_limit` - рекомендуемый дневной лимит
- `forecast_status` - статус: ok, warning, critical

**Примеры запросов:**
```
✅ "Сколько мне осталось до конца месяца?"
✅ "Покажи прогноз бюджета"
✅ "Сколько я могу тратить в день?"
✅ "Хватит ли мне денег до конца месяца?"
✅ "Какой прогноз расходов?"
```

**Ответ AI (пример):**
```
💰 Прогноз бюджета на октябрь 2025:

📊 Потрачено: 32,500 из 50,000 сом (65%)
📅 Осталось дней: 7
💵 Остаток: 17,500 сом

📈 Прогноз до конца месяца: ~51,000 сом
⚠️ Ожидается превышение бюджета на 2%

💡 Рекомендации:
   • Средний расход в день: 1,083 сом
   • Рекомендуемый лимит: 2,500 сом/день
   • Сократите траты на 1,000 сом
```

**Если forecast_status = 'critical':**
```
🚨 КРИТИЧЕСКОЕ ПРЕВЫШЕНИЕ!
Прогноз: 62,000 из 50,000 сом (+24%)
Необходимо срочно сократить расходы!
```

---

## 5️⃣ Get_notifications

**Назначение:** Получить последние уведомления пользователя

**Тип:** Postgres Tool

**SQL Query:**
```sql
SELECT 
    id,
    notification_type,
    title,
    message,
    priority,
    created_at,
    is_read,
    related_category
FROM notifications
WHERE user_id = {{ $('Telegram Bot Trigger').first().json.message.from.id }}
    AND is_sent = TRUE
ORDER BY 
    CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        ELSE 4
    END,
    created_at DESC
LIMIT {{ $fromAI('limit', 'number') || 10 }};
```

**Параметры AI:**
- `limit` (number, optional) - сколько уведомлений показать (по умолчанию 10)

**Типы уведомлений:**
- `budget_warning` - 80% бюджета
- `budget_exceeded` - превышение бюджета
- `limit_warning` - 80% лимита категории
- `limit_exceeded` - превышение лимита
- `recurring_reminder` - напоминание о платеже
- `unusual_spending` - необычная трата
- `weekly_report` - еженедельный отчет
- `monthly_summary` - месячная сводка

**Примеры запросов:**
```
✅ "Покажи мои уведомления"
✅ "Что нового?"
✅ "Какие алерты?"
✅ "Покажи последние 5 уведомлений"
```

**Ответ AI:**
```
🔔 Ваши уведомления:

🚨 СРОЧНО (сегодня, 14:30)
   💰 Бюджет превышен на 5%
   Потрачено: 52,500 из 50,000 сом

⚠️ ВАЖНО (вчера, 18:00)
   💰 Необычная трата
   15,000 сом в категории "Продукты"
   (обычно ~5,000 сом)

🔔 Обычное (28 окт, 20:00)
   📊 Еженедельный отчет
   Расходы за неделю: 12,500 сом
```

---

## 6️⃣ Configure_alerts

**Назначение:** Настроить пороги уведомлений о бюджете и лимитах

**Тип:** Postgres Tool

**SQL Query:**
```sql
INSERT INTO budget_alerts_config (
    user_id, 
    budget_warning_threshold,
    budget_critical_threshold,
    category_warning_threshold,
    category_critical_threshold,
    max_alerts_per_day
) VALUES (
    {{ $('Telegram Bot Trigger').first().json.message.from.id }},
    {{ $fromAI('budget_warning', 'number') || 80 }},
    {{ $fromAI('budget_critical', 'number') || 100 }},
    {{ $fromAI('category_warning', 'number') || 80 }},
    {{ $fromAI('category_critical', 'number') || 100 }},
    {{ $fromAI('max_alerts', 'number') || 5 }}
)
ON CONFLICT (user_id) 
DO UPDATE SET
    budget_warning_threshold = EXCLUDED.budget_warning_threshold,
    budget_critical_threshold = EXCLUDED.budget_critical_threshold,
    category_warning_threshold = EXCLUDED.category_warning_threshold,
    category_critical_threshold = EXCLUDED.category_critical_threshold,
    max_alerts_per_day = EXCLUDED.max_alerts_per_day,
    updated_at = NOW()
RETURNING *;
```

**Параметры AI:**
- `budget_warning` (number, optional) - порог предупреждения бюджета в % (по умолчанию 80)
- `budget_critical` (number, optional) - порог критического уровня бюджета в % (по умолчанию 100)
- `category_warning` (number, optional) - порог предупреждения лимита категории (по умолчанию 80)
- `category_critical` (number, optional) - критический порог категории (по умолчанию 100)
- `max_alerts` (number, optional) - максимум уведомлений в день (по умолчанию 5)

**Примеры запросов:**
```
✅ "Настрой уведомления: предупреждать при 75% бюджета"
✅ "Установи критический порог на 90%"
✅ "Уведомляй меня при 70% бюджета"
✅ "Не больше 3 уведомлений в день"
✅ "Алерт при 85% по категориям"
```

**AI должен распознать:**
- "при 75%" → budget_warning = 75
- "критический 90%" → budget_critical = 90
- "не больше 3" → max_alerts = 3

**Ответ AI:**
```
✅ Настройки уведомлений обновлены!

⚠️ Предупреждение: 75% бюджета
🚨 Критическое: 100% бюджета
📊 Лимиты категорий: 80% / 100%
🔔 Максимум уведомлений: 5 в день
```

---

## 📝 SYSTEM MESSAGE ДЛЯ AI (Дополнение к существующему)

Добавить в System Message AnaliziFinance.json:

```markdown
## 🔔 УПРАВЛЕНИЕ ПОДПИСКАМИ И УВЕДОМЛЕНИЯМИ (v2.3.0)

### ПОВТОРЯЮЩИЕСЯ ПЛАТЕЖИ:

Когда пользователь говорит о **подписках, аренде, регулярных платежах**:
- Используй **Create_recurring_payment**
- Распознай частоту:
  * "каждый месяц", "ежемесячно" → frequency: monthly
  * "каждую неделю", "еженедельно" → frequency: weekly
  * "каждый день" → frequency: daily
  * "каждый год", "ежегодно" → frequency: yearly
  * "каждые 2 недели" → frequency: weekly, interval_value: 2
  * "каждые 3 месяца", "ежеквартально" → frequency: monthly, interval_value: 3

**Примеры:**
- "Подписка Netflix $12.99 каждый месяц" 
  → Create_recurring_payment(title="Netflix", amount=12.99, currency="USD", frequency="monthly")
  
- "Аренда офиса 15000 сом 1-го числа"
  → Create_recurring_payment(title="Аренда офиса", amount=15000, frequency="monthly", start_date="2025-11-01")

**Список подписок:**
- "Покажи мои подписки" → List_recurring_payments
- Выведи красиво с иконками 📅 💰 ⚡

**Отмена:**
- "Отмени Netflix" → Сначала List_recurring_payments, найди ID, потом Cancel_recurring_payment

### ПРОГНОЗ БЮДЖЕТА:

Когда пользователь спрашивает про **остаток, прогноз, "хватит ли денег"**:
- Используй **Get_budget_forecast**
- Анализируй forecast_status:
  * 'ok' → "Всё в порядке ✅"
  * 'warning' → "Внимание! ⚠️ Возможно небольшое превышение"
  * 'critical' → "КРИТИЧНО! 🚨 Превышение более 10%"

**Примеры:**
- "Сколько осталось до конца месяца?"
  → Get_budget_forecast + красивый вывод с процентами

- "Хватит ли денег?"
  → Проверь projected_spending vs budget_amount

### УВЕДОМЛЕНИЯ:

Когда пользователь спрашивает **"что нового", "какие алерты"**:
- Используй **Get_notifications**
- Группируй по priority: urgent → high → normal
- Используй иконки:
  * 🚨 urgent
  * ⚠️ high  
  * 🔔 normal

### НАСТРОЙКА АЛЕРТОВ:

Когда пользователь хочет **настроить уведомления**:
- Используй **Configure_alerts**
- Распознай проценты: "при 75%" → 75, "при 80%" → 80
- "не больше N уведомлений" → max_alerts: N

---

## ⚠️ ВАЖНЫЕ ПРАВИЛА:

1. **user_id** всегда берется из Telegram: 
   `{{ $('Telegram Bot Trigger').first().json.message.from.id }}`
   
2. **Валюта** по умолчанию KGS, если не указана

3. **Даты** в формате YYYY-MM-DD

4. **frequency** только: daily, weekly, monthly, yearly

5. **transaction_type** только: expense или income

6. После создания recurring payment выведи:
   ✅ Название
   💰 Сумму и валюту
   📅 Частоту
   📆 Следующую дату платежа

7. Для прогноза бюджета покажи:
   - Текущие траты / бюджет (%)
   - Прогноз до конца месяца
   - Рекомендации по экономии
```

---

## 🧪 ТЕСТОВЫЕ СЦЕНАРИИ

### Сценарий 1: Создание подписки
```
User: Добавь подписку Netflix Premium $12.99 ежемесячно
AI: Вызывает Create_recurring_payment
Bot: ✅ Подписка создана!
     📅 Netflix Premium - $12.99 / месяц
     🔔 Напомню за 3 дня
     📆 Следующий платеж: 1 декабря 2025
```

### Сценарий 2: Прогноз бюджета
```
User: Сколько мне осталось до конца месяца?
AI: Вызывает Get_budget_forecast
Bot: 💰 Прогноз на октябрь:
     Потрачено: 32,500 / 50,000 сом (65%)
     Осталось: 7 дней
     Прогноз: ~51,000 сом (превышение на 2%)
     
     💡 Рекомендую сократить траты на 1,000 сом
```

### Сценарий 3: Список подписок
```
User: Покажи мои подписки
AI: Вызывает List_recurring_payments
Bot: 📋 Ваши подписки:
     1. Аренда офиса - 15,000 с (1 ноября)
     2. Netflix - $12.99 (15 ноября)
     3. Spotify - 169 ₽ (20 ноября)
     
     💰 Итого: ~17,500 сом/месяц
```

---

## 📊 SUMMARY

**Новых инструментов:** 6  
**Новых параметров:** 15+  
**Поддерживаемых команд:** 20+

**Готово к интеграции в AnaliziFinance.json** ✅
