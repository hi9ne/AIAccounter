-- =====================================================
-- AIAccounter Data Import
-- Step 2: Import all data from Seoul to Frankfurt
-- =====================================================

-- 1. USERS (7 records)
INSERT INTO users (user_id, username, first_name, last_name, telegram_chat_id, language_code, is_active, registered_date, last_activity, preferred_currency, usage_type, monthly_budget, occupation, country, timezone, onboarding_completed, onboarding_step, onboarding_started_at, onboarding_completed_at, registration_source) VALUES 
(1109421300, 'hi9ne', 'Test User', 'Бердибаев', 1109421300, 'ru', true, '2025-11-04 22:28:39.031927', '2025-12-06 05:03:37.579518', 'KGS', 'business', 180000.00, 'бизнесмен', 'Кыргызстан', 'Asia/Bishkek', true, 5, '2025-12-03 16:10:26.160972+00', '2025-12-03 17:12:50.298445+00', 'telegram'),
(665871760, 'kiryanoviv', 'Igor', 'Kiryanov', 665871760, 'ru', true, '2025-11-12 11:36:08.1784', '2025-11-12 15:01:04.20043', 'KGS', 'personal', 1.00, 'Предприниматель', 'Кыргызстан', 'Asia/Bishkek', true, 5, NULL, '2025-11-12 11:47:23.447396+00', 'telegram'),
(611802230, NULL, '.', NULL, 611802230, 'ru', true, '2025-11-29 10:49:46.972506', '2025-11-29 15:30:01.535193', 'KGS', NULL, NULL, NULL, 'Кыргызстан', 'Asia/Bishkek', false, 0, NULL, NULL, 'telegram'),
(1023084418, 'idirisovaskar', 'Аскар', 'Идирисов', 1023084418, 'ru', true, '2025-11-29 05:22:04.734921', '2025-11-29 17:02:14.934868', 'KGS', NULL, NULL, NULL, 'Кыргызстан', 'Asia/Bishkek', false, 0, NULL, NULL, 'telegram'),
(1660454307, 'mkbfine', 'Клавдий', 'Клавдиан', 1660454307, 'ru', true, '2025-12-02 23:48:05.214534', '2025-12-02 23:57:31.929232', 'KGS', NULL, NULL, NULL, 'Кыргызстан', 'Asia/Bishkek', false, 0, NULL, NULL, 'telegram'),
(8275142492, NULL, 'Чынгыз', NULL, 8275142492, 'ru', true, '2025-11-28 21:49:12.487837', '2025-11-30 20:06:16.506033', 'KGS', NULL, NULL, NULL, 'Кыргызстан', 'Asia/Bishkek', false, 0, NULL, NULL, 'telegram'),
(1222583683, 'elidss_s', 'El', '', 1222583683, 'ru', true, '2025-11-05 02:03:40.459751', '2025-12-01 04:28:34.681291', 'KGS', 'personal', 10000.00, 'Студент', 'Кыргызстане', 'Asia/Bishkek', true, 5, NULL, '2025-11-05 02:04:14.730446+00', 'telegram');

-- 2. DEFAULT CATEGORIES (15 records)
INSERT INTO categories (id, user_id, name, type, icon, color, is_default, is_active, sort_order, created_at, updated_at) VALUES 
(1, NULL, 'Продукты', 'expense', '🛒', '#22C55E', true, true, 1, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(2, NULL, 'Транспорт', 'expense', '🚗', '#3B82F6', true, true, 2, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(3, NULL, 'Кафе', 'expense', '☕', '#F59E0B', true, true, 3, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(4, NULL, 'Жильё', 'expense', '🏠', '#8B5CF6', true, true, 4, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(5, NULL, 'Медицина', 'expense', '💊', '#EF4444', true, true, 5, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(6, NULL, 'Одежда', 'expense', '👕', '#EC4899', true, true, 6, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(7, NULL, 'Развлечения', 'expense', '🎮', '#06B6D4', true, true, 7, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(8, NULL, 'Образование', 'expense', '📚', '#14B8A6', true, true, 8, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(9, NULL, 'Подписки', 'expense', '📱', '#6366F1', true, true, 9, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(10, NULL, 'Другое', 'expense', '📦', '#6B7280', true, true, 100, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(11, NULL, 'Зарплата', 'income', '💰', '#22C55E', true, true, 1, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(12, NULL, 'Фриланс', 'income', '💻', '#3B82F6', true, true, 2, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(13, NULL, 'Инвестиции', 'income', '📈', '#8B5CF6', true, true, 3, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(14, NULL, 'Подарки', 'income', '🎁', '#EC4899', true, true, 4, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00'),
(15, NULL, 'Другое', 'income', '📦', '#6B7280', true, true, 100, '2025-11-29T06:09:17.706387+00:00', '2025-11-29T06:09:17.706387+00:00');

-- User-specific categories for user 1109421300 (18 records)
INSERT INTO categories (id, user_id, name, type, icon, color, is_default, is_active, sort_order, created_at, updated_at) VALUES 
(90, 1109421300, 'Еда и продукты', 'expense', '🍔', '#EF4444', false, true, 1, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(91, 1109421300, 'Транспорт', 'expense', '🚗', '#3B82F6', false, true, 2, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(92, 1109421300, 'Жильё и ЖКХ', 'expense', '🏠', '#8B5CF6', false, true, 3, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(93, 1109421300, 'Связь и интернет', 'expense', '📱', '#06B6D4', false, true, 4, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(94, 1109421300, 'Развлечения', 'expense', '🎬', '#F59E0B', false, true, 5, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(95, 1109421300, 'Здоровье', 'expense', '💊', '#10B981', false, true, 6, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(96, 1109421300, 'Одежда', 'expense', '👕', '#EC4899', false, true, 7, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(97, 1109421300, 'Образование', 'expense', '📚', '#6366F1', false, true, 8, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(98, 1109421300, 'Путешествия', 'expense', '✈️', '#14B8A6', false, true, 9, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(99, 1109421300, 'Подарки', 'expense', '🎁', '#F97316', false, true, 10, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(100, 1109421300, 'Подписки', 'expense', '💳', '#8B5CF6', false, true, 11, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(101, 1109421300, 'Другое', 'expense', '📦', '#6B7280', false, true, 12, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(102, 1109421300, 'Зарплата', 'income', '💰', '#10B981', false, true, 1, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(103, 1109421300, 'Подработка', 'income', '💵', '#3B82F6', false, true, 2, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(104, 1109421300, 'Подарки', 'income', '🎁', '#F97316', false, true, 3, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(105, 1109421300, 'Кэшбэк', 'income', '💳', '#8B5CF6', false, true, 4, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(106, 1109421300, 'Инвестиции', 'income', '📈', '#06B6D4', false, true, 5, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00'),
(107, 1109421300, 'Другое', 'income', '📦', '#6B7280', false, true, 6, '2025-12-03T16:42:29.833264+00:00', '2025-12-03T16:42:29.833264+00:00');

-- Reset sequence for categories
SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories));

-- 3. EXPENSES (11 records)
INSERT INTO expenses (id, user_id, date, category, amount, description, operation_type, source, created_at, updated_at, currency, deleted_at, deleted_by) VALUES 
(68, 1222583683, '2025-11-29', 'Продукты', 750, 'Покупка шаурмы с девушкой', 'расход', 'telegram', '2025-11-29T06:12:08.615021', '2025-11-29T06:12:08.615021', 'KGS', NULL, NULL),
(69, 1023084418, '2025-11-29', 'Одежда', 800, 'Шоппинг', 'расход', 'telegram', '2025-11-29T07:30:19.818023', '2025-11-29T07:30:19.818023', 'KGS', NULL, NULL),
(70, 1023084418, '2025-11-29', 'Продукты', 200, 'Еда', 'расход', 'telegram', '2025-11-29T07:30:20.091963', '2025-11-29T07:30:20.091963', 'KGS', NULL, NULL),
(71, 1023084418, '2025-11-29', 'Транспорт', 1000, 'Такси', 'расход', 'telegram', '2025-11-29T07:30:20.324463', '2025-11-29T07:30:20.324463', 'KGS', NULL, NULL),
(72, 1023084418, '2025-11-29', 'Жильё', 34800, 'Жильё (конвертация из 400 долларов)', 'расход', 'telegram', '2025-11-29T07:30:27.294053', '2025-11-29T07:30:27.294053', 'KGS', NULL, NULL),
(73, 8275142492, '2025-11-30', 'Жильё', 20000, 'Аренда', 'расход', 'telegram', '2025-11-30T14:33:01.328132', '2025-11-30T14:33:01.328132', 'KGS', NULL, NULL),
(77, 1109421300, '2025-12-05', 'Продукты', 150, 'кофе', 'расход', 'telegram', '2025-12-05T17:08:43.159923', '2025-12-05T17:08:43.159923', 'USD', NULL, NULL),
(78, 1109421300, '2025-12-05', 'Транспорт', 200, 'такси', 'расход', 'telegram', '2025-12-05T17:08:55.447001', '2025-12-05T17:08:55.447001', 'USD', NULL, NULL),
(79, 1109421300, '2025-12-05', 'Продукты', 350, 'обед', 'расход', 'telegram', '2025-12-05T17:08:55.675331', '2025-12-05T17:08:55.675331', 'USD', NULL, NULL),
(80, 1109421300, '2025-12-05', 'Транспорт', 5, 'такси', 'расход', 'telegram', '2025-12-05T17:14:09.785565', '2025-12-05T17:14:09.785565', 'USD', NULL, NULL),
(81, 1109421300, '2025-12-05', 'Продукты', 10, 'продукты', 'расход', 'telegram', '2025-12-05T17:14:10.016712', '2025-12-05T17:14:10.016712', 'USD', NULL, NULL);

SELECT setval('expenses_id_seq', (SELECT COALESCE(MAX(id), 1) FROM expenses));

-- 4. INCOME (4 records)
INSERT INTO income (id, user_id, date, category, amount, description, operation_type, source, created_at, updated_at, currency, deleted_at, deleted_by) VALUES 
(16, 8275142492, '2025-11-30', 'Зарплата', 30000, 'Зарплата', 'доход', 'telegram', '2025-11-30T14:33:01.605805', '2025-11-30T14:33:01.605805', 'KGS', NULL, NULL),
(17, 1222583683, '2025-12-01', 'Фриланс', 22000, 'Заработок с проекта', 'доход', 'telegram', '2025-12-01T04:28:34.681291', '2025-12-01T04:28:34.681291', 'KGS', NULL, NULL),
(18, 1109421300, '2025-12-05', 'Зарплата', 50000, 'зарплата', 'доход', 'telegram', '2025-12-05T17:08:55.197655', '2025-12-05T17:08:55.197655', 'USD', NULL, NULL),
(19, 1109421300, '2025-12-05', 'Инвестиции', 100, 'инвестиции', 'доход', 'telegram', '2025-12-05T17:14:09.543311', '2025-12-05T17:14:09.543311', 'USD', NULL, NULL);

SELECT setval('income_id_seq', (SELECT COALESCE(MAX(id), 1) FROM income));

-- 5. BUDGETS (1 record)
INSERT INTO budgets (id, user_id, month, budget_amount, last_updated, currency) VALUES 
(2, 1109421300, '2025-12', 180000, '2025-12-05T17:10:05.754768', 'KGS');

SELECT setval('budgets_id_seq', (SELECT COALESCE(MAX(id), 1) FROM budgets));

-- 6. USER_PREFERENCES (1 record)
INSERT INTO user_preferences (id, user_id, theme, language, timezone, notification_settings, ui_preferences, created_at, updated_at, budget_alert_80_sent, budget_alert_100_sent) VALUES 
(1, 1109421300, 'light', 'ru', 'Asia/Bishkek', 
 '{"daily_summary":true,"debt_reminder":true,"large_expense":true,"weekly_report":true,"budget_warning":true,"monthly_report":true,"daily_summary_time":"20:00","debt_reminder_days":3,"recurring_reminder":true,"large_expense_threshold":10,"recurring_reminder_days":3,"budget_warning_threshold":80}',
 '{}', '2025-12-03T16:33:15.873226', '2025-12-03T16:42:56.299325', NULL, NULL);

SELECT setval('user_preferences_id_seq', (SELECT COALESCE(MAX(id), 1) FROM user_preferences));

-- 7. SAVINGS_GOALS (1 record)
INSERT INTO savings_goals (id, user_id, name, description, target_amount, current_amount, currency, icon, color, deadline, is_completed, completed_at, is_active, auto_contribute, auto_contribute_percent, created_at, updated_at) VALUES 
(5, 1109421300, 'iphone 17 pro', NULL, 111111, 12121, 'KGS', '💻', '#8B5CF6', NULL, false, NULL, true, false, NULL, '2025-12-06T05:31:25.214032', '2025-12-06T05:31:25.214032');

SELECT setval('savings_goals_id_seq', (SELECT COALESCE(MAX(id), 1) FROM savings_goals));

-- 8. GOAL_CONTRIBUTIONS (1 record)
INSERT INTO goal_contributions (id, goal_id, user_id, amount, type, note, source, created_at) VALUES 
(2, 5, 1109421300, 12121, 'deposit', 'Начальный взнос', 'manual', '2025-12-06T05:31:30.69793');

SELECT setval('goal_contributions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM goal_contributions));

-- 9. ACHIEVEMENTS (31 records - справочник)
INSERT INTO achievements (id, name, name_en, name_ky, description, description_en, description_ky, category, icon, xp_reward, rarity, condition_type, condition_value, condition_extra, sort_order, is_active, created_at) VALUES 
('first_expense', 'Первый шаг', 'First Step', 'Биринчи кадам', 'Добавь первый расход', 'Add your first expense', 'Биринчи чыгымыңды кош', 'tracking', '👣', 10, 'common', 'count', 1, NULL, 1, true, '2025-12-05T16:06:16.97949'),
('first_income', 'Первая зарплата', 'First Salary', 'Биринчи эмгек акы', 'Добавь первый доход', 'Add your first income', 'Биринчи кирешеңди кош', 'tracking', '💵', 10, 'common', 'count', 1, NULL, 2, true, '2025-12-05T16:06:16.97949'),
('week_streak', 'Неделя дисциплины', 'Week of Discipline', 'Тартиптин жумасы', 'Веди учёт 7 дней подряд', 'Track for 7 days in a row', '7 күн катары менен эсеп жүргүз', 'tracking', '🔥', 50, 'common', 'streak', 7, NULL, 3, true, '2025-12-05T16:06:16.97949'),
('month_streak', 'Месяц порядка', 'Month of Order', 'Тартиптин айы', 'Веди учёт 30 дней подряд', 'Track for 30 days in a row', '30 күн катары менен эсеп жүргүз', 'tracking', '🔥', 200, 'rare', 'streak', 30, NULL, 4, true, '2025-12-05T16:06:16.97949'),
('quarter_streak', 'Квартальный марафон', 'Quarterly Marathon', 'Чейректик марафон', 'Веди учёт 90 дней подряд', 'Track for 90 days in a row', '90 күн катары менен эсеп жүргүз', 'tracking', '🏃', 500, 'epic', 'streak', 90, NULL, 5, true, '2025-12-05T16:06:16.97949'),
('year_streak', 'Годовой чемпион', 'Annual Champion', 'Жылдык чемпион', 'Веди учёт 365 дней подряд', 'Track for 365 days in a row', '365 күн катары менен эсеп жүргүз', 'tracking', '👑', 2000, 'legendary', 'streak', 365, NULL, 6, true, '2025-12-05T16:06:16.97949'),
('century', 'Сотня', 'Century', 'Жүздүк', 'Добавь 100 транзакций', 'Add 100 transactions', '100 транзакция кош', 'tracking', '💯', 100, 'common', 'count', 100, NULL, 7, true, '2025-12-05T16:06:16.97949'),
('thousand', 'Тысячник', 'Thousand Club', 'Миңдик', 'Добавь 1000 транзакций', 'Add 1000 transactions', '1000 транзакция кош', 'tracking', '🎯', 500, 'rare', 'count', 1000, NULL, 8, true, '2025-12-05T16:06:16.97949'),
('detailed_tracker', 'Педант', 'Perfectionist', 'Тактык', 'Добавь описание к 50 транзакциям', 'Add descriptions to 50 transactions', '50 транзакцияга сүрөттөмө кош', 'tracking', '📝', 100, 'common', 'count', 50, NULL, 9, true, '2025-12-05T16:06:16.97949'),
('first_saving', 'Копилка', 'Piggy Bank', 'Куту', 'Сэкономь в первый месяц', 'Save money in your first month', 'Биринчи айда акча топто', 'savings', '🐷', 50, 'common', 'percentage', 1, NULL, 10, true, '2025-12-05T16:06:16.97949'),
('save_10', 'Экономист', 'Economist', 'Экономист', 'Сэкономь 10% от дохода за месяц', 'Save 10% of monthly income', 'Айлык кирешенин 10% топто', 'savings', '📈', 100, 'common', 'percentage', 10, NULL, 11, true, '2025-12-05T16:06:16.97949'),
('save_20', 'Бережливый', 'Thrifty', 'Үнөмчүл', 'Сэкономь 20% от дохода за месяц', 'Save 20% of monthly income', 'Айлык кирешенин 20% топто', 'savings', '💪', 150, 'rare', 'percentage', 20, NULL, 12, true, '2025-12-05T16:06:16.97949'),
('save_30', 'Финансовый ниндзя', 'Financial Ninja', 'Финансылык ниндзя', 'Сэкономь 30% от дохода за месяц', 'Save 30% of monthly income', 'Айлык кирешенин 30% топто', 'savings', '🥷', 250, 'epic', 'percentage', 30, NULL, 13, true, '2025-12-05T16:06:16.97949'),
('save_50', 'Аскет', 'Ascetic', 'Аскет', 'Сэкономь 50% от дохода за месяц', 'Save 50% of monthly income', 'Айлык кирешенин 50% топто', 'savings', '🧘', 500, 'legendary', 'percentage', 50, NULL, 14, true, '2025-12-05T16:06:16.97949'),
('budget_master', 'Мастер бюджета', 'Budget Master', 'Бюджет устаты', 'Не превысь бюджет за месяц', 'Stay within budget for a month', 'Бир ай бюджеттен ашпа', 'savings', '🎖️', 200, 'rare', 'combo', 1, NULL, 15, true, '2025-12-05T16:06:16.97949'),
('analyst', 'Аналитик', 'Analyst', 'Аналитик', 'Просмотри аналитику 10 раз', 'View analytics 10 times', 'Аналитиканы 10 жолу көр', 'analytics', '📊', 30, 'common', 'count', 10, NULL, 20, true, '2025-12-05T16:06:16.97949'),
('report_lover', 'Любитель отчётов', 'Report Enthusiast', 'Отчет сүйүүчү', 'Сгенерируй 5 отчётов', 'Generate 5 reports', '5 отчет түз', 'analytics', '📋', 50, 'common', 'count', 5, NULL, 21, true, '2025-12-05T16:06:16.97949'),
('pattern_finder', 'Охотник за паттернами', 'Pattern Hunter', 'Паттерн издөөчү', 'Используй AI-аналитику', 'Use AI analytics', 'AI-аналитиканы колдон', 'analytics', '🤖', 50, 'common', 'count', 1, NULL, 22, true, '2025-12-05T16:06:16.97949'),
('expense_detective', 'Детектив расходов', 'Expense Detective', 'Чыгым детективи', 'Найди свою самую затратную категорию', 'Find your most expensive category', 'Эң кымбат категорияңды тап', 'analytics', '🔍', 25, 'common', 'count', 1, NULL, 23, true, '2025-12-05T16:06:16.97949'),
('debt_slayer', 'Убийца долгов', 'Debt Slayer', 'Карыз жок кылуучу', 'Закрой 5 долгов', 'Close 5 debts', '5 карыз жап', 'debts', '⚔️', 150, 'rare', 'count', 5, NULL, 30, true, '2025-12-05T16:06:16.97949'),
('debt_free', 'Свободен от долгов', 'Debt Free', 'Карызсыз', 'Закрой все долги', 'Close all debts', 'Бардык карыздарды жап', 'debts', '🦅', 300, 'epic', 'combo', 1, NULL, 31, true, '2025-12-05T16:06:16.97949'),
('subscription_audit', 'Аудитор подписок', 'Subscription Auditor', 'Жазылуу аудитору', 'Добавь все свои подписки', 'Add all your subscriptions', 'Бардык жазылууларды кош', 'debts', '📱', 50, 'common', 'count', 3, NULL, 32, true, '2025-12-05T16:06:16.97949'),
('early_bird', 'Ранняя пташка', 'Early Bird', 'Эрте турган', 'Добавь запись до 7:00', 'Add entry before 7:00 AM', '7:00 чейин жазуу кош', 'special', '🐦', 25, 'common', 'count', 1, NULL, 40, true, '2025-12-05T16:06:16.97949'),
('night_owl', 'Ночная сова', 'Night Owl', 'Түнкү байкуш', 'Добавь запись после 23:00', 'Add entry after 11:00 PM', '23:00 дон кийин жазуу кош', 'special', '🦉', 25, 'common', 'count', 1, NULL, 41, true, '2025-12-05T16:06:16.97949'),
('multi_currency', 'Мультивалютный', 'Multi-Currency', 'Көп валюталык', 'Используй 3+ валюты', 'Use 3+ currencies', '3+ валюта колдон', 'special', '💱', 75, 'common', 'count', 3, NULL, 42, true, '2025-12-05T16:06:16.97949'),
('exporter', 'Архивариус', 'Archivist', 'Архивариус', 'Экспортируй данные', 'Export your data', 'Маалыматтарды экспортто', 'special', '💾', 25, 'common', 'count', 1, NULL, 43, true, '2025-12-05T16:06:16.97949'),
('weekend_warrior', 'Воин выходных', 'Weekend Warrior', 'Дем алыш жоокери', 'Веди учёт в выходные 4 недели подряд', 'Track on weekends for 4 weeks straight', '4 жума катары дем алышта эсеп жүргүз', 'special', '⚔️', 100, 'rare', 'count', 4, NULL, 44, true, '2025-12-05T16:06:16.97949'),
('perfect_month', 'Идеальный месяц', 'Perfect Month', 'Идеалдуу ай', 'Streak + экономия + бюджет в норме', 'Streak + savings + budget on track', 'Streak + үнөм + бюджет нормада', 'rare', '✨', 500, 'epic', 'combo', 1, NULL, 50, true, '2025-12-05T16:06:16.97949'),
('financial_guru', 'Финансовый гуру', 'Financial Guru', 'Финансылык гуру', 'Получи 20 базовых достижений', 'Get 20 basic achievements', '20 негизги жетишкендик ал', 'rare', '🧙', 1000, 'epic', 'count', 20, NULL, 51, true, '2025-12-05T16:06:16.97949'),
('zen_master', 'Дзен мастер', 'Zen Master', 'Дзен устаты', '6 месяцев streak + 20% экономии', '6 months streak + 20% savings', '6 ай streak + 20% үнөм', 'rare', '☯️', 2000, 'legendary', 'combo', 1, NULL, 52, true, '2025-12-05T16:06:16.97949'),
('legend', 'Легенда', 'Legend', 'Легенда', 'Год использования + все достижения', 'One year + all achievements', 'Бир жыл + бардык жетишкендиктер', 'rare', '🌟', 5000, 'legendary', 'combo', 1, NULL, 53, true, '2025-12-05T16:06:16.97949');

-- 10. USER_GAMIFICATION (1 record)
INSERT INTO user_gamification (id, user_id, level, xp, total_xp, current_streak, max_streak, last_activity_date, grace_used_this_month, total_transactions, total_achievements, notifications_enabled, show_on_home, created_at, updated_at) VALUES 
(2, 1109421300, 1, 41, 41, 1, 1, '2025-12-05', false, 3, 2, true, true, '2025-12-05T17:10:34.77745', '2025-12-05T17:25:47.865937');

SELECT setval('user_gamification_id_seq', (SELECT COALESCE(MAX(id), 1) FROM user_gamification));

-- 11. USER_ACHIEVEMENTS (31 records)
INSERT INTO user_achievements (id, user_id, achievement_id, progress, max_progress, unlocked_at, notified, created_at) VALUES 
(32, 1109421300, 'first_expense', 1, 1, '2025-12-05T17:20:20.653131', false, '2025-12-05T17:10:52.439626'),
(33, 1109421300, 'first_income', 1, 1, '2025-12-05T17:25:54.260449', false, '2025-12-05T17:10:52.439626'),
(34, 1109421300, 'week_streak', 1, 7, NULL, false, '2025-12-05T17:10:52.439626'),
(35, 1109421300, 'month_streak', 1, 30, NULL, false, '2025-12-05T17:10:52.439626'),
(36, 1109421300, 'quarter_streak', 1, 90, NULL, false, '2025-12-05T17:10:52.439626'),
(37, 1109421300, 'year_streak', 1, 365, NULL, false, '2025-12-05T17:10:52.439626'),
(38, 1109421300, 'century', 7, 100, NULL, false, '2025-12-05T17:10:52.439626'),
(39, 1109421300, 'thousand', 7, 1000, NULL, false, '2025-12-05T17:10:52.439626'),
(40, 1109421300, 'detailed_tracker', 0, 50, NULL, false, '2025-12-05T17:10:52.439626'),
(41, 1109421300, 'first_saving', 0, 1, NULL, false, '2025-12-05T17:10:52.439626'),
(42, 1109421300, 'save_10', 0, 10, NULL, false, '2025-12-05T17:10:52.439626'),
(43, 1109421300, 'save_20', 0, 20, NULL, false, '2025-12-05T17:10:52.439626'),
(44, 1109421300, 'save_30', 0, 30, NULL, false, '2025-12-05T17:10:52.439626'),
(45, 1109421300, 'save_50', 0, 50, NULL, false, '2025-12-05T17:10:52.439626'),
(46, 1109421300, 'budget_master', 0, 1, NULL, false, '2025-12-05T17:10:52.439626'),
(47, 1109421300, 'analyst', 0, 10, NULL, false, '2025-12-05T17:10:52.439626'),
(48, 1109421300, 'report_lover', 0, 5, NULL, false, '2025-12-05T17:10:52.439626'),
(49, 1109421300, 'pattern_finder', 0, 1, NULL, false, '2025-12-05T17:10:52.439626'),
(50, 1109421300, 'expense_detective', 0, 1, NULL, false, '2025-12-05T17:10:52.439626'),
(51, 1109421300, 'debt_slayer', 0, 5, NULL, false, '2025-12-05T17:10:52.439626'),
(52, 1109421300, 'debt_free', 0, 1, NULL, false, '2025-12-05T17:10:52.439626'),
(53, 1109421300, 'subscription_audit', 0, 3, NULL, false, '2025-12-05T17:10:52.439626'),
(54, 1109421300, 'early_bird', 0, 1, NULL, false, '2025-12-05T17:10:52.439626'),
(55, 1109421300, 'night_owl', 0, 1, NULL, false, '2025-12-05T17:10:52.439626'),
(56, 1109421300, 'multi_currency', 0, 3, NULL, false, '2025-12-05T17:10:52.439626'),
(57, 1109421300, 'exporter', 0, 1, NULL, false, '2025-12-05T17:10:52.439626'),
(58, 1109421300, 'weekend_warrior', 0, 4, NULL, false, '2025-12-05T17:10:52.439626'),
(59, 1109421300, 'perfect_month', 0, 1, NULL, false, '2025-12-05T17:10:52.439626'),
(60, 1109421300, 'financial_guru', 0, 20, NULL, false, '2025-12-05T17:10:52.439626'),
(61, 1109421300, 'zen_master', 0, 1, NULL, false, '2025-12-05T17:10:52.439626'),
(62, 1109421300, 'legend', 0, 1, NULL, false, '2025-12-05T17:10:52.439626');

SELECT setval('user_achievements_id_seq', (SELECT COALESCE(MAX(id), 1) FROM user_achievements));

-- 12. DAILY_QUESTS (1 record)
INSERT INTO daily_quests (id, user_id, quest_date, quests, all_completed, bonus_claimed, created_at) VALUES 
(1, 1109421300, '2025-12-06', '[{"id":"add_expense","xp":5,"type":"expense","target":1,"progress":0,"title_en":"Add expense","title_ky":"Чыгым кош","title_ru":"Добавь расход","completed":false},{"id":"add_income","xp":5,"type":"income","target":1,"progress":0,"title_en":"Add income","title_ky":"Кирешеңди кош","title_ru":"Добавь доход","completed":false},{"id":"add_description","xp":5,"type":"description","target":1,"progress":0,"title_en":"Add description","title_ky":"Сүрөттөмө кош","title_ru":"Добавь описание","completed":false}]', false, false, '2025-12-05T22:33:56.21004');

SELECT setval('daily_quests_id_seq', (SELECT COALESCE(MAX(id), 1) FROM daily_quests));

-- 13. XP_HISTORY (4 records)
INSERT INTO xp_history (id, user_id, amount, reason, details, created_at) VALUES 
(1, 1109421300, 7, 'transaction', '{"type":"income","multiplier":1,"transaction_id":19}', '2025-12-05T17:14:09.543311'),
(2, 1109421300, 7, 'transaction', '{"type":"expenses","multiplier":1,"transaction_id":80}', '2025-12-05T17:14:09.785565'),
(3, 1109421300, 7, 'transaction', '{"type":"expenses","multiplier":1,"transaction_id":81}', '2025-12-05T17:14:10.016712'),
(4, 1109421300, 10, 'achievement', '{"achievement_id":"first_income"}', '2025-12-05T17:26:01.487314');

SELECT setval('xp_history_id_seq', (SELECT COALESCE(MAX(id), 1) FROM xp_history));

-- 14. SAVED_REPORTS (5 records)
INSERT INTO saved_reports (id, user_id, report_type, title, period_start, period_end, pdf_url, format, report_data, created_at, expires_at) VALUES 
(11, 8275142492, 'weekly', 'Недельный отчёт', '2025-11-22', '2025-11-28', 'https://pub-cdn.apitemplate.io/2025/11/15624b58-7725-4142-b730-6ec9cfb47ddc.pdf', 'pdf', '{"balance":"-17.00","chat_id":"8275142492","user_id":"8275142492","avg_daily":"502","daily_data":[{"day":"28.11","expenses":3500},{"day":"29.11","expenses":17}],"first_name":"Чынгыз","period_end":"28.11.2025","report_type":"weekly","income_count":"1","income_total":"3500.00","period_start":"22.11.2025","expenses_count":"2","expenses_total":"3517.00","top_categories":[{"total":3500,"percent":99.5,"category":"Одежда"},{"total":17,"percent":0.5,"category":"Транспорт"}],"period_end_date":"2025-11-28","expenses_details":[{"date":"29.11","amount":17,"category":"Транспорт"},{"date":"28.11","amount":3500,"category":"Одежда"}],"period_start_date":"2025-11-22"}', '2025-11-28T22:30:27.700014+00:00', NULL),
(17, 1222583683, 'weekly', 'Недельный отчёт', '2025-11-23', '2025-11-29', 'https://pub-cdn.apitemplate.io/2025/11/f18c5c3f-2d24-4500-9850-6c2071cf6bec.pdf', 'pdf', '{}', '2025-11-29T05:48:13.1117+00:00', NULL),
(19, 1222583683, 'weekly', 'Недельный отчёт', '2025-11-23', '2025-11-29', 'https://pub-cdn.apitemplate.io/2025/11/169722f3-8b6c-4c10-b9f8-b9dee4c0732a.pdf', 'pdf', '{}', '2025-11-29T05:50:50.714175+00:00', NULL),
(20, 8275142492, 'weekly', 'Недельный отчёт', '2025-11-24', '2025-11-30', 'https://pub-cdn.apitemplate.io/2025/11/dadf043d-65b7-4f09-b0ba-3921c22ab489.pdf', 'pdf', '{}', '2025-11-30T04:00:09.224235+00:00', NULL),
(21, 665871760, 'monthly', 'Месячный отчёт', '2025-12-01', '2025-12-31', 'https://pub-cdn.apitemplate.io/2025/12/53264021-4b2a-4d5c-88e5-9fe41213e9dc.pdf', 'pdf', '{}', '2025-12-01T04:00:08.84312+00:00', NULL);

SELECT setval('saved_reports_id_seq', (SELECT COALESCE(MAX(id), 1) FROM saved_reports));

-- =====================================================
-- DONE! All data imported successfully
-- =====================================================
