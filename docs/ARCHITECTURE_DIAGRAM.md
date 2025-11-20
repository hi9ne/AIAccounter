# 🏗️ АРХИТЕКТУРА AI FINANCER WORKFLOW

## 📊 **ПОЛНАЯ СХЕМА ПОТОКА ДАННЫХ:**

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              TELEGRAM BOT                                        │
│                     (Получение сообщений от пользователей)                       │
└────────────────────────────────┬─────────────────────────────────────────────────┘
                                 │
                                 ↓
                    ┌────────────────────────┐
                    │   Message Type Switch   │
                    │  (Голос или текст?)     │
                    └──────────┬──────────────┘
                               │
                ┌──────────────┴───────────────┐
                │                              │
                ↓                              ↓
    ┌──────────────────┐         ┌──────────────────────┐
    │  Download Voice  │         │   Extract Text       │
    │  + Transcribe    │         │   + user_id          │
    │  (OpenAI Whisper)│         └──────────┬───────────┘
    └────────┬─────────┘                    │
             │                               │
             ↓                               │
    ┌──────────────────┐                    │
    │ Extract Voice    │                    │
    │ Text + user_id   │                    │
    └────────┬─────────┘                    │
             │                               │
             └───────────────┬───────────────┘
                             │
                             ↓
        ╔════════════════════════════════════════════════╗
        ║          🤖 MAIN AI AGENT                      ║
        ║   (Главный оркестратор всех операций)          ║
        ║                                                ║
        ║   Подключено:                                  ║
        ║   • OpenAI Model (gpt-4o-mini)                 ║
        ║   • Main Chat Memory (общий контекст)          ║
        ║   • 2 Sub-Agents (Income, Expenses)            ║
        ║   • 4 CRUD Tools (Create/Delete Income/Exp)    ║
        ╚════════════════════════════════════════════════╝
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ↓                 ↓                 ↓
    ┌─────────────┐   ┌─────────────┐  ┌──────────────┐
    │ Income      │   │ Expenses    │  │ Create/Delete│
    │ Agent       │   │ Agent       │  │ Tools        │
    └─────────────┘   └─────────────┘  └──────────────┘
           │                 │                 │
           │                 │                 │
           └─────────────────┴─────────────────┘
                             │
                             ↓
                    ┌────────────────────┐
                    │   Send Reply       │
                    │   (Telegram)       │
                    └────────────────────┘
```

---

## 🔍 **ДЕТАЛИЗАЦИЯ INCOME AGENT:**

```
╔═══════════════════════════════════════════════════════════════╗
║                     💰 INCOME AGENT                           ║
║              (Специалист по доходам)                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🧠 LANGUAGE MODEL:                                           ║
║      OpenAI Model (Income) → gpt-4o-mini                      ║
║                                                               ║
║  💾 MEMORY:                                                   ║
║      Income Chat Memory → n8n_chat_histories_income           ║
║      (Помнит последние 10 сообщений о доходах)                ║
║                                                               ║
║  🔢 CALCULATOR:                                               ║
║      Calculator (Income) → Для математических расчетов        ║
║                                                               ║
║  📊 DATABASE TOOLS:                                           ║
║      Get Income Rows → SELECT * FROM income                   ║
║                                                               ║
║  🔍 RAG VECTOR STORE:                                         ║
║      Income Vector Store                                      ║
║          ↓                                                    ║
║      income_embeddings table                                  ║
║          ↓                                                    ║
║      match_income_documents(embedding, count, user_id)        ║
║          ↓                                                    ║
║      Embeddings (Income) → OpenAI text-embedding-3-small      ║
║                                                               ║
║  📝 SYSTEM PROMPT:                                            ║
║      "Вы - специализированный агент для анализа ДОХОДОВ."     ║
║      "Используйте RAG для семантического поиска."             ║
║      "ВСЕГДА используйте калькулятор для расчетов."           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🔍 **ДЕТАЛИЗАЦИЯ EXPENSES AGENT:**

```
╔═══════════════════════════════════════════════════════════════╗
║                     💸 EXPENSES AGENT                         ║
║              (Специалист по расходам)                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🧠 LANGUAGE MODEL:                                           ║
║      OpenAI Model (Expenses) → gpt-4o-mini                    ║
║                                                               ║
║  💾 MEMORY:                                                   ║
║      Expenses Chat Memory → n8n_chat_histories_expenses       ║
║      (Помнит последние 10 сообщений о расходах)               ║
║                                                               ║
║  🔢 CALCULATOR:                                               ║
║      Calculator (Expenses) → Для математических расчетов      ║
║                                                               ║
║  📊 DATABASE TOOLS:                                           ║
║      Get Expenses Rows → SELECT * FROM expenses               ║
║                                                               ║
║  🔍 RAG VECTOR STORE:                                         ║
║      Expenses Vector Store                                    ║
║          ↓                                                    ║
║      expenses_embeddings table                                ║
║          ↓                                                    ║
║      match_expenses_documents(embedding, count, user_id)      ║
║          ↓                                                    ║
║      Embeddings (Expenses) → OpenAI text-embedding-3-small    ║
║                                                               ║
║  📝 SYSTEM PROMPT:                                            ║
║      "Вы - специализированный агент для анализа РАСХОДОВ."    ║
║      "Группируйте по 10 категориям."                          ║
║      "ВСЕГДА используйте калькулятор для сумм."               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🛠️ **CRUD TOOLS (Подключены к Main AI Agent):**

```
┌────────────────────────────────────────────────────────────┐
│                    CREATE OPERATIONS                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1️⃣ Create a row in income                                 │
│     ├─ user_id: from Telegram                             │
│     ├─ amount: $fromAI('sum', ...)                        │
│     ├─ category: $fromAI('category', ...)                 │
│     ├─ description: $fromAI('comment', ...)               │
│     └─ date: $fromAI('created_at', ...) or $now           │
│                                                            │
│  2️⃣ Create a row in expenses                               │
│     ├─ user_id: from Telegram                             │
│     ├─ amount: $fromAI('sum', ...)                        │
│     ├─ category: $fromAI('category', ...)                 │
│     ├─ description: $fromAI('comment', ...)               │
│     └─ date: $fromAI('created_at', ...) or $now           │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                    DELETE OPERATIONS                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  3️⃣ Delete a row in income                                 │
│     └─ WHERE id = $fromAI('id', ...)                      │
│                                                            │
│  4️⃣ Delete a row in expenses                               │
│     └─ WHERE id = $fromAI('id', ...)                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🔄 **ПРИМЕРЫ FLOW:**

### **Пример 1: Добавление дохода**

```
Пользователь: "Получил зарплату 50000"
       ↓
Telegram Trigger (получает сообщение)
       ↓
Switch (определяет тип: text)
       ↓
Extract Text (извлекает text + user_id)
       ↓
Main AI Agent (анализирует: это ДОХОД)
       ↓
    Решение: Вызвать "Create a row in income"
       ↓
Supabase Tool: 
    INSERT INTO income (user_id, amount, category, description, date)
    VALUES (123456, 50000, 'Зарплата', 'Зарплата', '2025-11-20T10:00:00Z')
       ↓
Main AI Agent: формирует ответ
    "✅ Записал! Доход 50000₽ - Зарплата"
       ↓
Send Reply (отправляет в Telegram)
```

### **Пример 2: Просмотр расходов с RAG**

```
Пользователь: "Сколько я потратил на еду?"
       ↓
Main AI Agent (анализирует: нужен EXPENSES AGENT)
       ↓
    Вызов: Expenses Agent с query="еда"
       ↓
Expenses Agent:
    ├→ Expenses Vector Store (RAG поиск)
    │     ↓
    │  match_expenses_documents(
    │      embedding("еда"),
    │      limit=5,
    │      user_id=123456
    │  )
    │     ↓
    │  Находит все записи с "Продукты питания"
    │
    ├→ Get Expenses Rows (получает детали)
    │     ↓
    │  SELECT * FROM expenses 
    │  WHERE category = 'Продукты питания' 
    │  AND user_id = 123456
    │
    └→ Calculator (суммирует)
          ↓
       5000 + 3000 + 2000 = 10000
       ↓
Expenses Agent возвращает:
    "💸 РАСХОДЫ:
    🛒 Продукты питания:
    - Продукты - 5000₽
    - Еда в кафе - 3000₽
    - Перекус - 2000₽
    Итого: 10000₽"
       ↓
Main AI Agent передает ответ пользователю
```

### **Пример 3: Голосовое сообщение**

```
Пользователь: [🎤 голосовое] "Потратил на такси 500"
       ↓
Telegram Trigger (получает voice)
       ↓
Switch (определяет тип: voice)
       ↓
Download Voice (скачивает .ogg файл)
       ↓
Transcribe Audio (OpenAI Whisper API)
    → "Потратил на такси 500"
       ↓
Extract Voice Text (извлекает text + user_id)
       ↓
Main AI Agent (анализирует: это РАСХОД, категория: Транспорт)
       ↓
Create a row in expenses:
    INSERT INTO expenses (user_id, amount, category, description, date)
    VALUES (123456, 500, 'Транспорт', 'Такси', '2025-11-20T10:00:00Z')
       ↓
Send Reply: "✅ Записал! Расход 500₽ - Транспорт"
```

---

## 🔐 **БЕЗОПАСНОСТЬ И ИЗОЛЯЦИЯ ДАННЫХ:**

```
┌───────────────────────────────────────────────────────────────┐
│                     USER ISOLATION                            │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  User A (user_id: 111111)                                     │
│     ↓                                                         │
│  Main AI Agent                                                │
│     ↓                                                         │
│  ┌─────────────────────────────────────────┐                 │
│  │ Фильтрация по user_id = 111111          │                 │
│  ├─────────────────────────────────────────┤                 │
│  │ • Supabase Tools (RLS)                  │                 │
│  │ • Vector Store (metadata filter)        │                 │
│  │ • Chat Memory (session key = user_id)   │                 │
│  └─────────────────────────────────────────┘                 │
│     ↓                                                         │
│  Видит ТОЛЬКО свои данные                                     │
│                                                               │
│  ═══════════════════════════════════════════                  │
│                                                               │
│  User B (user_id: 222222)                                     │
│     ↓                                                         │
│  Main AI Agent                                                │
│     ↓                                                         │
│  ┌─────────────────────────────────────────┐                 │
│  │ Фильтрация по user_id = 222222          │                 │
│  └─────────────────────────────────────────┘                 │
│     ↓                                                         │
│  Видит ТОЛЬКО свои данные                                     │
│                                                               │
└───────────────────────────────────────────────────────────────┘

Уровни изоляции:
1. ✅ PostgreSQL RLS (Row Level Security)
2. ✅ Supabase API фильтрация
3. ✅ Vector Store metadata filter
4. ✅ Chat Memory session isolation
```

---

## 📊 **DATABASE SCHEMA INTEGRATION:**

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE TABLES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📋 income                                                      │
│     ├─ id (PK)                                                  │
│     ├─ user_id (FK → users.id)                                 │
│     ├─ amount (decimal)                                         │
│     ├─ category (varchar)                                       │
│     ├─ description (text)                                       │
│     ├─ date (timestamptz)                                       │
│     └─ created_at (timestamptz)                                 │
│                                                                 │
│  💸 expenses                                                    │
│     ├─ id (PK)                                                  │
│     ├─ user_id (FK → users.id)                                 │
│     ├─ amount (decimal)                                         │
│     ├─ category (varchar)                                       │
│     ├─ description (text)                                       │
│     ├─ date (timestamptz)                                       │
│     └─ created_at (timestamptz)                                 │
│                                                                 │
│  🔍 income_embeddings (RAG)                                     │
│     ├─ id (PK)                                                  │
│     ├─ income_id (FK → income.id)                              │
│     ├─ content (text)                                           │
│     ├─ embedding (vector(1536))                                 │
│     └─ metadata (jsonb) → {user_id, category, date}            │
│                                                                 │
│  🔍 expenses_embeddings (RAG)                                   │
│     ├─ id (PK)                                                  │
│     ├─ expense_id (FK → expenses.id)                           │
│     ├─ content (text)                                           │
│     ├─ embedding (vector(1536))                                 │
│     └─ metadata (jsonb) → {user_id, category, date}            │
│                                                                 │
│  💬 n8n_chat_histories (общий чат)                              │
│     ├─ id (PK)                                                  │
│     ├─ session_id (varchar) → user_id                          │
│     ├─ type (varchar) → 'human' | 'ai'                         │
│     ├─ content (text)                                           │
│     └─ created_at (timestamptz)                                 │
│                                                                 │
│  💬 n8n_chat_histories_income (Income Agent)                    │
│  💬 n8n_chat_histories_expenses (Expenses Agent)                │
│  💬 n8n_chat_histories_general (Helper)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **AI DECISION FLOW:**

```
         ┌─────────────────────────────────────┐
         │   Main AI Agent получает запрос      │
         └──────────────┬──────────────────────┘
                        │
                        ↓
         ┌─────────────────────────────────────┐
         │   Анализирует намерение (intent)     │
         └──────────────┬──────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ↓                               ↓
┌──────────────┐               ┌──────────────┐
│  ДОБАВИТЬ    │               │  ПРОСМОТРЕТЬ │
│  (Create)    │               │  (View)      │
└──────┬───────┘               └───────┬──────┘
       │                               │
       ↓                               ↓
┌─────────────┐              ┌──────────────────┐
│ Доход или   │              │ Вызов агента:    │
│ расход?     │              │ • Income Agent   │
└──────┬──────┘              │ • Expenses Agent │
       │                     └──────────────────┘
   ┌───┴───┐
   ↓       ↓
Create   Create
Income   Expenses


Пример решения:

Запрос: "Получил зарплату 50000"
   ↓
Intent: ДОБАВИТЬ
   ↓
Тип: ДОХОД (ключевые слова: "получил", "зарплата")
   ↓
Категория: Зарплата
   ↓
Инструмент: Create a row in income
   ↓
Параметры:
   • amount: 50000
   • category: "Зарплата"
   • description: "Зарплата"
   • date: текущая дата
```

---

## 🚀 **ПРЕИМУЩЕСТВА АРХИТЕКТУРЫ:**

### 1. **Модульность**
```
✅ Каждый агент независим
✅ Легко добавить новые агенты (Budget Agent, Investment Agent)
✅ Можно отключить/включить агенты без влияния на других
```

### 2. **Масштабируемость**
```
✅ RAG Vector Store работает с большими данными
✅ Можно добавить кэширование
✅ Горизонтальное масштабирование через n8n workers
```

### 3. **Производительность**
```
✅ gpt-4o-mini - быстрая модель
✅ Calculator для расчетов (не AI)
✅ Vector Store индексы для быстрого поиска
✅ Context window = 10 (оптимально)
```

### 4. **Точность**
```
✅ Специализированные агенты → лучше понимают контекст
✅ RAG → точные данные из истории
✅ Structured prompts → четкие инструкции
```

### 5. **Безопасность**
```
✅ RLS на уровне БД
✅ Metadata фильтрация в Vector Store
✅ Session isolation в Chat Memory
✅ user_id из Telegram (не может быть подделан)
```

---

## 📈 **МЕТРИКИ И МОНИТОРИНГ:**

```
┌──────────────────────────────────────────────────┐
│           Что отслеживать:                       │
├──────────────────────────────────────────────────┤
│                                                  │
│  ⏱️  Response Time                                │
│      • Telegram → Reply: < 3 сек                 │
│      • Voice transcription: < 5 сек              │
│      • RAG search: < 1 сек                       │
│                                                  │
│  💰 Token Usage                                   │
│      • Main AI Agent: ~500-1000 tokens/запрос    │
│      • Income/Expenses Agent: ~300-500 tokens    │
│      • Embeddings: 1536 dimensions               │
│                                                  │
│  ✅ Success Rate                                  │
│      • Target: > 95%                             │
│      • Error handling: retry 3x                  │
│                                                  │
│  📊 Usage Stats                                   │
│      • Requests per user per day                 │
│      • Most used commands                        │
│      • Peak hours                                │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 🎉 **ЗАКЛЮЧЕНИЕ:**

Эта архитектура обеспечивает:

✅ **Быструю работу** - оптимизированные модели и инструменты  
✅ **Точность** - специализированные агенты с RAG  
✅ **Безопасность** - многоуровневая изоляция данных  
✅ **Масштабируемость** - легко добавлять новые функции  
✅ **Надёжность** - проверенная структура и error handling  

**Готово к production!** 🚀

---

**Создано:** 20.11.2025  
**Версия архитектуры:** 3.0

