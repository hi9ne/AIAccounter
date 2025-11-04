# Формат данных для n8n → APITemplate.io

## ⚠️ ВАЖНО: Форматированные значения с валютой

APITemplate.io не может корректно обрабатывать `{{currency_symbol}}` внутри HTML/JavaScript.

**Решение**: Отправляйте ДВА значения для каждого числа с валютой:
- `amount`: чистое число (для графиков)
- `amount_formatted`: число с валютой (для отображения)

---

## 📊 Месячный отчет (monthly-report)

### Обязательные поля с валютой:

```json
{
  "period": "01.10.2025 - 31.10.2025",
  "user_name": "Алик Мукан",
  
  // Основные метрики (нужны оба формата!)
  "total_expenses": 185600,
  "total_expenses_formatted": "185600 ₸",
  
  "total_income": 350000,
  "total_income_formatted": "350000 ₸",
  
  "balance": 164400,
  "balance_formatted": "164400 ₸",
  
  "transaction_count": 156,
  
  // Бюджет
  "budget_amount": 200000,
  "budget_amount_formatted": "200000 ₸",
  
  "budget_used": 185600,
  "budget_used_formatted": "185600 ₸",
  
  "budget_used_percent": 93,
  
  "budget_remaining": 14400,
  "budget_remaining_formatted": "14400 ₸",
  
  // Средние значения
  "avg_daily_expense": 5987,
  "avg_daily_expense_formatted": "5987 ₸",
  
  "avg_daily_income": 11290,
  "avg_daily_income_formatted": "11290 ₸",
  
  // Прогноз
  "forecast_expense": 192000,
  "forecast_expense_formatted": "192000 ₸",
  
  "forecast_income": 365000,
  "forecast_income_formatted": "365000 ₸",
  
  "forecast_balance": 173000,
  "forecast_balance_formatted": "173000 ₸",
  
  // Данные для графиков
  "weekly_data": [
    {
      "label": "Неделя 1",
      "expenses": 42300,
      "income": 85000
    }
  ],
  
  "top_categories": [
    {
      "name": "Продукты",
      "amount": 62400,
      "percentage": 33.6
    }
  ],
  
  "expense_breakdown": [
    {
      "category": "Продукты",
      "amount": 62400,
      "amount_formatted": "62400 ₸",
      "percentage": 33.6,
      "count": 45
    }
  ]
}
```

---

## 📅 Недельный отчет (weekly-report)

```json
{
  "user_name": "Алик Мукан",
  "period": "28.10.2025 - 04.11.2025",
  
  "total_expenses": 45280,
  "total_expenses_formatted": "45280 ₸",
  
  "total_income": 85000,
  "total_income_formatted": "85000 ₸",
  
  "balance": 39720,
  "balance_formatted": "39720 ₸",
  
  "transaction_count": 47,
  "expense_count": 38,
  
  "avg_daily_expense": 6468,
  "avg_daily_expense_formatted": "6468 ₸",
  
  "avg_daily_income": 12143,
  "avg_daily_income_formatted": "12143 ₸",
  
  "top_categories_table": [
    {
      "label": "Продукты",
      "value": 18500,
      "percentage": 40.9
    }
  ],
  
  "daily_details": [
    {
      "date": "04.11",
      "expenses": 5200,
      "expenses_formatted": "5200 ₸",
      "income": 0,
      "income_formatted": "0 ₸",
      "balance": -5200,
      "balance_formatted": "-5200 ₸"
    }
  ]
}
```

---

## 📆 Отчет за период (period-report)

```json
{
  "user_name": "Алик Мукан",
  "period_start": "15.10.2025",
  "period_end": "25.10.2025",
  
  "total_expenses": 58900,
  "total_expenses_formatted": "58900 ₸",
  
  "total_income": 125000,
  "total_income_formatted": "125000 ₸",
  
  "balance": 66100,
  "balance_formatted": "66100 ₸",
  
  "total_transactions": 52,
  "period_days": 11,
  
  "avg_expense_per_day": 5354,
  "avg_expense_per_day_formatted": "5354 ₸",
  
  "avg_income_per_day": 11364,
  "avg_income_per_day_formatted": "11364 ₸",
  
  "max_expense": 12500,
  "max_expense_formatted": "12500 ₸",
  
  "category_totals": [
    {
      "category": "Продукты",
      "category_total": 24500,
      "percentage": 41.6
    }
  ],
  
  "daily_data": [
    {
      "date": "15.10",
      "expenses": 4500,
      "income": 0
    }
  ],
  
  "all_transactions": [
    {
      "date": "15.10",
      "category": "Продукты",
      "description": "Супермаркет",
      "type": "expense",
      "amount": 4500,
      "amount_formatted": "4500 ₸"
    }
  ]
}
```

---

## � Отчёт за период (period-report)

### Обязательные поля:

```json
{
  "user_name": "Алик Мукан",
  "period_start": "15.10.2025",
  "period_end": "25.10.2025",
  "period_days": 11,
  "currency_symbol": "₸",
  
  // Основные метрики
  "total_expenses": 58900,
  "total_expenses_formatted": "58900 ₸",
  
  "total_income": 125000,
  "total_income_formatted": "125000 ₸",
  
  "balance": 66100,
  "balance_formatted": "66100 ₸",
  
  "transaction_count": 52,
  
  // Аналитика (для метрик внизу отчета)
  "avg_expense_per_day": 5354,
  "avg_expense_per_day_formatted": "5354 ₸",
  
  "avg_income_per_day": 11364,
  "avg_income_per_day_formatted": "11364 ₸",
  
  "max_expense": 8200,
  "max_expense_formatted": "8200 ₸",
  
  // График динамики по дням (ОБЯЗАТЕЛЬНО для Area Chart)
  "daily_data": [
    {
      "date": "15.10",
      "expenses": 4500,
      "income": 0
    },
    {
      "date": "16.10",
      "expenses": 5200,
      "income": 15000
    }
    // ... все дни периода
  ],
  
  // Распределение по категориям (для Donut и Bar графиков)
  "category_totals": [
    {
      "category": "Продукты",
      "category_total": 24500,
      "category_total_formatted": "24500 ₸",
      "percentage": 41.6
    },
    {
      "category": "Транспорт",
      "category_total": 12800,
      "category_total_formatted": "12800 ₸",
      "percentage": 21.7
    }
    // ... минимум 3-5 категорий
  ],
  
  // Таблица всех транзакций (ОБЯЗАТЕЛЬНО)
  "all_transactions": [
    {
      "date": "25.10",
      "category": "Зарплата",
      "description": "Основная зарплата",
      "type": "income",
      "amount": 50000,
      "amount_formatted": "50000 ₸"
    },
    {
      "date": "25.10",
      "category": "Продукты",
      "description": "Глобус супермаркет",
      "type": "expense",
      "amount": 900,
      "amount_formatted": "900 ₸"
    }
    // ... все транзакции периода (обратная хронология)
  ]
}
```

---

## �🔧 Пример кода для n8n (JavaScript)

### Функция форматирования с валютой:

```javascript
// В n8n Function Node добавьте эту функцию
function formatCurrency(amount, currencySymbol = "₸") {
  return `${amount} ${currencySymbol}`;
}

// Пример использования для месячного отчета
const monthlyReportData = {
  period: "01.10.2025 - 31.10.2025",
  user_name: $input.item.json.userName,
  
  // Форматируем все числовые значения
  total_expenses: $input.item.json.totalExpenses,
  total_expenses_formatted: formatCurrency($input.item.json.totalExpenses),
  
  total_income: $input.item.json.totalIncome,
  total_income_formatted: formatCurrency($input.item.json.totalIncome),
  
  balance: $input.item.json.balance,
  balance_formatted: formatCurrency($input.item.json.balance),
  
  // ... остальные поля
  
  // Для массивов используем map
  expense_breakdown: $input.item.json.categories.map(cat => ({
    category: cat.name,
    amount: cat.total,
    amount_formatted: formatCurrency(cat.total),
    percentage: cat.percentage,
    count: cat.count
  }))
};

return { json: monthlyReportData };
```

---

## 🌍 Поддержка разных валют

Измените символ валюты в функции `formatCurrency`:

```javascript
// Для тенге (по умолчанию)
formatCurrency(185600, "₸")  // "185600 ₸"

// Для сома
formatCurrency(185600, "KGS") // "185600 KGS"

// Для доллара
formatCurrency(185600, "$")   // "185600 $"

// Для рубля
formatCurrency(185600, "₽")   // "185600 ₽"
```

**Важно**: Символ валюты в графиках (JavaScript) жестко закодирован как `₸`. Если нужна другая валюта для графиков, измените его в HTML шаблоне вручную:

```javascript
// В monthly-report.html, weekly-report.html, period-report.html
formatter: function (val) {
  return val.toLocaleString() + ' ₸'  // <-- измените здесь
}
```

---

## ✅ Контрольный список перед отправкой

- [ ] Все числовые поля имеют `_formatted` версию с валютой
- [ ] Массивы данных (`expense_breakdown`, `daily_details`, `all_transactions`) содержат `amount_formatted`
- [ ] Валюта везде одинаковая (₸, KGS, $, ₽)
- [ ] Тест данные соответствуют структуре в APITemplate.io
- [ ] Template ID правильно вставлен в n8n workflow

---

## 🐛 Устранение проблем

**Проблема**: Валюта не отображается
- ✅ Убедитесь, что отправляете `amount_formatted` поля
- ✅ Проверьте, что в JSON данных нет опечаток в именах полей

**Проблема**: Графики без валюты
- ✅ Валюта в графиках жестко закодирована в HTML как `' ₸'`
- ✅ Для другой валюты измените в шаблоне: `+ ' $'` или `+ ' KGS'`

**Проблема**: Числа слишком длинные
- ✅ Используйте `toLocaleString()` для группировки разрядов
- ✅ Пример: `185600` → `"185 600 ₸"` (с пробелами)
