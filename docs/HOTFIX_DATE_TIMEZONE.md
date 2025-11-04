# Исправление записи дат (HOTFIX)

## Проблема

Расходы и доходы записывались с **неправильной датой** - на день раньше текущей даты.

**Пример:**
- Текущая дата: **05.11.2025**
- Пользователь отправил: "Потратил 500 на завтрак"
- Бот записал расход с датой: **04.11.2025** ❌
- В отчете за сегодня (05.11.2025) расход не отображается

## Причины

### 1. **AI видел текущую дату в промпте**

В системном промпте AI Assistant была строка:
```
Текущая дата: {{ new Date().toLocaleDateString('ru-RU') }}
```

Это JavaScript выражение выполнялось на сервере n8n и могло:
- Работать в UTC timezone (если сервер в UTC)
- Возвращать неправильную дату для timezone Кыргызстана (UTC+6)

AI видел эту дату и мог возвращать её в параметре `date` вместо пустой строки.

### 2. **CURRENT_DATE работал в UTC**

SQL запросы в `Add_expense` и `Add_income` использовали:
```sql
CASE 
  WHEN '{{ $fromAI("date", ...) }}' = '' THEN CURRENT_DATE
  ELSE TO_DATE('{{ $fromAI("date"...) }}', 'DD.MM.YYYY')
END
```

`CURRENT_DATE` в PostgreSQL возвращает дату в timezone сервера базы данных. Если сервер работает в UTC, а текущее время UTC 23:00 (04.11.2025), то в Кыргызстане уже 05:00 (05.11.2025), но `CURRENT_DATE` вернет `2025-11-04`.

## Решение

### 1. **Убрали дату из промпта AI** ✅

**Файл:** `AnaliziFinance.json`, строка ~311

**Было:**
```javascript
"Валюты: сом (KGS), доллар (USD), евро (EUR), рубль (RUB). Текущая дата: {{ new Date().toLocaleDateString('ru-RU') }}"
```

**Стало:**
```javascript
"Валюты: сом (KGS), доллар (USD), евро (EUR), рубль (RUB)."
```

Теперь AI не видит текущую дату и не может её возвращать.

### 2. **Изменили CURRENT_DATE на NOW() с timezone** ✅

**Файл:** `AnaliziFinance.json`
- **Add_expense** (строка ~892)
- **Add_income** (строка ~844)

**Было:**
```sql
CASE 
  WHEN '{{ $fromAI("date", "Дата операции в формате DD.MM.YYYY, если не указана то пустая строка", ...) }}' = '' 
    THEN CURRENT_DATE
  ELSE TO_DATE('{{ $fromAI("date"...) }}', 'DD.MM.YYYY')
END
```

**Стало:**
```sql
CASE 
  WHEN '{{ $fromAI("date", "Дата операции в формате DD.MM.YYYY. Если дата НЕ указана в сообщении пользователя - верни пустую строку", ...) }}' = '' 
    THEN (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE
  ELSE TO_DATE('{{ $fromAI("date"...) }}', 'DD.MM.YYYY')
END
```

**Изменения:**
1. `CURRENT_DATE` → `(NOW() AT TIME ZONE 'Asia/Bishkek')::DATE`
   - Получаем текущее время в timezone Бишкека (UTC+6)
   - Преобразуем в DATE (отбрасываем время)
   
2. Уточнили промпт AI: **"Если дата НЕ указана в сообщении пользователя - верни пустую строку"**
   - Более четкая инструкция для AI

## Проверка timezone

```sql
-- Проверить текущую дату в разных timezone
SELECT 
  CURRENT_DATE as current_date_utc,
  (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE as current_date_bishkek,
  NOW() AT TIME ZONE 'UTC' as now_utc,
  NOW() AT TIME ZONE 'Asia/Bishkek' as now_bishkek;
```

**Пример результата:**
```
current_date_utc | current_date_bishkek | now_utc              | now_bishkek
-----------------+----------------------+----------------------+----------------------
2025-11-04       | 2025-11-05           | 2025-11-04 23:30:00  | 2025-11-05 05:30:00
```

Если UTC время **23:30** (04.11.2025), то в Бишкеке уже **05:30** (05.11.2025).

## Очистка тестовых данных

```sql
-- Удалить тестовый расход с неправильной датой
DELETE FROM expenses 
WHERE user_id = 1109421300 
  AND date = '2025-11-04' 
  AND amount = 500 
  AND category = 'кафе/рестораны'
  AND description LIKE '%завтрак%';
```

## Тестирование

### 1. Перезагрузите workflow в n8n

После изменений в `AnaliziFinance.json`:
1. Откройте workflow в n8n
2. Деактивируйте и активируйте снова
3. Или перезапустите n8n

### 2. Проверьте запись расхода

Отправьте боту:
```
Потратил 100 на обед
```

Проверьте в базе:
```sql
SELECT 
  date,
  TO_CHAR(date, 'DD.MM.YYYY') as formatted_date,
  amount,
  description,
  created_at AT TIME ZONE 'Asia/Bishkek' as created_at_bishkek
FROM expenses
WHERE user_id = 1109421300
ORDER BY id DESC
LIMIT 1;
```

**Ожидаемый результат:**
- `date` = сегодняшняя дата (05.11.2025)
- `formatted_date` = '05.11.2025'
- Бот ответил: "✅ Расход добавлен: 100 KGS на 'продукты' (05.11.2025)"

### 3. Проверьте дневной отчет

Отправьте боту:
```
Отчет за сегодня
```

**Ожидаемый результат:**
- В отчете отображается расход на обед (100 KGS)
- Дата отчета: 05.11.2025

### 4. Проверьте с явной датой

Отправьте боту:
```
Потратил 200 на транспорт 03.11.2025
```

Проверьте:
```sql
SELECT date, amount, description
FROM expenses
WHERE user_id = 1109421300 AND date = '2025-11-03'
ORDER BY id DESC LIMIT 1;
```

**Ожидаемый результат:**
- Расход записан с датой 03.11.2025 (как указано пользователем)

## Альтернативные timezone

Если `'Asia/Bishkek'` не работает, используйте:

```sql
-- Вариант 1: UTC offset
(NOW() AT TIME ZONE 'UTC+6')::DATE

-- Вариант 2: Etc timezone (обратите внимание на минус!)
(NOW() AT TIME ZONE 'Etc/GMT-6')::DATE

-- Вариант 3: Almat (соседний город, тот же timezone)
(NOW() AT TIME ZONE 'Asia/Almaty')::DATE
```

Проверить доступные timezone:
```sql
SELECT name 
FROM pg_timezone_names 
WHERE name LIKE '%Asia%' OR name LIKE '%Bishkek%' OR name LIKE '%Almaty%'
ORDER BY name;
```

## Файлы изменены

- ✅ `AnaliziFinance.json` - убрана дата из промпта, изменены Add_expense, Add_income и **Get Daily Stats**
- ✅ `migrations/HOTFIX_date_timezone.sql` - SQL скрипт для проверки и очистки
- ✅ `docs/HOTFIX_DATE_TIMEZONE.md` - документация (этот файл)

## Все CURRENT_DATE заменены на timezone-aware

**Изменены SQL запросы:**

1. **Add_expense** (строка ~892):
   ```sql
   THEN (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE
   ```

2. **Add_income** (строка ~844):
   ```sql
   THEN (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE
   ```

3. **Get Daily Stats** (строка ~1650) - НОВОЕ:
   ```sql
   -- today_expenses
   AND DATE(date) = (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE
   
   -- today_income
   AND DATE(date) = (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE
   
   -- month_stats
   DATE_TRUNC('month', date) = DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE)
   
   -- budget_info
   month = TO_CHAR((NOW() AT TIME ZONE 'Asia/Bishkek')::DATE, 'YYYY-MM')
   ```

## Связанные проблемы

- [x] Expense recorded with wrong date (04.11.2025 instead of 05.11.2025)
- [x] Daily report shows 0 expenses for today
- [x] AI prompt included current date causing confusion
- [x] CURRENT_DATE used UTC instead of local timezone

## Статус: ✅ ИСПРАВЛЕНО

Дата: 2025-11-05  
Версия: v2.4.1  
Приоритет: CRITICAL
