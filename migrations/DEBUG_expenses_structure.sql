-- ============================================================
-- DEBUG: Проверка структуры expenses и income
-- ============================================================

-- 1. Проверить все объекты с именем expenses/income
SELECT 
    schemaname,
    tablename as object_name,
    'table' as object_type
FROM pg_tables 
WHERE tablename IN ('expenses', 'income')
UNION ALL
SELECT 
    schemaname,
    viewname as object_name,
    'view' as object_type
FROM pg_views 
WHERE viewname IN ('expenses', 'income')
UNION ALL
SELECT 
    schemaname,
    matviewname as object_name,
    'materialized view' as object_type
FROM pg_matviews 
WHERE matviewname IN ('expenses', 'income');

-- 2. Проверить все колонки таблицы expenses
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses'
ORDER BY ordinal_position;

-- 3. Проверить все колонки таблицы income
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'income'
ORDER BY ordinal_position;

-- 4. Проверить текущую схему
SELECT current_schema();

-- 5. Проверить путь поиска схем
SHOW search_path;
