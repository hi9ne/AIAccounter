-- ============================================================
-- AIAccounter v2.4.0 - Complete Database Setup
-- ============================================================
-- Execute this script in your PostgreSQL database to set up
-- all tables, functions, and indexes required for v2.4.0
-- ============================================================

-- Step 1: Create base tables for transactions (income/expenses)
CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    workspace_id INTEGER,
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KGS',
    category VARCHAR(100),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    workspace_id INTEGER,
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KGS',
    category VARCHAR(100),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_user ON income(user_id);
CREATE INDEX IF NOT EXISTS idx_income_workspace ON income(workspace_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_income_deleted ON income(deleted_at);

CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace ON expenses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted_at);

-- Now run the workspace and analytics migrations
-- Copy content from v2.4.0_workspaces.sql and v2.4.0_analytics.sql here
-- Or run them separately in order:
-- 1. migrations/v2.4.0_workspaces.sql
-- 2. migrations/v2.4.0_analytics.sql
