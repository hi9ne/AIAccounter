-- Обновление текстов вопросов онбординга (более красивые и понятные)

DROP FUNCTION IF EXISTS get_onboarding_step(BIGINT);

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
    
    -- Определяем следующий вопрос с красивым форматированием
    RETURN QUERY SELECT 
        v_step,
        v_step_name,
        v_completed,
        CASE v_step
            WHEN 0 THEN E'👋 Добро пожаловать в AI Financer!\n\n📋 Для начала заполните короткую анкету (займет 1 минуту)\n\n1️⃣ Для чего вы будете использовать бота?\n\nВыберите подходящий вариант:'
            WHEN 1 THEN E'2️⃣ В какой валюте вы хотите вести учёт?\n\n💱 Выберите валюту по умолчанию:'
            WHEN 2 THEN E'3️⃣ Какой у вас примерный месячный бюджет?\n\n💵 Введите сумму или выберите диапазон:'
            WHEN 3 THEN E'4️⃣ Чем вы занимаетесь?\n\n👔 Укажите вашу сферу деятельности или профессию:'
            WHEN 4 THEN E'5️⃣ В какой стране вы находитесь?\n\n🌍 Последний вопрос:'
            ELSE '✅ Анкета завершена!'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

SELECT 'Тексты вопросов обновлены ✅' as status;
