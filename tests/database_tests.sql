-- 🧪 SQL тесты для проверки функций Supabase
-- Запускайте эти тесты в Supabase SQL Editor

-- =============================================================================
-- 📋 ПОДГОТОВКА ТЕСТОВЫХ ДАННЫХ
-- =============================================================================

-- Создаем тестового пользователя (замените YOUR_TELEGRAM_ID на ваш реальный ID)
DO $$
DECLARE
    test_user_id BIGINT := 1109421300; -- Замените на ваш Telegram ID
    test_workspace_id INTEGER;
BEGIN
    -- Создаем пользователя
    INSERT INTO users (user_id, username, first_name, telegram_chat_id)
    VALUES (test_user_id, 'test_user', 'Test User', test_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Создаем workspace
    SELECT create_workspace_with_owner('Test Workspace', test_user_id, 'Test description', 'KGS') 
    INTO test_workspace_id;
    
    RAISE NOTICE 'Test user: %, workspace: %', test_user_id, test_workspace_id;
END $$;

-- Добавляем тестовые курсы валют
INSERT INTO exchange_rates (date, from_currency, to_currency, rate, source)
VALUES 
  (CURRENT_DATE, 'USD', 'KGS', 87.50, 'test'),
  (CURRENT_DATE, 'EUR', 'KGS', 95.20, 'test'),
  (CURRENT_DATE, 'RUB', 'KGS', 0.95, 'test'),
  (CURRENT_DATE, 'KGS', 'USD', 0.0114, 'test'),
  (CURRENT_DATE, 'KGS', 'EUR', 0.0105, 'test'),
  (CURRENT_DATE, 'KGS', 'RUB', 1.05, 'test')
ON CONFLICT (date, from_currency, to_currency) DO NOTHING;

-- =============================================================================
-- 🧪 ТЕСТ 1: Проверка функций курсов валют
-- =============================================================================

SELECT '=== ТЕСТ 1: Курсы валют ===' as test_name;

-- Тест get_exchange_rate
SELECT 
    'get_exchange_rate(USD, KGS)' as test,
    get_exchange_rate('USD', 'KGS', CURRENT_DATE) as result,
    CASE WHEN get_exchange_rate('USD', 'KGS', CURRENT_DATE) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status;

-- Тест convert_amount
SELECT 
    'convert_amount(100, USD, KGS)' as test,
    convert_amount(100, 'USD', 'KGS', CURRENT_DATE) as result,
    CASE WHEN convert_amount(100, 'USD', 'KGS', CURRENT_DATE) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status;

-- =============================================================================
-- 🧪 ТЕСТ 2: Создание транзакций
-- =============================================================================

SELECT '=== ТЕСТ 2: Транзакции ===' as test_name;

-- Добавляем тестовые транзакции
DO $$
DECLARE
    test_user_id BIGINT := 1109421300;
    test_workspace_id INTEGER;
    expense_id INTEGER;
    income_id INTEGER;
BEGIN
    -- Получаем workspace
    SELECT w.id INTO test_workspace_id
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = test_user_id AND wm.is_active = true
    LIMIT 1;
    
    -- Добавляем расход
    INSERT INTO expenses (user_id, workspace_id, date, category, amount, currency, description, operation_type, source)
    VALUES (test_user_id, test_workspace_id, CURRENT_DATE, 'продукты', 1500.00, 'KGS', 'Тест расход', 'расход', 'test')
    RETURNING id INTO expense_id;
    
    -- Добавляем доход
    INSERT INTO income (user_id, workspace_id, date, category, amount, currency, description, operation_type, source)
    VALUES (test_user_id, test_workspace_id, CURRENT_DATE, 'зарплата', 50000.00, 'KGS', 'Тест доход', 'доход', 'test')
    RETURNING id INTO income_id;
    
    RAISE NOTICE 'Created expense: %, income: %', expense_id, income_id;
END $$;

-- Проверяем созданные транзакции
SELECT 
    'Expenses count' as test,
    COUNT(*) as result,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM expenses 
WHERE user_id = 1109421300 AND source = 'test';

SELECT 
    'Income count' as test,
    COUNT(*) as result,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM income 
WHERE user_id = 1109421300 AND source = 'test';

-- =============================================================================
-- 🧪 ТЕСТ 3: Функции аналитики
-- =============================================================================

SELECT '=== ТЕСТ 3: Аналитика ===' as test_name;

-- Тест get_user_workspaces
SELECT 
    'get_user_workspaces' as test,
    COUNT(*) as workspace_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM get_user_workspaces(1109421300);

-- Тест get_income_expense_stats
DO $$
DECLARE
    test_user_id BIGINT := 1109421300;
    test_workspace_id INTEGER;
    stats RECORD;
BEGIN
    -- Получаем workspace
    SELECT w.id INTO test_workspace_id
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = test_user_id AND wm.is_active = true
    LIMIT 1;
    
    -- Получаем статистику
    SELECT * INTO stats
    FROM get_income_expense_stats(
        test_workspace_id,
        DATE_TRUNC('month', CURRENT_DATE)::DATE,
        CURRENT_DATE
    );
    
    RAISE NOTICE 'Stats - Income: %, Expenses: %, Balance: %', 
        stats.total_income, stats.total_expenses, stats.balance;
END $$;

-- =============================================================================
-- 🧪 ТЕСТ 4: Функции редактирования
-- =============================================================================

SELECT '=== ТЕСТ 4: Редактирование ===' as test_name;

-- Тест safe_update_transaction
DO $$
DECLARE
    test_user_id BIGINT := 1109421300;
    last_expense_id INTEGER;
    update_result JSON;
BEGIN
    -- Получаем ID последнего расхода
    SELECT get_last_transaction(test_user_id, 'expense') INTO last_expense_id;
    
    -- Обновляем сумму
    SELECT safe_update_transaction(
        test_user_id,
        'expense',
        last_expense_id::TEXT,
        'amount',
        '2000'
    ) INTO update_result;
    
    RAISE NOTICE 'Update result: %', update_result;
END $$;

-- =============================================================================
-- 🧪 ТЕСТ 5: Бюджет и лимиты
-- =============================================================================

SELECT '=== ТЕСТ 5: Бюджет и лимиты ===' as test_name;

-- Создаем тестовый бюджет
DO $$
DECLARE
    test_user_id BIGINT := 1109421300;
    test_workspace_id INTEGER;
BEGIN
    -- Получаем workspace
    SELECT w.id INTO test_workspace_id
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = test_user_id AND wm.is_active = true
    LIMIT 1;
    
    -- Создаем бюджет
    INSERT INTO budgets (user_id, workspace_id, month, budget_amount, currency)
    VALUES (test_user_id, test_workspace_id, TO_CHAR(CURRENT_DATE, 'YYYY-MM'), 50000, 'KGS')
    ON CONFLICT (user_id, month) DO UPDATE SET budget_amount = EXCLUDED.budget_amount;
    
    RAISE NOTICE 'Budget created for month: %', TO_CHAR(CURRENT_DATE, 'YYYY-MM');
END $$;

-- Тест get_budget_forecast
SELECT 
    'get_budget_forecast' as test,
    *
FROM get_budget_forecast(1109421300);

-- =============================================================================
-- 🧪 ТЕСТ 6: Подписки
-- =============================================================================

SELECT '=== ТЕСТ 6: Подписки ===' as test_name;

-- Тест create_recurring_payment
SELECT 
    'create_recurring_payment' as test,
    create_recurring_payment(
        1109421300::BIGINT,
        'Test Netflix'::VARCHAR,
        12.99::NUMERIC,
        'USD'::VARCHAR,
        'подписки'::VARCHAR,
        'monthly'::VARCHAR,
        CURRENT_DATE,
        'Test subscription'::TEXT,
        'expense'::VARCHAR,
        1::INTEGER,
        3::INTEGER,
        false::BOOLEAN
    ) as recurring_id,
    '✅ PASS' as status;

-- Проверяем созданную подписку
SELECT 
    'Recurring payments count' as test,
    COUNT(*) as result,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM recurring_payments 
WHERE user_id = 1109421300 AND title = 'Test Netflix';

-- =============================================================================
-- 🧪 ТЕСТ 7: Уведомления
-- =============================================================================

SELECT '=== ТЕСТ 7: Уведомления ===' as test_name;

-- Создаем тестовое уведомление
INSERT INTO notifications (user_id, notification_type, title, message, priority)
VALUES (1109421300, 'custom', 'Test Notification', 'This is a test', 'normal');

SELECT 
    'Notifications count' as test,
    COUNT(*) as result,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM notifications 
WHERE user_id = 1109421300 AND title = 'Test Notification';

-- =============================================================================
-- 📊 ИТОГОВЫЙ ОТЧЕТ
-- =============================================================================

SELECT '=== ИТОГОВЫЙ ОТЧЕТ ===' as test_name;

-- Подсчет созданных данных
SELECT 
    'Users' as table_name,
    COUNT(*) as count
FROM users WHERE user_id = 1109421300
UNION ALL
SELECT 
    'Workspaces',
    COUNT(*)
FROM workspaces w
JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE wm.user_id = 1109421300
UNION ALL
SELECT 
    'Expenses',
    COUNT(*)
FROM expenses WHERE user_id = 1109421300
UNION ALL
SELECT 
    'Income',
    COUNT(*)
FROM income WHERE user_id = 1109421300
UNION ALL
SELECT 
    'Exchange Rates',
    COUNT(*)
FROM exchange_rates WHERE source = 'test'
UNION ALL
SELECT 
    'Budgets',
    COUNT(*)
FROM budgets WHERE user_id = 1109421300
UNION ALL
SELECT 
    'Recurring Payments',
    COUNT(*)
FROM recurring_payments WHERE user_id = 1109421300
UNION ALL
SELECT 
    'Notifications',
    COUNT(*)
FROM notifications WHERE user_id = 1109421300;

-- =============================================================================
-- 🧹 ОЧИСТКА ТЕСТОВЫХ ДАННЫХ (раскомментируйте при необходимости)
-- =============================================================================

/*
-- ВНИМАНИЕ! Это удалит все тестовые данные
DO $$
DECLARE
    test_user_id BIGINT := 1109421300;
BEGIN
    -- Удаляем в правильном порядке (учитываем foreign keys)
    DELETE FROM notifications WHERE user_id = test_user_id;
    DELETE FROM recurring_payments WHERE user_id = test_user_id;
    DELETE FROM budgets WHERE user_id = test_user_id;
    DELETE FROM limits WHERE user_id = test_user_id;
    DELETE FROM transaction_history WHERE changed_by = test_user_id;
    DELETE FROM expenses WHERE user_id = test_user_id;
    DELETE FROM income WHERE user_id = test_user_id;
    DELETE FROM workspace_members WHERE user_id = test_user_id;
    DELETE FROM workspaces WHERE owner_id = test_user_id;
    DELETE FROM users WHERE user_id = test_user_id;
    DELETE FROM exchange_rates WHERE source = 'test';
    
    RAISE NOTICE 'Test data cleaned for user: %', test_user_id;
END $$;
*/