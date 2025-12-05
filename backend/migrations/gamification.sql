-- Миграция: Геймификация
-- Версия: 1.0
-- Дата: 2025-12-05

-- ============================================
-- Таблица: achievements (справочник достижений)
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    name_ky VARCHAR(100),
    description TEXT,
    description_en TEXT,
    description_ky TEXT,
    category VARCHAR(50) NOT NULL, -- tracking, savings, analytics, goals, debts, special, rare
    icon VARCHAR(10) DEFAULT '🏆',
    xp_reward INTEGER DEFAULT 0,
    rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary
    condition_type VARCHAR(50) NOT NULL, -- count, streak, percentage, combo
    condition_value INTEGER DEFAULT 1,
    condition_extra JSONB, -- дополнительные условия
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Таблица: user_gamification (профиль игрока)
-- ============================================
CREATE TABLE IF NOT EXISTS user_gamification (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Уровень и опыт
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    
    -- Streak
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    grace_used_this_month BOOLEAN DEFAULT FALSE,
    
    -- Статистика
    total_transactions INTEGER DEFAULT 0,
    total_achievements INTEGER DEFAULT 0,
    
    -- Настройки
    notifications_enabled BOOLEAN DEFAULT TRUE,
    show_on_home BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);

-- ============================================
-- Таблица: user_achievements (достижения пользователя)
-- ============================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0, -- текущий прогресс для прогрессивных достижений
    max_progress INTEGER DEFAULT 1, -- максимальный прогресс
    unlocked_at TIMESTAMP, -- NULL если не разблокировано
    notified BOOLEAN DEFAULT FALSE, -- отправлено ли уведомление
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, unlocked_at) WHERE unlocked_at IS NOT NULL;

-- ============================================
-- Таблица: daily_quests (ежедневные задания)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_quests (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    quest_date DATE DEFAULT CURRENT_DATE,
    
    -- Задания хранятся как JSON массив
    -- [{id: "add_expense", title: "...", completed: false, progress: 0, target: 1, xp: 5}]
    quests JSONB NOT NULL DEFAULT '[]',
    
    -- Бонус за выполнение всех
    all_completed BOOLEAN DEFAULT FALSE,
    bonus_claimed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, quest_date)
);

-- Индекс для быстрого поиска по user_id и дате
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date);

-- ============================================
-- Таблица: xp_history (история начисления XP)
-- ============================================
CREATE TABLE IF NOT EXISTS xp_history (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL, -- transaction, achievement, daily_quest, streak_bonus, level_up
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Индекс для истории
CREATE INDEX IF NOT EXISTS idx_xp_history_user_id ON xp_history(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_created ON xp_history(user_id, created_at DESC);

-- ============================================
-- Заполнение справочника достижений
-- ============================================

-- Категория: Учёт и дисциплина (tracking)
INSERT INTO achievements (id, name, name_en, name_ky, description, description_en, description_ky, category, icon, xp_reward, rarity, condition_type, condition_value, sort_order) VALUES
('first_expense', 'Первый шаг', 'First Step', 'Биринчи кадам', 'Добавь первый расход', 'Add your first expense', 'Биринчи чыгымыңды кош', 'tracking', '👣', 10, 'common', 'count', 1, 1),
('first_income', 'Первая зарплата', 'First Salary', 'Биринчи эмгек акы', 'Добавь первый доход', 'Add your first income', 'Биринчи кирешеңди кош', 'tracking', '💵', 10, 'common', 'count', 1, 2),
('week_streak', 'Неделя дисциплины', 'Week of Discipline', 'Тартиптин жумасы', 'Веди учёт 7 дней подряд', 'Track for 7 days in a row', '7 күн катары менен эсеп жүргүз', 'tracking', '🔥', 50, 'common', 'streak', 7, 3),
('month_streak', 'Месяц порядка', 'Month of Order', 'Тартиптин айы', 'Веди учёт 30 дней подряд', 'Track for 30 days in a row', '30 күн катары менен эсеп жүргүз', 'tracking', '🔥', 200, 'rare', 'streak', 30, 4),
('quarter_streak', 'Квартальный марафон', 'Quarterly Marathon', 'Чейректик марафон', 'Веди учёт 90 дней подряд', 'Track for 90 days in a row', '90 күн катары менен эсеп жүргүз', 'tracking', '🏃', 500, 'epic', 'streak', 90, 5),
('year_streak', 'Годовой чемпион', 'Annual Champion', 'Жылдык чемпион', 'Веди учёт 365 дней подряд', 'Track for 365 days in a row', '365 күн катары менен эсеп жүргүз', 'tracking', '👑', 2000, 'legendary', 'streak', 365, 6),
('century', 'Сотня', 'Century', 'Жүздүк', 'Добавь 100 транзакций', 'Add 100 transactions', '100 транзакция кош', 'tracking', '💯', 100, 'common', 'count', 100, 7),
('thousand', 'Тысячник', 'Thousand Club', 'Миңдик', 'Добавь 1000 транзакций', 'Add 1000 transactions', '1000 транзакция кош', 'tracking', '🎯', 500, 'rare', 'count', 1000, 8),
('detailed_tracker', 'Педант', 'Perfectionist', 'Тактык', 'Добавь описание к 50 транзакциям', 'Add descriptions to 50 transactions', '50 транзакцияга сүрөттөмө кош', 'tracking', '📝', 100, 'common', 'count', 50, 9)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward;

-- Категория: Накопления и экономия (savings)
INSERT INTO achievements (id, name, name_en, name_ky, description, description_en, description_ky, category, icon, xp_reward, rarity, condition_type, condition_value, sort_order) VALUES
('first_saving', 'Копилка', 'Piggy Bank', 'Куту', 'Сэкономь в первый месяц', 'Save money in your first month', 'Биринчи айда акча топто', 'savings', '🐷', 50, 'common', 'percentage', 1, 10),
('save_10', 'Экономист', 'Economist', 'Экономист', 'Сэкономь 10% от дохода за месяц', 'Save 10% of monthly income', 'Айлык кирешенин 10% топто', 'savings', '📈', 100, 'common', 'percentage', 10, 11),
('save_20', 'Бережливый', 'Thrifty', 'Үнөмчүл', 'Сэкономь 20% от дохода за месяц', 'Save 20% of monthly income', 'Айлык кирешенин 20% топто', 'savings', '💪', 150, 'rare', 'percentage', 20, 12),
('save_30', 'Финансовый ниндзя', 'Financial Ninja', 'Финансылык ниндзя', 'Сэкономь 30% от дохода за месяц', 'Save 30% of monthly income', 'Айлык кирешенин 30% топто', 'savings', '🥷', 250, 'epic', 'percentage', 30, 13),
('save_50', 'Аскет', 'Ascetic', 'Аскет', 'Сэкономь 50% от дохода за месяц', 'Save 50% of monthly income', 'Айлык кирешенин 50% топто', 'savings', '🧘', 500, 'legendary', 'percentage', 50, 14),
('budget_master', 'Мастер бюджета', 'Budget Master', 'Бюджет устаты', 'Не превысь бюджет за месяц', 'Stay within budget for a month', 'Бир ай бюджеттен ашпа', 'savings', '🎖️', 200, 'rare', 'combo', 1, 15)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward;

-- Категория: Аналитика и контроль (analytics)
INSERT INTO achievements (id, name, name_en, name_ky, description, description_en, description_ky, category, icon, xp_reward, rarity, condition_type, condition_value, sort_order) VALUES
('analyst', 'Аналитик', 'Analyst', 'Аналитик', 'Просмотри аналитику 10 раз', 'View analytics 10 times', 'Аналитиканы 10 жолу көр', 'analytics', '📊', 30, 'common', 'count', 10, 20),
('report_lover', 'Любитель отчётов', 'Report Enthusiast', 'Отчет сүйүүчү', 'Сгенерируй 5 отчётов', 'Generate 5 reports', '5 отчет түз', 'analytics', '📋', 50, 'common', 'count', 5, 21),
('pattern_finder', 'Охотник за паттернами', 'Pattern Hunter', 'Паттерн издөөчү', 'Используй AI-аналитику', 'Use AI analytics', 'AI-аналитиканы колдон', 'analytics', '🤖', 50, 'common', 'count', 1, 22),
('expense_detective', 'Детектив расходов', 'Expense Detective', 'Чыгым детективи', 'Найди свою самую затратную категорию', 'Find your most expensive category', 'Эң кымбат категорияңды тап', 'analytics', '🔍', 25, 'common', 'count', 1, 23)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward;

-- Категория: Долги и подписки (debts)
INSERT INTO achievements (id, name, name_en, name_ky, description, description_en, description_ky, category, icon, xp_reward, rarity, condition_type, condition_value, sort_order) VALUES
('debt_slayer', 'Убийца долгов', 'Debt Slayer', 'Карыз жок кылуучу', 'Закрой 5 долгов', 'Close 5 debts', '5 карыз жап', 'debts', '⚔️', 150, 'rare', 'count', 5, 30),
('debt_free', 'Свободен от долгов', 'Debt Free', 'Карызсыз', 'Закрой все долги', 'Close all debts', 'Бардык карыздарды жап', 'debts', '🦅', 300, 'epic', 'combo', 1, 31),
('subscription_audit', 'Аудитор подписок', 'Subscription Auditor', 'Жазылуу аудитору', 'Добавь все свои подписки', 'Add all your subscriptions', 'Бардык жазылууларды кош', 'debts', '📱', 50, 'common', 'count', 3, 32)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward;

-- Категория: Особые достижения (special)
INSERT INTO achievements (id, name, name_en, name_ky, description, description_en, description_ky, category, icon, xp_reward, rarity, condition_type, condition_value, sort_order) VALUES
('early_bird', 'Ранняя пташка', 'Early Bird', 'Эрте турган', 'Добавь запись до 7:00', 'Add entry before 7:00 AM', '7:00 чейин жазуу кош', 'special', '🐦', 25, 'common', 'count', 1, 40),
('night_owl', 'Ночная сова', 'Night Owl', 'Түнкү байкуш', 'Добавь запись после 23:00', 'Add entry after 11:00 PM', '23:00 дон кийин жазуу кош', 'special', '🦉', 25, 'common', 'count', 1, 41),
('multi_currency', 'Мультивалютный', 'Multi-Currency', 'Көп валюталык', 'Используй 3+ валюты', 'Use 3+ currencies', '3+ валюта колдон', 'special', '💱', 75, 'common', 'count', 3, 42),
('exporter', 'Архивариус', 'Archivist', 'Архивариус', 'Экспортируй данные', 'Export your data', 'Маалыматтарды экспортто', 'special', '💾', 25, 'common', 'count', 1, 43),
('weekend_warrior', 'Воин выходных', 'Weekend Warrior', 'Дем алыш жоокери', 'Веди учёт в выходные 4 недели подряд', 'Track on weekends for 4 weeks straight', '4 жума катары дем алышта эсеп жүргүз', 'special', '⚔️', 100, 'rare', 'count', 4, 44)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward;

-- Категория: Редкие достижения (rare)
INSERT INTO achievements (id, name, name_en, name_ky, description, description_en, description_ky, category, icon, xp_reward, rarity, condition_type, condition_value, sort_order) VALUES
('perfect_month', 'Идеальный месяц', 'Perfect Month', 'Идеалдуу ай', 'Streak + экономия + бюджет в норме', 'Streak + savings + budget on track', 'Streak + үнөм + бюджет нормада', 'rare', '✨', 500, 'epic', 'combo', 1, 50),
('financial_guru', 'Финансовый гуру', 'Financial Guru', 'Финансылык гуру', 'Получи 20 базовых достижений', 'Get 20 basic achievements', '20 негизги жетишкендик ал', 'rare', '🧙', 1000, 'epic', 'count', 20, 51),
('zen_master', 'Дзен мастер', 'Zen Master', 'Дзен устаты', '6 месяцев streak + 20% экономии', '6 months streak + 20% savings', '6 ай streak + 20% үнөм', 'rare', '☯️', 2000, 'legendary', 'combo', 1, 52),
('legend', 'Легенда', 'Legend', 'Легенда', 'Год использования + все достижения', 'One year + all achievements', 'Бир жыл + бардык жетишкендиктер', 'rare', '🌟', 5000, 'legendary', 'combo', 1, 53)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward;

-- ============================================
-- Функция: Автоматическое обновление updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_gamification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для user_gamification
DROP TRIGGER IF EXISTS trigger_update_gamification_timestamp ON user_gamification;
CREATE TRIGGER trigger_update_gamification_timestamp
    BEFORE UPDATE ON user_gamification
    FOR EACH ROW
    EXECUTE FUNCTION update_gamification_timestamp();

-- ============================================
-- Константы уровней (для справки)
-- ============================================
COMMENT ON TABLE user_gamification IS 'Уровни:
1: Новичок (0 XP)
2: Ученик (100 XP)
3: Практикант (250 XP)
4: Помощник (450 XP)
5: Бухгалтер (750 XP)
6: Экономист (1150 XP)
7: Финансист (1650 XP)
8: Аналитик (2250 XP)
9: Эксперт (3000 XP)
10: Мастер (4000 XP)
11: Гуру (5500 XP)
12: Магистр (7500 XP)
13: Грандмастер (10000 XP)
14: Легенда (15000 XP)
15: Финансовый бог (25000 XP)';
