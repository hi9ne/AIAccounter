/**
 * AIAccounter v2.4.0 API Testing Script
 * Тестирует Workspace_API, Analytics_API, Reports_API
 */

const axios = require('axios');

// ============================================================
// CONFIGURATION - ЗАМЕНИТЕ НА ВАШИ WEBHOOK URLs
// ============================================================
const CONFIG = {
    // Workspace API endpoints
    workspace: {
        baseUrl: 'https://hi9neee.app.n8n.cloud/webhook/workspace-api',
        endpoints: {
            createWorkspace: '',
            getWorkspaces: '',
            createInvite: '',
            acceptInvite: '',
            checkPermission: '',
            addMember: '',
            getMembers: '',
            updateMember: '',
            removeMember: ''
        }
    },
    // Analytics API endpoints
    analytics: {
        baseUrl: 'https://hi9neee.app.n8n.cloud/webhook/analytics-api',
        endpoints: {
            getStats: '',
            getChartData: '',
            getTopCategories: '',
            getSpendingPatterns: '',
            getBalanceTrend: '',
            getCached: ''
        }
    },
    // Reports API endpoints
    reports: {
        baseUrl: 'https://hi9neee.app.n8n.cloud/webhook/reports-api',
        endpoints: {
            generatePDF: '',
            generateExcel: '',
            generateCSV: '',
            getReport: '',
            listReports: ''
        }
    },
    // Test user ID
    testUserId: 123456,
    testWorkspaceId: 1
};

// ============================================================
// TEST UTILITIES
// ============================================================
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, message = '') {
    const status = passed ? '✅' : '❌';
    const result = { name, passed, message };
    testResults.tests.push(result);
    
    if (passed) {
        testResults.passed++;
        console.log(`${status} ${name}`);
    } else {
        testResults.failed++;
        console.log(`${status} ${name} - ${message}`);
    }
}

async function testEndpoint(name, url, method = 'POST', data = {}) {
    try {
        const response = await axios({
            method,
            url,
            data,
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        logTest(name, response.status === 200, `Status: ${response.status}`);
        return response.data;
    } catch (error) {
        logTest(name, false, error.message);
        return null;
    }
}

// ============================================================
// WORKSPACE API TESTS
// ============================================================
async function testWorkspaceAPI() {
    console.log('\n🏢 TEST SUITE: Workspace API');
    console.log('━'.repeat(50));
    
    const url = CONFIG.workspace.baseUrl;
    
    // Test 1: Create Workspace
    const workspace = await testEndpoint(
        'Create Workspace',
        url,
        'POST',
        {
            action: 'create_workspace',
            name: 'Test Workspace v2.4.0',
            owner_id: CONFIG.testUserId,
            description: 'Testing workspace creation',
            currency: 'KGS'
        }
    );
    
    if (workspace && workspace.id) {
        CONFIG.testWorkspaceId = workspace.id;
        console.log(`   📝 Created workspace_id: ${workspace.id}`);
    }
    
    // Test 2: Get Workspaces
    await testEndpoint(
        'Get User Workspaces',
        url,
        'POST',
        { 
            action: 'get_workspaces',
            user_id: CONFIG.testUserId 
        }
    );
    
    // Test 3: Create Invite
    const invite = await testEndpoint(
        'Create Invite',
        url,
        'POST',
        {
            action: 'create_invite',
            workspace_id: CONFIG.testWorkspaceId,
            created_by: CONFIG.testUserId,
            role: 'editor',
            max_uses: 5,
            expires_days: 7
        }
    );
    
    if (invite && invite.invite_code) {
        console.log(`   🎫 Invite code: ${invite.invite_code}`);
    }
    
    // Test 4: Check Permission
    await testEndpoint(
        'Check Permission (owner)',
        url,
        'POST',
        {
            action: 'check_permission',
            workspace_id: CONFIG.testWorkspaceId,
            user_id: CONFIG.testUserId,
            permission: 'owner'
        }
    );
    
    // Test 5: Get Members
    await testEndpoint(
        'Get Workspace Members',
        url,
        'POST',
        { 
            action: 'get_members',
            workspace_id: CONFIG.testWorkspaceId 
        }
    );
}

// ============================================================
// ANALYTICS API TESTS
// ============================================================
async function testAnalyticsAPI() {
    console.log('\n📊 TEST SUITE: Analytics API');
    console.log('━'.repeat(50));
    
    const url = CONFIG.analytics.baseUrl;
    const startDate = '2025-10-01';
    const endDate = '2025-10-31';
    
    // Test 1: Get Income/Expense Stats
    await testEndpoint(
        'Get Income/Expense Stats',
        url,
        'POST',
        {
            action: 'get_income_expense_stats',
            workspace_id: CONFIG.testWorkspaceId,
            start_date: startDate,
            end_date: endDate
        }
    );
    
    // Test 2: Get Chart Data
    await testEndpoint(
        'Get Chart Data (daily_balance)',
        url,
        'POST',
        {
            action: 'get_chart_data',
            workspace_id: CONFIG.testWorkspaceId,
            chart_type: 'daily_balance',
            start_date: startDate,
            end_date: endDate
        }
    );
    
    // Test 3: Get Top Categories
    await testEndpoint(
        'Get Top Categories',
        url,
        'POST',
        {
            action: 'get_top_categories',
            workspace_id: CONFIG.testWorkspaceId,
            start_date: startDate,
            end_date: endDate,
            limit: 10
        }
    );
    
    // Test 4: Get Spending Patterns
    await testEndpoint(
        'Get Spending Patterns',
        url,
        'POST',
        { 
            action: 'get_spending_patterns',
            workspace_id: CONFIG.testWorkspaceId 
        }
    );
    
    // Test 5: Get Balance Trend
    await testEndpoint(
        'Get Balance Trend',
        url,
        'POST',
        {
            action: 'get_balance_trend',
            workspace_id: CONFIG.testWorkspaceId,
            start_date: startDate,
            end_date: endDate
        }
    );
}

// ============================================================
// REPORTS API TESTS
// ============================================================
async function testReportsAPI() {
    console.log('\n📄 TEST SUITE: Reports API');
    console.log('━'.repeat(50));
    
    const url = CONFIG.reports.baseUrl;
    
    // Test 1: Generate CSV (fastest)
    const csvReport = await testEndpoint(
        'Generate CSV Report',
        url,
        'POST',
        {
            action: 'generate_csv',
            workspace_id: CONFIG.testWorkspaceId,
            user_id: CONFIG.testUserId,
            report_type: 'transactions',
            start_date: '2025-10-01',
            end_date: '2025-10-31'
        }
    );
    
    let reportId = null;
    if (csvReport && csvReport.id) {
        reportId = csvReport.id;
        console.log(`   📝 Report ID: ${reportId}`);
    }
    
    // Test 2: Generate Excel
    await testEndpoint(
        'Generate Excel Report',
        url,
        'POST',
        {
            action: 'generate_excel',
            workspace_id: CONFIG.testWorkspaceId,
            user_id: CONFIG.testUserId,
            report_type: 'financial',
            start_date: '2025-10-01',
            end_date: '2025-10-31'
        }
    );
    
    // Test 3: Generate PDF
    await testEndpoint(
        'Generate PDF Report',
        url,
        'POST',
        {
            action: 'generate_pdf',
            workspace_id: CONFIG.testWorkspaceId,
            user_id: CONFIG.testUserId,
            report_type: 'financial',
            start_date: '2025-10-01',
            end_date: '2025-10-31'
        }
    );
    
    // Test 4: Get Report by ID
    if (reportId) {
        await testEndpoint(
            'Get Report by ID',
            url,
            'POST',
            { 
                action: 'get_report',
                report_id: reportId 
            }
        );
    }
    
    // Test 5: List Reports
    await testEndpoint(
        'List Reports',
        url,
        'POST',
        {
            action: 'get_reports_list',
            workspace_id: CONFIG.testWorkspaceId,
            limit: 10
        }
    );
}

// ============================================================
// RUN ALL TESTS
// ============================================================
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   AIAccounter v2.4.0 API Testing Suite        ║');
    console.log('╚════════════════════════════════════════════════╝');
    
    try {
        await testWorkspaceAPI();
        await testAnalyticsAPI();
        await testReportsAPI();
        
        // Print summary
        console.log('\n' + '═'.repeat(50));
        console.log('📈 TEST RESULTS SUMMARY');
        console.log('═'.repeat(50));
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
        console.log(`🎯 Success Rate: ${Math.round(testResults.passed / (testResults.passed + testResults.failed) * 100)}%`);
        
        if (testResults.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! API v2.4.0 готов к работе.');
        } else {
            console.log('\n⚠️  SOME TESTS FAILED. Проверьте конфигурацию и webhook URLs.');
            console.log('\nFailed tests:');
            testResults.tests
                .filter(t => !t.passed)
                .forEach(t => console.log(`  • ${t.name}: ${t.message}`));
        }
        
    } catch (error) {
        console.error('\n❌ CRITICAL ERROR:', error.message);
        process.exit(1);
    }
}

// ============================================================
// MAIN
// ============================================================
console.log('\n⚙️  CONFIGURATION CHECK');
console.log('━'.repeat(50));
console.log('📝 Edit CONFIG section with your n8n webhook URLs');
console.log('🔧 Current base URLs:');
console.log(`   Workspace: ${CONFIG.workspace.baseUrl}`);
console.log(`   Analytics: ${CONFIG.analytics.baseUrl}`);
console.log(`   Reports: ${CONFIG.reports.baseUrl}`);
console.log('');

// Run tests
runAllTests();
