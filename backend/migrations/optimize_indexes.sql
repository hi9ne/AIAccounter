-- ═══════════════════════════════════════════════════════════════════════════
-- OPTIMIZATION INDEXES FOR AIAccounter
-- Run this migration to improve query performance
-- ═══════════════════════════════════════════════════════════════════════════

-- Expenses table indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses(user_id, category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_user_date_category ON expenses(user_id, date, category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_description_search ON expenses USING gin(to_tsvector('russian', description)) WHERE deleted_at IS NULL;

-- Income table indexes
CREATE INDEX IF NOT EXISTS idx_income_user_date ON income(user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_income_user_category ON income(user_id, category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_income_user_date_category ON income(user_id, date, category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_income_description_search ON income USING gin(to_tsvector('russian', description)) WHERE deleted_at IS NULL;

-- Exchange rates index for quick lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(from_currency, to_currency, date DESC);

-- Users index for telegram lookup
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_chat_id);

-- Budgets index
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month DESC);

-- Recurring payments index
CREATE INDEX IF NOT EXISTS idx_recurring_user_active ON recurring_payments(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_next_payment ON recurring_payments(next_payment_date) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYZE tables to update statistics
-- ═══════════════════════════════════════════════════════════════════════════
ANALYZE expenses;
ANALYZE income;
ANALYZE exchange_rates;
ANALYZE users;
ANALYZE budgets;
ANALYZE recurring_payments;
