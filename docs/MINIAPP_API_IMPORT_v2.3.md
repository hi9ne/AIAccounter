# 📦 Импорт MiniApp_API.json v2.3.0 в n8n

## ✅ Что было обновлено

**MiniApp_API.json** обновлён с версии **v2.2.0** до **v2.3.0**

### Добавлены 8 новых API роутов:

1. ✅ **get_subscriptions** - получить список подписок пользователя
2. ✅ **create_subscription** - создать новую подписку  
3. ✅ **cancel_subscription** - отменить подписку
4. ✅ **get_notifications** - получить уведомления
5. ✅ **mark_notification_read** - отметить уведомление прочитанным
6. ✅ **mark_all_read** - отметить все уведомления прочитанными
7. ✅ **get_budget_forecast** - получить прогноз бюджета
8. ✅ **save_alert_settings** - сохранить настройки алертов

### Статистика изменений:

- **Всего нод**: 7 → 31 (+24 новых ноды)
- **Switch роутов**: 7 → 15 (+8 новых роутов)
- **PostgreSQL запросов**: 6 → 14 (+8 новых запросов)
- **Response нод**: 7 → 15 (+8 новых)

---

## 🚀 Инструкция по импорту

### Шаг 1: Сохранить старую версию (резервная копия)

1. Открой **n8n** редактор
2. Найди workflow **"MiniApp API v2.2.0"**
3. Нажми **Export** (экспорт)
4. Сохрани как `MiniApp_API_v2.2.0_BACKUP.json`

### Шаг 2: Удалить старый workflow

1. В списке workflows найди **"MiniApp API v2.2.0"**
2. Нажми **три точки** → **Delete**
3. Подтверди удаление

### Шаг 3: Импортировать новый workflow

1. Нажми **Import from File**
2. Выбери файл `MiniApp_API.json` (из корня проекта AIAccounter)
3. Дождись загрузки
4. Workflow откроется автоматически

### Шаг 4: Проверить соединения

#### 4.1 Проверка Webhook

1. Найди ноду **"Webhook"** (самая первая нода)
2. Убедись что path = `miniapp`
3. Проверь URL вебхука (должен быть: `https://your-n8n.domain/webhook/miniapp`)

#### 4.2 Проверка PostgreSQL/Supabase

**ВАЖНО:** Все 14 PostgreSQL нод должны использовать одни и те же credentials!

Ноды, требующие проверки:
- Insert Transaction
- Get Stats
- Get History
- Update Transaction
- Delete Transaction
- Restore Transaction
- **Get Subscriptions** ⭐ NEW
- **Create Subscription** ⭐ NEW
- **Cancel Subscription** ⭐ NEW
- **Get Notifications** ⭐ NEW
- **Mark Notification Read** ⭐ NEW
- **Mark All Read** ⭐ NEW
- **Get Budget Forecast** ⭐ NEW
- **Save Alert Settings** ⭐ NEW

**Для каждой ноды:**
1. Открой ноду
2. Проверь что выбран credential: **"PostgreSQL account"** (или твой Supabase credential)
3. Если credential не выбран - выбери из списка
4. Сохрани ноду

### Шаг 5: Активировать workflow

1. Убедись что все ноды зелёные (без ошибок)
2. Нажми переключатель **"Active"** в правом верхнем углу
3. Workflow должен стать активным

### Шаг 6: Проверить работу

#### Тест через Mini App:

1. Открой **Telegram Mini App**
2. Перейди на вкладку **🔔 Подписки**
3. Нажми **➕ Добавить подписку**
4. Заполни форму и нажми **💾 Создать подписку**
5. Подписка должна появиться в списке

Если появилась ошибка - проверь **Executions** в n8n для деталей.

#### Тест через curl (альтернатива):

```bash
curl -X POST https://your-n8n.domain/webhook/miniapp \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_subscriptions",
    "userId": 123456789
  }'
```

Ожидаемый ответ:
```json
{
  "success": true,
  "data": []
}
```

---

## 🔍 Проверочный чек-лист

После импорта убедись что:

- [ ] Workflow называется **"MiniApp API v2.3.0"**
- [ ] Webhook активен и доступен
- [ ] Все 31 нода присутствуют
- [ ] Switch имеет 15 выходов (outputs)
- [ ] Все PostgreSQL ноды имеют credentials
- [ ] Workflow активирован (Active = ON)
- [ ] Тестовый запрос к `get_subscriptions` работает
- [ ] Нет ошибок в последних executions

---

## 🐛 Troubleshooting

### Ошибка: "Missing credentials"

**Проблема:** PostgreSQL ноды не имеют credentials

**Решение:**
1. Открой любую PostgreSQL ноду
2. В поле **Credential** выбери существующий credential
3. Если нет - создай новый:
   - Name: PostgreSQL account
   - Host: db.xxxx.supabase.co
   - Database: postgres
   - User: postgres
   - Password: [твой пароль]
   - SSL: Allow
4. Примени ко всем PostgreSQL нодам

### Ошибка: "Webhook not found"

**Проблема:** Webhook URL неверный

**Решение:**
1. Открой ноду **"Webhook"**
2. Проверь path = `miniapp`
3. Скопируй Production URL
4. Обнови в `miniapp/app.js`:
   ```javascript
   const webhookUrl = 'https://твой-url.app.n8n.cloud/webhook/miniapp';
   ```

### Ошибка: "Function does not exist"

**Проблема:** Миграция БД не выполнена

**Решение:**
1. Открой Supabase SQL Editor
2. Выполни миграцию: `migrations/add_notifications_recurring_v2.3.sql`
3. Проверь что все 4 таблицы созданы:
   - recurring_payments
   - notifications
   - budget_alerts_config
   - spending_patterns

### Ошибка в конкретной ноде

**Проблема:** Одна из 8 новых нод не работает

**Решение:**
1. Открой n8n **Executions**
2. Найди последний failed execution
3. Посмотри на каком шаге ошибка
4. Проверь SQL запрос в ноде
5. Убедись что данные передаются правильно

---

## 📊 Архитектура нового workflow

```
Webhook (POST /miniapp)
    ↓
Switch by Action (15 routes)
    ├─→ add_transaction → Prepare → Insert → Response
    ├─→ get_stats → Prepare → Get Stats → Format → Response
    ├─→ get_history → Prepare → Get History → Response
    ├─→ edit_transaction → Prepare → Update → Response
    ├─→ delete_transaction → Prepare → Delete → Response
    ├─→ restore_transaction → Prepare → Restore → Response
    ├─→ generate_report → Response (not implemented)
    │
    ├─→ get_subscriptions → Prepare → Get Subscriptions → Response ⭐
    ├─→ create_subscription → Prepare → Create → Response ⭐
    ├─→ cancel_subscription → Prepare → Cancel → Response ⭐
    │
    ├─→ get_notifications → Prepare → Get Notifications → Response ⭐
    ├─→ mark_notification_read → Prepare → Mark Read → Response ⭐
    ├─→ mark_all_read → Prepare → Mark All → Response ⭐
    │
    ├─→ get_budget_forecast → Prepare → Get Forecast → Response ⭐
    ├─→ save_alert_settings → Prepare → Save Settings → Response ⭐
    │
    └─→ unknown → Response Error (400)
```

---

## 📝 SQL Queries Reference

### 1. Get Subscriptions
```sql
SELECT * FROM recurring_payments 
WHERE user_id = {{ userId }}
ORDER BY is_active DESC, next_payment_date ASC;
```

### 2. Create Subscription
```sql
SELECT create_recurring_payment(
  {{ userId }}::BIGINT,
  '{{ title }}'::VARCHAR,
  {{ amount }}::NUMERIC,
  '{{ currency }}'::VARCHAR,
  '{{ category }}'::VARCHAR,
  '{{ frequency }}'::VARCHAR,
  CURRENT_DATE,
  'Подписка'::VARCHAR,
  'expense'::VARCHAR,
  1::INTEGER,
  {{ remindDays }}::INTEGER,
  {{ autoCreate }}::BOOLEAN
);
```

### 3. Cancel Subscription
```sql
UPDATE recurring_payments 
SET is_active = FALSE 
WHERE id = {{ subscriptionId }} 
  AND user_id = {{ userId }}
RETURNING *;
```

### 4. Get Notifications
```sql
SELECT * FROM notifications 
WHERE user_id = {{ userId }}
ORDER BY is_read ASC, priority DESC, created_at DESC
LIMIT 50;
```

### 5. Mark Notification Read
```sql
UPDATE notifications 
SET is_read = TRUE 
WHERE id = {{ notificationId }} 
  AND user_id = {{ userId }}
RETURNING *;
```

### 6. Mark All Read
```sql
UPDATE notifications 
SET is_read = TRUE 
WHERE user_id = {{ userId }}
  AND is_read = FALSE
RETURNING COUNT(*) as updated_count;
```

### 7. Get Budget Forecast
```sql
SELECT * FROM get_budget_forecast({{ userId }}::BIGINT);
```

### 8. Save Alert Settings
```sql
INSERT INTO budget_alerts_config (user_id, warning_threshold, critical_threshold)
VALUES ({{ userId }}, {{ warningThreshold }}, {{ criticalThreshold }})
ON CONFLICT (user_id) 
DO UPDATE SET 
  warning_threshold = EXCLUDED.warning_threshold,
  critical_threshold = EXCLUDED.critical_threshold,
  updated_at = CURRENT_TIMESTAMP
RETURNING *;
```

---

## ✨ После успешного импорта

1. ✅ Протестируй все 8 новых роутов через Mini App
2. ✅ Проверь что данные сохраняются в БД
3. ✅ Убедись что уведомления работают
4. ✅ Проверь прогноз бюджета
5. ✅ Обнови документацию если нужно

## 🎉 Готово!

Теперь **MiniApp API v2.3.0** полностью готов к работе!

Все новые фичи v2.3.0 доступны через Telegram Mini App:
- 🔔 Управление подписками
- 🔔 Уведомления с фильтрацией
- 💰 Прогноз бюджета с рекомендациями

---

**Вопросы?** Смотри:
- `docs/RELEASE_v2.3.md` - полное описание релиза
- `docs/MINIAPP_v2.3_INTEGRATION.md` - детали интеграции Mini App
- `docs/AI_TOOLS_v2.3.md` - описание AI инструментов
