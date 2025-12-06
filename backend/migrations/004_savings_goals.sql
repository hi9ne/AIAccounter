-- Migration: Create Savings Goals tables
-- Version: 1.4
-- Date: 2024-12-06

-- Таблица целей накоплений
CREATE TABLE IF NOT EXISTS savings_goals (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Основная информация
    name VARCHAR(100) NOT NULL,
    description TEXT,
    target_amount FLOAT NOT NULL,
    current_amount FLOAT DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'KGS',
    
    -- Визуализация
    icon VARCHAR(10) DEFAULT '🎯',
    color VARCHAR(7) DEFAULT '#6366F1',
    
    -- Сроки
    deadline DATE,
    
    -- Статус
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Настройки авто-отчислений
    auto_contribute BOOLEAN DEFAULT FALSE,
    auto_contribute_percent FLOAT,
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица истории пополнений
CREATE TABLE IF NOT EXISTS goal_contributions (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    amount FLOAT NOT NULL,
    type VARCHAR(20) DEFAULT 'deposit', -- deposit, withdraw
    note TEXT,
    source VARCHAR(20) DEFAULT 'manual', -- manual, auto, telegram
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_active ON savings_goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_id ON goal_contributions(user_id);

-- Комментарии
COMMENT ON TABLE savings_goals IS 'Цели накоплений пользователей';
COMMENT ON TABLE goal_contributions IS 'История пополнений и снятий с целей';
COMMENT ON COLUMN savings_goals.auto_contribute IS 'Автоматическое отчисление процента от доходов';
COMMENT ON COLUMN savings_goals.auto_contribute_percent IS 'Процент от дохода для авто-отчисления';
