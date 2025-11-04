-- ============================================
-- QUICK TEST: Проверка, почему доход не виден
-- ============================================

-- 1. Смотрим последние доходы пользователя 1109421300
SELECT 
  id,
  user_id,
  workspace_id,
  date,
  TO_CHAR(date, 'DD.MM.YYYY') as formatted_date,
  TO_CHAR(date AT TIME ZONE 'Asia/Bishkek', 'DD.MM.YYYY HH24:MI:SS') as bishkek_datetime,
  amount,
  currency,
  category,
  description,
  created_at AT TIME ZONE 'Asia/Bishkek' as created_at_bishkek,
  deleted_at
FROM income
WHERE user_id = 1109421300
ORDER BY created_at DESC
LIMIT 10;

-- 2. Проверяем сегодняшнюю дату в разных форматах
SELECT 
  CURRENT_DATE as current_date_utc,
  (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE as current_date_bishkek,
  NOW() AT TIME ZONE 'UTC' as now_utc,
  NOW() AT TIME ZONE 'Asia/Bishkek' as now_bishkek;

-- 3. Тест Get Daily Stats с workspace_id = NULL (как в реальном случае)
WITH today_income AS (
  SELECT 
    COALESCE(SUM(amount), 0) as total_income,
    COUNT(*) as income_count,
    json_agg(
      json_build_object(
        'id', id,
        'date', date,
        'date_str', TO_CHAR(date, 'DD.MM.YYYY'),
        'amount', amount
      )
    ) as details
  FROM income
  WHERE user_id = 1109421300
    -- Без фильтра workspace_id
    AND DATE(date) = (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE
    AND deleted_at IS NULL
)
SELECT * FROM today_income;

-- 4. Тест с CURRENT_DATE (старая версия, которая НЕ работала)
WITH today_income_old AS (
  SELECT 
    COALESCE(SUM(amount), 0) as total_income,
    COUNT(*) as income_count
  FROM income
  WHERE user_id = 1109421300
    AND DATE(date) = CURRENT_DATE  -- UTC, НЕ Asia/Bishkek!
    AND deleted_at IS NULL
)
SELECT * FROM today_income_old;

-- ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:
-- Запрос 3 (timezone-aware) должен найти доход 5000
-- Запрос 4 (CURRENT_DATE) не найдёт ничего из-за разницы в дате

-- ============================================
-- Дополнительная диагностика: workspace
-- ============================================

-- 5. Проверить workspace пользователя
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  wm.role,
  wm.is_active
FROM workspaces w
JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE wm.user_id = 1109421300
  AND wm.is_active = true
  AND w.is_active = true
ORDER BY wm.joined_at DESC;

-- 6. Проверить, в какой workspace попал доход
SELECT DISTINCT
  i.workspace_id,
  w.name as workspace_name,
  COUNT(i.id) as income_count,
  SUM(i.amount) as total_amount
FROM income i
LEFT JOIN workspaces w ON i.workspace_id = w.id
WHERE i.user_id = 1109421300
  AND i.deleted_at IS NULL
  AND i.created_at >= NOW() - INTERVAL '1 day'
GROUP BY i.workspace_id, w.name;

