# SQL Запросы для интеграции в n8n workflows

## 1. Регистрация/обновление пользователя

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

## 2. Добавление расхода

### JavaScript для преобразования данных:
```javascript
// Преобразование даты ДД.ММ.ГГГГ -> YYYY-MM-DD
const dateStr = $fromAI('date');
const [day, month, year] = dateStr.split('.');
const sqlDate = `${year}-${month}-${day}`;

const userId = $('Telegram Bot Trigger').first().json.message.from.id;

return {
  json: {
    user_id: userId,
    date: sqlDate,
    category: $fromAI('category'),
    amount: parseFloat($fromAI('amount')),
    description: $fromAI('description') || '',
    operation_type: 'расход',
    source: 'telegram'
  }
};
```

### SQL для вставки:
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

### SQL для проверки лимитов:
```sql
-- Проверка лимита по категории
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

## 3. Добавление дохода

### JavaScript для преобразования данных:
```javascript
const dateStr = $fromAI('date');
const [day, month, year] = dateStr.split('.');
const sqlDate = `${year}-${month}-${day}`;

const userId = $('Telegram Bot Trigger').first().json.message.from.id;

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

### SQL для вставки:
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

## 4. Анализ финансов

### JavaScript для парсинга месяца:
```javascript
// Преобразование месяца в номер
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

const userId = $('Telegram Bot Trigger').first().json.message.from.id;
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

### SQL для анализа расходов:
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

### SQL для анализа доходов:
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

## 5. Установка бюджета

### JavaScript для парсинга команды:
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

### SQL для UPSERT:
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

## 6. Установка лимита

### JavaScript для парсинга команды:
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

### SQL для UPSERT:
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

## 7. Еженедельный отчёт

### ЗАМЕНА: "Читать доходы" + "Читать расходы" → Один Postgres узел

**Что заменяем в WeeklyReport.json:**
- ❌ Удалить узел "Читать доходы" (Google Sheets)
- ❌ Удалить узел "Читать расходы" (Google Sheets)
- ❌ Удалить узел "Рассчитать статистику" (больше не нужен)
- ✅ Добавить один Postgres узел "Получить статистику пользователя"
- ✅ Добавить Code узел "Форматировать отчёт"

### Новая структура workflow:
1. Schedule Trigger (воскресенье 20:00)
2. Postgres: "Получить всех пользователей"
3. Split In Batches (по 1 пользователю)
4. **Postgres: "Получить статистику пользователя"** ← НОВЫЙ
5. **Code: "Форматировать отчёт"** ← НОВЫЙ
6. IF: Проверка что есть данные
7. Telegram: Отправить отчёт

### SQL для получения ВСЕХ пользователей:
```sql
SELECT user_id, username, first_name, telegram_chat_id
FROM users
WHERE is_active = true
ORDER BY user_id;
```

### SQL для статистики одного пользователя (выполняется в цикле):
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

### JavaScript для форматирования отчёта:
```javascript
const data = $json;

// Если нет транзакций - пропускаем пользователя
if (data.total_transactions === 0) {
  return null; // Не отправляем отчёт если нет данных
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

### Пошаговая инструкция для WeeklyReport.json:

1. **Откройте workflow** в n8n
2. **Удалите 3 узла:**
   - "Читать доходы"
   - "Читать расходы"  
   - "Рассчитать статистику"
3. **После "Split In Batches" добавьте:**
   - Postgres узел "Получить статистику пользователя"
   - Code узел "Форматировать отчёт"
   - IF узел "Есть данные?" (проверка `{{ $json.total_transactions > 0 }}`)
4. **Подключите к Telegram узлу**
5. **Измените узел "Получить пользователей"** с Google Sheets на Postgres

## 8. Логирование ошибок

### SQL для записи ошибки:
```sql
INSERT INTO error_logs (error_type, user_id, data, message, severity)
VALUES (
  '{{ $json.error_type }}',
  {{ $json.user_id || 'NULL' }},
  '{{ $json.data || "" }}',
  '{{ $json.message }}',
  '{{ $json.severity || "error" }}'
)
RETURNING *;
```

---

## Примечания по использованию:

1. **Все SQL запросы используют параметры из контекста n8n** через синтаксис `{{ $json.field }}`
2. **JavaScript узлы нужны для преобразования данных** перед SQL запросами
3. **Замените Google Sheets Tool узлы** на:
   - Code узел (для подготовки данных)
   - Postgres узел (для выполнения SQL)
4. **user_id автоматически берётся** из Telegram сообщения
5. **RLS отключите** в Supabase временно для работы через n8n

---

## Быстрая замена в основном workflow:

1. Найдите узел "AddRevenueGoogleTable"
2. Замените на: Code узел + Postgres узел с SQL выше
3. Повторите для "AddCostGoogleTable"
4. Добавьте узел "Регистрация пользователя" в начало workflow
