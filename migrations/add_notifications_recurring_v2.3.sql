-- =====================================================
-- AI Accounter v2.3.0: Notifications & Recurring Payments
-- Дата: 31 октября 2025
-- Описание: Система напоминаний, повторяющихся платежей и умных уведомлений
-- =====================================================

-- =====================================================
-- 1. ТАБЛИЦА: recurring_payments (Повторяющиеся платежи)
-- =====================================================

CREATE TABLE IF NOT EXISTS recurring_payments (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    -- Параметры платежа
    title VARCHAR(200) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'KGS',
    category VARCHAR(100) NOT NULL,
    description TEXT,
    transaction_type VARCHAR(10) DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'income')),
    
    -- Периодичность
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    interval_value INTEGER DEFAULT 1 CHECK (interval_value > 0), -- каждые N дней/недель/месяцев
    
    -- Даты
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = бесконечно
    next_payment_date DATE NOT NULL,
    last_payment_date DATE,
    
    -- Напоминания
    remind_days_before INTEGER DEFAULT 3 CHECK (remind_days_before >= 0),
    auto_create BOOLEAN DEFAULT FALSE, -- Автоматически создавать транзакцию
    last_reminder_sent_at TIMESTAMP,
    
    -- Метаданные
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_executed_at TIMESTAMP,
    total_executions INTEGER DEFAULT 0,
    
    -- Ограничения
    CONSTRAINT valid_currency CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB')),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT valid_next_date CHECK (next_payment_date >= start_date)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_recurring_next_payment ON recurring_payments(next_payment_date) 
    WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user_active ON recurring_payments(user_id, is_active);

-- Комментарии
COMMENT ON TABLE recurring_payments IS 'Повторяющиеся платежи: аренда, подписки, зарплаты';
COMMENT ON COLUMN recurring_payments.frequency IS 'Частота: daily, weekly, monthly, yearly';
COMMENT ON COLUMN recurring_payments.interval_value IS 'Каждые N периодов (например, каждые 2 недели)';
COMMENT ON COLUMN recurring_payments.auto_create IS 'Автоматически создавать транзакцию в день платежа';

-- =====================================================
-- 2. ТАБЛИЦА: notifications (Уведомления)
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    -- Тип уведомления
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'budget_warning',      -- 80% бюджета
        'budget_exceeded',     -- 100% бюджета
        'limit_warning',       -- 80% лимита категории
        'limit_exceeded',      -- 100% лимита
        'recurring_reminder',  -- Напоминание о платеже
        'unusual_spending',    -- Необычная трата
        'weekly_report',       -- Еженедельный отчет
        'monthly_summary',     -- Месячная сводка
        'custom'               -- Произвольное уведомление
    )),
    
    -- Содержимое
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Связанные объекты
    related_transaction_id INTEGER,
    related_recurring_id INTEGER REFERENCES recurring_payments(id) ON DELETE SET NULL,
    related_category VARCHAR(100),
    
    -- Приоритет и статус
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB, -- Дополнительные данные в JSON
    
    -- Проверки
    CONSTRAINT check_sent_at CHECK (is_sent = FALSE OR sent_at IS NOT NULL),
    CONSTRAINT check_read_at CHECK (is_read = FALSE OR read_at IS NOT NULL)
);

-- Индексы для быстрой выборки
CREATE INDEX IF NOT EXISTS idx_notifications_user_unsent ON notifications(user_id, is_sent) 
    WHERE is_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) 
    WHERE is_read = FALSE AND is_sent = TRUE;
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_recurring ON notifications(related_recurring_id) 
    WHERE related_recurring_id IS NOT NULL;

-- Комментарии
COMMENT ON TABLE notifications IS 'Система уведомлений для пользователей';
COMMENT ON COLUMN notifications.metadata IS 'JSON с дополнительными данными (проценты, суммы и т.д.)';

-- =====================================================
-- 3. ТАБЛИЦА: budget_alerts_config (Настройки алертов)
-- =====================================================

CREATE TABLE IF NOT EXISTS budget_alerts_config (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    -- Настройки для бюджета
    budget_alert_enabled BOOLEAN DEFAULT TRUE,
    budget_warning_threshold NUMERIC(5,2) DEFAULT 80.00 CHECK (budget_warning_threshold BETWEEN 0 AND 100),
    budget_critical_threshold NUMERIC(5,2) DEFAULT 100.00 CHECK (budget_critical_threshold BETWEEN 0 AND 200),
    
    -- Настройки для лимитов категорий
    category_alert_enabled BOOLEAN DEFAULT TRUE,
    category_warning_threshold NUMERIC(5,2) DEFAULT 80.00 CHECK (category_warning_threshold BETWEEN 0 AND 100),
    category_critical_threshold NUMERIC(5,2) DEFAULT 100.00 CHECK (category_critical_threshold BETWEEN 0 AND 200),
    
    -- Частота уведомлений
    max_alerts_per_day INTEGER DEFAULT 5 CHECK (max_alerts_per_day > 0),
    quiet_hours_start TIME DEFAULT '23:00',
    quiet_hours_end TIME DEFAULT '08:00',
    
    -- Каналы уведомлений
    telegram_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    email_address VARCHAR(200),
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_user_config UNIQUE(user_id),
    CONSTRAINT valid_email CHECK (email_enabled = FALSE OR email_address IS NOT NULL)
);

-- Комментарии
COMMENT ON TABLE budget_alerts_config IS 'Персональные настройки уведомлений о бюджете';
COMMENT ON COLUMN budget_alerts_config.budget_warning_threshold IS 'Процент бюджета для предупреждения (обычно 80%)';
COMMENT ON COLUMN budget_alerts_config.quiet_hours_start IS 'Начало тихих часов (не слать уведомления)';

-- =====================================================
-- 4. ТАБЛИЦА: spending_patterns (Паттерны трат для ML)
-- =====================================================

CREATE TABLE IF NOT EXISTS spending_patterns (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    category VARCHAR(100) NOT NULL,
    
    -- Статистика трат
    avg_daily_amount NUMERIC(12,2),
    avg_weekly_amount NUMERIC(12,2),
    avg_monthly_amount NUMERIC(12,2),
    
    median_amount NUMERIC(12,2),
    std_deviation NUMERIC(12,2),
    min_amount NUMERIC(12,2),
    max_amount NUMERIC(12,2),
    
    -- Пороги для аномалий
    unusual_threshold NUMERIC(12,2), -- Среднее + 2 * стандартное отклонение
    
    -- Временные паттерны (массивы типичных значений)
    typical_day_of_week INTEGER[], -- [1,2,3,4,5] = пн-пт
    typical_hour_of_day INTEGER[],  -- [9,10,11,12,13] = рабочие часы
    
    -- Периоды анализа
    last_analyzed_at TIMESTAMP,
    data_points_count INTEGER DEFAULT 0,
    analysis_period_days INTEGER DEFAULT 90, -- За сколько дней анализ
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_user_category_pattern UNIQUE(user_id, category)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_spending_patterns_user_category ON spending_patterns(user_id, category);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_analyzed ON spending_patterns(last_analyzed_at);

-- Комментарии
COMMENT ON TABLE spending_patterns IS 'Статистические паттерны трат для детекции аномалий';
COMMENT ON COLUMN spending_patterns.unusual_threshold IS 'Порог необычной траты = avg + 2*stddev';

-- =====================================================
-- ФУНКЦИЯ 1: create_recurring_payment
-- Создание повторяющегося платежа с автоматическим расчетом следующей даты
-- =====================================================

CREATE OR REPLACE FUNCTION create_recurring_payment(
    p_user_id BIGINT,
    p_title VARCHAR(200),
    p_amount NUMERIC,
    p_currency VARCHAR(3),
    p_category VARCHAR(100),
    p_frequency VARCHAR(20),
    p_start_date DATE,
    p_description TEXT DEFAULT NULL,
    p_transaction_type VARCHAR(10) DEFAULT 'expense',
    p_interval_value INTEGER DEFAULT 1,
    p_remind_days INTEGER DEFAULT 3,
    p_auto_create BOOLEAN DEFAULT FALSE
) RETURNS INTEGER AS $$
DECLARE
    v_recurring_id INTEGER;
    v_next_date DATE;
BEGIN
    -- Вычислить next_payment_date на основе frequency
    v_next_date := CASE p_frequency
        WHEN 'daily' THEN p_start_date + (p_interval_value || ' days')::INTERVAL
        WHEN 'weekly' THEN p_start_date + (p_interval_value || ' weeks')::INTERVAL
        WHEN 'monthly' THEN p_start_date + (p_interval_value || ' months')::INTERVAL
        WHEN 'yearly' THEN p_start_date + (p_interval_value || ' years')::INTERVAL
        ELSE p_start_date + INTERVAL '1 month' -- дефолт
    END;
    
    -- Создать recurring payment
    INSERT INTO recurring_payments (
        user_id, title, amount, currency, category, description,
        transaction_type, frequency, interval_value,
        start_date, next_payment_date,
        remind_days_before, auto_create
    ) VALUES (
        p_user_id, p_title, p_amount, p_currency, p_category, p_description,
        p_transaction_type, p_frequency, p_interval_value,
        p_start_date, v_next_date,
        p_remind_days, p_auto_create
    ) RETURNING id INTO v_recurring_id;
    
    -- Создать уведомление о создании
    INSERT INTO notifications (
        user_id, notification_type, title, message,
        related_recurring_id, priority, metadata
    ) VALUES (
        p_user_id,
        'custom',
        '✅ Подписка создана',
        'Создана подписка "' || p_title || '" на ' || p_amount || ' ' || p_currency || 
        ' каждые ' || p_interval_value || ' ' || 
        CASE p_frequency
            WHEN 'daily' THEN 'дн.'
            WHEN 'weekly' THEN 'нед.'
            WHEN 'monthly' THEN 'мес.'
            WHEN 'yearly' THEN 'год'
        END,
        v_recurring_id,
        'normal',
        json_build_object(
            'next_payment', v_next_date,
            'auto_create', p_auto_create
        )::JSONB
    );
    
    RETURN v_recurring_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_recurring_payment IS 'Создает повторяющийся платеж и вычисляет следующую дату';

-- =====================================================
-- ФУНКЦИЯ 2: execute_recurring_payment
-- Выполнение recurring payment и обновление следующей даты
-- =====================================================

CREATE OR REPLACE FUNCTION execute_recurring_payment(p_recurring_id INTEGER)
RETURNS TABLE (
    transaction_id INTEGER,
    next_date DATE,
    message TEXT
) AS $$
DECLARE
    v_recurring RECORD;
    v_next_date DATE;
    v_transaction_id INTEGER;
BEGIN
    -- Получить recurring payment
    SELECT * INTO v_recurring 
    FROM recurring_payments 
    WHERE id = p_recurring_id AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recurring payment % не найден или неактивен', p_recurring_id;
    END IF;
    
    -- Вычислить следующую дату
    v_next_date := CASE v_recurring.frequency
        WHEN 'daily' THEN v_recurring.next_payment_date + (v_recurring.interval_value || ' days')::INTERVAL
        WHEN 'weekly' THEN v_recurring.next_payment_date + (v_recurring.interval_value || ' weeks')::INTERVAL
        WHEN 'monthly' THEN v_recurring.next_payment_date + (v_recurring.interval_value || ' months')::INTERVAL
        WHEN 'yearly' THEN v_recurring.next_payment_date + (v_recurring.interval_value || ' years')::INTERVAL
    END;
    
    -- Если auto_create = true, создать транзакцию
    IF v_recurring.auto_create THEN
        IF v_recurring.transaction_type = 'expense' THEN
            INSERT INTO expenses (
                user_id, amount, currency, category, description, date, operation_type, source
            ) VALUES (
                v_recurring.user_id,
                v_recurring.amount,
                v_recurring.currency,
                v_recurring.category,
                v_recurring.title || ' (автоплатеж)',
                CURRENT_DATE,
                'расход',
                'recurring'
            ) RETURNING id INTO v_transaction_id;
        ELSE
            INSERT INTO income (
                user_id, amount, currency, category, description, date, operation_type, source
            ) VALUES (
                v_recurring.user_id,
                v_recurring.amount,
                v_recurring.currency,
                v_recurring.category,
                v_recurring.title || ' (автоплатеж)',
                CURRENT_DATE,
                'доход',
                'recurring'
            ) RETURNING id INTO v_transaction_id;
        END IF;
        
        -- Создать уведомление о выполнении
        INSERT INTO notifications (
            user_id, notification_type, title, message,
            related_transaction_id, related_recurring_id, priority
        ) VALUES (
            v_recurring.user_id,
            'custom',
            '💰 Автоплатеж выполнен',
            'Создан ' || v_recurring.transaction_type || ' "' || v_recurring.title || '" на сумму ' || 
            v_recurring.amount || ' ' || v_recurring.currency,
            v_transaction_id,
            p_recurring_id,
            'normal'
        );
    END IF;
    
    -- Обновить recurring payment
    UPDATE recurring_payments 
    SET 
        next_payment_date = v_next_date,
        last_payment_date = v_recurring.next_payment_date,
        last_executed_at = NOW(),
        total_executions = total_executions + 1,
        updated_at = NOW()
    WHERE id = p_recurring_id;
    
    -- Проверить, не истек ли срок
    IF v_recurring.end_date IS NOT NULL AND v_next_date > v_recurring.end_date THEN
        UPDATE recurring_payments SET is_active = FALSE WHERE id = p_recurring_id;
        
        INSERT INTO notifications (
            user_id, notification_type, title, message, related_recurring_id, priority
        ) VALUES (
            v_recurring.user_id,
            'custom',
            '🏁 Подписка завершена',
            'Подписка "' || v_recurring.title || '" завершена (достигнута конечная дата)',
            p_recurring_id,
            'normal'
        );
    END IF;
    
    RETURN QUERY SELECT 
        v_transaction_id,
        v_next_date,
        'Платеж выполнен. Следующий: ' || v_next_date::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION execute_recurring_payment IS 'Выполняет recurring payment и обновляет next_payment_date';

-- =====================================================
-- ФУНКЦИЯ 3: get_pending_reminders
-- Получить платежи, требующие напоминания
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE (
    recurring_id INTEGER,
    user_id BIGINT,
    title VARCHAR(200),
    amount NUMERIC,
    currency VARCHAR(3),
    category VARCHAR(100),
    next_payment_date DATE,
    days_until_payment INTEGER,
    auto_create BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.id,
        rp.user_id,
        rp.title,
        rp.amount,
        rp.currency,
        rp.category,
        rp.next_payment_date,
        (rp.next_payment_date - CURRENT_DATE)::INTEGER as days,
        rp.auto_create
    FROM recurring_payments rp
    WHERE rp.is_active = TRUE
      AND (rp.next_payment_date - CURRENT_DATE) <= rp.remind_days_before
      AND (rp.next_payment_date - CURRENT_DATE) >= 0
      -- Не отправлять повторно в тот же день
      AND (rp.last_reminder_sent_at IS NULL OR rp.last_reminder_sent_at::DATE < CURRENT_DATE)
    ORDER BY rp.next_payment_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_reminders IS 'Возвращает recurring payments, требующие напоминания сегодня';

-- =====================================================
-- ФУНКЦИЯ 4: mark_reminder_sent
-- Отметить, что напоминание отправлено
-- =====================================================

CREATE OR REPLACE FUNCTION mark_reminder_sent(p_recurring_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE recurring_payments 
    SET last_reminder_sent_at = NOW()
    WHERE id = p_recurring_id;
    
    -- Создать уведомление
    INSERT INTO notifications (
        user_id, notification_type, title, message,
        related_recurring_id, priority, is_sent, sent_at
    )
    SELECT 
        user_id,
        'recurring_reminder',
        '🔔 Напоминание о платеже',
        '💰 ' || title || ': ' || amount || ' ' || currency || 
        ' через ' || (next_payment_date - CURRENT_DATE)::TEXT || ' дн.',
        id,
        CASE 
            WHEN (next_payment_date - CURRENT_DATE) = 0 THEN 'urgent'
            WHEN (next_payment_date - CURRENT_DATE) = 1 THEN 'high'
            ELSE 'normal'
        END,
        TRUE,
        NOW()
    FROM recurring_payments
    WHERE id = p_recurring_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_reminder_sent IS 'Отмечает, что напоминание о recurring payment отправлено';

-- =====================================================
-- ФУНКЦИЯ 5: check_budget_alerts
-- Проверка превышения бюджета и создание алертов
-- =====================================================

CREATE OR REPLACE FUNCTION check_budget_alerts(
    p_user_id BIGINT,
    p_new_expense_amount NUMERIC DEFAULT 0
)
RETURNS TABLE (
    alert_type VARCHAR(50),
    message TEXT,
    current_spent NUMERIC,
    budget_amount NUMERIC,
    percentage NUMERIC,
    priority VARCHAR(20)
) AS $$
DECLARE
    v_current_spent NUMERIC;
    v_budget NUMERIC;
    v_percentage NUMERIC;
    v_config RECORD;
    v_alert_count INTEGER;
BEGIN
    -- Получить конфиг алертов
    SELECT * INTO v_config 
    FROM budget_alerts_config 
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Использовать дефолтные значения
        v_config.budget_alert_enabled := TRUE;
        v_config.budget_warning_threshold := 80.00;
        v_config.budget_critical_threshold := 100.00;
        v_config.max_alerts_per_day := 5;
    END IF;
    
    -- Проверить, не превышен ли лимит алертов за день
    SELECT COUNT(*) INTO v_alert_count
    FROM notifications
    WHERE user_id = p_user_id
      AND notification_type IN ('budget_warning', 'budget_exceeded')
      AND created_at::DATE = CURRENT_DATE;
    
    IF v_alert_count >= v_config.max_alerts_per_day THEN
        RETURN; -- Достигнут лимит уведомлений
    END IF;
    
    IF NOT v_config.budget_alert_enabled THEN
        RETURN; -- Алерты отключены
    END IF;
    
    -- Получить текущий месячный бюджет
    SELECT budget_amount INTO v_budget
    FROM budgets
    WHERE user_id = p_user_id
      AND month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    LIMIT 1;
    
    IF v_budget IS NULL THEN
        RETURN; -- Нет установленного бюджета
    END IF;
    
    -- Посчитать текущие траты + новый расход
    SELECT COALESCE(SUM(amount), 0) INTO v_current_spent
    FROM expenses
    WHERE user_id = p_user_id
      AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
      AND deleted_at IS NULL;
    
    v_current_spent := v_current_spent + p_new_expense_amount;
    v_percentage := ROUND((v_current_spent / v_budget) * 100, 1);
    
    -- Проверить пороги и вернуть алерт
    IF v_percentage >= v_config.budget_critical_threshold THEN
        RETURN QUERY SELECT 
            'budget_exceeded'::VARCHAR(50),
            '🚨 Бюджет превышен! Потрачено ' || v_percentage || '% (' || 
            v_current_spent || ' из ' || v_budget || ' сом)'::TEXT,
            v_current_spent,
            v_budget,
            v_percentage,
            'urgent'::VARCHAR(20);
            
    ELSIF v_percentage >= v_config.budget_warning_threshold THEN
        RETURN QUERY SELECT 
            'budget_warning'::VARCHAR(50),
            '⚠️ Внимание! Использовано ' || v_percentage || '% бюджета (' || 
            v_current_spent || ' из ' || v_budget || ' сом)'::TEXT,
            v_current_spent,
            v_budget,
            v_percentage,
            'high'::VARCHAR(20);
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_budget_alerts IS 'Проверяет превышение бюджета и возвращает алерты';

-- =====================================================
-- ФУНКЦИЯ 6: check_category_limit_alert
-- Проверка превышения лимита по категории
-- =====================================================

CREATE OR REPLACE FUNCTION check_category_limit_alert(
    p_user_id BIGINT,
    p_category VARCHAR(100),
    p_new_amount NUMERIC DEFAULT 0
)
RETURNS TABLE (
    alert_type VARCHAR(50),
    message TEXT,
    current_spent NUMERIC,
    limit_amount NUMERIC,
    percentage NUMERIC,
    priority VARCHAR(20)
) AS $$
DECLARE
    v_current_spent NUMERIC;
    v_limit NUMERIC;
    v_percentage NUMERIC;
    v_config RECORD;
BEGIN
    -- Получить конфиг
    SELECT * INTO v_config 
    FROM budget_alerts_config 
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        v_config.category_alert_enabled := TRUE;
        v_config.category_warning_threshold := 80.00;
        v_config.category_critical_threshold := 100.00;
    END IF;
    
    IF NOT v_config.category_alert_enabled THEN
        RETURN;
    END IF;
    
    -- Получить лимит категории
    SELECT limit_amount INTO v_limit
    FROM limits
    WHERE user_id = p_user_id
      AND category = p_category
      AND month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    LIMIT 1;
    
    IF v_limit IS NULL THEN
        RETURN; -- Нет лимита
    END IF;
    
    -- Посчитать текущие траты
    SELECT COALESCE(SUM(amount), 0) INTO v_current_spent
    FROM expenses
    WHERE user_id = p_user_id
      AND category = p_category
      AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
      AND deleted_at IS NULL;
    
    v_current_spent := v_current_spent + p_new_amount;
    v_percentage := ROUND((v_current_spent / v_limit) * 100, 1);
    
    -- Проверить пороги
    IF v_percentage >= v_config.category_critical_threshold THEN
        RETURN QUERY SELECT 
            'limit_exceeded'::VARCHAR(50),
            '🚨 Лимит "' || p_category || '" превышен! ' || v_percentage || '% (' || 
            v_current_spent || ' из ' || v_limit || ' сом)'::TEXT,
            v_current_spent,
            v_limit,
            v_percentage,
            'urgent'::VARCHAR(20);
            
    ELSIF v_percentage >= v_config.category_warning_threshold THEN
        RETURN QUERY SELECT 
            'limit_warning'::VARCHAR(50),
            '⚠️ Лимит "' || p_category || '": ' || v_percentage || '% (' || 
            v_current_spent || ' из ' || v_limit || ' сом)'::TEXT,
            v_current_spent,
            v_limit,
            v_percentage,
            'high'::VARCHAR(20);
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_category_limit_alert IS 'Проверяет превышение лимита по категории';

-- =====================================================
-- ФУНКЦИЯ 7: detect_unusual_spending
-- Детектор необычных трат на основе spending_patterns
-- =====================================================

CREATE OR REPLACE FUNCTION detect_unusual_spending(
    p_user_id BIGINT,
    p_category VARCHAR(100),
    p_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    v_pattern RECORD;
    v_is_unusual BOOLEAN := FALSE;
    v_multiplier NUMERIC;
BEGIN
    SELECT * INTO v_pattern 
    FROM spending_patterns 
    WHERE user_id = p_user_id AND category = p_category;
    
    IF FOUND AND v_pattern.unusual_threshold IS NOT NULL AND v_pattern.data_points_count >= 5 THEN
        IF p_amount > v_pattern.unusual_threshold THEN
            v_is_unusual := TRUE;
            v_multiplier := ROUND(p_amount / NULLIF(v_pattern.avg_monthly_amount, 0), 1);
            
            -- Создать уведомление
            INSERT INTO notifications (
                user_id, notification_type, title, message,
                related_category, priority, metadata
            ) VALUES (
                p_user_id,
                'unusual_spending',
                '💰 Необычная трата',
                'Расход ' || p_amount || ' сом в категории "' || p_category || 
                '" превышает обычный в ' || COALESCE(v_multiplier, 0) || 'x раз. ' ||
                'Средний расход: ' || ROUND(v_pattern.avg_monthly_amount, 0) || ' сом',
                p_category,
                'high',
                json_build_object(
                    'amount', p_amount,
                    'avg_amount', v_pattern.avg_monthly_amount,
                    'threshold', v_pattern.unusual_threshold,
                    'multiplier', v_multiplier
                )::JSONB
            );
        END IF;
    END IF;
    
    RETURN v_is_unusual;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_unusual_spending IS 'Детектирует необычную трату и создает уведомление';

-- =====================================================
-- ФУНКЦИЯ 8: update_spending_patterns
-- Обновление статистики трат для ML-анализа
-- =====================================================

CREATE OR REPLACE FUNCTION update_spending_patterns(p_user_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    v_category RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    FOR v_category IN 
        SELECT DISTINCT category 
        FROM expenses 
        WHERE user_id = p_user_id 
          AND deleted_at IS NULL
          AND date >= CURRENT_DATE - INTERVAL '90 days'
    LOOP
        INSERT INTO spending_patterns (
            user_id, category,
            avg_daily_amount, avg_weekly_amount, avg_monthly_amount,
            median_amount, std_deviation, 
            min_amount, max_amount,
            unusual_threshold,
            data_points_count, 
            last_analyzed_at,
            analysis_period_days
        )
        SELECT 
            p_user_id,
            v_category.category,
            AVG(amount) / 30 as avg_daily,
            AVG(amount) * 7 / 30 as avg_weekly,
            AVG(amount) as avg_monthly,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) as median,
            STDDEV(amount) as std_dev,
            MIN(amount) as min,
            MAX(amount) as max,
            AVG(amount) + (2 * COALESCE(STDDEV(amount), 0)) as threshold,
            COUNT(*) as data_points,
            NOW(),
            90
        FROM expenses
        WHERE user_id = p_user_id
          AND category = v_category.category
          AND deleted_at IS NULL
          AND date >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY category
        HAVING COUNT(*) >= 3 -- Минимум 3 точки для анализа
        ON CONFLICT (user_id, category)
        DO UPDATE SET
            avg_daily_amount = EXCLUDED.avg_daily_amount,
            avg_weekly_amount = EXCLUDED.avg_weekly_amount,
            avg_monthly_amount = EXCLUDED.avg_monthly_amount,
            median_amount = EXCLUDED.median_amount,
            std_deviation = EXCLUDED.std_deviation,
            min_amount = EXCLUDED.min_amount,
            max_amount = EXCLUDED.max_amount,
            unusual_threshold = EXCLUDED.unusual_threshold,
            data_points_count = EXCLUDED.data_points_count,
            last_analyzed_at = NOW(),
            updated_at = NOW();
            
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_spending_patterns IS 'Обновляет статистику трат пользователя для всех категорий';

-- =====================================================
-- ФУНКЦИЯ 9: get_budget_forecast
-- Прогноз бюджета до конца месяца
-- =====================================================

CREATE OR REPLACE FUNCTION get_budget_forecast(p_user_id BIGINT)
RETURNS TABLE (
    current_spent NUMERIC,
    budget_amount NUMERIC,
    percentage_used NUMERIC,
    projected_spending NUMERIC,
    remaining NUMERIC,
    days_remaining INTEGER,
    daily_average NUMERIC,
    recommended_daily_limit NUMERIC,
    forecast_status VARCHAR(20)
) AS $$
DECLARE
    v_result RECORD;
BEGIN
    RETURN QUERY
    WITH current_spending AS (
        SELECT COALESCE(SUM(amount), 0) as spent
        FROM expenses
        WHERE user_id = p_user_id
          AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
          AND deleted_at IS NULL
    ),
    days_data AS (
        SELECT 
            EXTRACT(DAY FROM CURRENT_DATE)::INTEGER as days_passed,
            EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::INTEGER as days_total
    ),
    budget_data AS (
        SELECT COALESCE(budget_amount, 0) as budget
        FROM budgets
        WHERE user_id = p_user_id
          AND month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    )
    SELECT 
        cs.spent as current_spent,
        bd.budget as budget_amount,
        ROUND((cs.spent / NULLIF(bd.budget, 0)) * 100, 1) as percentage_used,
        ROUND(cs.spent / NULLIF(dd.days_passed, 0) * dd.days_total, 2) as projected_spending,
        bd.budget - cs.spent as remaining,
        (dd.days_total - dd.days_passed)::INTEGER as days_remaining,
        ROUND(cs.spent / NULLIF(dd.days_passed, 0), 2) as daily_average,
        ROUND((bd.budget - cs.spent) / NULLIF((dd.days_total - dd.days_passed), 0), 2) as recommended_daily_limit,
        CASE 
            WHEN cs.spent / NULLIF(dd.days_passed, 0) * dd.days_total > bd.budget * 1.1 THEN 'critical'
            WHEN cs.spent / NULLIF(dd.days_passed, 0) * dd.days_total > bd.budget THEN 'warning'
            ELSE 'ok'
        END::VARCHAR(20) as forecast_status
    FROM current_spending cs, days_data dd, budget_data bd;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_budget_forecast IS 'Возвращает прогноз бюджета до конца месяца';

-- =====================================================
-- ПРОВЕРКА СОЗДАННЫХ ОБЪЕКТОВ
-- =====================================================

DO $$
DECLARE
    v_tables_count INTEGER;
    v_functions_count INTEGER;
    v_indexes_count INTEGER;
BEGIN
    -- Проверка таблиц
    SELECT COUNT(*) INTO v_tables_count
    FROM information_schema.tables
    WHERE table_name IN (
        'recurring_payments', 
        'notifications', 
        'budget_alerts_config', 
        'spending_patterns'
    );
    
    RAISE NOTICE '✅ Таблиц создано: %', v_tables_count;
    
    -- Проверка функций
    SELECT COUNT(*) INTO v_functions_count
    FROM pg_proc
    WHERE proname IN (
        'create_recurring_payment',
        'execute_recurring_payment',
        'get_pending_reminders',
        'mark_reminder_sent',
        'check_budget_alerts',
        'check_category_limit_alert',
        'detect_unusual_spending',
        'update_spending_patterns',
        'get_budget_forecast'
    );
    
    RAISE NOTICE '✅ Функций создано: %', v_functions_count;
    
    -- Проверка индексов
    SELECT COUNT(*) INTO v_indexes_count
    FROM pg_indexes
    WHERE tablename IN (
        'recurring_payments', 
        'notifications', 
        'spending_patterns'
    );
    
    RAISE NOTICE '✅ Индексов создано: %', v_indexes_count;
    
    RAISE NOTICE '🎉 Миграция v2.3.0 успешно завершена!';
END $$;

-- =====================================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ (для тестирования)
-- =====================================================

/*
-- Создать повторяющийся платеж (аренда)
SELECT create_recurring_payment(
    1109421300, -- user_id
    'Аренда офиса',
    15000,
    'KGS',
    'Аренда офиса',
    'monthly',
    '2025-11-01'::DATE,
    'Ежемесячная аренда офиса в центре',
    'expense',
    1,
    3,
    FALSE
);

-- Создать подписку Netflix с автоплатежом
SELECT create_recurring_payment(
    1109421300,
    'Netflix Premium',
    12.99,
    'USD',
    'Развлечения',
    'monthly',
    CURRENT_DATE,
    'Подписка Netflix',
    'expense',
    1,
    3,
    TRUE -- автоматически создавать расход
);

-- Получить pending reminders
SELECT * FROM get_pending_reminders();

-- Проверить бюджет (с новым расходом 5000)
SELECT * FROM check_budget_alerts(1109421300, 5000);

-- Прогноз бюджета
SELECT * FROM get_budget_forecast(1109421300);

-- Обновить spending patterns
SELECT update_spending_patterns(1109421300);

-- Детектировать необычную трату
SELECT detect_unusual_spending(1109421300, 'Продукты питания', 25000);
*/
