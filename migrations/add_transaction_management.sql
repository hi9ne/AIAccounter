-- =====================================================
-- AI Accounter v2.2.0: Transaction Management
-- Дата: 30 октября 2025
-- Описание: Добавление функционала редактирования и удаления транзакций
-- =====================================================

-- 1. Добавление поддержки soft delete для expenses
-- =====================================================
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by INTEGER DEFAULT NULL;

COMMENT ON COLUMN expenses.deleted_at IS 'Дата и время удаления (soft delete)';
COMMENT ON COLUMN expenses.deleted_by IS 'ID пользователя, удалившего транзакцию';

-- Индекс для фильтрации неудалённых записей
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at) WHERE deleted_at IS NULL;

-- 2. Добавление поддержки soft delete для income
-- =====================================================
ALTER TABLE income 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by INTEGER DEFAULT NULL;

COMMENT ON COLUMN income.deleted_at IS 'Дата и время удаления (soft delete)';
COMMENT ON COLUMN income.deleted_by IS 'ID пользователя, удалившего транзакцию';

-- Индекс для фильтрации неудалённых записей
CREATE INDEX IF NOT EXISTS idx_income_deleted_at ON income(deleted_at) WHERE deleted_at IS NULL;

-- 3. Таблица истории изменений транзакций (audit log)
-- =====================================================
CREATE TABLE IF NOT EXISTS transaction_history (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('expense', 'income')),
    transaction_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'restored')),
    field_changed VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET
);

COMMENT ON TABLE transaction_history IS 'История изменений транзакций (audit log)';
COMMENT ON COLUMN transaction_history.transaction_type IS 'Тип транзакции: expense или income';
COMMENT ON COLUMN transaction_history.transaction_id IS 'ID транзакции в таблице expenses или income';
COMMENT ON COLUMN transaction_history.action IS 'Действие: created, updated, deleted, restored';
COMMENT ON COLUMN transaction_history.field_changed IS 'Изменённое поле (amount, category, etc)';
COMMENT ON COLUMN transaction_history.old_value IS 'Старое значение поля';
COMMENT ON COLUMN transaction_history.new_value IS 'Новое значение поля';
COMMENT ON COLUMN transaction_history.changed_by IS 'Telegram user_id, кто сделал изменение';

-- Индексы для быстрого поиска истории
CREATE INDEX IF NOT EXISTS idx_transaction_history_transaction ON transaction_history(transaction_type, transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_changed_by ON transaction_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_transaction_history_changed_at ON transaction_history(changed_at DESC);

-- 4. View для активных (неудалённых) транзакций
-- =====================================================
CREATE OR REPLACE VIEW v_active_expenses AS
SELECT * FROM expenses WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW v_active_income AS
SELECT * FROM income WHERE deleted_at IS NULL;

COMMENT ON VIEW v_active_expenses IS 'Только активные (неудалённые) расходы';
COMMENT ON VIEW v_active_income IS 'Только активные (неудалённые) доходы';

-- 5. Функция для логирования изменений
-- =====================================================
CREATE OR REPLACE FUNCTION log_transaction_change(
    p_transaction_type VARCHAR(10),
    p_transaction_id INTEGER,
    p_action VARCHAR(20),
    p_field_changed VARCHAR(50),
    p_old_value TEXT,
    p_new_value TEXT,
    p_changed_by INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_history_id INTEGER;
BEGIN
    INSERT INTO transaction_history (
        transaction_type,
        transaction_id,
        action,
        field_changed,
        old_value,
        new_value,
        changed_by
    ) VALUES (
        p_transaction_type,
        p_transaction_id,
        p_action,
        p_field_changed,
        p_old_value,
        p_new_value,
        p_changed_by
    )
    RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_transaction_change IS 'Логирует изменения транзакций в transaction_history';

-- 6. Функция поиска последней транзакции пользователя
-- =====================================================
CREATE OR REPLACE FUNCTION get_last_transaction(
    p_user_id INTEGER,
    p_transaction_type VARCHAR(10) DEFAULT 'expense'
)
RETURNS INTEGER AS $$
DECLARE
    v_transaction_id INTEGER;
BEGIN
    IF p_transaction_type = 'expense' THEN
        SELECT e.id INTO v_transaction_id
        FROM expenses e
        WHERE e.user_id = p_user_id 
          AND e.deleted_at IS NULL
        ORDER BY e.date DESC, e.id DESC
        LIMIT 1;
    ELSIF p_transaction_type = 'income' THEN
        SELECT i.id INTO v_transaction_id
        FROM income i
        WHERE i.user_id = p_user_id 
          AND i.deleted_at IS NULL
        ORDER BY i.date DESC, i.id DESC
        LIMIT 1;
    ELSE
        RAISE EXCEPTION 'Invalid transaction_type: %', p_transaction_type;
    END IF;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_last_transaction IS 'Получает последнюю транзакцию пользователя (неудалённую)';

-- 7. Функция поиска транзакции по сумме
-- =====================================================
CREATE OR REPLACE FUNCTION find_transaction_by_amount(
    p_user_id INTEGER,
    p_amount NUMERIC,
    p_transaction_type VARCHAR(10) DEFAULT 'expense'
)
RETURNS TABLE (
    id INTEGER,
    amount NUMERIC,
    category VARCHAR,
    description TEXT,
    date TIMESTAMP,
    currency VARCHAR(3)
) AS $$
BEGIN
    IF p_transaction_type = 'expense' THEN
        RETURN QUERY
        SELECT e.id, e.amount, e.category, e.description, e.date, e.currency
        FROM expenses e
        WHERE e.user_id = p_user_id 
          AND e.amount = p_amount
          AND e.deleted_at IS NULL
        ORDER BY e.date DESC, e.id DESC
        LIMIT 1;
    ELSIF p_transaction_type = 'income' THEN
        RETURN QUERY
        SELECT i.id, i.amount, i.category, i.description, i.date, i.currency
        FROM income i
        WHERE i.user_id = p_user_id 
          AND i.amount = p_amount
          AND i.deleted_at IS NULL
        ORDER BY i.date DESC, i.id DESC
        LIMIT 1;
    ELSE
        RAISE EXCEPTION 'Invalid transaction_type: %', p_transaction_type;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_transaction_by_amount IS 'Ищет транзакцию по сумме (последнюю подходящую)';

-- 8. Проверка существования транзакции
-- =====================================================
CREATE OR REPLACE FUNCTION transaction_exists(
    p_transaction_id INTEGER,
    p_transaction_type VARCHAR(10),
    p_user_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_transaction_type = 'expense' THEN
        SELECT COUNT(*) INTO v_count
        FROM expenses
        WHERE id = p_transaction_id 
          AND user_id = p_user_id
          AND deleted_at IS NULL;
    ELSIF p_transaction_type = 'income' THEN
        SELECT COUNT(*) INTO v_count
        FROM income
        WHERE id = p_transaction_id 
          AND user_id = p_user_id
          AND deleted_at IS NULL;
    ELSE
        RETURN FALSE;
    END IF;
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION transaction_exists IS 'Проверяет, существует ли транзакция и принадлежит ли пользователю';

-- =====================================================
-- Готово! Миграция v2.2.0 завершена
-- =====================================================

-- Проверка созданных объектов:
SELECT 
    'Columns added' as status,
    COUNT(*) as count
FROM information_schema.columns
WHERE table_name IN ('expenses', 'income')
  AND column_name IN ('deleted_at', 'deleted_by');

SELECT 
    'Transaction history table' as status,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_name = 'transaction_history';

SELECT 
    'Functions created' as status,
    COUNT(*) as count
FROM pg_proc
WHERE proname IN (
    'log_transaction_change',
    'get_last_transaction',
    'find_transaction_by_amount',
    'transaction_exists'
);

SELECT 
    'Views created' as status,
    COUNT(*) as count
FROM information_schema.views
WHERE table_name IN ('v_active_expenses', 'v_active_income');
