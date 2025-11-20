-- Миграция для добавления таблицы истории чата Reports Agent
-- Дата: 20.11.2025
-- Описание: Создаем таблицу для хранения истории разговоров с Reports Agent

-- Проверяем что таблица еще не существует
DO $$
BEGIN
    -- Создаем таблицу n8n_chat_histories_reports если её нет
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'n8n_chat_histories_reports') THEN
        CREATE TABLE n8n_chat_histories_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Создаем индексы
        CREATE INDEX idx_reports_chat_session_id ON n8n_chat_histories_reports(session_id);
        CREATE INDEX idx_reports_chat_created_at ON n8n_chat_histories_reports(created_at);
        
        RAISE NOTICE 'Таблица n8n_chat_histories_reports успешно создана';
    ELSE
        RAISE NOTICE 'Таблица n8n_chat_histories_reports уже существует, пропускаем создание';
    END IF;
END
$$;

-- Комментарии к таблице
COMMENT ON TABLE n8n_chat_histories_reports IS 'История чата с Reports Agent для генерации PDF отчетов';
COMMENT ON COLUMN n8n_chat_histories_reports.id IS 'Уникальный идентификатор записи';
COMMENT ON COLUMN n8n_chat_histories_reports.session_id IS 'ID сессии (обычно user_id из Telegram)';
COMMENT ON COLUMN n8n_chat_histories_reports.type IS 'Тип сообщения: human или ai';
COMMENT ON COLUMN n8n_chat_histories_reports.content IS 'Содержимое сообщения';
COMMENT ON COLUMN n8n_chat_histories_reports.created_at IS 'Дата и время создания записи';

