-- Исправление типов данных в get_user_profile
-- Меняем TEXT на VARCHAR для совместимости с n8n

DROP FUNCTION IF EXISTS get_user_profile(BIGINT);

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
        END::VARCHAR(10) as currency_symbol,
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
        END::VARCHAR(50) as onboarding_step
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

SELECT 'Функция get_user_profile пересоздана с правильными типами ✅' as status;
