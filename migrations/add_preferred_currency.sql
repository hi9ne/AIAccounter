-- Добавление поля preferred_currency для хранения предпочитаемой валюты пользователя
-- Это позволит пользователям выбирать валюту отображения в настройках Mini App

-- 1. Добавляем колонку preferred_currency в таблицу users (если она есть)
-- Если таблица users не существует, создадим её
DO $$
BEGIN
    -- Проверяем существование таблицы users
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        -- Создаем таблицу users
        CREATE TABLE users (
            id BIGINT PRIMARY KEY,
            telegram_user_id BIGINT UNIQUE NOT NULL,
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            username VARCHAR(255),
            preferred_currency VARCHAR(3) DEFAULT 'KGS',
            language_code VARCHAR(10) DEFAULT 'ru',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE 'Таблица users создана';
    ELSE
        -- Добавляем колонку, если таблица существует, но колонки нет
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'preferred_currency'
        ) THEN
            ALTER TABLE users ADD COLUMN preferred_currency VARCHAR(3) DEFAULT 'KGS';
            RAISE NOTICE 'Колонка preferred_currency добавлена в таблицу users';
        ELSE
            RAISE NOTICE 'Колонка preferred_currency уже существует';
        END IF;
    END IF;
END $$;

-- 2. Создаем или обновляем функцию для получения настроек пользователя
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id BIGINT)
RETURNS TABLE (
    user_id BIGINT,
    preferred_currency VARCHAR(3),
    currency_symbol TEXT,
    language_code VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.telegram_user_id,
        COALESCE(u.preferred_currency, 'KGS') as preferred_currency,
        CASE COALESCE(u.preferred_currency, 'KGS')
            WHEN 'KGS' THEN 'сом'
            WHEN 'USD' THEN '$'
            WHEN 'EUR' THEN '€'
            WHEN 'RUB' THEN '₽'
            WHEN 'KZT' THEN '₸'
            ELSE 'сом'
        END as currency_symbol,
        COALESCE(u.language_code, 'ru') as language_code
    FROM users u
    WHERE u.telegram_user_id = p_user_id
    LIMIT 1;
    
    -- Если пользователь не найден, возвращаем настройки по умолчанию
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            p_user_id,
            'KGS'::VARCHAR(3),
            'сом'::TEXT,
            'ru'::VARCHAR(10);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Создаем функцию для обновления валюты пользователя
CREATE OR REPLACE FUNCTION update_user_currency(
    p_user_id BIGINT,
    p_currency VARCHAR(3)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Проверяем, существует ли пользователь
    SELECT EXISTS(
        SELECT 1 FROM users WHERE telegram_user_id = p_user_id
    ) INTO v_exists;
    
    IF v_exists THEN
        -- Обновляем существующего пользователя
        UPDATE users 
        SET preferred_currency = UPPER(p_currency),
            updated_at = CURRENT_TIMESTAMP
        WHERE telegram_user_id = p_user_id;
    ELSE
        -- Создаем нового пользователя
        INSERT INTO users (telegram_user_id, preferred_currency, id)
        VALUES (p_user_id, UPPER(p_currency), p_user_id)
        ON CONFLICT (telegram_user_id) 
        DO UPDATE SET 
            preferred_currency = UPPER(p_currency),
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. Создаем функцию форматирования суммы с валютой пользователя
CREATE OR REPLACE FUNCTION format_amount_with_currency(
    p_amount NUMERIC,
    p_user_id BIGINT
)
RETURNS TEXT AS $$
DECLARE
    v_currency VARCHAR(3);
    v_symbol TEXT;
BEGIN
    -- Получаем настройки пользователя
    SELECT preferred_currency, currency_symbol
    INTO v_currency, v_symbol
    FROM get_user_settings(p_user_id);
    
    -- Форматируем сумму
    RETURN ROUND(p_amount)::TEXT || ' ' || v_symbol;
END;
$$ LANGUAGE plpgsql;

-- 5. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_users_preferred_currency ON users(preferred_currency);

-- 6. Устанавливаем валюту по умолчанию для существующих пользователей (KGS = сом)
-- Получаем уникальных пользователей из expenses и создаем записи в users
INSERT INTO users (id, telegram_user_id, preferred_currency, created_at)
SELECT DISTINCT 
    user_id,
    user_id,
    'KGS',
    CURRENT_TIMESTAMP
FROM expenses
WHERE user_id NOT IN (SELECT telegram_user_id FROM users)
ON CONFLICT (telegram_user_id) DO NOTHING;

-- То же для income
INSERT INTO users (id, telegram_user_id, preferred_currency, created_at)
SELECT DISTINCT 
    user_id,
    user_id,
    'KGS',
    CURRENT_TIMESTAMP
FROM income
WHERE user_id NOT IN (SELECT telegram_user_id FROM users)
ON CONFLICT (telegram_user_id) DO NOTHING;

-- 7. Комментарии для документации
COMMENT ON COLUMN users.preferred_currency IS 'Предпочитаемая валюта пользователя для отображения (KGS, USD, EUR, RUB, KZT)';
COMMENT ON FUNCTION get_user_settings IS 'Получить настройки пользователя включая валюту и её символ';
COMMENT ON FUNCTION update_user_currency IS 'Обновить предпочитаемую валюту пользователя';
COMMENT ON FUNCTION format_amount_with_currency IS 'Отформатировать сумму с валютой пользователя';

-- Вывод информации
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    RAISE NOTICE 'Миграция завершена. Пользователей в системе: %', user_count;
END $$;
