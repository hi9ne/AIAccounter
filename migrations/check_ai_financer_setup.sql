-- ================================================
-- AI Financer Setup Checker
-- ================================================
-- Проверяет что все компоненты настроены правильно

\echo '🔍 Проверка настройки AI Financer...'
\echo ''

-- ================================================
-- 1. ПРОВЕРКА РАСШИРЕНИЙ
-- ================================================

\echo '📦 Проверка расширений:'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
        THEN '✅ pgvector установлен'
        ELSE '❌ pgvector НЕ установлен - выполните CREATE EXTENSION vector;'
    END as vector_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') 
        THEN '✅ uuid-ossp установлен'
        ELSE '⚠️  uuid-ossp НЕ установлен (опционально)'
    END as uuid_status;

\echo ''

-- ================================================
-- 2. ПРОВЕРКА ТАБЛИЦ
-- ================================================

\echo '📊 Проверка таблиц:'

DO $$
DECLARE
    tables_status TEXT;
BEGIN
    -- Проверяем основные таблицы
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'income') THEN
        RAISE NOTICE '✅ Таблица income существует (из основной БД)';
    ELSE
        RAISE NOTICE '❌ Таблица income НЕ найдена';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        RAISE NOTICE '✅ Таблица expenses существует (из основной БД)';
    ELSE
        RAISE NOTICE '❌ Таблица expenses НЕ найдена';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'income_embeddings') THEN
        RAISE NOTICE '✅ Таблица income_embeddings создана';
    ELSE
        RAISE NOTICE '❌ Таблица income_embeddings НЕ создана';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses_embeddings') THEN
        RAISE NOTICE '✅ Таблица expenses_embeddings создана';
    ELSE
        RAISE NOTICE '❌ Таблица expenses_embeddings НЕ создана';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'n8n_chat_histories_tranzactions') THEN
        RAISE NOTICE '✅ Таблица n8n_chat_histories_tranzactions создана';
    ELSE
        RAISE NOTICE '❌ Таблица n8n_chat_histories_tranzactions НЕ создана';
    END IF;
END $$;

\echo ''

-- ================================================
-- 3. ПРОВЕРКА ФУНКЦИЙ
-- ================================================

\echo '⚙️  Проверка функций:'

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'match_income_documents'
    ) THEN
        RAISE NOTICE '✅ Функция match_income_documents создана';
    ELSE
        RAISE NOTICE '❌ Функция match_income_documents НЕ создана';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'match_expenses_documents'
    ) THEN
        RAISE NOTICE '✅ Функция match_expenses_documents создана';
    ELSE
        RAISE NOTICE '❌ Функция match_expenses_documents НЕ создана';
    END IF;
END $$;

\echo ''

-- ================================================
-- 4. ПРОВЕРКА ИНДЕКСОВ
-- ================================================

\echo '📇 Проверка индексов:'

SELECT 
    tablename,
    indexname,
    '✅' as status
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename IN ('income_embeddings', 'expenses_embeddings')
ORDER BY tablename, indexname;

\echo ''

-- ================================================
-- 5. ПРОВЕРКА ДАННЫХ
-- ================================================

\echo '📈 Статистика данных:'

SELECT 
    '📊 Доходов в БД' as metric,
    COUNT(*)::TEXT as count
FROM income

UNION ALL

SELECT 
    '📊 Расходов в БД' as metric,
    COUNT(*)::TEXT as count
FROM expenses

UNION ALL

SELECT 
    '🧠 Embeddings доходов' as metric,
    COUNT(*)::TEXT as count
FROM income_embeddings

UNION ALL

SELECT 
    '🧠 Embeddings расходов' as metric,
    COUNT(*)::TEXT as count
FROM expenses_embeddings

UNION ALL

SELECT 
    '💬 Сообщений в истории' as metric,
    COUNT(*)::TEXT as count
FROM n8n_chat_histories_tranzactions;

\echo ''

-- ================================================
-- 6. ПРОВЕРКА RLS (Row Level Security)
-- ================================================

\echo '🔒 Проверка Row Level Security:'

SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '🔒 RLS включен'
        ELSE '🔓 RLS отключен'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('dohod', 'rashod')
ORDER BY tablename;

\echo ''

-- ================================================
-- 7. ПРОВЕРКА ПРАВ ДОСТУПА
-- ================================================

\echo '🔑 Проверка прав доступа:'

SELECT 
    grantee,
    table_name,
    STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
    AND table_name IN ('income_embeddings', 'expenses_embeddings')
    AND grantee IN ('authenticated', 'anon', 'service_role')
GROUP BY grantee, table_name
ORDER BY table_name, grantee;

\echo ''

-- ================================================
-- 8. ТЕСТИРОВАНИЕ ФУНКЦИЙ
-- ================================================

\echo '🧪 Тестирование функций:'

-- Тест векторных функций
\echo '   Тест match_income_documents():'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_income_documents') THEN
        RAISE NOTICE '✅ Функция match_income_documents доступна';
    ELSE
        RAISE NOTICE '❌ Функция match_income_documents не найдена';
    END IF;
END $$;

\echo ''

\echo '   Тест match_expenses_documents():'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'match_expenses_documents') THEN
        RAISE NOTICE '✅ Функция match_expenses_documents доступна';
    ELSE
        RAISE NOTICE '❌ Функция match_expenses_documents не найдена';
    END IF;
END $$;

\echo ''

-- ================================================
-- 9. ПРОВЕРКА ВЕКТОРНОГО ПОИСКА
-- ================================================

\echo '🔍 Проверка векторного расширения:'

DO $$
DECLARE
    test_vector vector(3);
BEGIN
    -- Тест создания вектора
    test_vector := '[1,2,3]'::vector;
    RAISE NOTICE '✅ Векторный тип работает: %', test_vector;
    
    -- Тест косинусного расстояния
    RAISE NOTICE '✅ Косинусное расстояние: %', 
        ('[1,2,3]'::vector <=> '[1,2,3]'::vector);
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Ошибка векторного типа: %', SQLERRM;
END $$;

\echo ''

-- ================================================
-- 10. ИТОГОВЫЙ ОТЧЕТ
-- ================================================

\echo '📋 ИТОГОВЫЙ ОТЧЕТ:'
\echo '════════════════════════════════════════'

DO $$
DECLARE
    total_checks INTEGER := 0;
    passed_checks INTEGER := 0;
    tables_ok BOOLEAN;
    functions_ok BOOLEAN;
    vector_ok BOOLEAN;
BEGIN
    -- Проверка таблиц
    tables_ok := (
        SELECT COUNT(*) = 5
        FROM information_schema.tables
        WHERE table_name IN ('income', 'expenses', 'income_embeddings', 'expenses_embeddings', 'n8n_chat_histories_tranzactions')
    );
    
    -- Проверка функций
    functions_ok := (
        SELECT COUNT(*) = 2
        FROM pg_proc
        WHERE proname IN ('match_income_documents', 'match_expenses_documents')
    );
    
    -- Проверка векторного расширения
    vector_ok := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector');
    
    total_checks := 3;
    
    IF tables_ok THEN 
        passed_checks := passed_checks + 1;
        RAISE NOTICE '✅ Таблицы: ОК (5/5)';
    ELSE
        RAISE NOTICE '❌ Таблицы: ОШИБКА';
    END IF;
    
    IF functions_ok THEN 
        passed_checks := passed_checks + 1;
        RAISE NOTICE '✅ Функции: ОК (2/2)';
    ELSE
        RAISE NOTICE '❌ Функции: ОШИБКА';
    END IF;
    
    IF vector_ok THEN 
        passed_checks := passed_checks + 1;
        RAISE NOTICE '✅ Векторное расширение: ОК';
    ELSE
        RAISE NOTICE '❌ Векторное расширение: НЕ УСТАНОВЛЕНО';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════';
    
    IF passed_checks = total_checks THEN
        RAISE NOTICE '🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! (%/%) ', passed_checks, total_checks;
        RAISE NOTICE '✅ Система готова к работе!';
        RAISE NOTICE '';
        RAISE NOTICE '📝 Следующие шаги:';
        RAISE NOTICE '1. Настройте credentials в n8n';
        RAISE NOTICE '2. Импортируйте workflows';
        RAISE NOTICE '3. Протестируйте через Telegram бота';
    ELSE
        RAISE NOTICE '⚠️  ПРОЙДЕНО %/% ПРОВЕРОК', passed_checks, total_checks;
        RAISE NOTICE '❌ Требуется дополнительная настройка!';
        RAISE NOTICE '';
        RAISE NOTICE '📝 См. AI_FINANCER_SETUP_GUIDE.md';
    END IF;
    
    RAISE NOTICE '════════════════════════════════════════';
END $$;

