# 🚀 Быстрое обновление до версии 2.0 (Мультивалютность)

## ⏱️ Время обновления: ~15 минут

---

## ✅ Checklist перед обновлением

- [ ] У вас есть доступ к Supabase/PostgreSQL
- [ ] У вас есть доступ к n8n
- [ ] У вас есть backup базы данных (рекомендуется)
- [ ] Бот сейчас работает корректно

---

## 📋 Шаги обновления

### 1️⃣ Обновление базы данных (3 минуты)

#### Вариант A: Через Supabase Dashboard
1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое `migrations/add_currency_field.sql`
3. Вставьте в редактор и нажмите "Run"
4. Проверьте выполнение - должно быть "Success"

#### Вариант B: Через командную строку
```powershell
# Замените на ваши данные
$env:PGPASSWORD = "your-password"
psql -h db.xxxxx.supabase.co -U postgres -d postgres -f migrations/add_currency_field.sql
```

#### Проверка:
```sql
-- Должна вернуть 'currency' колонку
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'currency';
```

---

### 2️⃣ Обновление n8n workflow (5 минут)

#### Вариант A: Импорт нового workflow (рекомендуется)
1. Откройте n8n
2. Workflows → Import from File
3. Выберите обновлённый `AnaliziFinance.json`
4. Замените старый workflow
5. Переподключите credentials (если нужно)
6. Активируйте workflow

#### Вариант B: Ручное обновление
1. Откройте существующий workflow `AnaliziFinance`
2. Найдите ноду **Add_expense (Postgres Tool)**
3. Обновите SQL запрос:

**Было:**
```sql
INSERT INTO expenses (amount, category, description, date, telegram_user_id)
VALUES (...)
```

**Стало:**
```sql
INSERT INTO expenses (amount, currency, category, description, date, telegram_user_id)
VALUES (
    {{ $fromAI("amount", "Сумма транзакции", "number") }},
    UPPER('{{ $fromAI("currency", "Валюта: сом/KGS, доллар/USD, евро/EUR, рубль/RUB. По умолчанию KGS", "string", "KGS") }}'),
    '{{ $fromAI("category", "Категория расхода", "string") }}',
    '{{ $fromAI("description", "Описание транзакции", "string", "") }}',
    '{{ $fromAI("date", "Дата в формате YYYY-MM-DD HH:MM:SS или сегодня", "string", CURRENT_TIMESTAMP) }}',
    {{ $fromAI("telegram_user_id", "ID пользователя Telegram", "number") }}
)
RETURNING *;
```

4. Повторите для **Add_income (Postgres Tool)**

5. Обновите **System Message**:

Добавьте в конец инструкций:
```
**Валюта:**
Определяй валюту из текста пользователя:
- сом/сома/сомов/KGS → KGS
- доллар/долларов/баксов/$|USD → USD
- евро/EUR|€ → EUR
- рубль/рублей/руб/RUB|₽ → RUB
По умолчанию: KGS
```

6. Сохраните и активируйте

---

### 3️⃣ Обновление Telegram Mini App (7 минут)

#### Если у вас уже есть Mini App:

1. **Скачайте обновлённый файл:**
   - `TelegramMiniApp.html` (новая версия)

2. **Создайте конфиг:**
   ```powershell
   # Скопируйте пример конфига
   cp miniapp-config.example.js miniapp-config.js
   ```

3. **Заполните конфиг:**
   ```javascript
   const MINIAPP_CONFIG = {
       supabase: {
           url: 'https://xxxxx.supabase.co',
           anonKey: 'your-anon-key',
           enabled: false // true если хотите прямое подключение
       },
       defaultCurrency: 'KGS',
       mode: 'bot' // или 'supabase'
   };
   ```

4. **Загрузите на хостинг:**
   - GitHub Pages / Vercel / Netlify / ваш сервер
   - Замените старый файл на новый

5. **Проверьте:**
   - Откройте Mini App в боте
   - Должен появиться выбор валюты

#### Если Mini App ещё не установлен:

См. полную инструкцию в `docs/MINIAPP_SETUP.md`

---

## 🧪 Тестирование

### Тест 1: Проверка базы данных
```sql
-- Вставка тестовой записи
INSERT INTO expenses (amount, currency, category, description, telegram_user_id)
VALUES (100, 'USD', 'Тест', 'Тестовая транзакция', 123456789);

-- Проверка
SELECT * FROM expenses WHERE category = 'Тест';

-- Удаление теста
DELETE FROM expenses WHERE category = 'Тест';
```

### Тест 2: Проверка бота
Отправьте боту:
```
Расход 100 долларов тест
```

Должно сохраниться с currency = 'USD'

### Тест 3: Проверка Mini App
1. Откройте Mini App
2. Добавьте транзакцию в USD
3. Проверьте в истории - должна быть отметка $

---

## 🔄 Откат изменений (если что-то пошло не так)

### Откат базы данных:
```sql
-- Удаление колонки currency
ALTER TABLE expenses DROP COLUMN IF EXISTS currency;
ALTER TABLE income DROP COLUMN IF EXISTS currency;

-- Удаление индексов
DROP INDEX IF EXISTS idx_expenses_currency;
DROP INDEX IF EXISTS idx_income_currency;
```

### Откат n8n:
1. Workflows → History
2. Восстановите предыдущую версию
3. Или импортируйте backup

### Откат Mini App:
Загрузите старую версию файла на хостинг

---

## ❓ Troubleshooting

### Ошибка: "column currency does not exist"
**Решение:** Миграция не выполнена. Выполните шаг 1 заново.

### Ошибка: "$fromAI invalid type parameter"
**Решение:** Обновите n8n до последней версии или используйте старый синтаксис:
```javascript
$fromAI("currency", "Описание")  // без "string"
```

### Валюта не сохраняется, всегда KGS
**Решение:** 
1. Проверьте System Message - есть ли инструкции по валюте?
2. Проверьте SQL запрос - есть ли UPPER('{{ $fromAI("currency"...) }}')
3. Попробуйте явно: "Расход 100 USD кафе"

### Mini App не показывает валюту
**Решение:** Очистите кэш браузера или перезагрузите Mini App

---

## 📊 Проверка успешного обновления

После обновления проверьте:

✅ **База данных:**
```sql
\d expenses  -- Должна быть колонка currency VARCHAR(3)
```

✅ **n8n:**
- Откройте workflow
- Найдите Add_expense
- SQL должен содержать `currency`

✅ **Bot:**
```
Расход 50 USD кафе
→ Должно сохраниться
```

✅ **Mini App:**
- Форма добавления → выпадающий список валют
- История → отображение символа валюты

✅ **Старые данные:**
```sql
SELECT COUNT(*) FROM expenses WHERE currency = 'KGS';
-- Все старые записи должны быть KGS (дефолт)
```

---

## 🎉 Готово!

Ваша система обновлена до версии 2.0 с поддержкой мультивалютности!

Теперь можно:
- Добавлять транзакции в 4 валютах (KGS, USD, EUR, RUB)
- Просматривать статистику по валютам
- Использовать Mini App с выбором валюты

---

## 📚 Дополнительная документация

- **Примеры использования:** `docs/MULTICURRENCY_GUIDE.md`
- **Настройка Mini App:** `docs/MINIAPP_SETUP.md`
- **История изменений:** `CHANGELOG.md`

---

## 🆘 Нужна помощь?

- 📖 Полная документация: `docs/README.md`
- 💬 Telegram Support: @your_support_bot
- 🐛 GitHub Issues: [создать issue](https://github.com/your-repo/issues)

---

**💡 Совет:** Сделайте backup перед обновлением!

**📅 Дата:** 28 января 2025  
**🏷️ Версия:** 2.0.0  
**⏱️ Время обновления:** ~15 минут
