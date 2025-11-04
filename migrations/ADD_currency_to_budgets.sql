-- Добавить currency в таблицу budgets
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KGS';

-- Проверка
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'budgets'
    AND column_name = 'currency';
