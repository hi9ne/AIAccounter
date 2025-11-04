-- ============================================================
-- HOTFIX: Add currency column to expenses and income tables
-- ============================================================
-- Execute this migration if you're getting:
-- "column 'currency' does not exist" errors
-- ============================================================

-- Add currency column to expenses table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE expenses 
        ADD COLUMN currency VARCHAR(3) DEFAULT 'KGS';
        
        RAISE NOTICE 'Currency column added to expenses table';
    ELSE
        RAISE NOTICE 'Currency column already exists in expenses table';
    END IF;
END $$;

-- Add currency column to income table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'income' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE income 
        ADD COLUMN currency VARCHAR(3) DEFAULT 'KGS';
        
        RAISE NOTICE 'Currency column added to income table';
    ELSE
        RAISE NOTICE 'Currency column already exists in income table';
    END IF;
END $$;

-- Verify the columns exist
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('expenses', 'income')
    AND column_name = 'currency';

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Currency column migration completed!';
    RAISE NOTICE 'Tables now support multi-currency transactions';
END $$;
