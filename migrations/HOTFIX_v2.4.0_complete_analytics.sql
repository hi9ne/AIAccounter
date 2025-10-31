-- ============================================================
-- HOTFIX: Create all missing v2.4.0 analytics tables
-- Date: 2025-10-31
-- Issue: Some tables may be missing or have wrong structure from partial migration
-- Solution: Drop and recreate all analytics tables
-- ============================================================

-- ============================================================
-- 1. REPORTS table
-- ============================================================
DROP TABLE IF EXISTS reports CASCADE;

CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'monthly', 'annual', 'tax', 'custom'
    format VARCHAR(10) NOT NULL, -- 'pdf', 'excel', 'csv'
    period_start DATE,
    period_end DATE,
    parameters JSONB DEFAULT '{}',
    file_url TEXT,
    file_size_bytes INTEGER,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'failed'
    error_message TEXT,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP
);

COMMENT ON TABLE reports IS 'Сгенерированные финансовые отчёты';
COMMENT ON COLUMN reports.parameters IS 'Параметры генерации (категории, валюта, фильтры)';
COMMENT ON COLUMN reports.file_url IS 'URL файла в Supabase Storage';
COMMENT ON COLUMN reports.expires_at IS 'Дата удаления файла (автоочистка старых отчётов)';

CREATE INDEX idx_reports_workspace ON reports(workspace_id);
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
CREATE INDEX idx_reports_expires ON reports(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- 2. ML_FORECASTS table
-- ============================================================
DROP TABLE IF EXISTS ml_forecasts CASCADE;

CREATE TABLE ml_forecasts (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    forecast_type VARCHAR(50) NOT NULL, -- 'income', 'expenses', 'balance', 'category'
    target_month DATE NOT NULL,
    predicted_value DECIMAL(12, 2) NOT NULL,
    confidence_lower DECIMAL(12, 2),
    confidence_upper DECIMAL(12, 2),
    confidence_level DECIMAL(3, 2) DEFAULT 0.95, -- 95% confidence interval
    model_name VARCHAR(50), -- 'prophet', 'arima', 'linear_regression'
    model_accuracy DECIMAL(5, 4), -- R² score or similar metric
    training_data_size INTEGER,
    features JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actual_value DECIMAL(12, 2), -- Фактическое значение (заполняется позже)
    updated_at TIMESTAMP
);

COMMENT ON TABLE ml_forecasts IS 'Прогнозы машинного обучения для доходов/расходов';
COMMENT ON COLUMN ml_forecasts.confidence_lower IS 'Нижняя граница доверительного интервала';
COMMENT ON COLUMN ml_forecasts.confidence_upper IS 'Верхняя граница доверительного интервала';
COMMENT ON COLUMN ml_forecasts.features IS 'Признаки, использованные для прогноза';
COMMENT ON COLUMN ml_forecasts.actual_value IS 'Фактическое значение (для оценки точности)';

CREATE INDEX idx_ml_forecasts_workspace ON ml_forecasts(workspace_id);
CREATE INDEX idx_ml_forecasts_type ON ml_forecasts(forecast_type);
CREATE INDEX idx_ml_forecasts_month ON ml_forecasts(target_month);
CREATE INDEX idx_ml_forecasts_created ON ml_forecasts(created_at DESC);

-- ============================================================
-- 3. CHART_CONFIGS table
-- ============================================================
DROP TABLE IF EXISTS chart_configs CASCADE;

CREATE TABLE chart_configs (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    chart_name VARCHAR(100) NOT NULL,
    chart_type VARCHAR(50) NOT NULL, -- 'line', 'bar', 'pie', 'doughnut', 'stacked', 'heatmap'
    config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE chart_configs IS 'Сохранённые конфигурации графиков пользователей';
COMMENT ON COLUMN chart_configs.config IS 'Полная конфигурация Chart.js (datasets, options, colors)';
COMMENT ON COLUMN chart_configs.is_public IS 'Доступен ли график другим участникам workspace';

CREATE INDEX idx_chart_configs_workspace ON chart_configs(workspace_id);
CREATE INDEX idx_chart_configs_user ON chart_configs(user_id);
CREATE INDEX idx_chart_configs_type ON chart_configs(chart_type);

-- ============================================================
-- 4. CATEGORY_ANALYTICS table
-- ============================================================
DROP TABLE IF EXISTS category_analytics CASCADE;

CREATE TABLE category_analytics (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    month DATE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    transaction_count INTEGER NOT NULL,
    avg_transaction DECIMAL(12, 2),
    max_transaction DECIMAL(12, 2),
    min_transaction DECIMAL(12, 2),
    trend_vs_prev_month DECIMAL(5, 2), -- % изменения относительно прошлого месяца
    budget_limit DECIMAL(12, 2),
    budget_used_percent DECIMAL(5, 2),
    top_subcategories JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, category, month)
);

COMMENT ON TABLE category_analytics IS 'Агрегированная аналитика по категориям расходов';
COMMENT ON COLUMN category_analytics.top_subcategories IS 'ТОП подкатегорий с суммами';
COMMENT ON COLUMN category_analytics.trend_vs_prev_month IS 'Тренд в процентах (+5.5 = рост на 5.5%)';

CREATE INDEX idx_category_analytics_workspace ON category_analytics(workspace_id);
CREATE INDEX idx_category_analytics_month ON category_analytics(month DESC);
CREATE INDEX idx_category_analytics_category ON category_analytics(workspace_id, category);

-- ============================================================
-- 5. SPENDING_PATTERNS table
-- ============================================================
-- Drop first if exists with wrong structure
DROP TABLE IF EXISTS spending_patterns CASCADE;

CREATE TABLE spending_patterns (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT,
    pattern_type VARCHAR(50) NOT NULL, -- 'weekly_peak', 'monthly_peak', 'seasonal', 'unusual'
    description TEXT NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confidence DECIMAL(3, 2) DEFAULT 0.80, -- 80% уверенность
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP
);

COMMENT ON TABLE spending_patterns IS 'Обнаруженные паттерны расходов (ML/rules-based)';
COMMENT ON COLUMN spending_patterns.pattern_type IS 'Тип паттерна для группировки';
COMMENT ON COLUMN spending_patterns.metadata IS 'Детали паттерна (категория, день недели, сумма и т.д.)';
COMMENT ON COLUMN spending_patterns.acknowledged IS 'Пользователь просмотрел инсайт';

CREATE INDEX IF NOT EXISTS idx_spending_patterns_workspace ON spending_patterns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_user ON spending_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_type ON spending_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_active ON spending_patterns(is_active) WHERE is_active = true;

-- ============================================================
-- Verification
-- ============================================================
SELECT 
    'All v2.4.0 analytics tables created!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN (
        'reports', 'ml_forecasts', 'chart_configs', 
        'category_analytics', 'spending_patterns'
    )) as tables_created;

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
    'reports', 'ml_forecasts', 'chart_configs', 
    'category_analytics', 'spending_patterns'
)
ORDER BY table_name;
