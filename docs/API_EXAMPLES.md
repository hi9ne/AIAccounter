# 🔌 API Examples - AIAccounter v2.3.0

Примеры использования MiniApp_API для интеграций и тестирования.

## 📋 Base URL

```
https://your-n8n.domain/webhook/miniapp
```

## 🔑 Формат запроса

```json
{
  "action": "action_name",
  "userId": 123456789,
  "data": {
    // параметры действия
  }
}
```

---

## 📦 Endpoints

### 1. ➕ Добавить транзакцию

**Action:** `add_transaction`

**Request:**
```json
{
  "action": "add_transaction",
  "userId": 123456789,
  "data": {
    "type": "expense",
    "amount": 500,
    "currency": "KGS",
    "category": "Продукты питания",
    "description": "Покупки в Народном",
    "date": "2025-10-31",
    "time": "14:30"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction added",
  "data": {
    "id": 123,
    "amount": 500,
    "currency": "KGS",
    "category": "Продукты питания",
    "description": "Покупки в Народном",
    "date": "2025-10-31"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://your-n8n.domain/webhook/miniapp \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_transaction",
    "userId": 123456789,
    "data": {
      "type": "expense",
      "amount": 500,
      "currency": "KGS",
      "category": "Продукты питания",
      "description": "Покупки в Народном",
      "date": "2025-10-31",
      "time": "14:30"
    }
  }'
```

---

### 2. 📊 Получить статистику

**Action:** `get_stats`

**Request:**
```json
{
  "action": "get_stats",
  "userId": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "income": 50000,
    "expenses": 32500,
    "profit": 17500,
    "count": 45,
    "currency": "KGS"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://your-n8n.domain/webhook/miniapp \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_stats",
    "userId": 123456789
  }'
```

---

### 3. 📜 Получить историю

**Action:** `get_history`

**Request:**
```json
{
  "action": "get_history",
  "userId": 123456789,
  "data": {
    "filter": "all",
    "period": "month"
  }
}
```

**Parameters:**
- `filter`: `all` | `income` | `expense`
- `period`: `today` | `week` | `month` | `year` | `all`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "amount": 500,
      "currency": "KGS",
      "category": "Продукты питания",
      "description": "Покупки в Народном",
      "date": "2025-10-31",
      "type": "expense",
      "deleted_at": null,
      "created_at": "2025-10-31T14:30:00Z"
    },
    {
      "id": 122,
      "amount": 10000,
      "currency": "KGS",
      "category": "Зарплата",
      "description": "Аванс",
      "date": "2025-10-15",
      "type": "income",
      "deleted_at": null,
      "created_at": "2025-10-15T09:00:00Z"
    }
  ]
}
```

---

### 4. 🔔 Получить подписки (v2.3.0)

**Action:** `get_subscriptions`

**Request:**
```json
{
  "action": "get_subscriptions",
  "userId": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123456789,
      "title": "Netflix",
      "amount": 12.99,
      "currency": "USD",
      "category": "Подписки",
      "frequency": "monthly",
      "interval_value": 1,
      "next_payment_date": "2025-11-30",
      "remind_days_before": 3,
      "auto_create": false,
      "is_active": true,
      "created_at": "2025-10-31T14:30:00Z"
    },
    {
      "id": 2,
      "title": "Spotify",
      "amount": 9.99,
      "currency": "USD",
      "category": "Подписки",
      "frequency": "monthly",
      "next_payment_date": "2025-11-15",
      "is_active": true
    }
  ]
}
```

---

### 5. ➕ Создать подписку (v2.3.0)

**Action:** `create_subscription`

**Request:**
```json
{
  "action": "create_subscription",
  "userId": 123456789,
  "data": {
    "title": "Netflix",
    "amount": 12.99,
    "currency": "USD",
    "category": "Подписки",
    "frequency": "monthly",
    "remind_days": 3,
    "auto_create": false
  }
}
```

**Parameters:**
- `frequency`: `daily` | `weekly` | `monthly` | `yearly`
- `remind_days`: количество дней до напоминания (по умолчанию 3)
- `auto_create`: автоматически создавать транзакцию (по умолчанию false)

**Response:**
```json
{
  "success": true,
  "message": "Subscription created",
  "data": {
    "create_recurring_payment": 1
  }
}
```

---

### 6. ❌ Отменить подписку (v2.3.0)

**Action:** `cancel_subscription`

**Request:**
```json
{
  "action": "cancel_subscription",
  "userId": 123456789,
  "data": {
    "subscription_id": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled",
  "data": {
    "id": 1,
    "is_active": false,
    "updated_at": "2025-10-31T14:35:00Z"
  }
}
```

---

### 7. 🔔 Получить уведомления (v2.3.0)

**Action:** `get_notifications`

**Request:**
```json
{
  "action": "get_notifications",
  "userId": 123456789,
  "data": {
    "filter": "all"
  }
}
```

**Parameters:**
- `filter`: `all` | `unread` | `urgent` (опционально)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123456789,
      "notification_type": "budget_warning",
      "title": "Предупреждение о бюджете",
      "message": "Вы израсходовали 80% месячного бюджета",
      "priority": "high",
      "is_read": false,
      "created_at": "2025-10-31T14:00:00Z"
    },
    {
      "id": 2,
      "notification_type": "recurring_reminder",
      "title": "Напоминание о подписке",
      "message": "Через 3 дня платёж за Netflix - 12.99 USD",
      "priority": "normal",
      "is_read": true,
      "created_at": "2025-10-28T09:00:00Z"
    }
  ]
}
```

**Типы уведомлений:**
- `budget_warning` - предупреждение о бюджете
- `budget_exceeded` - бюджет превышен
- `recurring_reminder` - напоминание о подписке
- `unusual_spending` - необычная трата
- `category_limit` - лимит категории
- `recurring_created` - подписка создана

**Приоритеты:**
- `urgent` - срочно (красный)
- `high` - важно (оранжевый)
- `normal` - обычно (синий)
- `low` - низкий (серый)

---

### 8. ✔️ Отметить уведомление прочитанным (v2.3.0)

**Action:** `mark_notification_read`

**Request:**
```json
{
  "action": "mark_notification_read",
  "userId": 123456789,
  "data": {
    "notification_id": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### 9. ✔️ Отметить все уведомления прочитанными (v2.3.0)

**Action:** `mark_all_read`

**Request:**
```json
{
  "action": "mark_all_read",
  "userId": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### 10. 💰 Получить прогноз бюджета (v2.3.0)

**Action:** `get_budget_forecast`

**Request:**
```json
{
  "action": "get_budget_forecast",
  "userId": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "budget_amount": 50000,
    "spent": 32500,
    "remaining": 17500,
    "percentage": 65.0,
    "days_left": 15,
    "forecast": 48200,
    "daily_average": 2166.67,
    "recommended_daily": 1166.67,
    "status": "ok",
    "recommendation": "Вы на правильном пути! Продолжайте контролировать расходы.",
    "currency": "KGS"
  }
}
```

**Status values:**
- `ok` - в пределах бюджета (<80%)
- `warning` - предупреждение (80-100%)
- `critical` - превышение (>100%)

---

### 11. ⚙️ Сохранить настройки алертов (v2.3.0)

**Action:** `save_alert_settings`

**Request:**
```json
{
  "action": "save_alert_settings",
  "userId": 123456789,
  "data": {
    "warning_threshold": 80,
    "critical_threshold": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert settings saved",
  "data": {
    "user_id": 123456789,
    "warning_threshold": 80,
    "critical_threshold": 100,
    "updated_at": "2025-10-31T14:40:00Z"
  }
}
```

---

### 12. ✏️ Редактировать транзакцию

**Action:** `edit_transaction`

**Request:**
```json
{
  "action": "edit_transaction",
  "userId": 123456789,
  "data": {
    "transaction_id": 123,
    "transaction_type": "expense",
    "field": "amount",
    "new_value": "600"
  }
}
```

**Editable fields:**
- `amount` - сумма
- `category` - категория
- `description` - описание
- `date` - дата
- `currency` - валюта

**Response:**
```json
{
  "success": true,
  "message": "Transaction updated",
  "data": {
    "id": 123,
    "amount": 600,
    "updated_at": "2025-10-31T14:45:00Z"
  }
}
```

---

### 13. 🗑️ Удалить транзакцию

**Action:** `delete_transaction`

**Request:**
```json
{
  "action": "delete_transaction",
  "userId": 123456789,
  "data": {
    "transaction_id": 123,
    "transaction_type": "expense"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction deleted",
  "data": {
    "id": 123,
    "deleted_at": "2025-10-31T14:50:00Z"
  }
}
```

---

### 14. 🔄 Восстановить транзакцию

**Action:** `restore_transaction`

**Request:**
```json
{
  "action": "restore_transaction",
  "userId": 123456789,
  "data": {
    "transaction_id": 123,
    "transaction_type": "expense"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction restored",
  "data": {
    "id": 123,
    "deleted_at": null,
    "updated_at": "2025-10-31T14:55:00Z"
  }
}
```

---

## 🚨 Error Responses

### Unknown Action
```json
{
  "success": false,
  "error": "Unknown action: invalid_action"
}
```

### Missing Parameters
```json
{
  "success": false,
  "error": "Missing required parameter: amount"
}
```

### Database Error
```json
{
  "success": false,
  "error": "Database error: duplicate key value"
}
```

---

## 🧪 Testing

### Postman Collection

Импортируй этот JSON в Postman:

```json
{
  "info": {
    "name": "AIAccounter API v2.3.0",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Add Transaction",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/webhook/miniapp",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"action\": \"add_transaction\",\n  \"userId\": {{userId}},\n  \"data\": {\n    \"type\": \"expense\",\n    \"amount\": 500,\n    \"currency\": \"KGS\",\n    \"category\": \"Продукты питания\",\n    \"description\": \"Test\",\n    \"date\": \"2025-10-31\",\n    \"time\": \"14:30\"\n  }\n}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://your-n8n.domain"
    },
    {
      "key": "userId",
      "value": "123456789"
    }
  ]
}
```

---

## 📚 Related Documentation

- [MINIAPP_API_IMPORT_v2.3.md](MINIAPP_API_IMPORT_v2.3.md) - импорт API в n8n
- [RELEASE_v2.3.md](RELEASE_v2.3.md) - полное описание v2.3.0
- [QUICKSTART_v2.3.md](QUICKSTART_v2.3.md) - быстрый старт

---

**v2.3.0 - Notifications & Recurring Payments**
