-- Проверить структуру таблицы budgets
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'budgets'
ORDER BY ordinal_position;
