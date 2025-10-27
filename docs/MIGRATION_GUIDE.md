# 🔄 Пошаговая миграция с Google Sheets на Supabase

## Зачем эта инструкция?

Вместо создания новых workflow с нуля, вы можете **модифицировать существующие** прямо в n8n интерфейсе. Это быстрее и проще.

---

## ✅ Что уже готово:

1. **init_database.sql** - запустите в Supabase SQL Editor
2. **SQL_QUERIES_FOR_N8N.md** - все SQL запросы готовы к копированию
3. **FixedAnaliziFinance_v3_BACKUP.json** - бэкап оригинала (на всякий случай)

---

## 🎯 План миграции (30 минут)

### Шаг 1: Настройка Supabase (10 минут)

1. Перейдите на https://supabase.com
2. Создайте проект "ai-accounter"
3. Откройте SQL Editor
4. Скопируйте весь код из **init_database.sql**
5. Выполните (Run)
6. Проверьте что созданы 6 таблиц

7. Скопируйте Database URL:
   - Settings → Database → Connection string → URI
   - Замените `[YOUR-PASSWORD]` на ваш пароль

8. Добавьте Postgres credentials в n8n:
   - Settings → Credentials → Add Credential → Postgres
   - Вставьте Connection String
   - SSL: Enabled
   - Test Connection → должен быть ✅

### Шаг 2: Модификация главного workflow (15 минут)

Откройте `FixedAnaliziFinance_v3.json` в n8n

#### 2.1 Добавить регистрацию пользователя

1. После узла "Telegram Bot Trigger"
2. Добавьте узел **Postgres**
3. Operation: Execute Query
4. Query: скопируйте из **SQL_QUERIES_FOR_N8N.md** → раздел 1
5. Continue On Fail: ✅ (чтобы не падало если пользователь уже есть)

#### 2.2 Заменить добавление расходов

Найдите узел "AddCostGoogleTable" и замените его на 3 узла:

**Узел 1: Code "Подготовка расхода"**
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
    description: $fromAI('description') || ''
  }
};
```

**Узел 2: Postgres "Добавить расход"**
- Query: скопируйте из **SQL_QUERIES_FOR_N8N.md** → раздел 2 → SQL для вставки

**Узел 3: Postgres "Проверка лимитов"**
- Query: скопируйте из **SQL_QUERIES_FOR_N8N.md** → раздел 2 → SQL для проверки лимитов
- Continue On Fail: ✅

#### 2.3 Заменить добавление доходов

Найдите узел "AddRevenueGoogleTable" и замените на 2 узла:

**Узел 1: Code "Подготовка дохода"**
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
    description: $fromAI('description') || ''
  }
};
```

**Узел 2: Postgres "Добавить доход"**
- Query: скопируйте из **SQL_QUERIES_FOR_N8N.md** → раздел 3 → SQL для вставки

#### 2.4 Заменить анализ

Найдите узел "workspaceAnalize" и замените на 3 узла:

**Узел 1: Code "Парсинг месяца"**
- Скопируйте код из **SQL_QUERIES_FOR_N8N.md** → раздел 4 → JavaScript

**Узел 2: IF "Проверка типа"**
- Condition: `{{ $json.type }}` equals `расход`

**Узел 3a: Postgres "Анализ расходов"** (если type = расход)
- Query: из **SQL_QUERIES_FOR_N8N.md** → раздел 4 → SQL для анализа расходов

**Узел 3b: Postgres "Анализ доходов"** (если type = доход)
- Query: из **SQL_QUERIES_FOR_N8N.md** → раздел 4 → SQL для анализа доходов

### Шаг 3: Модификация BudgetSystem.json (5 минут)

Откройте `BudgetSystem.json` в n8n

1. Замените все Google Sheets узлы на Postgres
2. Используйте SQL из разделов 5 и 6 файла **SQL_QUERIES_FOR_N8N.md**

### Шаг 4: Модификация WeeklyReport.json (5 минут)

Откройте `WeeklyReport.json` в n8n

#### ❌ Что удалить:
1. Узел "Читать доходы" (Google Sheets)
2. Узел "Читать расходы" (Google Sheets)  
3. Узел "Рассчитать статистику" (Code)

#### ✅ Что добавить:

**1. Заменить узел "Получить пользователей"**
- Удалить Google Sheets узел
- Добавить **Postgres** узел
- Query: 
  ```sql
  SELECT user_id, username, first_name, telegram_chat_id
  FROM users
  WHERE is_active = true
  ORDER BY user_id;
  ```

**2. После "Split In Batches" добавить Postgres узел "Получить статистику"**
- Operation: Execute Query
- Query: скопируйте из **SQL_QUERIES_FOR_N8N.md** → раздел 7 → полный SQL с CTEs

**3. Добавить Code узел "Форматировать отчёт"**
- Code: скопируйте из **SQL_QUERIES_FOR_N8N.md** → раздел 7 → JavaScript для форматирования

**4. Добавить IF узел "Проверка данных"** (опционально)
- Condition: `{{ $json.message !== undefined }}`
- Чтобы не отправлять пустые отчёты пользователям без транзакций

#### Новая структура потока:
```
Schedule Trigger (Воскресенье 20:00)
  ↓
Postgres: Получить пользователей
  ↓
Split In Batches
  ↓
Postgres: Получить статистику недели ← НОВОЕ (заменяет 3 старых узла)
  ↓
Code: Форматировать отчёт ← НОВОЕ
  ↓
IF: Есть данные? ← НОВОЕ
  ↓ (true)
Telegram: Отправить отчёт
```

**Преимущества новой архитектуры:**
- ⚡ Один SQL-запрос вместо 2 чтений + агрегации в JavaScript
- 📊 Агрегация на уровне базы данных (быстрее)
- 🔒 Каждый пользователь получает только свою статистику
- 📉 Меньше нагрузка на n8n

---

## 🧪 Тестирование

После миграции протестируйте:

1. **Регистрация**: напишите боту любое сообщение
   - Проверьте в Supabase Table Editor → users (должна появиться запись)

2. **Добавление расхода**: `Купил продукты за 500 сом`
   - Проверьте в Supabase → expenses (должна появиться запись с вашим user_id)

3. **Добавление дохода**: `Доход 40000 зарплата`
   - Проверьте в Supabase → income

4. **Анализ**: `Сколько потратил в октябре?`
   - Должен вернуться отчёт с данными

5. **Бюджет**: `/budget 50000`
   - Проверьте в Supabase → budgets

6. **Лимит**: `/limit продукты 15000`
   - Проверьте в Supabase → limits

---

## 🔧 Важные моменты

### RLS (Row Level Security)

По умолчанию RLS включён в базе. Для работы n8n нужно **временно отключить**:

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE income DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE limits DISABLE ROW LEVEL SECURITY;
```

Или используйте `service_role` ключ вместо `anon` в credentials.

### Timezone

Все даты хранятся в UTC в PostgreSQL. Для отображения используйте:
```sql
AT TIME ZONE 'Asia/Bishkek'
```

### Кодировка

Если русские символы отображаются как `?`, проверьте кодировку в Supabase (должна быть UTF8).

---

## ✨ Преимущества после миграции

✅ **Мультипользователь** - каждый видит только свои данные
✅ **Быстрые запросы** - SQL агрегации работают мгновенно
✅ **Масштабируемость** - неограниченное количество пользователей
✅ **Бэкапы** - автоматические в Supabase
✅ **Аналитика** - сложные SQL запросы для отчётов

---

## 📞 Если что-то не работает

1. Проверьте Execution Log в n8n
2. Проверьте таблицу error_logs в Supabase
3. Проверьте что Postgres credentials настроены правильно
4. Убедитесь что RLS отключён
5. Проверьте что user_id передаётся правильно

---

## 🎉 Готово!

После миграции ваш бот будет работать с PostgreSQL и поддерживать неограниченное количество пользователей!

**Следующие шаги:**
1. Протестируйте все функции
2. Пригласите друзей пользоваться ботом
3. Мониторьте использование в Supabase Dashboard
