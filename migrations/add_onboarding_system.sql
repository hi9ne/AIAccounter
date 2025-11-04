-- Система онбординга и профиля пользователя
-- Обязательная анкета перед использованием сервиса

-- 1. Добавляем колонки онбординга в существующую таблицу users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS usage_type VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS occupation VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Кыргызстан',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Bishkek',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS registration_source VARCHAR(50) DEFAULT 'telegram';

-- Для существующих пользователей устанавливаем onboarding_completed = TRUE
-- чтобы они могли продолжить пользоваться системой
UPDATE users 
SET onboarding_completed = TRUE,
    onboarding_completed_at = CURRENT_TIMESTAMP
WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;

-- 2. Создаем таблицу для хранения ответов на анкету
CREATE TABLE IF NOT EXISTS user_onboarding_answers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    question_key VARCHAR(100) NOT NULL,
    answer_value TEXT NOT NULL,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_key)
);

-- 3. Функция проверки завершенности онбординга
CREATE OR REPLACE FUNCTION check_onboarding_completed(p_user_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_completed BOOLEAN;
BEGIN
    SELECT onboarding_completed INTO v_completed
    FROM users
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_completed, FALSE);
END;
$$ LANGUAGE plpgsql;

-- 4. Функция получения текущего шага онбординга
CREATE OR REPLACE FUNCTION get_onboarding_step(p_user_id BIGINT)
RETURNS TABLE (
    step_number INTEGER,
    step_name VARCHAR(50),
    completed BOOLEAN,
    next_question TEXT
) AS $$
DECLARE
    v_step INTEGER;
    v_completed BOOLEAN;
    v_step_name VARCHAR(50);
BEGIN
    -- Получаем или создаем пользователя
    INSERT INTO users (user_id, onboarding_started_at)
    VALUES (p_user_id, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT onboarding_step, onboarding_completed
    INTO v_step, v_completed
    FROM users
    WHERE user_id = p_user_id;
    
    -- Определяем название шага
    v_step_name := CASE v_step
        WHEN 0 THEN 'usage_type'
        WHEN 1 THEN 'currency'
        WHEN 2 THEN 'monthly_budget'
        WHEN 3 THEN 'occupation'
        WHEN 4 THEN 'country'
        ELSE 'completed'
    END;
    
    -- Определяем следующий вопрос
    RETURN QUERY SELECT 
        v_step,
        v_step_name,
        v_completed,
        CASE v_step
            WHEN 0 THEN '👋 Добро пожаловать! Для начала работы заполните короткую анкету.\n\n1️⃣ Как вы планируете использовать бота?\n\n💼 Бизнес - для учета расходов компании\n👤 Личные финансы - для личного бюджета\n👨‍💼 Фриланс - учет проектов и клиентов\n👨‍👩‍👧 Семейный бюджет - совместное управление'
            WHEN 1 THEN '2️⃣ В какой валюте вы хотите вести учет?\n\n🇰🇬 Сом (KGS)\n💵 Доллар (USD)\n💶 Евро (EUR)\n₽ Рубль (RUB)\n🇰🇿 Тенге (KZT)'
            WHEN 2 THEN '3️⃣ Какой у вас примерный месячный бюджет? (в выбранной валюте)\n\nНапишите число или выберите:\n• До 30,000\n• 30,000 - 100,000\n• 100,000 - 500,000\n• Более 500,000'
            WHEN 3 THEN '4️⃣ Ваша сфера деятельности / профессия?\n\nНапример: IT, торговля, образование, студент, и т.д.'
            WHEN 4 THEN '5️⃣ В какой стране вы находитесь?\n\n🇰🇬 Кыргызстан\n🇰🇿 Казахстан\n🇷🇺 Россия\n🌍 Другая'
            ELSE '✅ Анкета завершена!'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 5. Функция сохранения ответа на анкету
CREATE OR REPLACE FUNCTION save_onboarding_answer(
    p_user_id BIGINT,
    p_step_name VARCHAR(50),
    p_answer TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    next_step VARCHAR(50),
    step_number INTEGER,
    completed BOOLEAN,
    usage_type VARCHAR(50),
    preferred_currency VARCHAR(3),
    currency_symbol TEXT,
    monthly_budget NUMERIC(12,2),
    occupation VARCHAR(255),
    country VARCHAR(100),
    message TEXT
) AS $$
DECLARE
    v_next_step_num INTEGER;
    v_next_step_name VARCHAR(50);
    v_usage_type VARCHAR(50);
    v_currency VARCHAR(3);
    v_budget NUMERIC(12,2);
    v_occupation VARCHAR(255);
    v_country VARCHAR(100);
BEGIN
    -- Сохраняем ответ в таблицу ответов
    INSERT INTO user_onboarding_answers (user_id, question_key, answer_value)
    VALUES (p_user_id, p_step_name, p_answer)
    ON CONFLICT (user_id, question_key) 
    DO UPDATE SET answer_value = p_answer, answered_at = CURRENT_TIMESTAMP;
    
    -- Обновляем профиль пользователя
    CASE p_step_name
        WHEN 'usage_type' THEN
            UPDATE users SET usage_type = p_answer, onboarding_step = 1 WHERE user_id = p_user_id;
        WHEN 'currency' THEN
            UPDATE users SET preferred_currency = UPPER(p_answer), onboarding_step = 2 WHERE user_id = p_user_id;
        WHEN 'monthly_budget' THEN
            UPDATE users SET monthly_budget = NULLIF(p_answer, 'Не знаю')::NUMERIC, onboarding_step = 3 WHERE user_id = p_user_id;
        WHEN 'occupation' THEN
            UPDATE users SET occupation = p_answer, onboarding_step = 4 WHERE user_id = p_user_id;
        WHEN 'country' THEN
            UPDATE users SET 
                country = p_answer,
                onboarding_step = 5,
                onboarding_completed = TRUE,
                onboarding_completed_at = CURRENT_TIMESTAMP
            WHERE user_id = p_user_id;
    END CASE;
    
    -- Получаем обновленные данные пользователя
    SELECT 
        u.onboarding_step,
        u.onboarding_completed,
        u.usage_type,
        COALESCE(u.preferred_currency, 'KGS'),
        u.monthly_budget,
        u.occupation,
        u.country
    INTO 
        v_next_step_num,
        completed,
        v_usage_type,
        v_currency,
        v_budget,
        v_occupation,
        v_country
    FROM users u
    WHERE u.user_id = p_user_id;
    
    -- Определяем название следующего шага
    v_next_step_name := CASE v_next_step_num
        WHEN 1 THEN 'currency'
        WHEN 2 THEN 'monthly_budget'
        WHEN 3 THEN 'occupation'
        WHEN 4 THEN 'country'
        ELSE 'completed'
    END;
    
    RETURN QUERY SELECT 
        TRUE,
        v_next_step_name,
        v_next_step_num,
        COALESCE(completed, FALSE),
        v_usage_type,
        v_currency,
        CASE v_currency
            WHEN 'KGS' THEN 'сом'
            WHEN 'USD' THEN '$'
            WHEN 'EUR' THEN '€'
            WHEN 'RUB' THEN '₽'
            WHEN 'KZT' THEN '₸'
            ELSE 'сом'
        END::TEXT,
        v_budget,
        v_occupation,
        v_country,
        CASE 
            WHEN COALESCE(completed, FALSE) THEN '🎉 Спасибо! Анкета заполнена. Теперь вы можете пользоваться всеми функциями бота!'
            ELSE 'Ответ сохранен. Переходим к следующему вопросу...'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. Функция получения полного профиля пользователя
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id BIGINT)
RETURNS TABLE (
    user_id BIGINT,
    first_name VARCHAR(255),
    usage_type VARCHAR(50),
    preferred_currency VARCHAR(3),
    currency_symbol VARCHAR(10),
    monthly_budget NUMERIC(12,2),
    occupation VARCHAR(255),
    country VARCHAR(100),
    onboarding_completed BOOLEAN,
    onboarding_step VARCHAR(50)
) AS $$
DECLARE
    v_step_num INTEGER;
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.first_name,
        u.usage_type,
        COALESCE(u.preferred_currency, 'KGS') as preferred_currency,
        CASE COALESCE(u.preferred_currency, 'KGS')
            WHEN 'KGS' THEN 'сом'
            WHEN 'USD' THEN '$'
            WHEN 'EUR' THEN '€'
            WHEN 'RUB' THEN '₽'
            WHEN 'KZT' THEN '₸'
            ELSE 'сом'
        END as currency_symbol,
        u.monthly_budget,
        u.occupation,
        u.country,
        COALESCE(u.onboarding_completed, FALSE) as onboarding_completed,
        CASE COALESCE(u.onboarding_step, 0)
            WHEN 0 THEN 'usage_type'
            WHEN 1 THEN 'currency'
            WHEN 2 THEN 'monthly_budget'
            WHEN 3 THEN 'occupation'
            WHEN 4 THEN 'country'
            ELSE 'completed'
        END as onboarding_step
    FROM users u
    WHERE u.user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Создаем пользователя и возвращаем дефолтные значения
        INSERT INTO users (user_id, onboarding_started_at)
        VALUES (p_user_id, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO NOTHING;
        
        RETURN QUERY
        SELECT 
            p_user_id,
            NULL::VARCHAR(255),
            NULL::VARCHAR(50),
            'KGS'::VARCHAR(3),
            'сом'::VARCHAR(10),
            NULL::NUMERIC(12,2),
            NULL::VARCHAR(255),
            'Кыргызстан'::VARCHAR(100),
            FALSE,
            'usage_type'::VARCHAR(50);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Функция сброса онбординга (для редактирования профиля)
CREATE OR REPLACE FUNCTION reset_onboarding(p_user_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users SET
        onboarding_step = 0,
        onboarding_completed = FALSE
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Индексы
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_answers_user_id ON user_onboarding_answers(user_id);

-- 9. Миграция существующих пользователей
INSERT INTO users (user_id, onboarding_completed, preferred_currency)
SELECT DISTINCT 
    user_id,
    TRUE, -- существующие пользователи считаются завершившими онбординг
    'KGS'
FROM expenses
WHERE user_id NOT IN (SELECT user_id FROM users)
GROUP BY user_id
ON CONFLICT (user_id) 
DO UPDATE SET onboarding_completed = TRUE, preferred_currency = 'KGS';

-- 10. Комментарии
COMMENT ON TABLE users IS 'Профили пользователей с системой онбординга';
COMMENT ON TABLE user_onboarding_answers IS 'История ответов на анкету онбординга';
COMMENT ON COLUMN users.onboarding_completed IS 'Флаг завершения обязательной анкеты';
COMMENT ON COLUMN users.usage_type IS 'Тип использования: personal, business, freelance, family';
COMMENT ON FUNCTION check_onboarding_completed IS 'Проверить, завершил ли пользователь онбординг';
COMMENT ON FUNCTION get_onboarding_step IS 'Получить текущий шаг анкеты и следующий вопрос';
COMMENT ON FUNCTION save_onboarding_answer IS 'Сохранить ответ на вопрос анкеты';

SELECT 'Миграция онбординга завершена ✅' as status;