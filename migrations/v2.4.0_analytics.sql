-- ============================================================
-- AIAccounter v2.4.0 Migration: Analytics & Reports
-- Date: 2025-10-31
-- Description: Добавление таблиц для аналитики, кэширования
--              и генерации отчётов
-- ============================================================

-- ============================================================
-- 1. ANALYTICS_CACHE - Кэш аналитических данных
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    cache_key VARCHAR(200) NOT NULL,
    cache_type VARCHAR(50) NOT NULL, -- 'chart', 'stats', 'forecast', 'trend'
    period VARCHAR(50), -- 'day', 'week', 'month', 'quarter', 'year'
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, cache_key)
);

COMMENT ON TABLE analytics_cache IS 'Кэш аналитических данных для быстрого доступа';
COMMENT ON COLUMN analytics_cache.cache_key IS 'Уникальный ключ кэша (напр. "income_vs_expenses_2025-10")';
COMMENT ON COLUMN analytics_cache.cache_data IS 'JSON с результатами аналитики';
COMMENT ON COLUMN analytics_cache.hit_count IS 'Счетчик обращений к кэшу';

CREATE INDEX idx_analytics_cache_workspace ON analytics_cache(workspace_id);
CREATE INDEX idx_analytics_cache_key ON analytics_cache(workspace_id, cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_analytics_cache_type ON analytics_cache(cache_type);

-- ============================================================
-- 2. REPORTS - Генерируемые отчёты
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
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
-- 3. ML_FORECASTS - ML прогнозы
-- ============================================================
CREATE TABLE IF NOT EXISTS ml_forecasts (
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
-- 4. CHART_CONFIGS - Сохранённые настройки графиков
-- ============================================================
CREATE TABLE IF NOT EXISTS chart_configs (
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
-- 5. CATEGORY_ANALYTICS - Аналитика по категориям
-- ============================================================
CREATE TABLE IF NOT EXISTS category_analytics (
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
-- 6. SPENDING_PATTERNS - Паттерны расходов
-- ============================================================
CREATE TABLE IF NOT EXISTS spending_patterns (
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

CREATE INDEX idx_spending_patterns_workspace ON spending_patterns(workspace_id);
CREATE INDEX idx_spending_patterns_user ON spending_patterns(user_id);
CREATE INDEX idx_spending_patterns_type ON spending_patterns(pattern_type);
CREATE INDEX idx_spending_patterns_active ON spending_patterns(is_active) WHERE is_active = true;

-- ============================================================
-- 7. Функции для аналитики
-- ============================================================

-- 7.1 Получить статистику доходов/расходов за период
CREATE OR REPLACE FUNCTION get_income_expense_stats(
    p_workspace_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'income', COALESCE((
            SELECT json_build_object(
                'total', SUM(amount),
                'count', COUNT(*),
                'avg', AVG(amount),
                'max', MAX(amount),
                'min', MIN(amount)
            )
            FROM income
            WHERE workspace_id = p_workspace_id
              AND date BETWEEN p_start_date AND p_end_date
        ), '{"total": 0, "count": 0, "avg": 0, "max": 0, "min": 0}'::json),
        'expenses', COALESCE((
            SELECT json_build_object(
                'total', SUM(amount),
                'count', COUNT(*),
                'avg', AVG(amount),
                'max', MAX(amount),
                'min', MIN(amount)
            )
            FROM expenses
            WHERE workspace_id = p_workspace_id
              AND date BETWEEN p_start_date AND p_end_date
        ), '{"total": 0, "count": 0, "avg": 0, "max": 0, "min": 0}'::json),
        'balance', COALESCE((
            SELECT SUM(amount) FROM income WHERE workspace_id = p_workspace_id AND date <= p_end_date
        ), 0) - COALESCE((
            SELECT SUM(amount) FROM expenses WHERE workspace_id = p_workspace_id AND date <= p_end_date
        ), 0),
        'period', json_build_object(
            'start', p_start_date,
            'end', p_end_date,
            'days', p_end_date - p_start_date + 1
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_income_expense_stats IS 'Получить агрегированную статистику за период';

-- 7.2 Получить топ категорий расходов
CREATE OR REPLACE FUNCTION get_top_expense_categories(
    p_workspace_id INTEGER,
    p_start_date DATE,
    p_end_date DATE,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    category VARCHAR,
    total_amount DECIMAL,
    transaction_count BIGINT,
    avg_amount DECIMAL,
    percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH totals AS (
        SELECT SUM(amount) as total_expenses
        FROM expenses
        WHERE workspace_id = p_workspace_id
          AND date BETWEEN p_start_date AND p_end_date
    )
    SELECT 
        e.category,
        SUM(e.amount)::DECIMAL(12,2),
        COUNT(*)::BIGINT,
        AVG(e.amount)::DECIMAL(12,2),
        (SUM(e.amount) / t.total_expenses * 100)::DECIMAL(5,2)
    FROM expenses e
    CROSS JOIN totals t
    WHERE e.workspace_id = p_workspace_id
      AND e.date BETWEEN p_start_date AND p_end_date
    GROUP BY e.category, t.total_expenses
    ORDER BY SUM(e.amount) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_top_expense_categories IS 'Получить топ категорий расходов с процентами';

-- 7.3 Построить данные для line chart (доходы vs расходы)
CREATE OR REPLACE FUNCTION get_income_expense_chart_data(
    p_workspace_id INTEGER,
    p_start_date DATE,
    p_end_date DATE,
    p_group_by VARCHAR DEFAULT 'month' -- 'day', 'week', 'month'
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_date_trunc VARCHAR;
BEGIN
    -- Определяем функцию группировки
    v_date_trunc := CASE p_group_by
        WHEN 'day' THEN 'day'
        WHEN 'week' THEN 'week'
        ELSE 'month'
    END;
    
    -- Собираем данные
    WITH date_series AS (
        SELECT generate_series(
            date_trunc(v_date_trunc, p_start_date::timestamp),
            date_trunc(v_date_trunc, p_end_date::timestamp),
            ('1 ' || v_date_trunc)::interval
        )::date as period_date
    ),
    income_data AS (
        SELECT 
            date_trunc(v_date_trunc, date)::date as period_date,
            SUM(amount) as total_income
        FROM income
        WHERE workspace_id = p_workspace_id
          AND date BETWEEN p_start_date AND p_end_date
        GROUP BY date_trunc(v_date_trunc, date)
    ),
    expense_data AS (
        SELECT 
            date_trunc(v_date_trunc, date)::date as period_date,
            SUM(amount) as total_expenses
        FROM expenses
        WHERE workspace_id = p_workspace_id
          AND date BETWEEN p_start_date AND p_end_date
        GROUP BY date_trunc(v_date_trunc, date)
    )
    SELECT json_build_object(
        'labels', json_agg(to_char(ds.period_date, 'DD.MM.YYYY') ORDER BY ds.period_date),
        'datasets', json_build_array(
            json_build_object(
                'label', 'Доходы',
                'data', (SELECT json_agg(COALESCE(i.total_income, 0) ORDER BY ds.period_date) 
                         FROM date_series ds2 
                         LEFT JOIN income_data i ON ds2.period_date = i.period_date
                         WHERE ds2.period_date IN (SELECT period_date FROM date_series)),
                'borderColor', 'rgb(34, 197, 94)',
                'backgroundColor', 'rgba(34, 197, 94, 0.1)'
            ),
            json_build_object(
                'label', 'Расходы',
                'data', (SELECT json_agg(COALESCE(e.total_expenses, 0) ORDER BY ds.period_date) 
                         FROM date_series ds2 
                         LEFT JOIN expense_data e ON ds2.period_date = e.period_date
                         WHERE ds2.period_date IN (SELECT period_date FROM date_series)),
                'borderColor', 'rgb(239, 68, 68)',
                'backgroundColor', 'rgba(239, 68, 68, 0.1)'
            )
        )
    ) INTO v_result
    FROM date_series ds
    LEFT JOIN income_data i ON ds.period_date = i.period_date
    LEFT JOIN expense_data e ON ds.period_date = e.period_date
    GROUP BY NULL;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_income_expense_chart_data IS 'Получить данные для Chart.js линейного графика';

-- 7.4 Построить данные для pie chart (категории)
CREATE OR REPLACE FUNCTION get_category_pie_chart_data(
    p_workspace_id INTEGER,
    p_start_date DATE,
    p_end_date DATE,
    p_top_n INTEGER DEFAULT 10
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH category_totals AS (
        SELECT 
            category,
            SUM(amount) as total
        FROM expenses
        WHERE workspace_id = p_workspace_id
          AND date BETWEEN p_start_date AND p_end_date
        GROUP BY category
        ORDER BY total DESC
        LIMIT p_top_n
    )
    SELECT json_build_object(
        'labels', json_agg(category ORDER BY total DESC),
        'datasets', json_build_array(
            json_build_object(
                'label', 'Расходы по категориям',
                'data', json_agg(total ORDER BY total DESC),
                'backgroundColor', json_build_array(
                    'rgb(239, 68, 68)',
                    'rgb(34, 197, 94)',
                    'rgb(59, 130, 246)',
                    'rgb(234, 179, 8)',
                    'rgb(168, 85, 247)',
                    'rgb(236, 72, 153)',
                    'rgb(20, 184, 166)',
                    'rgb(249, 115, 22)',
                    'rgb(156, 163, 175)',
                    'rgb(14, 165, 233)'
                )
            )
        )
    ) INTO v_result
    FROM category_totals;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_category_pie_chart_data IS 'Получить данные для Chart.js круговой диаграммы';

-- 7.5 Обновить кэш аналитики
CREATE OR REPLACE FUNCTION update_analytics_cache(
    p_workspace_id INTEGER,
    p_cache_key VARCHAR,
    p_cache_type VARCHAR,
    p_cache_data JSONB,
    p_ttl_hours INTEGER DEFAULT 24
) RETURNS VOID AS $$
BEGIN
    INSERT INTO analytics_cache (
        workspace_id,
        cache_key,
        cache_type,
        cache_data,
        expires_at
    ) VALUES (
        p_workspace_id,
        p_cache_key,
        p_cache_type,
        p_cache_data,
        CURRENT_TIMESTAMP + (p_ttl_hours || ' hours')::interval
    )
    ON CONFLICT (workspace_id, cache_key) 
    DO UPDATE SET
        cache_data = EXCLUDED.cache_data,
        expires_at = EXCLUDED.expires_at,
        updated_at = CURRENT_TIMESTAMP,
        hit_count = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_analytics_cache IS 'Обновить или создать кэш аналитики';

-- 7.6 Получить данные из кэша
CREATE OR REPLACE FUNCTION get_cached_analytics(
    p_workspace_id INTEGER,
    p_cache_key VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_data JSONB;
BEGIN
    -- Получаем данные и увеличиваем счетчик
    UPDATE analytics_cache
    SET hit_count = hit_count + 1
    WHERE workspace_id = p_workspace_id
      AND cache_key = p_cache_key
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    RETURNING cache_data INTO v_data;
    
    RETURN v_data;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_cached_analytics IS 'Получить данные из кэша с увеличением счетчика';

-- 7.7 Очистить устаревший кэш
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM analytics_cache
    WHERE expires_at IS NOT NULL 
      AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_cache IS 'Удалить устаревшие записи кэша';

-- ============================================================
-- 8. Триггеры для автоматического обновления
-- ============================================================

-- 8.1 Инвалидировать кэш при изменении транзакций
CREATE OR REPLACE FUNCTION invalidate_analytics_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Удаляем весь кэш для данного workspace
    DELETE FROM analytics_cache
    WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invalidate_cache_on_income
    AFTER INSERT OR UPDATE OR DELETE ON income
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_analytics_cache();

CREATE TRIGGER trigger_invalidate_cache_on_expenses
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_analytics_cache();

-- 8.2 Автоматически заполнять actual_value в прогнозах
CREATE OR REPLACE FUNCTION update_forecast_actual_value()
RETURNS VOID AS $$
BEGIN
    -- Обновляем фактические значения для прошедших месяцев
    UPDATE ml_forecasts mf
    SET 
        actual_value = (
            CASE mf.forecast_type
                WHEN 'income' THEN (
                    SELECT SUM(amount) 
                    FROM income 
                    WHERE workspace_id = mf.workspace_id 
                      AND date_trunc('month', date) = mf.target_month
                )
                WHEN 'expenses' THEN (
                    SELECT SUM(amount) 
                    FROM expenses 
                    WHERE workspace_id = mf.workspace_id 
                      AND date_trunc('month', date) = mf.target_month
                )
                ELSE NULL
            END
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE mf.target_month < date_trunc('month', CURRENT_DATE)
      AND mf.actual_value IS NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_forecast_actual_value IS 'Обновить фактические значения в прогнозах';

-- ============================================================
-- 9. Планировщик задач (через pg_cron или n8n)
-- ============================================================

-- Примечание: эти задачи будут выполняться через n8n workflows
-- Оставляем здесь как документацию

-- TASK 1: Очистка устаревшего кэша (каждый час)
-- SELECT cleanup_expired_cache();

-- TASK 2: Обновление фактических значений прогнозов (ежедневно)
-- SELECT update_forecast_actual_value();

-- TASK 3: Обновление category_analytics (ежедневно)
-- См. отдельный workflow

-- ============================================================
-- Migration Complete! 🎉
-- ============================================================

SELECT 
    'Analytics & Reports Migration v2.4.0 completed successfully!' as status,
    COUNT(*) as analytics_tables_created
FROM information_schema.tables
WHERE table_name IN (
    'analytics_cache',
    'reports',
    'ml_forecasts',
    'chart_configs',
    'category_analytics',
    'spending_patterns'
);
