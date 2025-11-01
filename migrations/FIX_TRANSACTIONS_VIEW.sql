-- ============================================================
-- FIX: Create transactions VIEW and update functions
-- ============================================================
-- Problem: Functions use 'transactions' table which doesn't exist
-- Solution: Create a VIEW that combines income and expenses
-- ============================================================

-- 1. Create transactions VIEW
CREATE OR REPLACE VIEW transactions AS
SELECT 
    id,
    user_id,
    workspace_id,
    amount,
    currency,
    category,
    description,
    date,
    'income' as type,
    created_at,
    updated_at,
    deleted_at
FROM income
WHERE deleted_at IS NULL

UNION ALL

SELECT 
    id,
    user_id,
    workspace_id,
    amount,
    currency,
    category,
    description,
    date,
    'expense' as type,
    created_at,
    updated_at,
    deleted_at
FROM expenses
WHERE deleted_at IS NULL;

COMMENT ON VIEW transactions IS 'Combined view of income and expenses for unified queries';

-- Now the get_income_expense_stats function will work!
-- Test it:
-- SELECT * FROM get_income_expense_stats(1, '2025-10-01', '2025-11-30');
