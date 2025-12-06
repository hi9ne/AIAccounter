-- =============================================
-- AIAccounter Migration: Functions
-- Target: Frankfurt (eu-central-1)
-- =============================================

-- 1. update_updated_at_column - базовая функция для триггеров
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- 2. calculate_reverse_rate - автоматический расчёт обратного курса
CREATE OR REPLACE FUNCTION public.calculate_reverse_rate()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    reverse_rate DECIMAL(20, 10);
    existing_id UUID;
BEGIN
    -- Вычисляем обратный курс
    reverse_rate := 1.0 / NEW.rate;
    
    -- Проверяем, существует ли уже обратный курс
    SELECT id INTO existing_id 
    FROM exchange_rates 
    WHERE from_currency = NEW.to_currency 
      AND to_currency = NEW.from_currency
      AND date = NEW.date
      AND source = NEW.source || '_REVERSE';
    
    IF existing_id IS NOT NULL THEN
        -- Обновляем существующий
        UPDATE exchange_rates 
        SET rate = reverse_rate, updated_at = NOW()
        WHERE id = existing_id;
    ELSE
        -- Создаём новый
        INSERT INTO exchange_rates (from_currency, to_currency, rate, date, source)
        VALUES (NEW.to_currency, NEW.from_currency, reverse_rate, NEW.date, NEW.source || '_REVERSE');
    END IF;
    
    RETURN NEW;
END;
$function$;

-- 3. convert_amount - конвертация валют
CREATE OR REPLACE FUNCTION public.convert_amount(
    p_amount DECIMAL,
    p_from_currency TEXT,
    p_to_currency TEXT,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $function$
DECLARE
    v_rate DECIMAL;
    v_result DECIMAL;
BEGIN
    -- Если валюты одинаковые
    IF p_from_currency = p_to_currency THEN
        RETURN p_amount;
    END IF;
    
    -- Ищем прямой курс
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_from_currency
      AND to_currency = p_to_currency
      AND date <= p_date
    ORDER BY date DESC
    LIMIT 1;
    
    IF v_rate IS NOT NULL THEN
        RETURN p_amount * v_rate;
    END IF;
    
    -- Ищем обратный курс
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_to_currency
      AND to_currency = p_from_currency
      AND date <= p_date
    ORDER BY date DESC
    LIMIT 1;
    
    IF v_rate IS NOT NULL THEN
        RETURN p_amount / v_rate;
    END IF;
    
    -- Курс не найден
    RETURN NULL;
END;
$function$;

-- 4. get_exchange_rate - получить курс валюты
CREATE OR REPLACE FUNCTION public.get_exchange_rate(
    p_from_currency TEXT,
    p_to_currency TEXT,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $function$
DECLARE
    v_rate DECIMAL;
BEGIN
    IF p_from_currency = p_to_currency THEN
        RETURN 1.0;
    END IF;
    
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_from_currency
      AND to_currency = p_to_currency
      AND date <= p_date
    ORDER BY date DESC
    LIMIT 1;
    
    RETURN v_rate;
END;
$function$;

-- 5. process_gamification_on_transaction - обработка геймификации
CREATE OR REPLACE FUNCTION public.process_gamification_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id UUID;
    v_xp_amount INT := 10; -- базовый XP за транзакцию
    v_current_streak INT;
    v_last_activity DATE;
BEGIN
    -- Получаем user_id из транзакции
    v_user_id := NEW.user_id;
    
    -- Обновляем или создаём запись геймификации
    INSERT INTO user_gamification (user_id, total_xp, current_streak, last_activity_date)
    VALUES (v_user_id, v_xp_amount, 1, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
        total_xp = user_gamification.total_xp + v_xp_amount,
        last_activity_date = CURRENT_DATE,
        current_streak = CASE 
            WHEN user_gamification.last_activity_date = CURRENT_DATE - INTERVAL '1 day' 
            THEN user_gamification.current_streak + 1
            WHEN user_gamification.last_activity_date = CURRENT_DATE 
            THEN user_gamification.current_streak
            ELSE 1
        END,
        longest_streak = GREATEST(
            user_gamification.longest_streak,
            CASE 
                WHEN user_gamification.last_activity_date = CURRENT_DATE - INTERVAL '1 day' 
                THEN user_gamification.current_streak + 1
                ELSE user_gamification.current_streak
            END
        );
    
    -- Записываем в историю XP
    INSERT INTO xp_history (user_id, amount, source, description)
    VALUES (v_user_id, v_xp_amount, TG_TABLE_NAME, 'Новая транзакция');
    
    RETURN NEW;
END;
$function$;

-- 6. update_user_activity - обновление активности пользователя
CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE users 
    SET last_activity = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$function$;

-- 7. cleanup_embeddings_on_delete - очистка эмбеддингов при soft delete
CREATE OR REPLACE FUNCTION public.cleanup_embeddings_on_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- При soft delete удаляем связанные эмбеддинги
    DELETE FROM transaction_embeddings 
    WHERE transaction_id = NEW.id 
      AND transaction_type = TG_TABLE_NAME;
    RETURN NEW;
END;
$function$;

-- 8. check_budget_alerts - проверка превышения бюджета
CREATE OR REPLACE FUNCTION public.check_budget_alerts(p_user_id UUID)
RETURNS TABLE(
    budget_id UUID,
    category_id UUID,
    category_name TEXT,
    budget_amount DECIMAL,
    spent_amount DECIMAL,
    percentage INT,
    alert_type TEXT
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as budget_id,
        b.category_id,
        c.name as category_name,
        b.amount as budget_amount,
        COALESCE(SUM(e.amount), 0) as spent_amount,
        CASE WHEN b.amount > 0 
            THEN (COALESCE(SUM(e.amount), 0) / b.amount * 100)::INT 
            ELSE 0 
        END as percentage,
        CASE 
            WHEN COALESCE(SUM(e.amount), 0) >= b.amount THEN 'exceeded'
            WHEN COALESCE(SUM(e.amount), 0) >= b.amount * 0.9 THEN 'warning'
            WHEN COALESCE(SUM(e.amount), 0) >= b.amount * 0.75 THEN 'approaching'
            ELSE 'ok'
        END as alert_type
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    LEFT JOIN expenses e ON e.category_id = b.category_id 
        AND e.user_id = b.user_id
        AND e.deleted_at IS NULL
        AND e.date >= b.start_date
        AND e.date <= COALESCE(b.end_date, CURRENT_DATE)
    WHERE b.user_id = p_user_id
      AND b.is_active = true
    GROUP BY b.id, b.category_id, c.name, b.amount;
END;
$function$;

-- 9. save_onboarding_answer - сохранение ответов онбординга
CREATE OR REPLACE FUNCTION public.save_onboarding_answer(
    p_user_id UUID,
    p_question_key TEXT,
    p_answer JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO user_preferences (user_id, preferences)
    VALUES (p_user_id, jsonb_build_object('onboarding', jsonb_build_object(p_question_key, p_answer)))
    ON CONFLICT (user_id) DO UPDATE SET
        preferences = jsonb_set(
            COALESCE(user_preferences.preferences, '{}'::jsonb),
            ARRAY['onboarding', p_question_key],
            p_answer
        ),
        updated_at = NOW();
END;
$function$;

-- 10. update_spending_patterns - анализ паттернов расходов
CREATE OR REPLACE FUNCTION public.update_spending_patterns(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
DECLARE
    v_patterns JSONB;
BEGIN
    -- Собираем паттерны расходов
    SELECT jsonb_build_object(
        'by_category', (
            SELECT jsonb_agg(jsonb_build_object(
                'category_id', category_id,
                'total', total,
                'count', cnt,
                'avg', avg_amount
            ))
            FROM (
                SELECT 
                    e.category_id,
                    SUM(e.amount) as total,
                    COUNT(*) as cnt,
                    AVG(e.amount) as avg_amount
                FROM expenses e
                WHERE e.user_id = p_user_id
                  AND e.deleted_at IS NULL
                  AND e.date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY e.category_id
            ) sub
        ),
        'by_day_of_week', (
            SELECT jsonb_agg(jsonb_build_object(
                'day', day_of_week,
                'total', total
            ))
            FROM (
                SELECT 
                    EXTRACT(DOW FROM e.date) as day_of_week,
                    SUM(e.amount) as total
                FROM expenses e
                WHERE e.user_id = p_user_id
                  AND e.deleted_at IS NULL
                  AND e.date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY EXTRACT(DOW FROM e.date)
            ) sub
        ),
        'updated_at', NOW()
    ) INTO v_patterns;
    
    -- Сохраняем в analytics_cache
    INSERT INTO analytics_cache (user_id, cache_key, data, expires_at)
    VALUES (p_user_id, 'spending_patterns', v_patterns, NOW() + INTERVAL '1 hour')
    ON CONFLICT (user_id, cache_key) DO UPDATE SET
        data = v_patterns,
        expires_at = NOW() + INTERVAL '1 hour',
        updated_at = NOW();
END;
$function$;

-- 11. process_recurring_payment - обработка регулярного платежа
CREATE OR REPLACE FUNCTION public.process_recurring_payment(p_recurring_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $function$
DECLARE
    v_recurring recurring_payments%ROWTYPE;
    v_new_expense_id UUID;
    v_next_date DATE;
BEGIN
    -- Получаем данные регулярного платежа
    SELECT * INTO v_recurring FROM recurring_payments WHERE id = p_recurring_id;
    
    IF v_recurring IS NULL THEN
        RAISE EXCEPTION 'Recurring payment not found';
    END IF;
    
    -- Создаём расход
    INSERT INTO expenses (user_id, category_id, amount, currency, description, date, recurring_id)
    VALUES (
        v_recurring.user_id,
        v_recurring.category_id,
        v_recurring.amount,
        v_recurring.currency,
        v_recurring.description,
        COALESCE(v_recurring.next_payment_date, CURRENT_DATE),
        v_recurring.id
    )
    RETURNING id INTO v_new_expense_id;
    
    -- Вычисляем следующую дату
    v_next_date := CASE v_recurring.frequency
        WHEN 'daily' THEN v_recurring.next_payment_date + INTERVAL '1 day'
        WHEN 'weekly' THEN v_recurring.next_payment_date + INTERVAL '1 week'
        WHEN 'monthly' THEN v_recurring.next_payment_date + INTERVAL '1 month'
        WHEN 'yearly' THEN v_recurring.next_payment_date + INTERVAL '1 year'
        ELSE v_recurring.next_payment_date + INTERVAL '1 month'
    END;
    
    -- Обновляем recurring payment
    UPDATE recurring_payments SET
        next_payment_date = v_next_date,
        last_processed_at = NOW()
    WHERE id = p_recurring_id;
    
    RETURN v_new_expense_id;
END;
$function$;

-- 12. get_dashboard_stats - статистика для дашборда
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
    p_user_id UUID,
    p_start_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_expenses', COALESCE((
            SELECT SUM(amount) FROM expenses 
            WHERE user_id = p_user_id 
              AND deleted_at IS NULL
              AND date BETWEEN p_start_date AND p_end_date
        ), 0),
        'total_income', COALESCE((
            SELECT SUM(amount) FROM income 
            WHERE user_id = p_user_id 
              AND deleted_at IS NULL
              AND date BETWEEN p_start_date AND p_end_date
        ), 0),
        'expense_count', COALESCE((
            SELECT COUNT(*) FROM expenses 
            WHERE user_id = p_user_id 
              AND deleted_at IS NULL
              AND date BETWEEN p_start_date AND p_end_date
        ), 0),
        'income_count', COALESCE((
            SELECT COUNT(*) FROM income 
            WHERE user_id = p_user_id 
              AND deleted_at IS NULL
              AND date BETWEEN p_start_date AND p_end_date
        ), 0),
        'top_categories', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'category_id', category_id,
                'category_name', category_name,
                'total', total
            )), '[]'::jsonb)
            FROM (
                SELECT 
                    e.category_id,
                    c.name as category_name,
                    SUM(e.amount) as total
                FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = p_user_id 
                  AND e.deleted_at IS NULL
                  AND e.date BETWEEN p_start_date AND p_end_date
                GROUP BY e.category_id, c.name
                ORDER BY total DESC
                LIMIT 5
            ) sub
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$function$;

-- 13. get_category_hierarchy - получить иерархию категорий
CREATE OR REPLACE FUNCTION public.get_category_hierarchy(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    icon TEXT,
    color TEXT,
    type TEXT,
    parent_id UUID,
    level INT,
    path TEXT[]
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH RECURSIVE category_tree AS (
        -- Базовый уровень (корневые категории)
        SELECT 
            c.id,
            c.name,
            c.icon,
            c.color,
            c.type,
            c.parent_id,
            0 as level,
            ARRAY[c.name] as path
        FROM categories c
        WHERE c.parent_id IS NULL
          AND (c.user_id = p_user_id OR c.is_system = true)
        
        UNION ALL
        
        -- Рекурсивная часть
        SELECT 
            c.id,
            c.name,
            c.icon,
            c.color,
            c.type,
            c.parent_id,
            ct.level + 1,
            ct.path || c.name
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.id
        WHERE c.user_id = p_user_id OR c.is_system = true
    )
    SELECT * FROM category_tree ORDER BY path;
END;
$function$;

-- 14. create_notification - создание уведомления
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $function$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$function$;

-- 15. mark_notifications_read - пометить уведомления прочитанными
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INT;
BEGIN
    IF p_notification_ids IS NULL THEN
        UPDATE notifications SET read_at = NOW()
        WHERE user_id = p_user_id AND read_at IS NULL;
    ELSE
        UPDATE notifications SET read_at = NOW()
        WHERE user_id = p_user_id 
          AND id = ANY(p_notification_ids)
          AND read_at IS NULL;
    END IF;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$function$;

-- 16. get_user_achievements_progress - прогресс достижений
CREATE OR REPLACE FUNCTION public.get_user_achievements_progress(p_user_id UUID)
RETURNS TABLE(
    achievement_id UUID,
    code TEXT,
    name TEXT,
    description TEXT,
    icon TEXT,
    xp_reward INT,
    current_progress INT,
    target_progress INT,
    is_unlocked BOOLEAN,
    unlocked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as achievement_id,
        a.code,
        a.name,
        a.description,
        a.icon,
        a.xp_reward,
        COALESCE(ua.progress, 0) as current_progress,
        a.target as target_progress,
        ua.unlocked_at IS NOT NULL as is_unlocked,
        ua.unlocked_at
    FROM achievements a
    LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = p_user_id
    ORDER BY 
        ua.unlocked_at IS NOT NULL DESC,
        COALESCE(ua.progress, 0)::FLOAT / NULLIF(a.target, 0) DESC,
        a.name;
END;
$function$;

-- 17. update_achievement_progress - обновление прогресса достижения
CREATE OR REPLACE FUNCTION public.update_achievement_progress(
    p_user_id UUID,
    p_achievement_code TEXT,
    p_increment INT DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $function$
DECLARE
    v_achievement achievements%ROWTYPE;
    v_current_progress INT;
    v_was_unlocked BOOLEAN;
BEGIN
    -- Получаем достижение
    SELECT * INTO v_achievement FROM achievements WHERE code = p_achievement_code;
    
    IF v_achievement IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Проверяем текущий прогресс
    SELECT progress, unlocked_at IS NOT NULL 
    INTO v_current_progress, v_was_unlocked
    FROM user_achievements 
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
    
    -- Если уже разблокировано, ничего не делаем
    IF v_was_unlocked THEN
        RETURN FALSE;
    END IF;
    
    -- Обновляем или создаём прогресс
    INSERT INTO user_achievements (user_id, achievement_id, progress)
    VALUES (p_user_id, v_achievement.id, p_increment)
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        progress = user_achievements.progress + p_increment,
        unlocked_at = CASE 
            WHEN user_achievements.progress + p_increment >= v_achievement.target 
            THEN NOW() 
            ELSE NULL 
        END;
    
    -- Проверяем, было ли разблокировано сейчас
    SELECT unlocked_at IS NOT NULL INTO v_was_unlocked
    FROM user_achievements 
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
    
    -- Если разблокировано, начисляем XP
    IF v_was_unlocked THEN
        UPDATE user_gamification SET
            total_xp = total_xp + v_achievement.xp_reward
        WHERE user_id = p_user_id;
        
        INSERT INTO xp_history (user_id, amount, source, description)
        VALUES (p_user_id, v_achievement.xp_reward, 'achievement', v_achievement.name);
        
        -- Создаём уведомление
        PERFORM create_notification(
            p_user_id,
            'achievement',
            'Достижение разблокировано!',
            v_achievement.name,
            jsonb_build_object('achievement_id', v_achievement.id, 'xp_reward', v_achievement.xp_reward)
        );
    END IF;
    
    RETURN v_was_unlocked;
END;
$function$;

-- 18. generate_daily_quests - генерация ежедневных квестов
CREATE OR REPLACE FUNCTION public.generate_daily_quests(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
DECLARE
    v_quest_templates JSONB[] := ARRAY[
        '{"type": "add_expense", "target": 3, "xp": 15, "title": "Записать 3 расхода"}'::jsonb,
        '{"type": "add_income", "target": 1, "xp": 10, "title": "Записать доход"}'::jsonb,
        '{"type": "check_budget", "target": 1, "xp": 10, "title": "Проверить бюджет"}'::jsonb,
        '{"type": "categorize", "target": 5, "xp": 20, "title": "Категоризировать 5 транзакций"}'::jsonb
    ];
    v_selected JSONB;
BEGIN
    -- Удаляем старые невыполненные квесты
    DELETE FROM daily_quests 
    WHERE user_id = p_user_id 
      AND created_at < CURRENT_DATE
      AND completed_at IS NULL;
    
    -- Проверяем, есть ли уже квесты на сегодня
    IF EXISTS (SELECT 1 FROM daily_quests WHERE user_id = p_user_id AND created_at >= CURRENT_DATE) THEN
        RETURN;
    END IF;
    
    -- Выбираем случайные 3 квеста
    FOR i IN 1..3 LOOP
        v_selected := v_quest_templates[1 + floor(random() * array_length(v_quest_templates, 1))::int];
        
        INSERT INTO daily_quests (user_id, quest_type, title, target, xp_reward)
        VALUES (
            p_user_id,
            v_selected->>'type',
            v_selected->>'title',
            (v_selected->>'target')::int,
            (v_selected->>'xp')::int
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$function$;

-- 19. complete_daily_quest - завершение квеста
CREATE OR REPLACE FUNCTION public.complete_daily_quest(
    p_user_id UUID,
    p_quest_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $function$
DECLARE
    v_quest daily_quests%ROWTYPE;
BEGIN
    SELECT * INTO v_quest FROM daily_quests 
    WHERE id = p_quest_id AND user_id = p_user_id;
    
    IF v_quest IS NULL OR v_quest.completed_at IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Помечаем выполненным
    UPDATE daily_quests SET
        completed_at = NOW(),
        progress = target
    WHERE id = p_quest_id;
    
    -- Начисляем XP
    UPDATE user_gamification SET
        total_xp = total_xp + v_quest.xp_reward
    WHERE user_id = p_user_id;
    
    INSERT INTO xp_history (user_id, amount, source, description)
    VALUES (p_user_id, v_quest.xp_reward, 'quest', v_quest.title);
    
    RETURN TRUE;
END;
$function$;

-- 20. get_financial_summary - финансовая сводка
CREATE OR REPLACE FUNCTION public.get_financial_summary(
    p_user_id UUID,
    p_currency TEXT DEFAULT 'RUB'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'current_month', jsonb_build_object(
            'income', COALESCE((
                SELECT SUM(amount) FROM income 
                WHERE user_id = p_user_id 
                  AND deleted_at IS NULL
                  AND date >= DATE_TRUNC('month', CURRENT_DATE)
            ), 0),
            'expenses', COALESCE((
                SELECT SUM(amount) FROM expenses 
                WHERE user_id = p_user_id 
                  AND deleted_at IS NULL
                  AND date >= DATE_TRUNC('month', CURRENT_DATE)
            ), 0)
        ),
        'previous_month', jsonb_build_object(
            'income', COALESCE((
                SELECT SUM(amount) FROM income 
                WHERE user_id = p_user_id 
                  AND deleted_at IS NULL
                  AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                  AND date < DATE_TRUNC('month', CURRENT_DATE)
            ), 0),
            'expenses', COALESCE((
                SELECT SUM(amount) FROM expenses 
                WHERE user_id = p_user_id 
                  AND deleted_at IS NULL
                  AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                  AND date < DATE_TRUNC('month', CURRENT_DATE)
            ), 0)
        ),
        'savings_goals', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', sg.id,
                'name', sg.name,
                'target', sg.target_amount,
                'current', sg.current_amount,
                'progress', CASE WHEN sg.target_amount > 0 
                    THEN (sg.current_amount / sg.target_amount * 100)::INT 
                    ELSE 0 END
            )), '[]'::jsonb)
            FROM savings_goals sg
            WHERE sg.user_id = p_user_id AND sg.status = 'active'
        ),
        'currency', p_currency
    ) INTO v_result;
    
    RETURN v_result;
END;
$function$;

-- Грантим права на выполнение функций
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

SELECT 'Functions created successfully' as status;
