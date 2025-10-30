-- Добавление поля currency в таблицы expenses и income
-- Дата: 30.10.2025

-- 1. Добавляем колонку currency в expenses
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KGS' NOT NULL;

-- 2. Добавляем колонку currency в income
ALTER TABLE income 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KGS' NOT NULL;

-- 3. Добавляем индексы для быстрого поиска по валюте
CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency);
CREATE INDEX IF NOT EXISTS idx_income_currency ON income(currency);

-- 4. Добавляем проверку допустимых валют
ALTER TABLE expenses
ADD CONSTRAINT check_expenses_currency CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB'));

ALTER TABLE income
ADD CONSTRAINT check_income_currency CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB'));

-- 5. Комментарии
COMMENT ON COLUMN expenses.currency IS 'Валюта операции: KGS (сом), USD (доллар), EUR (евро), RUB (рубль)';
COMMENT ON COLUMN income.currency IS 'Валюта операции: KGS (сом), USD (доллар), EUR (евро), RUB (рубль)';
