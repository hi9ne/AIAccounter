-- Hotfix: убираем updated_at из функций онбординга

DROP FUNCTION IF EXISTS save_onboarding_answer(BIGINT, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS reset_onboarding(BIGINT);

-- Пересоздаем save_onboarding_answer без updated_at
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
    currency_symbol VARCHAR(10),
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
        END::VARCHAR(10),
        v_budget,
        v_occupation,
        v_country,
        CASE 
            WHEN COALESCE(completed, FALSE) THEN '🎉 Спасибо! Анкета заполнена. Теперь вы можете пользоваться всеми функциями бота!'
            ELSE 'Ответ сохранен. Переходим к следующему вопросу...'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Пересоздаем reset_onboarding без updated_at
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

SELECT 'Функции обновлены: убран updated_at ✅' as status;
