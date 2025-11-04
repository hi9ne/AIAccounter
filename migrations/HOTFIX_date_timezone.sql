-- ============================================
-- HOTFIX: Fix Date Recording with Timezone
-- ============================================
-- Проблема: Расходы/доходы записывались с неправильной датой (день назад)
-- Причина: 
--   1. AI видел текущую дату в промпте и возвращал её вместо пустой строки
--   2. CURRENT_DATE на PostgreSQL сервере мог работать в UTC timezone
-- Решение:
--   1. Убрали "Текущая дата: {{ new Date()... }}" из промпта AI
--   2. Изменили CURRENT_DATE на (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE
--   3. Уточнили промпт AI: "Если дата НЕ указана в сообщении пользователя - верни пустую строку"

-- Удаляем тестовый расход с неправильной датой
-- (Выполнить только если есть тестовые данные)
DELETE FROM expenses 
WHERE user_id = 1109421300 
  AND date = '2025-11-04' 
  AND amount = 500 
  AND category = 'кафе/рестораны'
  AND description LIKE '%завтрак%';

-- Проверка: показать последние расходы пользователя
SELECT 
  id,
  date,
  TO_CHAR(date, 'DD.MM.YYYY') as formatted_date,
  category,
  amount,
  currency,
  description,
  created_at AT TIME ZONE 'Asia/Bishkek' as created_at_bishkek
FROM expenses
WHERE user_id = 1109421300
ORDER BY created_at DESC
LIMIT 5;

-- Проверка текущей даты в разных timezone
SELECT 
  CURRENT_DATE as current_date_utc,
  (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE as current_date_bishkek,
  NOW() AT TIME ZONE 'UTC' as now_utc,
  NOW() AT TIME ZONE 'Asia/Bishkek' as now_bishkek;

-- ============================================
-- Изменения в workflow (AnaliziFinance.json)
-- ============================================

-- 1. Financial Assistant prompt (строка ~311):
--    БЫЛО: "Валюты: сом (KGS), доллар (USD), евро (EUR), рубль (RUB). Текущая дата: {{ new Date().toLocaleDateString('ru-RU') }}"
--    СТАЛО: "Валюты: сом (KGS), доллар (USD), евро (EUR), рубль (RUB)."

-- 2. Add_expense query (строка ~892):
--    БЫЛО: 
--      CASE 
--        WHEN '{{ $fromAI("date", "Дата операции в формате DD.MM.YYYY, если не указана то пустая строка", ...) }}' = '' 
--          THEN CURRENT_DATE
--        ELSE TO_DATE('{{ $fromAI("date"...) }}', 'DD.MM.YYYY')
--      END

--    СТАЛО:
--      CASE 
--        WHEN '{{ $fromAI("date", "Дата операции в формате DD.MM.YYYY. Если дата НЕ указана в сообщении пользователя - верни пустую строку", ...) }}' = '' 
--          THEN (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE
--        ELSE TO_DATE('{{ $fromAI("date"...) }}', 'DD.MM.YYYY')
--      END

-- 3. Add_income query (строка ~844):
--    Аналогичные изменения как в Add_expense

-- ============================================
-- Тестирование
-- ============================================

-- После применения этих изменений:
-- 1. Перезагрузите workflow в n8n
-- 2. Отправьте тестовое сообщение: "Потратил 100 на обед"
-- 3. Проверьте, что дата записалась правильно:
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

-- 4. Запросите "Отчет за сегодня" и убедитесь, что расход отображается

-- ============================================
-- Примечания
-- ============================================

-- Timezone 'Asia/Bishkek' (UTC+6) используется для Кыргызстана
-- При необходимости можно изменить на другой timezone

-- Список доступных timezone в PostgreSQL:
-- SELECT name FROM pg_timezone_names WHERE name LIKE '%Bishkek%' OR name LIKE '%Asia%' LIMIT 20;

-- Если Bishkek не работает, альтернативы:
-- 'UTC+6' или 'Etc/GMT-6' (обратите внимание на минус!)
