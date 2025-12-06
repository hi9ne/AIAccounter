-- =====================================================
-- AIAccounter Database Schema Migration
-- Target: Frankfurt (eu-central-1)
-- Step 1: Create all tables
-- =====================================================

-- 1. USERS TABLE (основная таблица)
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    telegram_chat_id BIGINT UNIQUE NOT NULL,
    language_code VARCHAR(10) DEFAULT 'ru',
    is_active BOOLEAN DEFAULT true,
    registered_date TIMESTAMP DEFAULT now(),
    last_activity TIMESTAMP DEFAULT now(),
    preferred_currency VARCHAR(10) DEFAULT 'KGS',
    usage_type VARCHAR(50),
    monthly_budget NUMERIC,
    occupation VARCHAR(255),
    country VARCHAR(100) DEFAULT 'Кыргызстан',
    timezone VARCHAR(50) DEFAULT 'Asia/Bishkek',
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    onboarding_started_at TIMESTAMPTZ,
    onboarding_completed_at TIMESTAMPTZ,
    registration_source VARCHAR(50) DEFAULT 'telegram'
);
COMMENT ON TABLE users IS 'Профили пользователей с системой онбординга';

-- 2. INCOME TABLE
CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    description TEXT,
    operation_type VARCHAR(50) DEFAULT 'доход',
    source VARCHAR(50) DEFAULT 'telegram',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    currency VARCHAR(10) DEFAULT 'KGS' CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB')),
    deleted_at TIMESTAMP,
    deleted_by INTEGER
);

-- 3. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    description TEXT,
    operation_type VARCHAR(50) DEFAULT 'расход',
    source VARCHAR(50) DEFAULT 'telegram',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    currency VARCHAR(10) DEFAULT 'KGS' CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB')),
    deleted_at TIMESTAMP,
    deleted_by INTEGER
);

-- 4. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    month VARCHAR(20) NOT NULL,
    budget_amount NUMERIC NOT NULL CHECK (budget_amount >= 0),
    last_updated TIMESTAMP DEFAULT now(),
    currency VARCHAR(10) DEFAULT 'KGS'
);

-- 5. EXCHANGE_RATES TABLE
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    from_currency VARCHAR(10) NOT NULL CHECK (from_currency IN ('KGS', 'USD', 'EUR', 'RUB')),
    to_currency VARCHAR(10) NOT NULL CHECK (to_currency IN ('KGS', 'USD', 'EUR', 'RUB')),
    rate NUMERIC NOT NULL CHECK (rate > 0),
    source VARCHAR(50) DEFAULT 'NBKR',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 6. RECURRING_PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS recurring_payments (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'KGS' CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB')),
    category VARCHAR(100) NOT NULL,
    description TEXT,
    transaction_type VARCHAR(20) DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'income')),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    interval_value INTEGER DEFAULT 1 CHECK (interval_value > 0),
    start_date DATE NOT NULL,
    end_date DATE,
    next_payment_date DATE NOT NULL,
    last_payment_date DATE,
    remind_days_before INTEGER DEFAULT 3 CHECK (remind_days_before >= 0),
    auto_create BOOLEAN DEFAULT false,
    last_reminder_sent_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    last_executed_at TIMESTAMP,
    total_executions INTEGER DEFAULT 0
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('budget_warning', 'budget_exceeded', 'limit_warning', 'limit_exceeded', 'recurring_reminder', 'unusual_spending', 'weekly_report', 'monthly_summary', 'custom')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_transaction_id INTEGER,
    related_recurring_id INTEGER REFERENCES recurring_payments(id),
    related_category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    metadata JSONB
);

-- 8. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. USER_PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'ru',
    timezone VARCHAR(50) DEFAULT 'Asia/Bishkek',
    notification_settings JSONB DEFAULT '{"push": true, "email": false, "telegram": true}'::jsonb,
    ui_preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    budget_alert_80_sent TIMESTAMP,
    budget_alert_100_sent TIMESTAMP
);

-- 10. ANALYTICS_CACHE TABLE
CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL,
    cache_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- 11. N8N_CHAT_HISTORIES TABLE
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    message JSONB NOT NULL
);

-- 12. SAVED_REPORTS TABLE
CREATE TABLE IF NOT EXISTS saved_reports (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    report_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    pdf_url TEXT,
    format VARCHAR(20) DEFAULT 'pdf',
    report_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

-- 13. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
    icon VARCHAR(20) DEFAULT '📁',
    color VARCHAR(20) DEFAULT '#6B7280',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. DEBTS TABLE
CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    person_name VARCHAR(255) NOT NULL,
    debt_type VARCHAR(20) NOT NULL CHECK (debt_type IN ('given', 'received')),
    original_amount NUMERIC NOT NULL CHECK (original_amount > 0),
    remaining_amount NUMERIC NOT NULL CHECK (remaining_amount >= 0),
    currency VARCHAR(10) DEFAULT 'KGS' CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB')),
    description TEXT,
    created_at TIMESTAMP DEFAULT now(),
    due_date DATE,
    is_settled BOOLEAN DEFAULT false,
    settled_at TIMESTAMP,
    remind_before_days INTEGER DEFAULT 3 CHECK (remind_before_days >= 0),
    last_reminder_sent_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT now()
);

-- 15. DEBT_PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS debt_payments (
    id SERIAL PRIMARY KEY,
    debt_id INTEGER NOT NULL REFERENCES debts(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_date DATE DEFAULT CURRENT_DATE,
    note TEXT,
    related_transaction_id INTEGER,
    created_at TIMESTAMP DEFAULT now()
);

-- 16. AI_INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS ai_insights (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- 17. ACHIEVEMENTS TABLE (справочник)
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    name_ky VARCHAR(255),
    description TEXT,
    description_en TEXT,
    description_ky TEXT,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(20) DEFAULT '🏆',
    xp_reward INTEGER DEFAULT 0,
    rarity VARCHAR(20) DEFAULT 'common',
    condition_type VARCHAR(50) NOT NULL,
    condition_value INTEGER DEFAULT 1,
    condition_extra JSONB,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

-- 18. USER_GAMIFICATION TABLE
CREATE TABLE IF NOT EXISTS user_gamification (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id),
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    grace_used_this_month BOOLEAN DEFAULT false,
    total_transactions INTEGER DEFAULT 0,
    total_achievements INTEGER DEFAULT 0,
    notifications_enabled BOOLEAN DEFAULT true,
    show_on_home BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 19. USER_ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    achievement_id VARCHAR(50) NOT NULL REFERENCES achievements(id),
    progress INTEGER DEFAULT 0,
    max_progress INTEGER DEFAULT 1,
    unlocked_at TIMESTAMP,
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

-- 20. DAILY_QUESTS TABLE
CREATE TABLE IF NOT EXISTS daily_quests (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    quest_date DATE DEFAULT CURRENT_DATE,
    quests JSONB DEFAULT '[]'::jsonb,
    all_completed BOOLEAN DEFAULT false,
    bonus_claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

-- 21. XP_HISTORY TABLE
CREATE TABLE IF NOT EXISTS xp_history (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    amount INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT now()
);

-- 22. SAVINGS_GOALS TABLE
CREATE TABLE IF NOT EXISTS savings_goals (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_amount DOUBLE PRECISION NOT NULL,
    current_amount DOUBLE PRECISION DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'KGS',
    icon VARCHAR(20) DEFAULT '🎯',
    color VARCHAR(20) DEFAULT '#6366F1',
    deadline DATE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    auto_contribute BOOLEAN DEFAULT false,
    auto_contribute_percent DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. GOAL_CONTRIBUTIONS TABLE
CREATE TABLE IF NOT EXISTS goal_contributions (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES savings_goals(id),
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    amount DOUBLE PRECISION NOT NULL,
    type VARCHAR(20) DEFAULT 'deposit',
    note TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES for better performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_income_user_date ON income(user_id, date);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(date);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);

CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON recurring_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next_date ON recurring_payments(next_payment_date);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(is_sent);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_settled ON debts(is_settled);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_user_id ON xp_history(user_id);

CREATE INDEX IF NOT EXISTS idx_n8n_session ON n8n_chat_histories(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);

-- =====================================================
-- Enable RLS on all tables
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
