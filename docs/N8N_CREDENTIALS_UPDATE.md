# 🔐 Обновление Credentials в n8n workflows

**Для:** Ai Financer + Helper AI Financer  
**Время:** ~10 минут

---

## 📋 Список credentials для замены

### **Ai Financer workflow (7 типов credentials)**

| Node Type | Credential Name | Текущий ID | Заменить на |
|-----------|----------------|------------|-------------|
| Telegram Trigger | telegramApi | `fPqNwNFzj8J6bmkC` | **AI Financer** |
| Download Voice File | telegramApi | `fPqNwNFzj8J6bmkC` | **AI Financer** |
| Transcribe Audio | openAiApi | `D1aWHG8Msi15h2ih` | **OpenAi account** |
| Postgres Chat Memory | postgres | (разные ID) | **AIAccounter supabase** |
| OpenAI Chat Model | openAiApi | `D1aWHG8Msi15h2ih` | **OpenAi account** |
| Supabase Tools (все) | supabaseApi | `Jw7Fxi8Uxqvo4mkY` | **Ai Financer** |
| Send Telegram Message | telegramApi | `fPqNwNFzj8J6bmkC` | **AI Financer** |

### **Helper AI Financer workflow (3 типа credentials)**

| Node Type | Credential Name | Текущий ID | Заменить на |
|-----------|----------------|------------|-------------|
| Supabase Vectorstore | supabaseApi | `Jw7Fxi8Uxqvo4mkY` | **Ai Financer** |
| Postgres Chat Memory | postgres | `TKaoUfPabvnDB4Ak` | **AIAccounter supabase** |
| OpenAI Embeddings | openAiApi | `D1aWHG8Msi15h2ih` | **OpenAi account** |
| Supabase Tools | supabaseApi | `Jw7Fxi8Uxqvo4mkY` | **Ai Financer** |

---

## 🎯 Пошаговая инструкция - Helper AI Financer

### **Шаг 1: Откройте workflow**
```
n8n → Workflows → Helper AI Financer
```

### **Шаг 2: Обновите Supabase Vectorstore**

1. Кликните на ноду **"Insert into Supabase Vectorstore2"**
2. В правой панели найдите **"Credential to connect with"**
3. Кликните на выпадающий список
4. Выберите **"Ai Financer"** (ваш новый credential)
5. Если нет в списке:
   - Кликните **"Create New"**
   - Type: **Supabase API**
   - Name: **Ai Financer**
   - Host: `https://xxxxx.supabase.co`
   - Service Role Secret: `eyJhbGc...`
   - Save

### **Шаг 3: Обновите Postgres Chat Memory**

1. Кликните на ноду **"Add Trans"**
2. В правой панели найдите **"Credential to connect with"**
3. Выберите **"AIAccounter supabase"**
4. Если нет в списке:
   - Create New → PostgreSQL
   - Name: **AIAccounter supabase**
   - Host: `db.xxxyyyzz.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: `your_password`
   - SSL: ✅ Enable
   - Test Connection → Save

### **Шаг 4: Обновите OpenAI Embeddings**

1. Кликните на ноду **"Embeddings OpenAI3"**
2. Выберите **"OpenAi account"**
3. Если нет в списке:
   - Create New → OpenAI API
   - Name: **OpenAi account**
   - API Key: `sk-...`
   - Test → Save

### **Шаг 5: Обновите Supabase Tools**

**Ноды для обновления:**
- "Create a row in expenses"
- "Create a row in income"
- "Delete a row in income"
- "Delete a row in expenses"

**Для каждой:**
1. Кликните на ноду
2. Credential → **"Ai Financer"**

### **Шаг 6: Сохранить и активировать**

```
1. Кликните "Save" (правый верхний угол)
2. Включите toggle "Active" (правый верхний угол)
3. Скопируйте Workflow ID из URL:
   /workflow/U4SvReDaJErjHZO3
            ^^^^^^^^^^^^^^^^ - это ID
```

---

## 🎯 Пошаговая инструкция - Ai Financer

### **Шаг 1: Откройте workflow**
```
n8n → Workflows → Ai Financer
```

### **Шаг 2: Обновите Telegram Trigger**

1. Кликните на ноду **"Telegram Trigger"**
2. Credential → **"AI Financer"**
3. Если нет:
   - Create New → Telegram API
   - Name: **AI Financer**
   - Access Token: `123456789:ABC...` (от @BotFather)
   - Save

### **Шаг 3: Обновите OpenAI ноды**

**Ноды для обновления:**
- "Transcribe Audio" - для голосовых сообщений
- Все "OpenAI Chat Model" (3-4 штуки)
- "Embeddings OpenAI" (если есть)

**Для каждой:**
1. Кликните на ноду
2. Credential → **"OpenAi account"**

### **Шаг 4: Обновите Postgres Chat Memory**

**Ноды для обновления:**
- "Postgres Chat Memory" (основная)
- "Add dohod" (если есть)
- "Add rashod" (если есть)

**Для каждой:**
1. Кликните на ноду
2. Credential → **"AIAccounter supabase"**

### **Шаг 5: Обновите все Supabase Tools**

**Ноды для обновления (6 штук):**
- "Create a row in expenses"
- "Create a row in income"
- "Delete a row in income"
- "Delete a row in ecpenses"
- "Get many rows in Supabase"
- "Get many rows in Supabase1"

**Для каждой:**
1. Кликните на ноду
2. Credential → **"Ai Financer"**

### **Шаг 6: ВАЖНО - Обновите Execute Workflow**

1. Найдите ноду **"Execute Workflow"** или **"Call 'Ai Financer'"**
2. В параметрах найдите **"Workflow ID"**
3. Вставьте ID Helper workflow (скопированный на предыдущем шаге)
   ```
   Было: какой-то старый ID
   Стало: U4SvReDaJErjHZO3 (ваш Helper workflow ID)
   ```

### **Шаг 7: Обновите все Send Telegram Message**

**Найдите все ноды отправки сообщений** (обычно в конце веток)

**Для каждой:**
1. Кликните на ноду
2. Credential → **"AI Financer"**

### **Шаг 8: Сохранить и активировать**

```
1. Save (правый верхний угол)
2. Включите "Active"
3. Скопируйте Webhook URL из "Telegram Trigger"
```

### **Шаг 9: Настроить Telegram Webhook**

```
1. Откройте @BotFather в Telegram
2. Отправьте: /setwebhook
3. Вставьте скопированный Webhook URL
4. Проверьте: /getwebhookinfo
```

---

## 🔍 Проверка всех credentials

### **Чек-лист для Helper AI Financer**

- [ ] Insert into Supabase Vectorstore2 → **Ai Financer** ✅
- [ ] Add Trans (Postgres) → **AIAccounter supabase** ✅
- [ ] Embeddings OpenAI3 → **OpenAi account** ✅
- [ ] Create a row in expenses → **Ai Financer** ✅
- [ ] Create a row in income → **Ai Financer** ✅
- [ ] Delete a row in income → **Ai Financer** ✅
- [ ] Delete a row in expenses → **Ai Financer** ✅

### **Чек-лист для Ai Financer**

- [ ] Telegram Trigger → **AI Financer** ✅
- [ ] Download Voice File → **AI Financer** ✅
- [ ] Transcribe Audio → **OpenAi account** ✅
- [ ] Postgres Chat Memory (все) → **AIAccounter supabase** ✅
- [ ] OpenAI Chat Model (все) → **OpenAi account** ✅
- [ ] Supabase Tools (6 штук) → **Ai Financer** ✅
- [ ] Execute Workflow → **Helper Workflow ID** ✅
- [ ] Send Telegram Message (все) → **AI Financer** ✅

---

## 🚨 Типичные ошибки

### **Ошибка 1: "Credential not found"**
```
Причина: Старый credential ID не существует в вашем n8n
Решение: Замените на новый credential из списка выше
```

### **Ошибка 2: "Unauthorized"**
```
Причина: Неправильный API key или token
Решение: 
1. Проверьте что скопировали правильный key
2. Для Supabase: используйте service_role key (не anon!)
3. Для Telegram: токен от @BotFather
4. Для OpenAI: проверьте баланс
```

### **Ошибка 3: "Connection timeout"**
```
Причина: Неправильный host или порт
Решение:
1. PostgreSQL host должен быть: db.xxxyyyzz.supabase.co
2. Port: 5432
3. SSL: ОБЯЗАТЕЛЬНО включить
```

### **Ошибка 4: "Workflow not found"**
```
Причина: Неправильный Workflow ID в Execute Workflow
Решение:
1. Откройте Helper workflow
2. Скопируйте ID из URL: /workflow/ID_ТУТ
3. Вставьте в Ai Financer → Execute Workflow
```

---

## 💾 Быстрое обновление через JSON (продвинутый способ)

### **Способ 1: Find & Replace в редакторе**

1. Экспортируйте workflow (Download)
2. Откройте в VS Code / любом редакторе
3. Найти и заменить:

```json
// Старые credentials ID → Новые

// Telegram API
"id": "fPqNwNFzj8J6bmkC"  →  "id": "ВАШ_TELEGRAM_ID"

// OpenAI API
"id": "D1aWHG8Msi15h2ih"  →  "id": "ВАШ_OPENAI_ID"

// Supabase API
"id": "Jw7Fxi8Uxqvo4mkY"  →  "id": "ВАШ_SUPABASE_ID"

// PostgreSQL
"id": "TKaoUfPabvnDB4Ak"  →  "id": "ВАШ_POSTGRES_ID"
```

4. Сохраните файл
5. Импортируйте обратно в n8n (Upload)

### **Способ 2: Создать новые credentials с такими же ID**

```
ВНИМАНИЕ: Не рекомендуется! Может нарушить другие workflows
```

---

## 📝 Сводная таблица всех credentials

| Тип | Name | Где взять | Для чего |
|-----|------|-----------|----------|
| **Supabase API** | Ai Financer | Supabase → Settings → API → service_role | CRUD операции |
| **PostgreSQL** | AIAccounter supabase | Supabase → Settings → Database | История чатов |
| **OpenAI API** | OpenAi account | platform.openai.com → API Keys | GPT + Whisper + Embeddings |
| **Telegram API** | AI Financer | @BotFather → /newbot или /token | Telegram бот |

---

## ✅ Проверка после обновления

### **Тест 1: Запустите workflow вручную**

```
1. Helper AI Financer → Execute Workflow
2. Должно выполниться без ошибок ✅
```

### **Тест 2: Проверьте подключение к БД**

```sql
-- В Supabase SQL Editor
SELECT * FROM dohod LIMIT 1;
SELECT * FROM rashod LIMIT 1;
```

### **Тест 3: Отправьте сообщение боту**

```
Telegram → ваш бот → "Привет"
```

Ожидается:
```
✅ Бот отвечает
✅ Нет ошибок в n8n Executions
```

---

## 🎉 Готово!

Все credentials обновлены и настроены!

**Следующий шаг:** Протестируйте все функции (см. `AI_FINANCER_QUICKSTART.md`)

---

## 🔗 Дополнительные ресурсы

- [n8n Credentials Guide](https://docs.n8n.io/credentials/)
- [Supabase API Keys](https://supabase.com/docs/guides/api)
- [Telegram Bot Setup](https://core.telegram.org/bots/tutorial)
- [OpenAI API Keys](https://platform.openai.com/api-keys)

