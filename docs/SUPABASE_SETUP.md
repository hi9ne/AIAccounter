# 🚀 Настройка Supabase для AI Accounter

## Что такое Supabase?

**Supabase** — это открытая альтернатива Firebase, построенная на PostgreSQL.

**Преимущества:**
- ✅ Бесплатный тариф (500 MB БД, 50,000 запросов в месяц)
- ✅ Автоматические бэкапы
- ✅ REST API из коробки
- ✅ Row Level Security (данные защищены)
- ✅ Встроенный SQL редактор
- ✅ Реалтайм подписки (опционально)

---

## Шаг 1: Создание проекта в Supabase

### 1.1 Регистрация

1. Перейдите на https://supabase.com
2. Нажмите **"Start your project"**
3. Войдите через GitHub (рекомендуется) или email

### 1.2 Создание проекта

1. Нажмите **"New Project"**
2. Заполните форму:
   - **Name**: `ai-accounter` (или любое название)
   - **Database Password**: придумайте сложный пароль (сохраните его!)
   - **Region**: выберите ближайший регион (например, `Central EU` или `Frankfurt`)
   - **Pricing Plan**: выберите **Free** (бесплатно)
3. Нажмите **"Create new project"**
4. Подождите 2-3 минуты пока проект создаётся

---

## Шаг 2: Инициализация базы данных

### 2.1 Откройте SQL Editor

1. В левом меню выберите **"SQL Editor"**
2. Нажмите **"New query"**

### 2.2 Выполните SQL-скрипт

1. Откройте файл `init_database.sql` из вашего проекта
2. Скопируйте **весь** код (Ctrl+A, Ctrl+C)
3. Вставьте в SQL Editor в Supabase
4. Нажмите **"Run"** (или F5)
5. Должно появиться сообщение: **"Success. No rows returned"**

### 2.3 Проверка таблиц

1. В левом меню выберите **"Table Editor"**
2. Вы должны увидеть таблицы:
   - ✅ users
   - ✅ income
   - ✅ expenses
   - ✅ budgets
   - ✅ limits
   - ✅ error_logs

---

## Шаг 3: Получение credentials для n8n

### 3.1 Database URL

1. В левом меню выберите **"Settings"** → **"Database"**
2. Найдите раздел **"Connection string"**
3. Выберите **"URI"**
4. Скопируйте строку подключения, например:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
5. **Замените** `[YOUR-PASSWORD]` на ваш реальный пароль

**Сохраните эту строку** — она понадобится для n8n!

### 3.2 API Keys (опционально, для REST API)

1. В левом меню выберите **"Settings"** → **"API"**
2. Скопируйте:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: для публичного доступа
   - **service_role key**: для серверного доступа (храните в секрете!)

---

## Шаг 4: Настройка Row Level Security (RLS)

### 4.1 Что такое RLS?

**Row Level Security** — это защита, при которой каждый пользователь видит только свои данные.

Скрипт `init_database.sql` уже настроил RLS автоматически! ✅

### 4.2 Временное отключение RLS (для n8n)

Для работы n8n нужно отключить RLS или использовать service_role:

**Вариант 1: Отключить RLS (проще, но менее безопасно)**

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE income DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE limits DISABLE ROW LEVEL SECURITY;
```

**Вариант 2: Использовать service_role ключ (безопаснее)**

В n8n при подключении используйте `service_role` API key вместо `anon` ключа.

---

## Шаг 5: Настройка n8n для Supabase

### 5.1 Добавление credentials в n8n

1. Откройте n8n: http://localhost:5678
2. Перейдите в **Settings** → **Credentials**
3. Нажмите **"Add Credential"**
4. Выберите **"Postgres"**
5. Заполните данные:

**Способ 1: Connection String (проще)**
```
Connection String: postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
SSL: Enabled
```

**Способ 2: Отдельные поля**
```
Host: db.xxxxxxxxxxxxx.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [ваш пароль]
SSL: Enabled
```

6. Нажмите **"Test Connection"**
7. Должно появиться: ✅ **"Connection successful"**
8. Нажмите **"Save"**

---

## Шаг 6: Тестирование подключения

### 6.1 Создайте тестовый workflow в n8n

1. Создайте новый workflow
2. Добавьте узел **"Execute Query"** → **"Postgres"**
3. Выберите ваши Supabase credentials
4. Введите запрос:
   ```sql
   SELECT * FROM users LIMIT 10;
   ```
5. Нажмите **"Execute Node"**
6. Должен вернуться пустой результат (таблица пока пустая)

### 6.2 Добавьте тестового пользователя

```sql
INSERT INTO users (user_id, username, first_name, telegram_chat_id) 
VALUES (123456789, 'test_user', 'Тестовый Пользователь', 123456789)
RETURNING *;
```

Выполните → должна вернуться строка с данными пользователя.

---

## Шаг 7: Импорт обновлённых workflows

Теперь импортируйте новые файлы:

1. **FixedAnaliziFinance_v3_Supabase.json** - основной бот
2. **WeeklyReport_Supabase.json** - еженедельные отчёты
3. **BudgetSystem_Supabase.json** - бюджеты и лимиты
4. **ErrorHandling_Supabase.json** - обработка ошибок

Все файлы уже настроены на работу с PostgreSQL! 🚀

---

## Шаг 8: Мониторинг и управление

### 8.1 Просмотр данных

**Через Supabase Table Editor:**
1. Откройте Table Editor
2. Выберите таблицу (например, `expenses`)
3. Увидите все записи в красивом интерфейсе
4. Можно редактировать вручную

**Через SQL Editor:**
```sql
-- Все расходы пользователя
SELECT * FROM expenses WHERE user_id = 123456789 ORDER BY date DESC;

-- Сумма расходов по категориям
SELECT category, SUM(amount) as total 
FROM expenses 
WHERE user_id = 123456789 
GROUP BY category 
ORDER BY total DESC;

-- Статистика за месяц
SELECT 
  (SELECT SUM(amount) FROM income WHERE user_id = 123456789 AND date >= '2025-10-01') as income,
  (SELECT SUM(amount) FROM expenses WHERE user_id = 123456789 AND date >= '2025-10-01') as expenses;
```

### 8.2 Бэкапы

Supabase автоматически делает бэкапы (на бесплатном тарифе - 7 дней истории).

**Ручной экспорт:**
1. SQL Editor → New query
2. Выполните:
   ```sql
   COPY (SELECT * FROM expenses) TO STDOUT WITH CSV HEADER;
   ```
3. Скопируйте результат

### 8.3 Мониторинг использования

1. **Settings** → **Usage**
2. Смотрите:
   - Database size (макс. 500 MB на Free)
   - API requests (макс. 50,000/мес на Free)
   - Bandwidth

---

## Шаг 9: Безопасность

### 9.1 Рекомендации

✅ **ДЕЛАТЬ:**
- Используйте сложный Database Password (мин. 16 символов)
- Храните credentials в безопасном месте (не в Git!)
- Регулярно проверяйте логи ошибок
- Делайте периодические экспорты данных

❌ **НЕ ДЕЛАТЬ:**
- Не публикуйте `service_role` ключ в коде
- Не используйте простые пароли
- Не отключайте SSL подключение

### 9.2 API Keys в n8n

Для REST API запросов используйте:
- **anon key** - для публичных операций
- **service_role key** - для административных операций (только на сервере!)

---

## Troubleshooting (Решение проблем)

### Проблема: "Could not connect to database"

**Решение:**
1. Проверьте, что SSL включён
2. Проверьте пароль (без спецсимволов в URL кодируйте: `%21` вместо `!`)
3. Убедитесь, что проект Supabase запущен (может "засыпать" на Free тарифе)

### Проблема: "Permission denied"

**Решение:**
1. Отключите RLS временно (см. Шаг 4.2)
2. Или используйте `service_role` ключ вместо `anon`

### Проблема: "Too many connections"

**Решение:**
На Free тарифе лимит: 60 одновременных подключений.
- Закройте неиспользуемые n8n workflows
- Используйте connection pooling

### Проблема: Медленные запросы

**Решение:**
1. Добавьте индексы (уже есть в `init_database.sql`)
2. Оптимизируйте SQL-запросы
3. Используйте представления (views) для сложных запросов

---

## Полезные ссылки

- 📚 Документация Supabase: https://supabase.com/docs
- 💬 Discord сообщество: https://discord.supabase.com
- 📖 PostgreSQL документация: https://www.postgresql.org/docs/
- 🔧 n8n + Supabase примеры: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/

---

## Готово! 🎉

Ваш Supabase настроен и готов к работе!

**Следующий шаг:** Импортируйте обновлённые workflows в n8n и начинайте тестирование! 🚀
