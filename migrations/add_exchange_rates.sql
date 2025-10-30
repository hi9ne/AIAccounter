-- ============================================
-- AI Accounter v2.1: Exchange Rates Migration
-- Создание таблицы для хранения курсов валют
-- ============================================

-- Создание таблицы exchange_rates
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(12, 6) NOT NULL,
    source VARCHAR(100) DEFAULT 'NBKR',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT valid_from_currency CHECK (from_currency IN ('KGS', 'USD', 'EUR', 'RUB')),
    CONSTRAINT valid_to_currency CHECK (to_currency IN ('KGS', 'USD', 'EUR', 'RUB')),
    CONSTRAINT positive_rate CHECK (rate > 0),
    CONSTRAINT unique_rate_per_day UNIQUE(date, from_currency, to_currency)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_rates_date ON exchange_rates(date DESC);
CREATE INDEX IF NOT EXISTS idx_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_rates_latest ON exchange_rates(date DESC, from_currency, to_currency);

-- Комментарии
COMMENT ON TABLE exchange_rates IS 'Курсы валют (обновляются ежедневно)';
COMMENT ON COLUMN exchange_rates.date IS 'Дата курса';
COMMENT ON COLUMN exchange_rates.from_currency IS 'Из какой валюты';
COMMENT ON COLUMN exchange_rates.to_currency IS 'В какую валюту';
COMMENT ON COLUMN exchange_rates.rate IS 'Курс конвертации (1 from = rate * to)';
COMMENT ON COLUMN exchange_rates.source IS 'Источник курса (NBKR, ExchangeRate-API, etc)';

-- ============================================
-- Заполнение начальными данными (примерные курсы на 30.10.2025)
-- ============================================

-- Курсы от KGS к другим валютам
INSERT INTO exchange_rates (date, from_currency, to_currency, rate, source) VALUES
    (CURRENT_DATE, 'KGS', 'USD', 0.0115, 'NBKR'),  -- 1 KGS = 0.0115 USD (примерно 87 KGS за 1 USD)
    (CURRENT_DATE, 'KGS', 'EUR', 0.0106, 'NBKR'),  -- 1 KGS = 0.0106 EUR (примерно 94 KGS за 1 EUR)
    (CURRENT_DATE, 'KGS', 'RUB', 1.10, 'NBKR'),    -- 1 KGS = 1.10 RUB (примерно 0.91 KGS за 1 RUB)
    (CURRENT_DATE, 'KGS', 'KGS', 1.0, 'SYSTEM')    -- 1 KGS = 1 KGS
ON CONFLICT (date, from_currency, to_currency) DO NOTHING;

-- Обратные курсы (от USD, EUR, RUB к KGS)
INSERT INTO exchange_rates (date, from_currency, to_currency, rate, source) VALUES
    (CURRENT_DATE, 'USD', 'KGS', 87.0, 'NBKR'),    -- 1 USD = 87 KGS
    (CURRENT_DATE, 'EUR', 'KGS', 94.5, 'NBKR'),    -- 1 EUR = 94.5 KGS
    (CURRENT_DATE, 'RUB', 'KGS', 0.91, 'NBKR'),    -- 1 RUB = 0.91 KGS
    (CURRENT_DATE, 'USD', 'USD', 1.0, 'SYSTEM'),
    (CURRENT_DATE, 'EUR', 'EUR', 1.0, 'SYSTEM'),
    (CURRENT_DATE, 'RUB', 'RUB', 1.0, 'SYSTEM')
ON CONFLICT (date, from_currency, to_currency) DO NOTHING;

-- Кросс-курсы (USD <-> EUR, USD <-> RUB, EUR <-> RUB)
INSERT INTO exchange_rates (date, from_currency, to_currency, rate, source) VALUES
    (CURRENT_DATE, 'USD', 'EUR', 0.92, 'NBKR'),    -- 1 USD = 0.92 EUR
    (CURRENT_DATE, 'EUR', 'USD', 1.09, 'NBKR'),    -- 1 EUR = 1.09 USD
    (CURRENT_DATE, 'USD', 'RUB', 96.0, 'NBKR'),    -- 1 USD = 96 RUB
    (CURRENT_DATE, 'RUB', 'USD', 0.0104, 'NBKR'),  -- 1 RUB = 0.0104 USD
    (CURRENT_DATE, 'EUR', 'RUB', 104.5, 'NBKR'),   -- 1 EUR = 104.5 RUB
    (CURRENT_DATE, 'RUB', 'EUR', 0.0096, 'NBKR')   -- 1 RUB = 0.0096 EUR
ON CONFLICT (date, from_currency, to_currency) DO NOTHING;

-- ============================================
-- Функция для автоматического вычисления обратного курса
-- ============================================

CREATE OR REPLACE FUNCTION calculate_reverse_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- Если вставляется прямой курс, автоматически создаём обратный
    IF NEW.from_currency != NEW.to_currency THEN
        INSERT INTO exchange_rates (date, from_currency, to_currency, rate, source)
        VALUES (NEW.date, NEW.to_currency, NEW.from_currency, 1.0 / NEW.rate, NEW.source || '_REVERSE')
        ON CONFLICT (date, from_currency, to_currency) 
        DO UPDATE SET 
            rate = 1.0 / NEW.rate,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического создания обратных курсов
CREATE TRIGGER trg_auto_reverse_rate
    AFTER INSERT OR UPDATE ON exchange_rates
    FOR EACH ROW
    WHEN (NEW.from_currency != NEW.to_currency AND NEW.source NOT LIKE '%_REVERSE')
    EXECUTE FUNCTION calculate_reverse_rate();

-- ============================================
-- Функция для получения актуального курса
-- ============================================

CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(12, 6) AS $$
DECLARE
    v_rate DECIMAL(12, 6);
BEGIN
    -- Если валюты одинаковые, курс = 1
    IF p_from_currency = p_to_currency THEN
        RETURN 1.0;
    END IF;
    
    -- Ищем курс на указанную дату
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = UPPER(p_from_currency)
      AND to_currency = UPPER(p_to_currency)
      AND date = p_date
    LIMIT 1;
    
    -- Если не найдено на эту дату, ищем последний доступный
    IF v_rate IS NULL THEN
        SELECT rate INTO v_rate
        FROM exchange_rates
        WHERE from_currency = UPPER(p_from_currency)
          AND to_currency = UPPER(p_to_currency)
          AND date <= p_date
        ORDER BY date DESC
        LIMIT 1;
    END IF;
    
    -- Если всё ещё не найдено, возвращаем NULL
    IF v_rate IS NULL THEN
        RAISE NOTICE 'Exchange rate not found for % -> % on date %', p_from_currency, p_to_currency, p_date;
        RETURN NULL;
    END IF;
    
    RETURN v_rate;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Функция для конвертации суммы
-- ============================================

CREATE OR REPLACE FUNCTION convert_amount(
    p_amount DECIMAL(10, 2),
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_rate DECIMAL(12, 6);
    v_result DECIMAL(10, 2);
BEGIN
    -- Получаем курс
    v_rate := get_exchange_rate(p_from_currency, p_to_currency, p_date);
    
    IF v_rate IS NULL THEN
        RAISE EXCEPTION 'Cannot convert % from % to %: rate not found', p_amount, p_from_currency, p_to_currency;
    END IF;
    
    -- Конвертируем
    v_result := ROUND(p_amount * v_rate, 2);
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Представление для последних курсов
-- ============================================

CREATE OR REPLACE VIEW v_latest_rates AS
SELECT DISTINCT ON (from_currency, to_currency)
    from_currency,
    to_currency,
    rate,
    date,
    source,
    created_at
FROM exchange_rates
ORDER BY from_currency, to_currency, date DESC;

COMMENT ON VIEW v_latest_rates IS 'Последние актуальные курсы валют';

-- ============================================
-- Тестовые запросы (для проверки)
-- ============================================

-- Проверка курсов
-- SELECT * FROM exchange_rates ORDER BY date DESC, from_currency, to_currency;

-- Проверка функции получения курса
-- SELECT get_exchange_rate('USD', 'KGS', CURRENT_DATE);
-- SELECT get_exchange_rate('KGS', 'USD', CURRENT_DATE);

-- Проверка функции конвертации
-- SELECT convert_amount(100, 'USD', 'KGS', CURRENT_DATE);
-- SELECT convert_amount(10000, 'KGS', 'USD', CURRENT_DATE);

-- Проверка последних курсов
-- SELECT * FROM v_latest_rates;

-- ============================================
-- Очистка старых курсов (опционально)
-- Хранить курсы за последние 365 дней
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_rates()
RETURNS void AS $$
BEGIN
    DELETE FROM exchange_rates
    WHERE date < CURRENT_DATE - INTERVAL '365 days';
    
    RAISE NOTICE 'Cleaned up exchange rates older than 365 days';
END;
$$ LANGUAGE plpgsql;

-- Можно настроить автоматический запуск через pg_cron (если установлен):
-- SELECT cron.schedule('cleanup-rates', '0 0 1 * *', 'SELECT cleanup_old_rates()');

-- ============================================
-- Готово! Миграция завершена
-- ============================================

-- Проверка структуры
\d exchange_rates

-- Статистика
SELECT 'Migration completed successfully. Exchange rates table created.' AS status;
SELECT COUNT(*) AS total_rates FROM exchange_rates;
SELECT COUNT(DISTINCT date) AS days_with_rates FROM exchange_rates;
