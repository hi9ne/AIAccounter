# 📊 SQL Запросы для n8n Workflows

Справочник всех SQL запросов для копирования в узлы PostgreSQL в n8n.

---

## 1. Регистрация/обновление пользователя

**Где используется:** AnaliziFinance.json → узел после Telegram Trigger

```sql
INSERT INTO users (user_id, username, first_name, last_name, telegram_chat_id)
VALUES (
  {{ $json.message.from.id }},
  '{{ $json.message.from.username || "" }}',
  '{{ $json.message.from.first_name || "" }}',
  '{{ $json.message.from.last_name || "" }}',
  {{ $json.message.chat.id }}
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  username = EXCLUDED.username,
  last_activity = NOW()
RETURNING *;
```

---

## 2. Добавление расхода

**Где используется:** AnaliziFinance.json → узел Add_expense (Postgres Tool)

**JavaScript для подготовки данных:**
```javascript
const dateStr = $fromAI('date');
const [day, month, year] = dateStr.split('.');
const sqlDate = `${year}-${month}-${day}`;
const userId = $node["Telegram Bot Trigger"].json["message"]["from"]["id"];

return {
  json: {
    user_id: userId,
    date: sqlDate,
    category: $fromAI('category'),
    amount: parseFloat($fromAI('amount')),
    description: $fromAI('description') || ''
  }
};
```

**SQL для вставки:**
```sql
INSERT INTO expenses (user_id, date, category, amount, description, operation_type, source)
VALUES (
  {{ $json.user_id }},
  '{{ $json.date }}',
  '{{ $json.category }}',
  {{ $json.amount }},
  '{{ $json.description }}',
  'расход',
  'telegram'
)
RETURNING id, date, category, amount, description;
```

**SQL для проверки лимитов:**
```sql
WITH expense_sum AS (
  SELECT COALESCE(SUM(amount), 0) as total_spent
  FROM expenses
  WHERE user_id = {{ $json.user_id }}
    AND category = '{{ $json.category }}'
    AND date >= DATE_TRUNC('month', CURRENT_DATE)
),
category_limit AS (
  SELECT limit_amount
  FROM limits
  WHERE user_id = {{ $json.user_id }}
    AND category = '{{ $json.category }}'
    AND month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  LIMIT 1
)
SELECT 
  e.total_spent,
  l.limit_amount,
  CASE 
    WHEN l.limit_amount IS NULL THEN NULL
    WHEN e.total_spent > l.limit_amount THEN 'exceeded'
    WHEN e.total_spent > (l.limit_amount * 0.8) THEN 'warning'
    ELSE 'ok'
  END as limit_status,
  CASE
    WHEN l.limit_amount IS NOT NULL THEN ROUND((e.total_spent / l.limit_amount) * 100)
    ELSE NULL
  END as percent_used
FROM expense_sum e
LEFT JOIN category_limit l ON true;
```

---

## 3. Добавление дохода

**Где используется:** AnaliziFinance.json → узел Add_income (Postgres Tool)

**JavaScript для подготовки данных:**
```javascript
const dateStr = $fromAI('date');
const [day, month, year] = dateStr.split('.');
const sqlDate = `${year}-${month}-${day}`;
const userId = $node["Telegram Bot Trigger"].json["message"]["from"]["id"];

return {
  json: {
    user_id: userId,
    date: sqlDate,
    category: $fromAI('category'),
    amount: parseFloat($fromAI('amount')),
    description: $fromAI('description') || '',
    operation_type: 'доход',
    source: 'telegram'
  }
};
```

**SQL для вставки:**
```sql
INSERT INTO income (user_id, date, category, amount, description, operation_type, source)
VALUES (
  {{ $json.user_id }},
  '{{ $json.date }}',
  '{{ $json.category }}',
  {{ $json.amount }},
  '{{ $json.description }}',
  'доход',
  'telegram'
)
RETURNING id, date, category, amount, description;
```

---

## 4. Анализ финансов (расходы)

**Где используется:** AnaliziFinance.json → узел для анализа расходов

**JavaScript для парсинга месяца:**
```javascript
const monthNames = {
  'январь': '01', 'февраль': '02', 'март': '03',
  'апрель': '04', 'май': '05', 'июнь': '06',
  'июль': '07', 'август': '08', 'сентябрь': '09',
  'октябрь': '10', 'ноябрь': '11', 'декабрь': '12'
};

const month = $fromAI('month').toLowerCase();
const monthNum = monthNames[month] || '10';
const year = new Date().getFullYear();
const yearMonth = `${year}-${monthNum}`;
const userId = $node["Telegram Bot Trigger"].json["message"]["from"]["id"];
const type = $fromAI('type'); // "доход" или "расход"
const category = $fromAI('category') || null;

return {
  json: {
    user_id: userId,
    year_month: yearMonth,
    type: type,
    category: category,
    month_name: month
  }
};
```

**SQL для анализа расходов:**
```sql
WITH monthly_data AS (
  SELECT 
    category,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
  FROM expenses
  WHERE user_id = {{ $json.user_id }}
    AND TO_CHAR(date, 'YYYY-MM') = '{{ $json.year_month }}'
    {{ $json.category ? "AND category = '" + $json.category + "'" : "" }}
  GROUP BY category
  ORDER BY total_amount DESC
)
SELECT 
  *,
  (SELECT SUM(total_amount) FROM monthly_data) as grand_total
FROM monthly_data;
```

**SQL для анализа доходов:**
```sql
WITH monthly_data AS (
  SELECT 
    category,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
  FROM income
  WHERE user_id = {{ $json.user_id }}
    AND TO_CHAR(date, 'YYYY-MM') = '{{ $json.year_month }}'
    {{ $json.category ? "AND category = '" + $json.category + "'" : "" }}
  GROUP BY category
  ORDER BY total_amount DESC
)
SELECT 
  *,
  (SELECT SUM(total_amount) FROM monthly_data) as grand_total
FROM monthly_data;
```

---

## 5. Установка бюджета

**Где используется:** BudgetSystem.json

**JavaScript для парсинга команды:**
```javascript
const text = $json.message.text || '';
const match = text.match(/\/budget\s+(\d+)/);

if (match) {
  const amount = parseFloat(match[1]);
  const userId = $json.message.from.id;
  const now = new Date();
  const month = now.toLocaleString('ru-RU', { 
    year: 'numeric', 
    month: '2-digit',
    timeZone: 'Asia/Bishkek'
  }).replace('.', '-').slice(0, 7);
  
  return {
    json: {
      user_id: userId,
      month: month,
      budget_amount: amount,
      telegram_chat_id: $json.message.chat.id
    }
  };
} else {
  throw new Error('Формат: /budget <сумма>');
}
```

**SQL для UPSERT:**
```sql
INSERT INTO budgets (user_id, month, budget_amount)
VALUES (
  {{ $json.user_id }},
  '{{ $json.month }}',
  {{ $json.budget_amount }}
)
ON CONFLICT (user_id, month)
DO UPDATE SET
  budget_amount = EXCLUDED.budget_amount,
  last_updated = NOW()
RETURNING *;
```

---

## 6. Установка лимита

**Где используется:** BudgetSystem.json

**JavaScript для парсинга команды:**
```javascript
const text = $json.message.text || '';
const match = text.match(/\/limit\s+([^\d]+)\s+(\d+)/);

if (match) {
  const category = match[1].trim();
  const amount = parseFloat(match[2]);
  const userId = $json.message.from.id;
  const now = new Date();
  const month = now.toLocaleString('ru-RU', { 
    year: 'numeric', 
    month: '2-digit',
    timeZone: 'Asia/Bishkek'
  }).replace('.', '-').slice(0, 7);
  
  return {
    json: {
      user_id: userId,
      category: category,
      limit_amount: amount,
      month: month,
      telegram_chat_id: $json.message.chat.id
    }
  };
} else {
  throw new Error('Формат: /limit <категория> <сумма>');
}
```

**SQL для UPSERT:**
```sql
INSERT INTO limits (user_id, category, limit_amount, month)
VALUES (
  {{ $json.user_id }},
  '{{ $json.category }}',
  {{ $json.limit_amount }},
  '{{ $json.month }}'
)
ON CONFLICT (user_id, category, month)
DO UPDATE SET
  limit_amount = EXCLUDED.limit_amount,
  last_updated = NOW()
RETURNING *;
```

---

## 7. Еженедельный отчёт

**Где используется:** WeeklyReport.json

**SQL для получения всех активных пользователей:**
```sql
SELECT user_id, username, first_name, telegram_chat_id
FROM users
WHERE is_active = true
ORDER BY user_id;
```

**SQL для статистики одного пользователя (в цикле):**
```sql
WITH week_range AS (
  SELECT 
    DATE_TRUNC('week', CURRENT_DATE AT TIME ZONE 'Asia/Bishkek') as week_start,
    DATE_TRUNC('week', CURRENT_DATE AT TIME ZONE 'Asia/Bishkek') + INTERVAL '6 days' as week_end
),
income_sum AS (
  SELECT COALESCE(SUM(amount), 0) as total
  FROM income
  WHERE user_id = {{ $json.user_id }}
    AND date >= (SELECT week_start FROM week_range)::date
    AND date <= (SELECT week_end FROM week_range)::date
),
expense_sum AS (
  SELECT COALESCE(SUM(amount), 0) as total
  FROM expenses
  WHERE user_id = {{ $json.user_id }}
    AND date >= (SELECT week_start FROM week_range)::date
    AND date <= (SELECT week_end FROM week_range)::date
),
top_categories AS (
  SELECT 
    category,
    SUM(amount) as total,
    COUNT(*) as count
  FROM expenses
  WHERE user_id = {{ $json.user_id }}
    AND date >= (SELECT week_start FROM week_range)::date
    AND date <= (SELECT week_end FROM week_range)::date
  GROUP BY category
  ORDER BY total DESC
  LIMIT 3
),
transaction_count AS (
  SELECT 
    (SELECT COUNT(*) FROM income WHERE user_id = {{ $json.user_id }} 
     AND date >= (SELECT week_start FROM week_range)::date
     AND date <= (SELECT week_end FROM week_range)::date) as income_count,
    (SELECT COUNT(*) FROM expenses WHERE user_id = {{ $json.user_id }}
     AND date >= (SELECT week_start FROM week_range)::date
     AND date <= (SELECT week_end FROM week_range)::date) as expense_count
)
SELECT 
  TO_CHAR((SELECT week_start FROM week_range), 'DD.MM.YYYY') as week_start_formatted,
  TO_CHAR((SELECT week_end FROM week_range), 'DD.MM.YYYY') as week_end_formatted,
  (SELECT total FROM income_sum) as total_income,
  (SELECT total FROM expense_sum) as total_expenses,
  (SELECT total FROM income_sum) - (SELECT total FROM expense_sum) as profit,
  (SELECT income_count FROM transaction_count) as income_count,
  (SELECT expense_count FROM transaction_count) as expense_count,
  (SELECT income_count + expense_count FROM transaction_count) as total_transactions,
  COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT(
    'category', category,
    'total', total,
    'count', count
  )) FROM top_categories), '[]'::json) as top_categories;
```

**JavaScript для форматирования отчёта:**
```javascript
const data = $json;

// Если нет транзакций - пропускаем пользователя
if (data.total_transactions === 0) {
  return null;
}

const topCategories = JSON.parse(data.top_categories || '[]');
const emojis = ['1️⃣', '2️⃣', '3️⃣'];

const topCategoriesText = topCategories.map((cat, index) => {
  const percent = data.total_expenses > 0 
    ? Math.round((cat.total / data.total_expenses) * 100) 
    : 0;
  return `${emojis[index]} ${cat.category}: ${Math.round(cat.total).toLocaleString('ru-RU')} сом (${percent}%)`;
}).join('\n');

const message = `📊 Недельная финансовая сводка
🗓 ${data.week_start_formatted} - ${data.week_end_formatted}

💰 ДОХОДЫ: ${Math.round(data.total_income).toLocaleString('ru-RU')} сом
💸 РАСХОДЫ: ${Math.round(data.total_expenses).toLocaleString('ru-RU')} сом
📈 ПРИБЫЛЬ: ${Math.round(data.profit).toLocaleString('ru-RU')} сом

🏆 ТОП-3 КАТЕГОРИИ РАСХОДОВ:
${topCategoriesText || 'Нет данных'}

💡 Операций за неделю: ${data.total_transactions}`;

return {
  json: {
    message: message,
    telegram_chat_id: $('Split In Batches').first().json.telegram_chat_id
  }
};
```

---

## 8. Логирование ошибок

**Где используется:** ErrorHandling_PostgreSQL.json

```sql
INSERT INTO error_logs (error_type, user_id, data, message, severity)
VALUES (
  '{{ $json.error_type }}',
  {{ $json.user_id || 'NULL' }},
  '{{ JSON.stringify($json) }}',
  '{{ $json.error_message }}',
  'error'
)
RETURNING *;
```

---

## 9. Банковский парсер

**Где используется:** BankParser_Kyrgyzstan_PostgreSQL.json

**Добавление расхода из банка:**
```sql
INSERT INTO expenses (user_id, date, category, amount, description, operation_type, source)
VALUES (
  1,  -- Замените на user_id из настроек
  '{{ $json.date }}',
  '{{ $json.category }}',
  {{ $json.amount }},
  '{{ $json.description }}',
  'расход',
  'bank_parser'
)
RETURNING *;
```

**Добавление дохода из банка:**
```sql
INSERT INTO income (user_id, date, category, amount, description, operation_type, source)
VALUES (
  1,  -- Замените на user_id из настроек
  '{{ $json.date }}',
  '{{ $json.category }}',
  {{ $json.amount }},
  '{{ $json.description }}',
  'доход',
  'bank_parser'
)
RETURNING *;
```

---

## 10. Проверка дубликатов

**Где используется:** ErrorHandling_PostgreSQL.json

```sql
SELECT * FROM expenses 
WHERE user_id = {{ $json.user_id }}
  AND date = '{{ $json.date }}'
  AND amount = {{ $json.amount }}
  AND category = '{{ $json.category }}'
LIMIT 1;
```

---

## Полезные SQL запросы для отладки

### Просмотр всех транзакций пользователя:
```sql
SELECT * FROM expenses 
WHERE user_id = 123456789 
ORDER BY date DESC 
LIMIT 50;
```

### Сумма по категориям за месяц:
```sql
SELECT 
  category,
  COUNT(*) as count,
  SUM(amount) as total,
  AVG(amount) as average
FROM expenses
WHERE user_id = 123456789
  AND date >= '2025-10-01'
  AND date < '2025-11-01'
GROUP BY category
ORDER BY total DESC;
```

### Статистика пользователя:
```sql
SELECT * FROM user_statistics
WHERE user_id = 123456789;
```

### Последние ошибки:
```sql
SELECT * FROM error_logs
ORDER BY timestamp DESC
LIMIT 20;
```

### Все пользователи с активностью:
```sql
SELECT 
  user_id,
  username,
  first_name,
  last_activity,
  (SELECT COUNT(*) FROM expenses WHERE expenses.user_id = users.user_id) as expense_count,
  (SELECT COUNT(*) FROM income WHERE income.user_id = users.user_id) as income_count
FROM users
WHERE is_active = true
ORDER BY last_activity DESC;
```

---

## Примечания

1. **{{ $json.field }}** - синтаксис n8n для доступа к данным из предыдущих узлов
2. **$fromAI('field')** - функция для получения данных от AI-агента
3. **$node["NodeName"]** - доступ к данным конкретного узла
4. Все даты в формате **YYYY-MM-DD**
5. Суммы в **сомах (KGS)** без дополнительных обозначений

---

## Копирование в n8n

1. Откройте нужный workflow в n8n
2. Найдите узел Postgres
3. Скопируйте SQL запрос отсюда
4. Вставьте в поле **Query**
5. Убедитесь, что credentials настроены
6. Сохраните и протестируйте

**Готово!** 🚀
