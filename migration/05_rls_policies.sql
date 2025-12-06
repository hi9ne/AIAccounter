-- =============================================
-- AIAccounter Migration: RLS Policies
-- Target: Frankfurt (eu-central-1)
-- =============================================

-- Включаем RLS для всех таблиц
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_embeddings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ANALYTICS_CACHE
-- =============================================
CREATE POLICY "analytics_cache_delete_policy" ON analytics_cache
    FOR DELETE TO public USING (true);

CREATE POLICY "analytics_cache_insert_policy" ON analytics_cache
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "analytics_cache_select_policy" ON analytics_cache
    FOR SELECT TO public USING (true);

CREATE POLICY "analytics_cache_update_policy" ON analytics_cache
    FOR UPDATE TO public USING (true);

-- =============================================
-- AUDIT_LOGS
-- =============================================
CREATE POLICY "audit_logs_insert_policy" ON audit_logs
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "audit_logs_select_policy" ON audit_logs
    FOR SELECT TO public USING (true);

-- =============================================
-- BUDGETS
-- =============================================
CREATE POLICY "budgets_delete_policy" ON budgets
    FOR DELETE TO public USING (true);

CREATE POLICY "budgets_insert_policy" ON budgets
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "budgets_select_policy" ON budgets
    FOR SELECT TO public USING (true);

CREATE POLICY "budgets_update_policy" ON budgets
    FOR UPDATE TO public USING (true);

-- =============================================
-- CATEGORIES
-- =============================================
CREATE POLICY "categories_delete_policy" ON categories
    FOR DELETE TO public USING (true);

CREATE POLICY "categories_insert_policy" ON categories
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "categories_select_policy" ON categories
    FOR SELECT TO public USING (true);

CREATE POLICY "categories_update_policy" ON categories
    FOR UPDATE TO public USING (true);

-- =============================================
-- EXCHANGE_RATES
-- =============================================
CREATE POLICY "exchange_rates_delete_policy" ON exchange_rates
    FOR DELETE TO public USING (true);

CREATE POLICY "exchange_rates_insert_policy" ON exchange_rates
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "exchange_rates_select_policy" ON exchange_rates
    FOR SELECT TO public USING (true);

CREATE POLICY "exchange_rates_update_policy" ON exchange_rates
    FOR UPDATE TO public USING (true);

-- =============================================
-- EXPENSES
-- =============================================
CREATE POLICY "expenses_delete_policy" ON expenses
    FOR DELETE TO public USING (true);

CREATE POLICY "expenses_insert_policy" ON expenses
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "expenses_select_policy" ON expenses
    FOR SELECT TO public USING (true);

CREATE POLICY "expenses_update_policy" ON expenses
    FOR UPDATE TO public USING (true);

-- =============================================
-- INCOME
-- =============================================
CREATE POLICY "income_delete_policy" ON income
    FOR DELETE TO public USING (true);

CREATE POLICY "income_insert_policy" ON income
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "income_select_policy" ON income
    FOR SELECT TO public USING (true);

CREATE POLICY "income_update_policy" ON income
    FOR UPDATE TO public USING (true);

-- =============================================
-- N8N_CHAT_HISTORIES
-- =============================================
CREATE POLICY "n8n_chat_histories_delete_policy" ON n8n_chat_histories
    FOR DELETE TO public USING (true);

CREATE POLICY "n8n_chat_histories_insert_policy" ON n8n_chat_histories
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "n8n_chat_histories_select_policy" ON n8n_chat_histories
    FOR SELECT TO public USING (true);

CREATE POLICY "n8n_chat_histories_update_policy" ON n8n_chat_histories
    FOR UPDATE TO public USING (true);

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE POLICY "notifications_delete_policy" ON notifications
    FOR DELETE TO public USING (true);

CREATE POLICY "notifications_insert_policy" ON notifications
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "notifications_select_policy" ON notifications
    FOR SELECT TO public USING (true);

CREATE POLICY "notifications_update_policy" ON notifications
    FOR UPDATE TO public USING (true);

-- =============================================
-- RECURRING_PAYMENTS
-- =============================================
CREATE POLICY "recurring_payments_delete_policy" ON recurring_payments
    FOR DELETE TO public USING (true);

CREATE POLICY "recurring_payments_insert_policy" ON recurring_payments
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "recurring_payments_select_policy" ON recurring_payments
    FOR SELECT TO public USING (true);

CREATE POLICY "recurring_payments_update_policy" ON recurring_payments
    FOR UPDATE TO public USING (true);

-- =============================================
-- SAVED_REPORTS
-- =============================================
CREATE POLICY "saved_reports_delete_policy" ON saved_reports
    FOR DELETE TO public USING (true);

CREATE POLICY "saved_reports_insert_policy" ON saved_reports
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "saved_reports_select_policy" ON saved_reports
    FOR SELECT TO public USING (true);

CREATE POLICY "saved_reports_update_policy" ON saved_reports
    FOR UPDATE TO public USING (true);

-- =============================================
-- USER_PREFERENCES
-- =============================================
CREATE POLICY "user_preferences_delete_policy" ON user_preferences
    FOR DELETE TO public USING (true);

CREATE POLICY "user_preferences_insert_policy" ON user_preferences
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "user_preferences_select_policy" ON user_preferences
    FOR SELECT TO public USING (true);

CREATE POLICY "user_preferences_update_policy" ON user_preferences
    FOR UPDATE TO public USING (true);

-- =============================================
-- USERS
-- =============================================
CREATE POLICY "users_delete_policy" ON users
    FOR DELETE TO public USING (true);

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "users_select_policy" ON users
    FOR SELECT TO public USING (true);

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE TO public USING (true);

-- =============================================
-- ACHIEVEMENTS
-- =============================================
CREATE POLICY "achievements_select_policy" ON achievements
    FOR SELECT TO public USING (true);

-- =============================================
-- USER_ACHIEVEMENTS
-- =============================================
CREATE POLICY "user_achievements_all_policy" ON user_achievements
    FOR ALL TO public USING (true);

-- =============================================
-- USER_GAMIFICATION
-- =============================================
CREATE POLICY "user_gamification_all_policy" ON user_gamification
    FOR ALL TO public USING (true);

-- =============================================
-- XP_HISTORY
-- =============================================
CREATE POLICY "xp_history_all_policy" ON xp_history
    FOR ALL TO public USING (true);

-- =============================================
-- DAILY_QUESTS
-- =============================================
CREATE POLICY "daily_quests_all_policy" ON daily_quests
    FOR ALL TO public USING (true);

-- =============================================
-- SAVINGS_GOALS
-- =============================================
CREATE POLICY "savings_goals_all_policy" ON savings_goals
    FOR ALL TO public USING (true);

-- =============================================
-- GOAL_CONTRIBUTIONS
-- =============================================
CREATE POLICY "goal_contributions_all_policy" ON goal_contributions
    FOR ALL TO public USING (true);

-- =============================================
-- DEBTS
-- =============================================
CREATE POLICY "debts_all_policy" ON debts
    FOR ALL TO public USING (true);

-- =============================================
-- DEBT_PAYMENTS
-- =============================================
CREATE POLICY "debt_payments_all_policy" ON debt_payments
    FOR ALL TO public USING (true);

-- =============================================
-- TRANSACTION_EMBEDDINGS
-- =============================================
CREATE POLICY "transaction_embeddings_all_policy" ON transaction_embeddings
    FOR ALL TO public USING (true);

SELECT 'RLS Policies created successfully' as status;
