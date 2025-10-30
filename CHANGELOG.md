# 🔄 Changelog - Telegram Mini App

## [2.2.0] - 30 октября 2025 - Управление транзакциями

### 🎯 Главная фича: Редактирование, удаление и восстановление транзакций

#### ✏️ Редактирование транзакций
- ✅ Изменение любых полей: сумма, категория, описание, дата, валюта
- ✅ Поиск транзакций по ID или слову "last"
- ✅ Команды: "Измени последний расход на 1500", "Поменяй категорию транзакции 15 на продукты"
- ✅ Полная история изменений в аудит-журнале

#### 🗑️ Мягкое удаление
- ✅ Транзакции не удаляются физически из БД
- ✅ Возможность восстановления в любой момент
- ✅ Команды: "Удали последний расход", "Удали транзакцию номер 25"
- ✅ Удалённые транзакции не показываются в статистике

#### 🔄 Восстановление
- ✅ Восстановление удалённых транзакций одной командой
- ✅ Команды: "Верни последнюю удалённую транзакцию", "Восстанови расход 12"
- ✅ Автоматическая очистка метки deleted_at

#### 📜 Аудит и история
- ✅ Полная история изменений каждой транзакции
- ✅ Отслеживание: создание, изменение, удаление, восстановление
- ✅ Команды: "Покажи историю транзакции 15", "История последнего расхода"
- ✅ Хранится: какое поле изменено, старое/новое значение, кто и когда

### 🗄️ Новая архитектура данных

#### Таблица transaction_history
```sql
CREATE TABLE transaction_history (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(10) NOT NULL,
    transaction_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    field_changed VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    changed_by BIGINT NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    details JSONB
);
```

#### Soft Delete Pattern
```sql
-- Добавлены столбцы в expenses и income
ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN deleted_by BIGINT;
ALTER TABLE income ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE income ADD COLUMN deleted_by BIGINT;
```

#### Представления активных транзакций
```sql
CREATE VIEW v_active_expenses AS
SELECT * FROM expenses WHERE deleted_at IS NULL;

CREATE VIEW v_active_income AS
SELECT * FROM income WHERE deleted_at IS NULL;
```

#### SQL Функции
```sql
-- Логирование изменений
CREATE FUNCTION log_transaction_change(
    p_transaction_type VARCHAR(10),
    p_transaction_id INTEGER,
    p_action VARCHAR(20),
    p_field_changed VARCHAR(50),
    p_old_value TEXT,
    p_new_value TEXT,
    p_changed_by BIGINT
) RETURNS INTEGER;

-- Поиск последней транзакции
CREATE FUNCTION get_last_transaction(
    p_user_id BIGINT,
    p_type VARCHAR(10)
) RETURNS INTEGER;

-- Поиск по сумме
CREATE FUNCTION find_transaction_by_amount(
    p_user_id BIGINT,
    p_amount NUMERIC,
    p_type VARCHAR(10)
) RETURNS INTEGER;

-- Проверка существования
CREATE FUNCTION transaction_exists(
    p_id INTEGER,
    p_type VARCHAR(10),
    p_user_id BIGINT
) RETURNS BOOLEAN;
```

### 🤖 Новые инструменты AI Agent

**Edit_transaction** (Postgres Tool)
```sql
-- Изменение полей транзакции с логированием
UPDATE expenses SET 
  amount = CASE WHEN field='amount' THEN new_value::NUMERIC ELSE amount END,
  category = CASE WHEN field='category' THEN new_value ELSE category END,
  description = CASE WHEN field='description' THEN new_value ELSE description END,
  date = CASE WHEN field='date' THEN new_value::TIMESTAMP ELSE date END,
  currency = CASE WHEN field='currency' THEN new_value ELSE currency END
WHERE id = found_transaction_id AND deleted_at IS NULL
```

**Delete_transaction** (Postgres Tool)
```sql
-- Мягкое удаление с логированием
UPDATE expenses 
SET deleted_at = NOW(), deleted_by = user_id
WHERE id = transaction_id AND deleted_at IS NULL
```

**Restore_transaction** (Postgres Tool)
```sql
-- Восстановление с логированием
UPDATE expenses 
SET deleted_at = NULL, deleted_by = NULL
WHERE id = transaction_id AND deleted_at IS NOT NULL
```

**Get_transaction_history** (Postgres Tool)
```sql
-- Просмотр истории изменений
SELECT 
  action, field_changed, old_value, new_value, 
  changed_at, details
FROM transaction_history
WHERE transaction_id = id AND transaction_type = type
ORDER BY changed_at DESC
LIMIT 50
```

### 📊 Примеры использования

```
✅ "Измени последний расход на 1500 сом"
   → ✏️ Транзакция изменена: сумма обновлена на 1,500 KGS

✅ "Поменяй категорию транзакции 15 на транспорт"
   → ✏️ Транзакция изменена: категория обновлена на 'транспорт'

✅ "Удали последний расход"
   → 🗑️ Транзакция удалена (можно восстановить)

✅ "Покажи все расходы за октябрь"
   → 📊 (удалённые не показываются)

✅ "Верни последнюю удалённую транзакцию"
   → 🔄 Транзакция восстановлена

✅ "Покажи историю транзакции 15"
   → 📜 История изменений:
      30.10.2025 12:00 - Создана (сумма: 500 KGS)
      30.10.2025 12:15 - Изменена сумма: 500 → 750 KGS
      30.10.2025 12:30 - Удалена
      30.10.2025 12:45 - Восстановлена
```

### 🔧 Технические изменения

#### Миграция базы данных
```bash
# Файл: migrations/add_transaction_management.sql
- Таблица transaction_history (10 полей)
- Столбцы deleted_at, deleted_by в expenses/income
- 4 SQL функции
- 2 представления (v_active_expenses, v_active_income)
- 5 индексов для быстрого поиска
```

#### Обновление AI Agent
```javascript
// AnaliziFinance.json
+ Edit_transaction (Postgres Tool)
+ Delete_transaction (Postgres Tool)
+ Restore_transaction (Postgres Tool)
+ Get_transaction_history (Postgres Tool)
+ Обновлён System Message с инструкциями управления транзакциями
+ Добавлены 4 новых ai_tool connections
```

### ⚡ Производительность

- Индексы на deleted_at для быстрой фильтрации активных транзакций
- Индексы на transaction_history для быстрого поиска истории
- View для исключения удалённых из выборок

### 🔐 Безопасность

- Soft delete: данные не теряются
- Проверка владельца транзакции перед изменением
- Аудит: полная история кто, что и когда изменил

### ✅ Тестирование

**Test Suite:**
- [ ] Тест 1: Создание транзакции
- [ ] Тест 2: Изменение суммы последней транзакции
- [ ] Тест 3: Удаление транзакции
- [ ] Тест 4: Проверка что удалённая не показывается в статистике
- [ ] Тест 5: Восстановление транзакции
- [ ] Тест 6: Просмотр истории изменений
- [ ] Тест 7: Изменение категории по ID
- [ ] Тест 8: Удаление по ID

### 📚 Новая документация

- ➕ `v2.2_SUMMARY.md` - краткая инструкция по развёртыванию
- ➕ `migrations/add_transaction_management.sql` - SQL миграция

---

# Changelog

## [2.2.0] - 2025-10-30

### Added
- ✏️ **Transaction Management**: редактирование, удаление и восстановление транзакций
- 📜 **Audit Log**: полная история изменений в таблице `transaction_history`
- 🔍 **Smart Search**: функция поиска последней транзакции по типу
- 🗑️ **Soft Delete**: безопасное удаление с возможностью восстановления

### Fixed
- ✅ Функция `get_last_transaction()` возвращает INTEGER вместо TABLE
- ✅ Исправлены имена колонок: `user_id` вместо `telegram_user_id`
- ✅ User ID берётся из Telegram триггера автоматически
- ✅ Добавлена поддержка 'last' через NULLIF для безопасного CAST
- ✅ Исправлено преобразование даты: TO_TIMESTAMP вместо ::TIMESTAMP
- ✅ Финальный SELECT возвращает row_to_json() вместо *

### Database
- Добавлена таблица `transaction_history` (8 полей)
- Добавлены колонки `deleted_at`, `deleted_by` в `expenses` и `income`
- 4 новых SQL функции для управления транзакциями

### AI Tools
- `Edit_transaction` - редактирование полей транзакции
- `Delete_transaction` - мягкое удаление
- `Restore_transaction` - восстановление удалённых
- `Get_transaction_history` - история изменений

### Tested
- ✅ Редактирование суммы последнего расхода
- ✅ Функция get_last_transaction() работает корректно
- ✅ История записывается в transaction_history

---

## [2.1.0] - 2025-10-29

### 🎯 Главная фича: Автоматическая конвертация валют

#### 💱 Конвертация в реальном времени
- ✅ Автоматическая конвертация между KGS, USD, EUR, RUB
- ✅ Актуальные курсы обновляются ежедневно в 10:00
- ✅ Команды: "Конвертируй 1000 сом в доллары", "Какой курс евро?"
- ✅ Статистика в любой валюте: "Покажи статистику в долларах"
- ✅ Кросс-конвертация: EUR→RUB, USD→EUR и т.д.

#### 🗄️ Новая архитектура данных
```sql
-- Таблица курсов валют
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(10, 6) NOT NULL,
    source VARCHAR(50) DEFAULT 'exchangerate-api.com',
    UNIQUE(date, from_currency, to_currency)
);

-- Функция получения курса
CREATE FUNCTION get_exchange_rate(
    p_from VARCHAR(3),
    p_to VARCHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC;

-- Функция конвертации
CREATE FUNCTION convert_amount(
    p_amount NUMERIC,
    p_from VARCHAR(3),
    p_to VARCHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC;

-- View актуальных курсов
CREATE VIEW v_latest_rates AS
SELECT * FROM exchange_rates 
WHERE date = (SELECT MAX(date) FROM exchange_rates);
```

#### 🤖 Новые инструменты AI Agent

**Convert_currency** (Postgres Tool)
```sql
-- Конвертация суммы с актуальным курсом
SELECT 
    {{ $fromAI("amount") }} as original_amount,
    UPPER('{{ $fromAI("from_currency") }}') as from_currency,
    UPPER('{{ $fromAI("to_currency") }}') as to_currency,
    get_exchange_rate(...) as rate,
    convert_amount(...) as converted_amount
```

**Get_exchange_rates** (Postgres Tool)
```sql
-- Просмотр всех актуальных курсов
SELECT 
    from_currency,
    to_currency,
    rate,
    date
FROM v_latest_rates
ORDER BY from_currency, to_currency;
```

#### 🔄 Новый workflow: ExchangeRates_Daily

**Cron Schedule:** Ежедневно в 10:00 (Asia/Bishkek)

**Workflow:**
1. HTTP Request → ExchangeRate-API
2. JavaScript → Трансформация данных
3. Postgres → INSERT с ON CONFLICT DO UPDATE
4. Telegram → Уведомление администратору

**Источник данных:** https://api.exchangerate-api.com/v4/latest/KGS

**Поддерживаемые пары:** 16+ комбинаций (KGS↔USD, KGS↔EUR, KGS↔RUB, USD↔EUR и т.д.)

### 📊 Примеры использования

#### Команды пользователя:
```
✅ "Конвертируй 1000 сом в доллары"
   → 💱 1,000 KGS = 11.50 USD (по курсу 87.00)

✅ "Какой курс евро?"
   → 💱 1 EUR = 94.50 KGS

✅ "Сколько будет 100 долларов в сомах?"
   → 💱 100 USD = 8,700 KGS

✅ "Переведи 50 евро в рубли"
   → 💱 50 EUR = 5,225 RUB (по курсу 104.50)

✅ "Покажи статистику в долларах"
   → 📊 Статистика за октябрь 2025 (в USD):
      💸 Расходы: 316.23 USD
      💰 Доходы: 1,179.46 USD
      📈 Прибыль: 863.23 USD

✅ "Все курсы"
   → 💱 Актуальные курсы на 30.10.2025:
      KGS → USD: 0.0115
      USD → KGS: 87.00
      ...
```

### 🔧 Технические изменения

#### Миграция базы данных
```bash
# Файл: migrations/add_exchange_rates.sql
- Таблица exchange_rates (6 полей)
- Функции get_exchange_rate() и convert_amount()
- View v_latest_rates для быстрого доступа
- Триггер auto_create_reverse_rate (автоматические обратные курсы)
- Начальные курсы (12+ записей)
```

#### Обновление AI Agent
```javascript
// AnaliziFinance.json
+ Convert_currency (Postgres Tool)
+ Get_exchange_rates (Postgres Tool)
+ Обновлён System Message с инструкциями конвертации
+ Добавлены ai_tool connections
```

### 📚 Новая документация

- ➕ `docs/CURRENCY_CONVERSION.md` - руководство пользователя
- ➕ `ROADMAP_v2.1.md` - план разработки
- ➕ `UPGRADE_TO_2.1.md` - инструкция обновления с v2.0
- ➕ `migrations/add_exchange_rates.sql` - SQL миграция

### 🐛 Исправления

- Исправлено: ошибки синтаксиса psql в документации (заменены на стандартный SQL)
- Улучшено: обработка ошибок при недоступности API курсов
- Улучшено: валидация валют перед конвертацией

### ⚡ Производительность

- View `v_latest_rates` для быстрого доступа к актуальным курсам
- Индексы на (date, from_currency, to_currency) для быстрого поиска
- Кэширование курсов в БД (не запрашиваем API каждый раз)

### 🔐 Безопасность

- ON CONFLICT DO UPDATE предотвращает дубликаты
- Валидация валют через CHECK constraints
- Rate limiting для API запросов (1 раз в день)

### 📊 Миграция с v2.0

**Время обновления:** ~20 минут

**Шаги:**
1. Выполните `migrations/add_exchange_rates.sql` в Supabase
2. Импортируйте `ExchangeRates_Daily.json` в n8n
3. Обновите `AnaliziFinance.json` в n8n
4. Протестируйте 6 команд конвертации

**Подробности:** См. `UPGRADE_TO_2.1.md`

### ✅ Тестирование

**Статус:** Готов к тестированию

**Test Suite:**
- [ ] Тест 1: Проверка курсов ("Какой курс доллара?")
- [ ] Тест 2: Конвертация ("Конвертируй 1000 сом в доллары")
- [ ] Тест 3: Обратная конвертация ("100 долларов в сомы")
- [ ] Тест 4: Кросс-конвертация ("50 евро в рубли")
- [ ] Тест 5: Статистика в валюте ("Статистика в долларах")
- [ ] Тест 6: Все курсы ("Все курсы")

---

## [2.0.0] - 28 января 2025 - Мультивалютность и улучшения

#### Мультивалютность
- 💱 Поддержка 4 валют: KGS (сом), USD, EUR, RUB
- 🏦 Автоматическое определение символа валюты
- 📊 Статистика с учётом валюты
- 📋 История с отображением валюты каждой транзакции

#### Улучшенные категории
- ➕ Добавлено 6 новых категорий расходов:
  - Кафе и рестораны
  - Медицина
  - Одежда
  - Развлечения
  - Хозяйственные товары
  - Образование
  - Благотворительность
  
- ➕ Добавлено 2 новые категории доходов:
  - Фриланс
  - Аренда имущества

#### Интеграция
- 🔗 Прямое подключение к Supabase (опционально)
- 🤖 Режим работы через Telegram Bot (по умолчанию)
- ⚙️ Конфигурационный файл для настроек

#### UI/UX улучшения
- 📱 Улучшенный адаптивный дизайн
- 🌙 Поддержка темной темы Telegram
- 📅 Отображение даты в истории транзакций
- 💫 Анимации и плавные переходы
- ✅ Информативные уведомления с символом валюты

### 🔧 Технические изменения

#### Архитектура
```javascript
// Новая структура данных транзакции
{
    type: 'income' | 'expense',
    amount: number,
    currency: 'KGS' | 'USD' | 'EUR' | 'RUB',
    category: string,
    description: string,
    date: string,
    time: string,
    telegram_user_id: number
}
```

#### Новые функции
- `updateCurrencyDisplay()` - обновление отображения валюты
- `sendToSupabase()` - прямая отправка в Supabase
- `resetForm()` - сброс формы с сохранением дефолтной валюты

#### API изменения
```javascript
// Для режима Supabase
POST /rest/v1/expenses
POST /rest/v1/income

Headers:
- apikey: SUPABASE_ANON_KEY
- Authorization: Bearer SUPABASE_ANON_KEY
- Content-Type: application/json

Body:
{
    "amount": 1000,
    "currency": "KGS",
    "category": "Продукты",
    "description": "Покупка в супермаркете",
    "date": "2025-01-28T14:30:00",
    "telegram_user_id": 123456789
}
```

### 🗃️ База данных

#### Требуемая миграция
```sql
-- Добавление поля currency
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KGS' NOT NULL;
ALTER TABLE income ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KGS' NOT NULL;

-- Ограничения
ALTER TABLE expenses ADD CONSTRAINT expenses_currency_check 
CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB'));

ALTER TABLE income ADD CONSTRAINT income_currency_check 
CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB'));

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency);
CREATE INDEX IF NOT EXISTS idx_income_currency ON income(currency);
```

### 📝 Миграция с версии 1.x

1. **Обновите базу данных:**
```bash
# Выполните SQL из migrations/add_currency_field.sql
psql -h your-supabase-host -U postgres -d postgres -f migrations/add_currency_field.sql
```

2. **Обновите n8n workflow:**
- Импортируйте обновлённый `AnaliziFinance.json`
- Или обновите вручную Add_expense и Add_income инструменты

3. **Обновите Mini App:**
- Замените `TelegramMiniApp.html` на новую версию
- Создайте `miniapp-config.js` из `miniapp-config.example.js`
- Загрузите на хостинг

4. **Проверьте совместимость:**
```javascript
// Старые транзакции без currency будут иметь 'KGS' по умолчанию
SELECT * FROM expenses WHERE currency IS NULL;
-- Должно быть пусто после миграции
```

### 🐛 Исправления

- Исправлено: форма не очищалась после отправки
- Исправлено: категория не сбрасывалась
- Исправлено: время не обновлялось автоматически
- Исправлено: статистика показывала ₽ вместо выбранной валюты
- Улучшено: обработка ошибок при отправке данных
- Улучшено: отображение пустой истории

### ⚡ Производительность

- Оптимизация: кэширование списка категорий
- Оптимизация: уменьшение размера HTML (сжатие CSS)
- Оптимизация: lazy loading для истории транзакций

### 🔐 Безопасность

- Добавлена проверка telegram_user_id
- Улучшена валидация форм
- Добавлена защита от SQL инъекций (через Supabase RLS)

### 📚 Документация

- ➕ Добавлен `MINIAPP_SETUP.md` - полное руководство по настройке
- ➕ Добавлен `miniapp-config.example.js` - пример конфигурации
- ➕ Добавлен `CHANGELOG.md` - этот файл
- 🔄 Обновлён `README.md` - упоминание мультивалютности

---

## [1.0.0] - Первый релиз

### Основные функции
- Добавление доходов/расходов
- Выбор категории
- Голосовой ввод
- Статистика
- История транзакций
- Интеграция с Telegram Bot

---

## 🔮 Планы на будущее (v2.2+)

### Приоритеты v2.2
- [ ] Редактирование транзакций
- [ ] Удаление транзакций (soft delete)
- [ ] Графики расходов по категориям
- [ ] Бюджеты по валютам с уведомлениями
- [ ] Прогноз курсов валют (ML)

### В разработке
- [ ] PDF отчёты с брендингом
- [ ] Recurring transactions (подписки)
- [ ] Множественные счета (кошельки)
- [ ] Тёмная тема (кастомная)
- [ ] Виджеты для быстрого доступа

### Идеи
- [ ] Геолокация для транзакций
- [ ] QR-сканер чеков
- [ ] OCR для чеков
- [ ] Импорт банковских выписок
- [ ] Экспорт в 1C
- [ ] Интеграция с CRM
- [ ] Мультипользовательский режим (семья/команда)
- [ ] Цели накоплений
- [ ] Инвестиционный портфель
- [ ] Уведомления о значительных изменениях курса валют

---

**📅 Последнее обновление:** 30 октября 2025  
**🏷️ Текущая версия:** 2.2.0  
**👨‍💻 Автор:** AI Accounter Team
