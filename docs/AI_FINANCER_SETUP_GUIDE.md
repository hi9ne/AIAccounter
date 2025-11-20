# 🤖 AI Financer - Полное руководство по настройке

**Дата:** 20.11.2025  
**Версия:** 1.0  
**Workflows:** Ai Financer + Helper AI Financer

---

## 📋 Содержание

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Настройка базы данных](#настройка-базы-данных)
3. [Настройка Supabase](#настройка-supabase)
4. [Настройка n8n credentials](#настройка-n8n-credentials)
5. [Импорт workflows](#импорт-workflows)
6. [Тестирование](#тестирование)
7. [Troubleshooting](#troubleshooting)

---

## 🏗️ Обзор архитектуры

### **Компоненты системы**

```
┌─────────────────────────────────────────────┐
│         Telegram User                       │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│      Ai Financer (Main Workflow)            │
│  - Voice transcription (OpenAI Whisper)     │
│  - AI Agent (GPT-4o-mini)                   │
│  - CRUD операции (доходы/расходы)          │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│   Helper AI Financer (RAG Workflow)         │
│  - Embeddings (OpenAI)                      │
│  - Vector Search (Supabase pgvector)        │
│  - Context enrichment                       │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│       Supabase PostgreSQL                   │
│  - dohod (доходы)                          │
│  - rashod (расходы)                        │
│  - dohod_embeddings (векторы)              │
│  - rashod_embeddings (векторы)             │
│  - n8n_chat_histories_tranzactions (чаты)  │
└─────────────────────────────────────────────┘
```

### **Workflow взаимодействие**

1. **Пользователь** отправляет сообщение/голос в Telegram
2. **Ai Financer** обрабатывает запрос через AI Agent
3. **Helper AI Financer** предоставляет контекст через RAG
4. **Supabase** хранит данные и векторы для поиска
5. **Telegram** получает структурированный ответ

---

## 🗄️ Настройка базы данных

### **Шаг 1: Выполнить SQL миграцию**

```bash
# В Supabase SQL Editor:
# 1. Откройте файл migrations/setup_ai_financer_integration.sql
# 2. Скопируйте весь SQL код
# 3. Вставьте в Supabase SQL Editor
# 4. Нажмите "Run"
```

### **Шаг 2: Проверить создание таблиц**

```sql
-- Проверяем таблицы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('dohod', 'rashod', 'dohod_embeddings', 'rashod_embeddings', 'n8n_chat_histories_tranzactions');

-- Должно вернуть 5 строк ✅
```

### **Шаг 3: Проверить расширение pgvector**

```sql
-- Проверяем векторное расширение
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Если пусто, выполните:
CREATE EXTENSION vector;
```

### **Шаг 4: Проверить тестовые данные**

```sql
-- Проверяем доходы
SELECT * FROM dohod LIMIT 5;

-- Проверяем расходы
SELECT * FROM rashod LIMIT 5;

-- Должно вернуть тестовые данные ✅
```

---

## 🔧 Настройка Supabase

### **Получить credentials**

1. Откройте ваш проект в [Supabase](https://supabase.com)
2. Перейдите в **Settings → API**
3. Скопируйте:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...`
   - **service_role key**: `eyJhbGc...` (secret!)

### **Настроить Row Level Security (опционально)**

```sql
-- Если используете anon key, настройте RLS политики
-- Если используете service_role key, RLS автоматически bypass

-- Для production: используйте RLS с JWT аутентификацией
-- Для development: можно отключить RLS

-- Отключить RLS (только для dev!):
ALTER TABLE dohod DISABLE ROW LEVEL SECURITY;
ALTER TABLE rashod DISABLE ROW LEVEL SECURITY;
```

### **Connection String для PostgreSQL**

```bash
# Формат:
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Пример:
postgresql://postgres:your_password@db.xxxyyyzz.supabase.co:5432/postgres
```

**Где найти:**
- Settings → Database → Connection string → URI

---

## 🔐 Настройка n8n credentials

### **1. Supabase API Credential**

**Для:** Supabase Tools (CRUD операции)

```
Name: Ai Financer
Type: Supabase API
Host: https://xxxxx.supabase.co
Service Role Secret: eyJhbGc... (service_role key)
```

**Где используется:**
- Create a row in expenses
- Create a row in income
- Delete a row in income
- Delete a row in expenses
- Get many rows in Supabase
- Insert into Supabase Vectorstore

### **2. PostgreSQL Credential**

**Для:** Postgres Chat Memory (история чатов)

```
Name: AIAccounter supabase
Type: PostgreSQL
Host: db.xxxyyyzz.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: your_password
SSL: Enable
```

**Где используется:**
- Postgres Chat Memory (все ноды)
- Add Trans (Helper AI Financer)

### **3. OpenAI API Credential**

**Для:** GPT-4o-mini + Whisper + Embeddings

```
Name: OpenAi account
Type: OpenAI API
API Key: sk-...
Organization ID: (опционально)
```

**Где используется:**
- Transcribe Audio
- OpenAI Chat Model
- Embeddings OpenAI

### **4. Telegram API Credential**

**Для:** Telegram бот

```
Name: AI Financer
Type: Telegram API
Access Token: 123456789:ABC... (от @BotFather)
```

**Где используется:**
- Telegram Trigger
- Download Voice File
- Send Telegram Message (все ответы)

---

## 📥 Импорт workflows

### **Шаг 1: Импортировать Helper AI Financer**

```
1. n8n → Workflows → Import from File
2. Выберите: n8n/workflows/Helper AI Financer.json
3. Обновите credentials:
   - Supabase API → "Ai Financer"
   - PostgreSQL → "AIAccounter supabase"
   - OpenAI API → "OpenAi account"
4. Сохраните workflow
5. Скопируйте Workflow ID (например: U4SvReDaJErjHZO3)
```

### **Шаг 2: Импортировать Ai Financer**

```
1. n8n → Workflows → Import from File
2. Выберите: n8n/workflows/Ai Financer.json
3. Обновите credentials:
   - Telegram API → "AI Financer"
   - OpenAI API → "OpenAi account"
   - Supabase API → "Ai Financer"
   - PostgreSQL → "AIAccounter supabase"
4. В ноде "Execute Workflow" → укажите ID Helper workflow
5. Активируйте workflow
```

### **Шаг 3: Настроить Telegram Webhook**

```
1. Ai Financer → Telegram Trigger → Copy Webhook URL
2. Вставьте URL в @BotFather:
   /setwebhook
   URL: https://your-n8n-domain/webhook/...
3. Проверьте статус:
   /getwebhookinfo
```

---

## 🧪 Тестирование

### **Тест 1: Проверка подключения к БД**

```sql
-- В Supabase SQL Editor
SELECT 
    (SELECT COUNT(*) FROM dohod) as dohodов,
    (SELECT COUNT(*) FROM rashod) as расходов,
    (SELECT COUNT(*) FROM n8n_chat_histories_tranzactions) as сообщений;
```

### **Тест 2: Проверка векторного расширения**

```sql
-- Проверяем что pgvector работает
SELECT '[1,2,3]'::vector;

-- Должно вернуть: [1,2,3] ✅
```

### **Тест 3: Проверка функций**

```sql
-- Проверяем статистику доходов
SELECT * FROM get_dohod_stats(NULL, NULL, NULL, NULL);

-- Проверяем статистику расходов
SELECT * FROM get_rashod_stats(NULL, NULL, NULL, NULL);
```

### **Тест 4: Проверка AI агента через Telegram**

```
Отправьте боту:
"Привет"

Ожидается:
"Здравствуйте! Я ваш AI финансовый помощник..."
```

### **Тест 5: Добавление дохода**

```
Отправьте боту:
"Получил зарплату 50000 рублей"

Ожидается:
✅ Доход добавлен: 50000 руб. (Зарплата)

Проверка в БД:
SELECT * FROM dohod ORDER BY created_at DESC LIMIT 1;
```

### **Тест 6: Добавление расхода**

```
Отправьте боту:
"Потратил 3500 на продукты"

Ожидается:
✅ Расход добавлен: 3500 руб. (Продукты питания)

Проверка в БД:
SELECT * FROM rashod ORDER BY created_at DESC LIMIT 1;
```

### **Тест 7: Голосовой ввод**

```
Отправьте голосовое:
"Купил новый телефон за 25000"

Ожидается:
1. Транскрипция голоса
2. ✅ Расход добавлен: 25000 руб.
```

### **Тест 8: RAG поиск**

```
Отправьте боту:
"Покажи мои расходы на продукты за последнюю неделю"

Ожидается:
- AI найдет в векторном хранилище похожие расходы
- Предоставит контекстный ответ
```

---

## 🐛 Troubleshooting

### **Ошибка: "Extension vector does not exist"**

**Решение:**
```sql
CREATE EXTENSION vector;
```

Если не работает:
- Убедитесь что используете Supabase (pgvector включен по умолчанию)
- Для self-hosted PostgreSQL: установите pgvector вручную

### **Ошибка: "permission denied for table dohod"**

**Решение:**
```sql
-- Даем права для всех ролей
GRANT ALL ON dohod TO authenticated, anon, service_role;
GRANT ALL ON rashod TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;
```

### **Ошибка: "relation n8n_chat_histories_tranzactions does not exist"**

**Решение:**
```sql
-- Создайте таблицу вручную (см. миграцию)
CREATE TABLE n8n_chat_histories_tranzactions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);
```

### **Ошибка: "Telegram webhook failed"**

**Решение:**
1. Проверьте что n8n доступен из интернета
2. Используйте ngrok для локального dev:
   ```bash
   ngrok http 5678
   ```
3. Обновите webhook URL в @BotFather

### **AI не распознает команды**

**Решение:**
1. Проверьте что Helper AI Financer активирован
2. Проверьте что workflow ID правильный в Execute Workflow
3. Проверьте OpenAI API Key и баланс

### **RAG не находит данные**

**Решение:**
1. Проверьте что embeddings создаются:
   ```sql
   SELECT COUNT(*) FROM dohod_embeddings;
   SELECT COUNT(*) FROM rashod_embeddings;
   ```
2. Если пусто - запустите Helper workflow вручную
3. Проверьте что match_documents функции работают

---

## 📊 Структура таблиц

### **dohod (доходы)**

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный ID |
| sum | NUMERIC(12,2) | Сумма дохода |
| category | VARCHAR(100) | Категория (Зарплата, Фриланс...) |
| comment | TEXT | Комментарий |
| created_at | TIMESTAMP | Дата создания |
| user_id | BIGINT | Telegram user ID |
| workspace_id | INTEGER | Workspace ID |
| updated_at | TIMESTAMP | Дата обновления |

### **rashod (расходы)**

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный ID |
| summ | NUMERIC(12,2) | Сумма расхода |
| category | VARCHAR(100) | Категория (Продукты, Транспорт...) |
| comment | TEXT | Комментарий |
| created_at | TIMESTAMP | Дата создания |
| user_id | BIGINT | Telegram user ID |
| workspace_id | INTEGER | Workspace ID |
| updated_at | TIMESTAMP | Дата обновления |

### **dohod_embeddings / rashod_embeddings**

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | Уникальный ID |
| dohod_id / rashod_id | INTEGER | Ссылка на транзакцию |
| content | TEXT | Текст для поиска |
| metadata | JSONB | Метаданные |
| embedding | vector(1536) | OpenAI embedding |
| created_at | TIMESTAMP | Дата создания |

### **n8n_chat_histories_tranzactions**

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный ID |
| session_id | VARCHAR(255) | ID сессии чата |
| type | VARCHAR(50) | 'human' или 'ai' |
| content | TEXT | Содержимое сообщения |
| created_at | TIMESTAMP | Дата создания |
| metadata | JSONB | Дополнительные данные |

---

## 📝 Категории

### **Категории доходов (15)**
- Зарплата
- Фриланс
- Инвестиции
- Подарки
- Возврат долга
- Бонусы
- Дивиденды
- Премия
- Кэшбэк
- Продажа
- Аренда
- Прочее
- Пассивный доход
- Стипендия
- Алименты

### **Категории расходов (18)**
- Жильё
- Транспорт
- Продукты питания
- Медицина
- Одежда и обувь
- Развлечения
- Образование
- Дети и семья
- Подарки и праздники
- Сбережения и инвестиции
- Коммунальные услуги
- Связь и интернет
- Рестораны и кафе
- Спорт и фитнес
- Красота и уход
- Питомцы
- Путешествия
- Прочее

---

## 🎯 Следующие шаги

1. ✅ Выполнить SQL миграцию
2. ✅ Настроить credentials в n8n
3. ✅ Импортировать оба workflows
4. ✅ Протестировать все функции
5. 🔄 Интегрировать с основной системой AIAccounter
6. 🔄 Добавить multi-user support (user_id)
7. 🔄 Настроить workspace isolation

---

## 🔗 Полезные ссылки

- [Supabase Docs](https://supabase.com/docs)
- [n8n Documentation](https://docs.n8n.io/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [OpenAI API](https://platform.openai.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

**Готово! 🎉**

Теперь у вас полностью настроенная система AI Financer с RAG, векторным поиском и Telegram интеграцией!

