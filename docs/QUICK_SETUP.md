# ⚡ Быстрая настройка AI Financer (адаптировано под твою БД)

## ✅ Шаг 1: SQL миграция — ГОТОВО!

**Миграция уже применена через MCP!**

**Что добавлено:**
- ✅ `expenses_embeddings` - векторы для RAG поиска расходов
- ✅ `income_embeddings` - векторы для RAG поиска доходов
- ✅ `n8n_chat_histories_general` - история основного чата
- ✅ `n8n_chat_histories_income` - история Income Agent
- ✅ `n8n_chat_histories_expenses` - история Expenses Agent
- ✅ `match_expenses_documents()` - функция RAG поиска
- ✅ `match_income_documents()` - функция RAG поиска
- ✅ Расширения: `vector` v0.8.0, `uuid-ossp` v1.1

---

## Шаг 2: Импорт workflows (3 минуты)

### 2.1 Helper AI Financer (ПЕРВЫМ!)

```
1. n8n → Workflows → Import from File
2. Файл: n8n/workflows/Helper AI Financer.json
3. n8n попросит выбрать credentials:
   - OpenAI API → "OpenAi account" ✅
   - Supabase API → "AIAccounter" ✅  
   - PostgreSQL → "AIAccounter supabase" ✅
4. Save
5. Activate (включи toggle)
6. СКОПИРУЙ Workflow ID из URL: /workflow/XXXXX
```

### 2.2 Ai Financer (ВТОРЫМ!)

```
1. n8n → Workflows → Import from File
2. Файл: n8n/workflows/Ai Financer.json
3. n8n попросит выбрать credentials:
   - Telegram API → "AIAccounter" ✅
   - OpenAI API → "OpenAi account" ✅
   - Supabase API → "AIAccounter" ✅
   - PostgreSQL → "AIAccounter supabase" ✅

4. ВАЖНО: Найди ноду "Call 'Helper AI Financer'"
   → Вставь Helper Workflow ID (из пункта 2.1)

5. Save
6. Activate
```

---

## Шаг 3: Проверка (2 минуты)

**Отправь боту:**
```
Привет
```

**Ожидается:**
```
Здравствуйте! Я ваш AI финансовый помощник...
```

**Тест добавления:**
```
Получил зарплату 50000
```

**Проверь в БД (твои существующие таблицы):**
```sql
SELECT * FROM income ORDER BY date DESC LIMIT 1;
SELECT * FROM expenses ORDER BY date DESC LIMIT 1;
```

---

## 🎉 ГОТОВО!

**Workflows теперь работают с ТВОЕЙ существующей БД:**
- ✅ `expenses` (не создают rashod)
- ✅ `income` (не создают dohod)
- ✅ Используют твои поля: amount, description, date, user_id
- ✅ Backend API и workflows работают с одними данными!

**Команды для теста:**
- "Получил зарплату 50000"
- "Потратил 3500 на продукты"
- "Покажи мои расходы"
- "Сколько я потратил в этом месяце?"

---

## 🔍 Что изменилось в workflows:

**Таблицы:**
- `rashod` → `expenses` ✅
- `dohod` → `income` ✅

**Поля:**
- `summ` → `amount` ✅
- `sum` → `amount` ✅
- `comment` → `description` ✅
- `created_at` → `date` ✅

**Всё адаптировано под твою БД!**

---

## 🐛 Если что-то не так:

**Ошибка "Extension vector does not exist":**
```sql
CREATE EXTENSION vector;
```

**Ошибка "Permission denied for table":**
```sql
GRANT ALL ON expenses_embeddings, income_embeddings TO authenticated, anon, service_role;
```

**AI не отвечает:**
1. Проверь что Helper workflow активирован
2. Проверь Workflow ID в "Call 'Helper AI Financer'"
3. Проверь OpenAI API Key (Settings → Credentials)

**Workflow не находит таблицу:**
- Проверь что таблицы называются именно `expenses` и `income`
- Проверь что поля `amount`, `description`, `date` существуют

---

## 📊 Структура твоей БД после миграции:

**Существующие (не изменились):**
- ✅ `expenses` - расходы (amount, description, date, category, currency, user_id)
- ✅ `income` - доходы (аналогично)
- ✅ `users` - пользователи
- ✅ Все остальные таблицы

**Добавлено для RAG:**
- ✅ `expenses_embeddings` - векторы для поиска по расходам
- ✅ `income_embeddings` - векторы для поиска по доходам
- ✅ `n8n_chat_histories_general` - история основного чата
- ✅ `n8n_chat_histories_income` - история Income Agent
- ✅ `n8n_chat_histories_expenses` - история Expenses Agent

---

**Всё! Импортируй workflows и тестируй!** 🎉
