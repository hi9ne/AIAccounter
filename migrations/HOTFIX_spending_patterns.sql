-- ============================================================
-- HOTFIX: Add missing spending_patterns table
-- Date: 2025-10-31
-- Issue: Table was missing from initial migration run
-- ============================================================

-- Drop if exists (for clean reinstall)
DROP TABLE IF EXISTS spending_patterns CASCADE;

-- Create spending_patterns table
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

CREATE INDEX idx_spending_patterns_workspace ON spending_patterns(workspace_id);
CREATE INDEX idx_spending_patterns_user ON spending_patterns(user_id);
CREATE INDEX idx_spending_patterns_type ON spending_patterns(pattern_type);
CREATE INDEX idx_spending_patterns_active ON spending_patterns(is_active) WHERE is_active = true;

-- Verify
SELECT 'spending_patterns table created successfully!' as status,
       COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'spending_patterns';
