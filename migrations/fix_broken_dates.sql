-- Исправление неправильных дат в таблице expenses
-- Все транзакции с датой '0001-01-01 BC' будут обновлены на текущую дату

-- 1. Сначала посмотрим, сколько таких записей
SELECT 
  COUNT(*) as broken_records,
  'expenses' as table_name
FROM expenses
WHERE DATE(date) = '0001-01-01 BC'
  AND deleted_at IS NULL;

-- 2. Обновляем все расходы с неправильной датой на CURRENT_DATE
UPDATE expenses
SET date = CURRENT_DATE
WHERE DATE(date) = '0001-01-01 BC'
  AND deleted_at IS NULL;

-- 3. Проверяем результат для expenses
SELECT 
  id,
  user_id,
  workspace_id,
  DATE(date) as transaction_date,
  category,
  amount,
  description
FROM expenses
WHERE user_id = 1109421300
  AND deleted_at IS NULL
ORDER BY id DESC
LIMIT 10;

-- 4. Проверяем и исправляем таблицу income (если нужно)
SELECT 
  COUNT(*) as broken_records,
  'income' as table_name
FROM income
WHERE DATE(date) = '0001-01-01 BC'
  AND deleted_at IS NULL;

UPDATE income
SET date = CURRENT_DATE
WHERE DATE(date) = '0001-01-01 BC'
  AND deleted_at IS NULL;

-- 5. Итоговая проверка - все транзакции за последние 7 дней
SELECT 
  'expenses' as type,
  DATE(date) as day,
  COUNT(*) as transactions,
  SUM(amount) as total
FROM expenses
WHERE user_id = 1109421300
  AND DATE(date) >= CURRENT_DATE - INTERVAL '7 days'
  AND DATE(date) <= CURRENT_DATE
  AND deleted_at IS NULL
GROUP BY DATE(date)
UNION ALL
SELECT 
  'income' as type,
  DATE(date) as day,
  COUNT(*) as transactions,
  SUM(amount) as total
FROM income
WHERE user_id = 1109421300
  AND DATE(date) >= CURRENT_DATE - INTERVAL '7 days'
  AND DATE(date) <= CURRENT_DATE
  AND deleted_at IS NULL
GROUP BY DATE(date)
ORDER BY day DESC, type;
