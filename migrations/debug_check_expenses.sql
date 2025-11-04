-- Проверка расходов пользователя
-- Замените user_id на ваш реальный ID из Telegram

-- 1. Проверить последние 10 транзакций
SELECT 
  id,
  user_id,
  workspace_id,
  amount,
  category,
  description,
  DATE(date) as transaction_date,
  date as full_datetime,
  deleted_at
FROM expenses
WHERE user_id = 1109421300  -- Ваш user_id из предыдущей ошибки
ORDER BY date DESC
LIMIT 10;

-- 2. Проверить транзакции за последние 7 дней
SELECT 
  DATE(date) as day,
  COUNT(*) as transactions,
  SUM(amount) as total,
  json_agg(json_build_object(
    'category', category,
    'amount', amount,
    'workspace_id', workspace_id
  )) as details
FROM expenses
WHERE user_id = 1109421300
  AND DATE(date) >= CURRENT_DATE - INTERVAL '7 days'
  AND DATE(date) <= CURRENT_DATE
  AND deleted_at IS NULL
GROUP BY DATE(date)
ORDER BY day DESC;

-- 3. Проверить текущую дату сервера
SELECT 
  CURRENT_DATE as server_date,
  CURRENT_TIMESTAMP as server_timestamp,
  NOW() as now_time;

-- 4. Проверить workspace_id пользователя
SELECT DISTINCT workspace_id
FROM expenses
WHERE user_id = 1109421300
ORDER BY workspace_id;
