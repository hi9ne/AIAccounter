# Analytics API v2.4.0 - Документация

## 📊 Обзор

Analytics API предоставляет 10 endpoints для работы с аналитикой, графиками и статистикой в AIAccounter v2.4.0.

**Webhook URL:** `https://hi9neee.app.n8n.cloud/webhook/analytics-api`

**Метод:** `POST`

**Content-Type:** `application/json`

---

## 🔍 Endpoints

### 1. **get_income_expense_stats**
Получить статистику доходов и расходов за период

**Request:**
```json
{
  "action": "get_income_expense_stats",
  "workspace_id": 1,
  "start_date": "2025-10-01",
  "end_date": "2025-10-31"
}
```

**Response:**
```json
{
  "success": true,
  "action": "get_income_expense_stats",
  "data": [
    {
      "total_income": 150000.00,
      "total_expenses": 95000.00,
      "balance": 55000.00,
      "income_count": 15,
      "expense_count": 43,
      "avg_income": 10000.00,
      "avg_expense": 2209.30
    }
  ]
}
```

**SQL Function:** `get_income_expense_stats(workspace_id, start_date, end_date)`

---

### 2. **get_chart_data**
Получить данные для графика доходов/расходов (для Chart.js Line chart)

**Request:**
```json
{
  "action": "get_chart_data",
  "workspace_id": 1,
  "start_date": "2025-10-01",
  "end_date": "2025-10-31",
  "interval": "day"
}
```

**Parameters:**
- `interval`: `day`, `week`, `month` - группировка данных

**Response:**
```json
{
  "success": true,
  "action": "get_chart_data",
  "data": [
    {
      "date": "2025-10-01",
      "income_amount": 25000.00,
      "expense_amount": 8500.00,
      "income_count": 2,
      "expense_count": 5
    },
    {
      "date": "2025-10-02",
      "income_amount": 0.00,
      "expense_amount": 3200.00,
      "income_count": 0,
      "expense_count": 3
    }
  ]
}
```

**SQL Function:** `get_income_expense_chart_data(workspace_id, start_date, end_date, interval)`

---

### 3. **get_top_categories**
Получить топ категорий расходов (для Chart.js Pie chart)

**Request:**
```json
{
  "action": "get_top_categories",
  "workspace_id": 1,
  "start_date": "2025-10-01",
  "end_date": "2025-10-31",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "action": "get_top_categories",
  "data": [
    {
      "category": "Продукты",
      "total_amount": 35000.00,
      "transaction_count": 18,
      "percentage": 36.84
    },
    {
      "category": "Транспорт",
      "total_amount": 15000.00,
      "transaction_count": 12,
      "percentage": 15.79
    }
  ]
}
```

**SQL Function:** `get_top_expense_categories(workspace_id, start_date, end_date, limit)`

---

### 4. **get_category_analytics**
Получить подробную аналитику по категориям с трендами

**Request:**
```json
{
  "action": "get_category_analytics",
  "workspace_id": 1,
  "start_date": "2025-09-01",
  "end_date": "2025-10-31"
}
```

**Response:**
```json
{
  "success": true,
  "action": "get_category_analytics",
  "data": [
    {
      "workspace_id": 1,
      "category": "Продукты",
      "month": "2025-10-01",
      "total_amount": 35000.00,
      "transaction_count": 18,
      "avg_amount": 1944.44,
      "min_amount": 500.00,
      "max_amount": 8000.00,
      "percentage": 36.84,
      "top_subcategories": "{\"Мясо\": 12000, \"Овощи\": 8000}",
      "trend_vs_prev_month": 5.5
    }
  ]
}
```

**SQL Table:** `category_analytics`

---

### 5. **get_spending_patterns**
Получить обнаруженные паттерны трат (регулярные покупки, аномалии)

**Request:**
```json
{
  "action": "get_spending_patterns",
  "workspace_id": 1,
  "start_date": "2025-10-01T00:00:00",
  "end_date": "2025-10-31T23:59:59",
  "limit": 20
}
```

**Response:**
```json
{
  "success": true,
  "action": "get_spending_patterns",
  "data": [
    {
      "workspace_id": 1,
      "pattern_type": "recurring",
      "category": "Коммунальные услуги",
      "description": "Регулярный платеж каждые 30 дней",
      "frequency": "monthly",
      "avg_amount": 3500.00,
      "confidence_score": 0.95,
      "detected_at": "2025-10-15T10:30:00",
      "metadata": "{\"day_of_month\": 15}"
    }
  ]
}
```

**SQL Table:** `spending_patterns`

**Pattern Types:**
- `recurring` - регулярные платежи
- `anomaly` - аномальные траты
- `seasonal` - сезонные паттерны

---

### 6. **get_balance_trend**
Получить тренд баланса (для Chart.js Line chart с fill)

**Request:**
```json
{
  "action": "get_balance_trend",
  "workspace_id": 1,
  "start_date": "2025-10-01",
  "end_date": "2025-10-31"
}
```

**Response:**
```json
{
  "success": true,
  "action": "get_balance_trend",
  "data": [
    {
      "date": "2025-10-01",
      "daily_income": 25000.00,
      "daily_expense": 8500.00,
      "daily_net": 16500.00,
      "cumulative_balance": 16500.00
    },
    {
      "date": "2025-10-02",
      "daily_income": 0.00,
      "daily_expense": 3200.00,
      "daily_net": -3200.00,
      "cumulative_balance": 13300.00
    }
  ]
}
```

**SQL Query:** Custom query with `daily_balance` CTE and `SUM() OVER (ORDER BY date)`

---

### 7. **update_analytics_cache**
Сохранить кэш аналитики (для оптимизации)

**Request:**
```json
{
  "action": "update_analytics_cache",
  "workspace_id": 1,
  "cache_key": "monthly_stats_2025_10",
  "data": {
    "income": 150000,
    "expenses": 95000,
    "balance": 55000
  }
}
```

**Response:**
```json
{
  "success": true,
  "action": "update_analytics_cache",
  "data": [
    {
      "success": true
    }
  ]
}
```

**SQL Function:** `update_analytics_cache(workspace_id, cache_key, data_json)`

---

### 8. **get_cached_analytics**
Получить кэшированные данные аналитики

**Request:**
```json
{
  "action": "get_cached_analytics",
  "workspace_id": 1,
  "cache_key": "monthly_stats_2025_10",
  "max_age_minutes": 60
}
```

**Response:**
```json
{
  "success": true,
  "action": "get_cached_analytics",
  "data": [
    {
      "cache_key": "monthly_stats_2025_10",
      "data": {
        "income": 150000,
        "expenses": 95000,
        "balance": 55000
      },
      "cached_at": "2025-10-31T14:30:00"
    }
  ]
}
```

**SQL Function:** `get_cached_analytics(workspace_id, cache_key, max_age_minutes)`

---

### 9. **save_chart_config**
Сохранить конфигурацию графика (персонализация)

**Request:**
```json
{
  "action": "save_chart_config",
  "workspace_id": 1,
  "chart_type": "income_expense_line",
  "title": "Мой кастомный график",
  "config": {
    "colors": ["#22c55e", "#ef4444"],
    "tension": 0.4,
    "fill": true
  },
  "is_default": true
}
```

**Response:**
```json
{
  "success": true,
  "action": "save_chart_config",
  "data": [
    {
      "id": 5,
      "workspace_id": 1,
      "chart_type": "income_expense_line",
      "title": "Мой кастомный график",
      "config_json": {...},
      "is_default": true,
      "created_at": "2025-10-31T15:00:00",
      "updated_at": "2025-10-31T15:00:00"
    }
  ]
}
```

**SQL Table:** `chart_configs` (INSERT ... ON CONFLICT DO UPDATE)

---

### 10. **get_chart_configs**
Получить сохраненные конфигурации графиков

**Request:**
```json
{
  "action": "get_chart_configs",
  "workspace_id": 1,
  "chart_type": "income_expense_line"
}
```

**Parameters:**
- `chart_type` - опционально, для фильтрации по типу графика

**Response:**
```json
{
  "success": true,
  "action": "get_chart_configs",
  "data": [
    {
      "id": 5,
      "workspace_id": 1,
      "chart_type": "income_expense_line",
      "title": "Мой кастомный график",
      "config_json": {...},
      "is_default": true,
      "created_at": "2025-10-31T15:00:00"
    }
  ]
}
```

**SQL Table:** `chart_configs` (SELECT with ORDER BY is_default DESC)

---

## 📊 Chart Types

### Line Chart - Income/Expense
```javascript
const chartData = await fetch(analyticsUrl, {
  method: 'POST',
  body: JSON.stringify({
    action: 'get_chart_data',
    workspace_id: 1,
    start_date: '2025-10-01',
    end_date: '2025-10-31',
    interval: 'day'
  })
});

new Chart(ctx, {
  type: 'line',
  data: {
    labels: chartData.data.map(d => d.date),
    datasets: [
      { label: 'Доходы', data: chartData.data.map(d => d.income_amount) },
      { label: 'Расходы', data: chartData.data.map(d => d.expense_amount) }
    ]
  }
});
```

### Pie Chart - Categories
```javascript
const categories = await fetch(analyticsUrl, {
  method: 'POST',
  body: JSON.stringify({
    action: 'get_top_categories',
    workspace_id: 1,
    start_date: '2025-10-01',
    end_date: '2025-10-31',
    limit: 10
  })
});

new Chart(ctx, {
  type: 'pie',
  data: {
    labels: categories.data.map(c => c.category),
    datasets: [{
      data: categories.data.map(c => c.total_amount)
    }]
  }
});
```

### Line Chart - Balance Trend
```javascript
const trend = await fetch(analyticsUrl, {
  method: 'POST',
  body: JSON.stringify({
    action: 'get_balance_trend',
    workspace_id: 1,
    start_date: '2025-10-01',
    end_date: '2025-10-31'
  })
});

new Chart(ctx, {
  type: 'line',
  data: {
    labels: trend.data.map(d => d.date),
    datasets: [{
      label: 'Баланс',
      data: trend.data.map(d => d.cumulative_balance),
      fill: true
    }]
  }
});
```

---

## 🔗 Интеграция с Mini App

В `app.js` функция `loadAnalytics()` вызывает 4 endpoint'а:

1. `get_income_expense_stats` → `updateMetrics()`
2. `get_chart_data` → `renderIncomeExpenseChart()`
3. `get_top_categories` → `renderCategoryPieChart()` + `renderTopCategories()`
4. `get_balance_trend` → `renderBalanceTrendChart()`

**Пример использования:**
```javascript
async function loadAnalytics() {
  const analyticsUrl = 'https://hi9neee.app.n8n.cloud/webhook/analytics-api';
  const workspaceId = getCurrentWorkspaceId();
  
  // 1. Статистика
  const stats = await fetch(analyticsUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'get_income_expense_stats',
      workspace_id: workspaceId,
      start_date: '2025-10-01',
      end_date: '2025-10-31'
    })
  });
  
  // 2. График доходов/расходов
  const chartData = await fetch(analyticsUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'get_chart_data',
      workspace_id: workspaceId,
      start_date: '2025-10-01',
      end_date: '2025-10-31',
      interval: 'day'
    })
  });
  
  // ... и т.д.
}
```

---

## 🚀 Импорт в n8n

1. Откройте n8n
2. Создайте новый workflow
3. Импортируйте `Analytics_API.json`
4. Настройте Supabase credentials
5. Активируйте workflow
6. Скопируйте Production Webhook URL

**Количество нод:** 32
**Endpoints:** 10
**PostgreSQL функции:** 8

---

## 📈 Производительность

### Кэширование
Используйте `update_analytics_cache()` и `get_cached_analytics()` для часто запрашиваемых данных:

```javascript
// Проверяем кэш
const cached = await fetch(analyticsUrl, {
  method: 'POST',
  body: JSON.stringify({
    action: 'get_cached_analytics',
    workspace_id: 1,
    cache_key: 'monthly_stats_2025_10',
    max_age_minutes: 60
  })
});

if (cached.data.length > 0) {
  // Используем кэш
  updateMetrics(cached.data[0].data);
} else {
  // Запрашиваем данные + сохраняем в кэш
  const stats = await fetch(analyticsUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'get_income_expense_stats',
      workspace_id: 1,
      start_date: '2025-10-01',
      end_date: '2025-10-31'
    })
  });
  
  // Сохраняем в кэш
  await fetch(analyticsUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'update_analytics_cache',
      workspace_id: 1,
      cache_key: 'monthly_stats_2025_10',
      data: stats.data[0]
    })
  });
}
```

---

## ✅ Готово к использованию

- ✅ 10 endpoints реализовано
- ✅ Интеграция с Chart.js
- ✅ Кэширование для оптимизации
- ✅ Поддержка multi-tenancy (workspace_id)
- ✅ Гибкие периоды (day/week/month/year)

**Next Steps:** Phase 5 - Reports Generation 📄
