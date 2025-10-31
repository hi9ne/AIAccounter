-- ============================================================
-- COMPLETE v2.4.0 Analytics Migration
-- Выполнить в Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Drop existing analytics tables (safe cleanup)
-- ============================================================
DROP TABLE IF EXISTS analytics_cache CASCADE;
DROP TABLE IF EXISTS ml_forecasts CASCADE;
DROP TABLE IF EXISTS chart_configs CASCADE;
DROP TABLE IF EXISTS category_analytics CASCADE;
DROP TABLE IF EXISTS spending_patterns CASCADE;

-- ============================================================
-- STEP 2: Create analytics_cache
-- ============================================================
CREATE TABLE analytics_cache (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    cache_key VARCHAR(255) NOT NULL,
    cache_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(workspace_id, cache_key)
);

CREATE INDEX idx_analytics_cache_workspace ON analytics_cache(workspace_id);
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);

-- ============================================================
-- STEP 3: Create ml_forecasts
-- ============================================================
CREATE TABLE ml_forecasts (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    forecast_type VARCHAR(50) NOT NULL,
    model_name VARCHAR(50) NOT NULL,
    input_data JSONB NOT NULL,
    predictions JSONB NOT NULL,
    confidence_score DECIMAL(5,2),
    metrics JSONB,
    period_start DATE,
    period_end DATE,
    forecast_horizon_days INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP
);

CREATE INDEX idx_ml_forecasts_workspace ON ml_forecasts(workspace_id);
CREATE INDEX idx_ml_forecasts_user ON ml_forecasts(user_id);
CREATE INDEX idx_ml_forecasts_type ON ml_forecasts(forecast_type);

-- ============================================================
-- STEP 4: Create chart_configs
-- ============================================================
CREATE TABLE chart_configs (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    chart_name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, user_id, chart_name)
);

CREATE INDEX idx_chart_configs_workspace ON chart_configs(workspace_id);
CREATE INDEX idx_chart_configs_user ON chart_configs(user_id);

-- ============================================================
-- STEP 5: Create category_analytics
-- ============================================================
CREATE TABLE category_analytics (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    period DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    transaction_count INTEGER DEFAULT 0,
    avg_transaction DECIMAL(15,2),
    trend_direction VARCHAR(10),
    trend_percentage DECIMAL(5,2),
    metadata JSONB DEFAULT '{}',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, category_name, period)
);

CREATE INDEX idx_category_analytics_workspace ON category_analytics(workspace_id);
CREATE INDEX idx_category_analytics_period ON category_analytics(period DESC);

-- ============================================================
-- STEP 6: Create spending_patterns
-- ============================================================
CREATE TABLE spending_patterns (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL,
    pattern_name VARCHAR(200) NOT NULL,
    description TEXT,
    frequency VARCHAR(20),
    avg_amount DECIMAL(15,2),
    category VARCHAR(100),
    confidence_score DECIMAL(5,2),
    metadata JSONB DEFAULT '{}',
    first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_spending_patterns_workspace ON spending_patterns(workspace_id);
CREATE INDEX idx_spending_patterns_type ON spending_patterns(pattern_type);
CREATE INDEX idx_spending_patterns_active ON spending_patterns(is_active) WHERE is_active = true;

-- ============================================================
-- STEP 7: Create analytics functions
-- ============================================================

-- Function: get_income_expense_stats
CREATE OR REPLACE FUNCTION get_income_expense_stats(
    p_workspace_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_income DECIMAL,
    total_expense DECIMAL,
    balance DECIMAL,
    income_count INTEGER,
    expense_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as balance,
        COUNT(CASE WHEN t.type = 'income' THEN 1 END)::INTEGER as income_count,
        COUNT(CASE WHEN t.type = 'expense' THEN 1 END)::INTEGER as expense_count
    FROM transactions t
    WHERE t.workspace_id = p_workspace_id
        AND t.date >= p_start_date
        AND t.date <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function: get_chart_data
CREATE OR REPLACE FUNCTION get_chart_data(
    p_workspace_id INTEGER,
    p_chart_type VARCHAR,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    IF p_chart_type = 'daily_balance' THEN
        SELECT jsonb_agg(jsonb_build_object(
            'date', date,
            'balance', balance
        ) ORDER BY date)
        INTO result
        FROM (
            SELECT 
                date,
                SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) OVER (ORDER BY date) as balance
            FROM transactions
            WHERE workspace_id = p_workspace_id
                AND date >= p_start_date
                AND date <= p_end_date
        ) t;
    ELSE
        result := '[]'::jsonb;
    END IF;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function: get_top_categories
CREATE OR REPLACE FUNCTION get_top_categories(
    p_workspace_id INTEGER,
    p_start_date DATE,
    p_end_date DATE,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    category VARCHAR,
    total_amount DECIMAL,
    transaction_count BIGINT,
    percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH category_totals AS (
        SELECT 
            t.category,
            SUM(t.amount) as total,
            COUNT(*) as count
        FROM transactions t
        WHERE t.workspace_id = p_workspace_id
            AND t.type = 'expense'
            AND t.date >= p_start_date
            AND t.date <= p_end_date
        GROUP BY t.category
    ),
    total_sum AS (
        SELECT SUM(total) as grand_total FROM category_totals
    )
    SELECT 
        ct.category,
        ct.total,
        ct.count,
        ROUND((ct.total / NULLIF(ts.grand_total, 0) * 100)::NUMERIC, 2) as percentage
    FROM category_totals ct
    CROSS JOIN total_sum ts
    ORDER BY ct.total DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: get_category_analytics
CREATE OR REPLACE FUNCTION get_category_analytics(
    p_workspace_id INTEGER,
    p_period DATE
)
RETURNS TABLE(
    category_name VARCHAR,
    total_amount DECIMAL,
    transaction_count INTEGER,
    avg_transaction DECIMAL,
    trend_direction VARCHAR,
    trend_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.category_name,
        ca.total_amount,
        ca.transaction_count,
        ca.avg_transaction,
        ca.trend_direction,
        ca.trend_percentage
    FROM category_analytics ca
    WHERE ca.workspace_id = p_workspace_id
        AND ca.period = p_period
    ORDER BY ca.total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: get_spending_patterns
CREATE OR REPLACE FUNCTION get_spending_patterns(
    p_workspace_id INTEGER
)
RETURNS TABLE(
    pattern_type VARCHAR,
    pattern_name VARCHAR,
    description TEXT,
    frequency VARCHAR,
    avg_amount DECIMAL,
    category VARCHAR,
    confidence_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.pattern_type,
        sp.pattern_name,
        sp.description,
        sp.frequency,
        sp.avg_amount,
        sp.category,
        sp.confidence_score
    FROM spending_patterns sp
    WHERE sp.workspace_id = p_workspace_id
        AND sp.is_active = true
    ORDER BY sp.confidence_score DESC, sp.last_updated DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: get_balance_trend
CREATE OR REPLACE FUNCTION get_balance_trend(
    p_workspace_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    date DATE,
    balance DECIMAL,
    income DECIMAL,
    expense DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.date,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) OVER (ORDER BY t.date) as balance,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expense
    FROM transactions t
    WHERE t.workspace_id = p_workspace_id
        AND t.date >= p_start_date
        AND t.date <= p_end_date
    GROUP BY t.date
    ORDER BY t.date;
END;
$$ LANGUAGE plpgsql;

-- Function: update_analytics_cache
CREATE OR REPLACE FUNCTION update_analytics_cache(
    p_workspace_id INTEGER,
    p_cache_key VARCHAR,
    p_cache_type VARCHAR,
    p_data JSONB,
    p_ttl_hours INTEGER DEFAULT 24
)
RETURNS void AS $$
BEGIN
    INSERT INTO analytics_cache (workspace_id, cache_key, cache_type, data, expires_at)
    VALUES (
        p_workspace_id,
        p_cache_key,
        p_cache_type,
        p_data,
        CURRENT_TIMESTAMP + (p_ttl_hours || ' hours')::INTERVAL
    )
    ON CONFLICT (workspace_id, cache_key) 
    DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at,
        created_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function: get_cached_analytics
CREATE OR REPLACE FUNCTION get_cached_analytics(
    p_workspace_id INTEGER,
    p_cache_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    cached_data JSONB;
BEGIN
    SELECT data INTO cached_data
    FROM analytics_cache
    WHERE workspace_id = p_workspace_id
        AND cache_key = p_cache_key
        AND expires_at > CURRENT_TIMESTAMP;
    
    RETURN cached_data;
END;
$$ LANGUAGE plpgsql;

-- Function: log_audit_event
CREATE OR REPLACE FUNCTION log_audit_event(
    p_workspace_id INTEGER,
    p_user_id BIGINT,
    p_action VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id INTEGER,
    p_details JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
    INSERT INTO audit_logs (workspace_id, user_id, action, entity_type, entity_id, details)
    VALUES (p_workspace_id, p_user_id, p_action, p_entity_type, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ v2.4.0 Analytics Migration Complete!';
    RAISE NOTICE '📊 Created 5 tables';
    RAISE NOTICE '🔧 Created 9 functions';
    RAISE NOTICE '🔍 Created 12 indexes';
END $$;
