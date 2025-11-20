-- ================================================
-- RAG Integration для существующей БД AIAccounter
-- ================================================
-- Дата: 20.11.2025
-- Цель: Добавить RAG (embeddings + chat history) к существующим таблицам

-- ================================================
-- 1. ПРОВЕРКА И ВКЛЮЧЕНИЕ РАСШИРЕНИЙ
-- ================================================

-- Векторное хранилище для embeddings (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- UUID для генерации уникальных ID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\echo '✅ Расширения включены'

-- ================================================
-- 2. ВЕКТОРНОЕ ХРАНИЛИЩЕ ДЛЯ EMBEDDINGS (RAG)
-- ================================================

-- Таблица для хранения embeddings расходов (expenses)
CREATE TABLE IF NOT EXISTS expenses_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- Текст для поиска (description + category + amount)
    metadata JSONB, -- Метаданные (user_id, category, amount, currency, date)
    embedding vector(1536), -- OpenAI embeddings (1536 размерность)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для векторного поиска (ivfflat - быстрый approximate search)
CREATE INDEX IF NOT EXISTS idx_expenses_embeddings_vector 
ON expenses_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_expenses_embeddings_metadata 
ON expenses_embeddings USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_expenses_embeddings_expense_id 
ON expenses_embeddings(expense_id);

COMMENT ON TABLE expenses_embeddings IS 'Векторные embeddings для RAG поиска по расходам';

\echo '✅ Таблица expenses_embeddings создана'

-- ================================================

-- Таблица для хранения embeddings доходов (income)
CREATE TABLE IF NOT EXISTS income_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    income_id INTEGER REFERENCES income(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- Текст для поиска
    metadata JSONB, -- Метаданные
    embedding vector(1536), -- OpenAI embeddings (1536 размерность)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для векторного поиска
CREATE INDEX IF NOT EXISTS idx_income_embeddings_vector 
ON income_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_income_embeddings_metadata 
ON income_embeddings USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_income_embeddings_income_id 
ON income_embeddings(income_id);

COMMENT ON TABLE income_embeddings IS 'Векторные embeddings для RAG поиска по доходам';

\echo '✅ Таблица income_embeddings создана'

-- ================================================
-- 3. ТАБЛИЦЫ ДЛЯ ИСТОРИИ AI ЧАТОВ
-- ================================================

-- Таблица для Postgres Chat Memory основного агента
CREATE TABLE IF NOT EXISTS n8n_chat_histories_general (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    message JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_histories_general_session 
ON n8n_chat_histories_general(session_id, created_at DESC);

COMMENT ON TABLE n8n_chat_histories_general IS 'История AI чатов основного агента';

\echo '✅ Таблица n8n_chat_histories_tranzactions создана'

-- ================================================

-- Таблица для Income Agent чатов
CREATE TABLE IF NOT EXISTS n8n_chat_histories_income (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    message JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_histories_income_session 
ON n8n_chat_histories_income(session_id, created_at DESC);

COMMENT ON TABLE n8n_chat_histories_income IS 'История чатов Income Agent';

\echo '✅ Таблица n8n_chat_histories_income создана'

-- ================================================

-- Таблица для Expenses Agent чатов
CREATE TABLE IF NOT EXISTS n8n_chat_histories_expenses (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    message JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_histories_expenses_session 
ON n8n_chat_histories_expenses(session_id, created_at DESC);

COMMENT ON TABLE n8n_chat_histories_expenses IS 'История чатов Expenses Agent';

\echo '✅ Таблица n8n_chat_histories_expenses создана'

-- ================================================
-- 4. ФУНКЦИИ ДЛЯ ВЕКТОРНОГО ПОИСКА (RAG)
-- ================================================

-- Функция поиска похожих расходов по embedding
CREATE OR REPLACE FUNCTION match_expenses_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    filter_user_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    expense_id INTEGER,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        expenses_embeddings.id,
        expenses_embeddings.expense_id,
        expenses_embeddings.content,
        expenses_embeddings.metadata,
        1 - (expenses_embeddings.embedding <=> query_embedding) as similarity
    FROM expenses_embeddings
    WHERE 1 - (expenses_embeddings.embedding <=> query_embedding) > match_threshold
        AND (filter_user_id IS NULL OR (metadata->>'user_id')::BIGINT = filter_user_id)
    ORDER BY expenses_embeddings.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_expenses_documents IS 'RAG поиск похожих расходов по embedding с фильтрацией по user_id';

\echo '✅ Функция match_expenses_documents создана'

-- ================================================

-- Функция поиска похожих доходов по embedding
CREATE OR REPLACE FUNCTION match_income_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    filter_user_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    income_id INTEGER,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        income_embeddings.id,
        income_embeddings.income_id,
        income_embeddings.content,
        income_embeddings.metadata,
        1 - (income_embeddings.embedding <=> query_embedding) as similarity
    FROM income_embeddings
    WHERE 1 - (income_embeddings.embedding <=> query_embedding) > match_threshold
        AND (filter_user_id IS NULL OR (metadata->>'user_id')::BIGINT = filter_user_id)
    ORDER BY income_embeddings.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_income_documents IS 'RAG поиск похожих доходов по embedding с фильтрацией по user_id';

\echo '✅ Функция match_income_documents создана'

-- ================================================
-- 5. ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО СОЗДАНИЯ EMBEDDINGS
-- ================================================

-- Функция для автоматической очистки embeddings при удалении транзакции
CREATE OR REPLACE FUNCTION cleanup_embeddings_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Очищаем только если это soft delete (deleted_at установлен)
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        IF TG_TABLE_NAME = 'expenses' THEN
            DELETE FROM expenses_embeddings WHERE expense_id = NEW.id;
        ELSIF TG_TABLE_NAME = 'income' THEN
            DELETE FROM income_embeddings WHERE income_id = NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для expenses
DROP TRIGGER IF EXISTS cleanup_expenses_embeddings ON expenses;
CREATE TRIGGER cleanup_expenses_embeddings
    AFTER UPDATE ON expenses
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
    EXECUTE FUNCTION cleanup_embeddings_on_delete();

-- Триггер для income
DROP TRIGGER IF EXISTS cleanup_income_embeddings ON income;
CREATE TRIGGER cleanup_income_embeddings
    AFTER UPDATE ON income
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
    EXECUTE FUNCTION cleanup_embeddings_on_delete();

\echo '✅ Триггеры для очистки embeddings созданы'

-- ================================================
-- 6. ПРАВА ДОСТУПА
-- ================================================

-- Даем права на новые таблицы
GRANT ALL ON expenses_embeddings TO authenticated, anon, service_role;
GRANT ALL ON income_embeddings TO authenticated, anon, service_role;
GRANT ALL ON n8n_chat_histories_general TO authenticated, anon, service_role;
GRANT ALL ON n8n_chat_histories_income TO authenticated, anon, service_role;
GRANT ALL ON n8n_chat_histories_expenses TO authenticated, anon, service_role;

-- Даем права на sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- Даем права на функции
GRANT EXECUTE ON FUNCTION match_expenses_documents TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION match_income_documents TO authenticated, anon, service_role;

\echo '✅ Права доступа настроены'

-- ================================================
-- 7. ПРОВЕРКА УСТАНОВКИ
-- ================================================

DO $$
DECLARE
    expenses_count INTEGER;
    income_count INTEGER;
BEGIN
    -- Проверяем что основные таблицы существуют
    SELECT COUNT(*) INTO expenses_count FROM information_schema.tables 
    WHERE table_name = 'expenses';
    
    SELECT COUNT(*) INTO income_count FROM information_schema.tables 
    WHERE table_name = 'income';
    
    IF expenses_count = 0 OR income_count = 0 THEN
        RAISE EXCEPTION 'Основные таблицы expenses/income не найдены! Проверьте БД.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Миграция завершена успешно!';
    RAISE NOTICE '📊 Добавлено:';
    RAISE NOTICE '  - expenses_embeddings (векторное хранилище)';
    RAISE NOTICE '  - income_embeddings (векторное хранилище)';
    RAISE NOTICE '  - n8n_chat_histories_general';
    RAISE NOTICE '  - n8n_chat_histories_income';
    RAISE NOTICE '  - n8n_chat_histories_expenses';
    RAISE NOTICE '  - match_expenses_documents() функция';
    RAISE NOTICE '  - match_income_documents() функция';
    RAISE NOTICE '  - Триггеры для автоочистки';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Следующие шаги:';
    RAISE NOTICE '1. Импортируйте обновленные workflows в n8n';
    RAISE NOTICE '2. Выберите свои credentials при импорте';
    RAISE NOTICE '3. Протестируйте через Telegram бота';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Workflows теперь используют:';
    RAISE NOTICE '  - expenses (вместо rashod)';
    RAISE NOTICE '  - income (вместо dohod)';
    RAISE NOTICE '  - Ваши существующие поля: amount, description, date';
END $$;

