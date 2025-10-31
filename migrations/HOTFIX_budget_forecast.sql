-- =====================================================
-- HOTFIX: get_budget_forecast - исправление конфликта имен
-- Дата: 31 октября 2025
-- Проблема: "column reference budget_amount is ambiguous"
-- =====================================================

DROP FUNCTION IF EXISTS get_budget_forecast(BIGINT);

CREATE OR REPLACE FUNCTION get_budget_forecast(p_user_id BIGINT)
RETURNS TABLE (
    current_spent NUMERIC,
    budget_amount NUMERIC,
    percentage_used NUMERIC,
    projected_spending NUMERIC,
    remaining NUMERIC,
    days_remaining INTEGER,
    daily_average NUMERIC,
    recommended_daily_limit NUMERIC,
    forecast_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    WITH current_spending AS (
        SELECT COALESCE(SUM(e.amount), 0) as spent
        FROM expenses e
        WHERE e.user_id = p_user_id
          AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE)
          AND e.deleted_at IS NULL
    ),
    days_data AS (
        SELECT 
            EXTRACT(DAY FROM CURRENT_DATE)::INTEGER as days_passed,
            EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::INTEGER as days_total
    ),
    budget_data AS (
        SELECT COALESCE(b.budget_amount, 0) as budget
        FROM budgets b
        WHERE b.user_id = p_user_id
          AND b.month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    )
    SELECT 
        cs.spent,
        bd.budget,
        ROUND((cs.spent / NULLIF(bd.budget, 0)) * 100, 1),
        ROUND(cs.spent / NULLIF(dd.days_passed, 0) * dd.days_total, 2),
        bd.budget - cs.spent,
        (dd.days_total - dd.days_passed)::INTEGER,
        ROUND(cs.spent / NULLIF(dd.days_passed, 0), 2),
        ROUND((bd.budget - cs.spent) / NULLIF((dd.days_total - dd.days_passed), 0), 2),
        CASE 
            WHEN cs.spent / NULLIF(dd.days_passed, 0) * dd.days_total > bd.budget * 1.1 THEN 'critical'
            WHEN cs.spent / NULLIF(dd.days_passed, 0) * dd.days_total > bd.budget THEN 'warning'
            ELSE 'ok'
        END::VARCHAR(20)
    FROM current_spending cs, days_data dd, budget_data bd;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_budget_forecast IS 'Возвращает прогноз бюджета до конца месяца (FIXED: устранены конфликты имен)';

-- Проверка
SELECT * FROM get_budget_forecast(1109421300);
