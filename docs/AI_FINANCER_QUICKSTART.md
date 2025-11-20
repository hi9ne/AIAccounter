# ⚡ AI Financer - Быстрый старт

**Время настройки:** ~15 минут  
**Сложность:** Средняя

---

## 📋 Чеклист настройки

### ☑️ **Шаг 1: Supabase - Выполнить миграцию** (5 минут)

```bash
1. Откройте Supabase SQL Editor
2. Скопируйте код из: migrations/setup_ai_financer_integration.sql
3. Вставьте и нажмите "Run"
4. Дождитесь: "✅ Миграция завершена успешно!"
```

**Проверка:**
```sql
SELECT COUNT(*) FROM dohod;  -- Должно вернуть 3 (тестовые данные)
```

---

### ☑️ **Шаг 2: Supabase - Получить credentials** (2 минуты)

**Откройте:** Settings → API

**Скопируйте:**
```
✅ Project URL: https://xxxxx.supabase.co
✅ service_role key: eyJhbGc... (SECRET!)
```

**Откройте:** Settings → Database

**Скопируйте:**
```
✅ Host: db.xxxyyyzz.supabase.co
✅ Password: your_database_password
```

---

### ☑️ **Шаг 3: n8n - Создать credentials** (3 минуты)

#### **3.1 Supabase API**
```
n8n → Credentials → Add → Supabase API

Name: Ai Financer
Host: https://xxxxx.supabase.co
Service Role Secret: eyJhbGc... (service_role key)

→ Save
```

#### **3.2 PostgreSQL**
```
n8n → Credentials → Add → PostgreSQL

Name: AIAccounter supabase
Host: db.xxxyyyzz.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: your_database_password
SSL: ✅ Enable

→ Test Connection → Save
```

#### **3.3 OpenAI API**
```
n8n → Credentials → Add → OpenAI API

Name: OpenAi account
API Key: sk-...

→ Test → Save
```

#### **3.4 Telegram API**
```
n8n → Credentials → Add → Telegram API

Name: AI Financer
Access Token: 123456789:ABC... (от @BotFather)

→ Save
```

---

### ☑️ **Шаг 4: n8n - Импорт workflows** (5 минут)

#### **4.1 Импорт Helper (первым!)**
```
1. n8n → Workflows → Import from File
2. Выберите: n8n/workflows/Helper AI Financer.json
3. Обновите credentials:
   - Supabase API → "Ai Financer" ✅
   - PostgreSQL → "AIAccounter supabase" ✅
   - OpenAI API → "OpenAi account" ✅
4. Save → Активировать
5. Скопируйте Workflow ID (в URL: /workflow/XXXXX)
```

#### **4.2 Импорт Main Workflow**
```
1. n8n → Workflows → Import from File
2. Выберите: n8n/workflows/Ai Financer.json
3. Обновите credentials:
   - Telegram API → "AI Financer" ✅
   - OpenAI API → "OpenAi account" ✅
   - Supabase API → "Ai Financer" ✅
   - PostgreSQL → "AIAccounter supabase" ✅
   
4. ВАЖНО: Найдите ноду "Execute Workflow"
   → Укажите Helper Workflow ID
   
5. Save → Активировать ✅
```

---

### ☑️ **Шаг 5: Проверка работы** (5 минут)

#### **5.1 Проверка БД**
```sql
-- В Supabase SQL Editor
\i migrations/check_ai_financer_setup.sql

-- Ожидается:
-- 🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! (3/3)
```

#### **5.2 Тест через Telegram**

**Отправьте боту:**
```
Привет
```
**Ожидается:**
```
Здравствуйте! Я ваш AI финансовый помощник...
```

**Отправьте:**
```
Получил зарплату 50000 рублей
```
**Ожидается:**
```
✅ Доход добавлен: 50000 руб. (Зарплата)
```

**Проверьте в БД:**
```sql
SELECT * FROM dohod ORDER BY created_at DESC LIMIT 1;
```

**Отправьте:**
```
Потратил 3500 на продукты
```
**Ожидается:**
```
✅ Расход добавлен: 3500 руб. (Продукты питания)
```

---

## 🎉 Готово!

Система настроена и работает!

---

## 🐛 Быстрый Troubleshooting

### **Проблема:** "Extension vector does not exist"
```sql
CREATE EXTENSION vector;
```

### **Проблема:** "Permission denied for table dohod"
```sql
GRANT ALL ON dohod, rashod TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;
```

### **Проблема:** "Telegram webhook failed"
```
1. Проверьте что n8n доступен из интернета
2. Используйте ngrok для локального dev:
   ngrok http 5678
3. Обновите webhook в @BotFather
```

### **Проблема:** "AI не отвечает"
```
1. Проверьте что Helper workflow активирован
2. Проверьте OpenAI API Key
3. Проверьте баланс OpenAI
4. Проверьте логи в n8n (Executions)
```

---

## 📚 Полная документация

**Детальное руководство:** `docs/AI_FINANCER_SETUP_GUIDE.md`

**SQL миграция:** `migrations/setup_ai_financer_integration.sql`

**Проверка настройки:** `migrations/check_ai_financer_setup.sql`

---

## 🎯 Что дальше?

1. **Добавить user_id** для multi-user support
2. **Интегрировать с основной системой** AIAccounter
3. **Настроить workspace isolation**
4. **Добавить дополнительные AI агенты**
5. **Настроить автоматические отчеты**

---

## 💡 Примеры команд для бота

```
✅ "Получил зарплату 50000"
✅ "Потратил 3500 на продукты"
✅ "Купил телефон за 25000"
✅ "Фриланс 15000 от клиента А"
✅ "Оплатил коммунальные 5000"
✅ "Заработал на инвестициях 8000"

📊 "Покажи мои доходы"
📊 "Сколько я потратил на продукты?"
📊 "Статистика за месяц"

🗑️ "Удали последний расход"
🗑️ "Удали доход с ID 15"
```

---

## 🔗 Полезные ссылки

- [Supabase Dashboard](https://supabase.com/dashboard)
- [n8n Workflows](https://app.n8n.io/workflows)
- [OpenAI Platform](https://platform.openai.com/)
- [@BotFather](https://t.me/botfather)

---

**Вопросы?** См. полную документацию в `docs/AI_FINANCER_SETUP_GUIDE.md`

