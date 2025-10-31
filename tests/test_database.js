/**
 * AIAccounter v2.4.0 Database Testing Script
 * Проверяет успешность миграций и структуру БД
 */

const { Client } = require('pg');

const DB_URL = 'postgresql://postgres.ggcmoikpztvbatstcnai:AIAccounter_2025@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

const TESTS = {
    tables: [
        'workspaces',
        'workspace_members',
        'workspace_invites',
        'invite_uses',
        'audit_logs',
        'user_preferences',
        'analytics_cache',
        'reports',
        'ml_forecasts',
        'chart_configs',
        'category_analytics',
        'spending_patterns'
    ],
    functions: [
        'create_workspace_with_owner',
        'check_workspace_permission',
        'get_user_workspaces',
        'log_audit_event',
        'get_income_expense_stats',
        'get_chart_data',
        'get_top_categories',
        'get_category_analytics',
        'get_spending_patterns',
        'get_balance_trend',
        'update_analytics_cache',
        'get_cached_analytics'
    ]
};

async function testDatabase() {
    const client = new Client({ connectionString: DB_URL });
    
    try {
        console.log('🔌 Подключение к Supabase PostgreSQL...\n');
        await client.connect();
        console.log('✅ Подключение установлено\n');

        let passed = 0;
        let failed = 0;

        // ============================================================
        // TEST 1: Проверка существования таблиц
        // ============================================================
        console.log('📋 TEST 1: Проверка таблиц v2.4.0');
        console.log('━'.repeat(50));
        
        for (const table of TESTS.tables) {
            try {
                const result = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = $1
                    );
                `, [table]);
                
                if (result.rows[0].exists) {
                    console.log(`✅ ${table}`);
                    passed++;
                } else {
                    console.log(`❌ ${table} - НЕ СУЩЕСТВУЕТ`);
                    failed++;
                }
            } catch (err) {
                console.log(`❌ ${table} - ОШИБКА: ${err.message}`);
                failed++;
            }
        }

        // ============================================================
        // TEST 2: Проверка функций
        // ============================================================
        console.log('\n🔧 TEST 2: Проверка функций v2.4.0');
        console.log('━'.repeat(50));
        
        for (const func of TESTS.functions) {
            try {
                const result = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM pg_proc 
                        WHERE proname = $1
                    );
                `, [func]);
                
                if (result.rows[0].exists) {
                    console.log(`✅ ${func}()`);
                    passed++;
                } else {
                    console.log(`❌ ${func}() - НЕ СУЩЕСТВУЕТ`);
                    failed++;
                }
            } catch (err) {
                console.log(`❌ ${func}() - ОШИБКА: ${err.message}`);
                failed++;
            }
        }

        // ============================================================
        // TEST 3: Проверка индексов
        // ============================================================
        console.log('\n🔍 TEST 3: Проверка индексов');
        console.log('━'.repeat(50));
        
        const indexes = [
            'idx_workspaces_owner',
            'idx_workspace_members_workspace',
            'idx_workspace_members_user',
            'idx_analytics_cache_workspace',
            'idx_reports_workspace'
        ];
        
        for (const index of indexes) {
            try {
                const result = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM pg_indexes 
                        WHERE indexname = $1
                    );
                `, [index]);
                
                if (result.rows[0].exists) {
                    console.log(`✅ ${index}`);
                    passed++;
                } else {
                    console.log(`⚠️  ${index} - не найден (может быть не критично)`);
                }
            } catch (err) {
                console.log(`❌ ${index} - ОШИБКА: ${err.message}`);
            }
        }

        // ============================================================
        // TEST 4: Проверка данных
        // ============================================================
        console.log('\n📊 TEST 4: Проверка данных');
        console.log('━'.repeat(50));
        
        try {
            const wsCount = await client.query('SELECT COUNT(*) FROM workspaces;');
            console.log(`✅ Workspaces: ${wsCount.rows[0].count} записей`);
            passed++;
            
            const membersCount = await client.query('SELECT COUNT(*) FROM workspace_members;');
            console.log(`✅ Members: ${membersCount.rows[0].count} записей`);
            passed++;
            
            const reportsCount = await client.query('SELECT COUNT(*) FROM reports;');
            console.log(`✅ Reports: ${reportsCount.rows[0].count} записей`);
            passed++;
        } catch (err) {
            console.log(`❌ Ошибка чтения данных: ${err.message}`);
            failed++;
        }

        // ============================================================
        // TEST 5: Функциональное тестирование
        // ============================================================
        console.log('\n⚙️  TEST 5: Функциональное тестирование');
        console.log('━'.repeat(50));
        
        try {
            // Тест get_user_workspaces
            const userWorkspaces = await client.query('SELECT get_user_workspaces(123456);');
            console.log(`✅ get_user_workspaces() - работает`);
            passed++;
        } catch (err) {
            console.log(`❌ get_user_workspaces() - ${err.message}`);
            failed++;
        }

        try {
            // Тест get_income_expense_stats
            const stats = await client.query(`
                SELECT get_income_expense_stats(1, '2025-10-01', '2025-10-31');
            `);
            console.log(`✅ get_income_expense_stats() - работает`);
            passed++;
        } catch (err) {
            console.log(`❌ get_income_expense_stats() - ${err.message}`);
            failed++;
        }

        // ============================================================
        // ИТОГИ
        // ============================================================
        console.log('\n' + '═'.repeat(50));
        console.log('📈 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
        console.log('═'.repeat(50));
        console.log(`✅ Пройдено: ${passed}`);
        console.log(`❌ Провалено: ${failed}`);
        console.log(`📊 Всего: ${passed + failed}`);
        console.log(`🎯 Успешность: ${Math.round(passed / (passed + failed) * 100)}%`);
        
        if (failed === 0) {
            console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! База данных v2.4.0 готова к работе.');
        } else {
            console.log('\n⚠️  ЕСТЬ ПРОБЛЕМЫ! Требуется исправление миграций.');
        }

    } catch (err) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', err.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n🔌 Соединение закрыто');
    }
}

// Запуск тестирования
testDatabase();
