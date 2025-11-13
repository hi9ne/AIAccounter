// AI Accounter Mini App v2.4.0 - Modern UI
// Работает через n8n с Supabase PostgreSQL

// ========== INITIALIZATION ==========

// Telegram WebApp initialization with fallback
const tg = window.Telegram?.WebApp || {
    ready: () => console.log('Mock: Telegram WebApp ready'),
    expand: () => console.log('Mock: Telegram WebApp expand'),
    initDataUnsafe: { 
        user: { id: null } // Will use fallback ID
    },
    MainButton: {
        setText: () => {},
        showProgress: () => {},
        hideProgress: () => {},
        show: () => {},
        hide: () => {}
    },
    showAlert: null // Not supported in old versions
};

// Initialize Telegram WebApp if available
if (window.Telegram?.WebApp) {
    tg.ready();
    tg.expand();
    console.log('✅ Telegram WebApp initialized');
} else {
    console.warn('⚠️ Telegram WebApp not found, using mock for testing');
}

// Import configuration with fallback
const config = window.MiniAppConfig || {
    mode: 'fallback',
    n8nWebhooks: {
        miniapp: 'https://hi9neee.app.n8n.cloud/webhook/test', // Fallback endpoint
        workspace: 'https://hi9neee.app.n8n.cloud/webhook/workspace-api',
        analytics: 'https://hi9neee.app.n8n.cloud/webhook/analytics-api',
        reports: 'https://hi9neee.app.n8n.cloud/webhook/reports-api'
    }
};

// Current state
let currentScreen = 'home';
let currentWorkspaceId = null;
let currentUserId = null;
let selectedCurrency = 'KGS';
let transactionType = 'expense';
let isAuthenticated = false;

// Categories
const categories = {
    income: [
        'Зарплата', 'Продажи товаров', 'Продажи услуг', 'Подработка',
        'Дивиденды', 'Возврат налогов', 'Кэшбек', 'Фриланс', 'Аренда'
    ],
    expense: [
        'Продукты', 'Транспорт', 'Аренда', 'Зарплата',
        'Реклама', 'Налоги', 'Канцелярия', 'Связь',
        'Обучение', 'Страхование', 'Банк', 'Кафе',
        'Медицина', 'Одежда', 'Развлечения'
    ]
};

// ========== NAVIGATION ==========

function switchScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Deactivate all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected screen
    document.getElementById(`${screenName}-screen`).classList.add('active');
    
    // Activate nav item
    const navItem = document.querySelector(`[data-screen="${screenName}"]`);
    if (navItem) navItem.classList.add('active');
    
    currentScreen = screenName;
    
    // Load screen data
    loadScreenData(screenName);
}

function loadScreenData(screenName) {
    switch(screenName) {
        case 'home':
            loadDashboard();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'team':
            loadTeam();
            break;
        case 'reports':
            // Reports don't need auto-loading
            break;
        case 'settings':
            loadSettings();
            break;
        case 'history':
            loadHistory();
            break;
    }
}

// ========== MODAL MANAGEMENT ==========

function openAddTransactionModal() {
    document.getElementById('add-transaction-modal').classList.add('active');
    resetTransactionForm();
}

// Alias for HTML onclick
function openAddTransaction(type) {
    openAddTransactionModal();
    if (type) {
        currentTransactionType = type;
        document.querySelectorAll('.transaction-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function resetTransactionForm() {
    document.getElementById('amount').value = '';
    document.getElementById('description').value = '';
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.classList.remove('active');
    });
    setCurrentDateTime();
    
    // Set default currency from settings
    const savedCurrency = localStorage.getItem('defaultCurrency') || 'KGS';
    const currencySelect = document.getElementById('transaction-currency-select');
    if (currencySelect) {
        currencySelect.value = savedCurrency;
    }
}

function setCurrentDateTime() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    document.getElementById('transaction-date').value = date;
    document.getElementById('transaction-time').value = time;
}

function toggleTransactionType(type) {
    transactionType = type;
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update category pills
    const categoryContainer = document.querySelector('.category-pills');
    categoryContainer.innerHTML = categories[type].map(cat => 
        `<div class="category-pill" onclick="selectCategory('${cat}')">${cat}</div>`
    ).join('');
}

function selectCategory(category) {
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.classList.remove('active');
    });
    event.target.classList.add('active');
}

// ========== API CALLS ==========

function getUserId() {
    if (currentUserId) return currentUserId;
    
    // Try to get Telegram user ID
    const userId = tg.initDataUnsafe?.user?.id;
    
    if (!userId) {
        // Fallback for local testing or old Telegram versions
        console.warn('⚠️ Telegram ID not found, using fallback ID for testing');
        currentUserId = 123456789; // Fallback test ID
        return currentUserId;
    }
    
    currentUserId = userId;
    return userId;
}

async function apiCall(endpoint, action, data = {}) {
    try {
        const userId = getUserId();
        if (!userId) {
            console.warn('⚠️ User ID not available');
            return { success: false, error: 'User ID not available' };
        }

        const payload = {
            userId: userId,
            workspaceId: currentWorkspaceId,
            action: action,
            ...data
        };

        console.log(`🚀 API Call: ${endpoint}/${action}`, payload);

        const webhookUrl = config.n8nWebhooks[endpoint];
        if (!webhookUrl) {
            console.error(`❌ No webhook URL for endpoint: ${endpoint}`);
            return { success: false, error: `Endpoint ${endpoint} not configured` };
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`📡 Response status: ${response.status}`);

        if (!response.ok) {
            if (response.status === 404) {
                console.error(`❌ Webhook not found: ${webhookUrl}`);
                return { success: false, error: 'API endpoint not found. Please check n8n workflow setup.' };
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`✅ API Response:`, result);
        return result;
    } catch (error) {
        console.error(`❌ API Error (${endpoint}/${action}):`, error);
        return { 
            success: false, 
            error: error.message || 'Network error',
            endpoint: endpoint,
            action: action
        };
    }
}

// ========== AUTHENTICATION ==========

async function authenticateUser() {
    console.log('🔐 Starting authentication...');
    
    // Check if token already exists and validate it
    const existingToken = localStorage.getItem('auth_token');
    if (existingToken) {
        api.setToken(existingToken);
        
        // Try to validate token
        try {
            await api.getWorkspaces();
            console.log('✅ Using existing token');
            isAuthenticated = true;
            return;
        } catch (error) {
            console.warn('⚠️ Token expired or invalid, re-authenticating...');
            localStorage.removeItem('auth_token');
        }
    }

    // Get Telegram user data
    const telegramUser = tg.initDataUnsafe?.user;
    
    // Если НЕ в Telegram и нет токена - перенаправляем на страницу входа
    if (!telegramUser || !telegramUser.id) {
        console.warn('⚠️ No Telegram user data and no token');
        // Перенаправляем на логин, если не там уже
        if (!window.location.pathname.includes('login.html')) {
            console.log('🔄 Redirecting to login page...');
            window.location.href = 'login.html';
        }
        isAuthenticated = false;
        return;
    }
    
    try {
        console.log('📱 Authenticating with user:', telegramUser.id, telegramUser.first_name);
        
        // Prepare auth data matching backend schema
        const authData = {
            telegram_chat_id: telegramUser.id.toString(),
            username: telegramUser.username || null,
            first_name: telegramUser.first_name || null,
            last_name: telegramUser.last_name || null,
            language_code: telegramUser.language_code || 'ru'
        };
        
        // Authenticate via API
        const response = await api.authTelegram(authData);
        
        if (response && response.access_token) {
            // Save token
            api.setToken(response.access_token);
            currentUserId = telegramUser.id;
            isAuthenticated = true;
            console.log('✅ Authentication successful, token saved');
        } else {
            throw new Error('No access token received');
        }
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        showError('Ошибка авторизации. Пожалуйста, перезапустите приложение.');
        isAuthenticated = false;
    }
}

// ========== DASHBOARD (HOME) ==========

async function loadDashboard() {
    await loadWorkspaces();
    await loadBalance();
    await loadQuickStats();
    await loadRecentTransactions();
}

async function loadWorkspaces() {
    try {
        const workspaces = await api.getWorkspaces();
        
        if (workspaces && workspaces.length > 0) {
            currentWorkspaceId = workspaces[0].workspace_id;
            console.log('✅ Workspace loaded:', currentWorkspaceId);
        } else {
            // Create default workspace
            const workspace = await api.createWorkspace({
                name: 'Мой кошелек',
                description: 'Личный кошелёк',
                currency: selectedCurrency
            });
            currentWorkspaceId = workspace.workspace_id;
            console.log('✅ Workspace created:', currentWorkspaceId);
        }
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить workspace:', error);
        // Продолжаем работу без workspace
    }
}

async function loadBalance() {
    console.log('📊 Loading balance...');
    
    try {
        if (!currentWorkspaceId) {
            console.warn('⚠️ No workspace selected');
            document.querySelector('.balance-amount').textContent = '0 с';
            return;
        }
        
        // Получаем данные за текущий месяц
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];
        
        const stats = await api.getOverview({
            workspace_id: currentWorkspaceId,
            start_date: startDate,
            end_date: endDate
        });
        
        console.log('📊 Stats received:', stats);
        
        // Use balance from API or calculate
        const balance = stats.balance !== undefined ? stats.balance : 
                       ((stats.total_income || 0) - (stats.total_expense || 0));
        const change = stats.change_percent || 0;
        
        console.log('💰 Calculated balance:', balance, 'Change:', change + '%');
        
        const balanceEl = document.querySelector('.balance-amount');
        if (balanceEl) {
            balanceEl.textContent = formatCurrency(balance);
        }
        
        const changeEl = document.querySelector('.balance-change');
        if (changeEl) {
            const changeClass = change >= 0 ? 'change-positive' : 'change-negative';
            const changeSpan = changeEl.querySelector('span');
            if (changeSpan) {
                changeSpan.className = changeClass;
                changeSpan.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
            }
        }
        
        console.log('✅ Balance loaded:', balance);
    } catch (error) {
        console.error('❌ Failed to load balance:', error);
        document.querySelector('.balance-amount').textContent = '0 с';
    }
}

async function loadQuickStats() {
    console.log('📈 Loading quick stats...');
    
    try {
        if (!currentWorkspaceId) {
            console.warn('⚠️ No workspace selected');
            return;
        }
        
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];
        
        const stats = await api.getIncomeExpenseStats({
            workspace_id: currentWorkspaceId,
            start_date: startDate,
            end_date: endDate
        });
        
        document.querySelector('.stat-item.income .stat-value').textContent = 
            formatCurrency(stats.total_income || 0);
        document.querySelector('.stat-item.expense .stat-value').textContent = 
            formatCurrency(stats.total_expense || 0);
        
        console.log('✅ Quick stats loaded');
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить статистику:', error);
        document.querySelector('.stat-item.income .stat-value').textContent = '0 с';
        document.querySelector('.stat-item.expense .stat-value').textContent = '0 с';
    }
}

async function loadRecentTransactions() {
    try {
        if (!currentWorkspaceId) {
            console.warn('⚠️ No workspace selected');
            return;
        }
        
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Получаем последние расходы и доходы
        const [expenses, income] = await Promise.all([
            api.getExpenses({
                workspace_id: currentWorkspaceId,
                start_date: weekAgo.toISOString().split('T')[0],
                end_date: today.toISOString().split('T')[0],
                limit: 3
            }),
            api.getIncome({
                workspace_id: currentWorkspaceId,
                start_date: weekAgo.toISOString().split('T')[0],
                end_date: today.toISOString().split('T')[0],
                limit: 2
            })
        ]);
        
        // Объединяем и сортируем по дате
        const transactions = [
            ...expenses.map(e => ({ ...e, type: 'expense' })),
            ...income.map(i => ({ ...i, type: 'income' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
        displayRecentTransactions(transactions);
        console.log('✅ Recent transactions loaded:', transactions.length);
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить транзакции:', error);
    }
}

function displayRecentTransactions(transactions) {
    const container = document.querySelector('.transactions-list');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-inbox"></i>
                <p>Нет транзакций</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = transactions.map(t => `
        <div class="transaction-item">
            <div class="transaction-icon ${t.type}">
                <i class="fa-solid fa-${t.type === 'income' ? 'arrow-down' : 'arrow-up'}"></i>
            </div>
            <div class="transaction-info">
                <div class="transaction-category">${t.category}</div>
                <div class="transaction-description">${t.description || '-'}</div>
            </div>
            <div class="transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
            </div>
        </div>
    `).join('');
}

// ========== ANALYTICS ==========

// ========== ANALYTICS ==========

let charts = {
    incomeExpense: null,
    categoryPie: null,
    balanceTrend: null
};

async function loadAnalytics() {
    if (!currentWorkspaceId) {
        console.warn('⚠️ No workspace selected');
        return;
    }
    
    const period = document.querySelector('.period-select')?.value || 'month';
    
    await Promise.all([
        loadMetrics(period),
        loadCharts(period)
    ]);
}

async function loadMetrics(period) {
    try {
        const today = new Date();
        let startDate;
        
        if (period === 'week') {
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === 'month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (period === 'year') {
            startDate = new Date(today.getFullYear(), 0, 1);
        } else {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        }
        
        const result = await api.getIncomeExpenseStats({
            workspace_id: currentWorkspaceId,
            start_date: startDate.toISOString().split('T')[0],
            end_date: today.toISOString().split('T')[0]
        });
        
        if (result) {
            document.querySelectorAll('.metric-value')[0].textContent = formatCurrency(result.total_income || 0);
            document.querySelectorAll('.metric-value')[1].textContent = formatCurrency(result.total_expense || 0);
            
            const balance = (result.total_income || 0) - (result.total_expense || 0);
            document.querySelectorAll('.metric-value')[2].textContent = formatCurrency(balance);
            
            const savingsRate = result.total_income > 0 
                ? ((balance / result.total_income) * 100).toFixed(0)
                : 0;
            document.querySelectorAll('.metric-value')[3].textContent = `${savingsRate}%`;
        }
    } catch (error) {
        console.error('❌ Failed to load metrics:', error);
    }
}

async function loadCharts(period) {
    try {
        if (!currentWorkspaceId) {
            console.warn('⚠️ No workspace selected');
            return;
        }
        
        const today = new Date();
        let startDate;
        
        if (period === 'week') {
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === 'month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (period === 'year') {
            startDate = new Date(today.getFullYear(), 0, 1);
        } else {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        }
        
        // Top categories
        const categoryData = await api.getCategoryAnalytics({
            workspace_id: currentWorkspaceId,
            start_date: startDate.toISOString().split('T')[0],
            end_date: today.toISOString().split('T')[0],
            limit: 10
        });
        
        if (categoryData && categoryData.length > 0) {
            renderCategoryPieChart(categoryData);
        }
        
        // Balance trend
        const trendData = await api.getTrends({
            workspace_id: currentWorkspaceId,
            start_date: startDate.toISOString().split('T')[0],
            end_date: today.toISOString().split('T')[0]
        });
        
        if (trendData && trendData.length > 0) {
            renderBalanceTrendChart(trendData);
        }
        
        console.log('✅ Charts loaded');
    } catch (error) {
        console.error('❌ Failed to load charts:', error);
    }
}

function renderIncomeExpenseChart(data) {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;
    
    if (charts.incomeExpense) {
        charts.incomeExpense.destroy();
    }
    
    charts.incomeExpense = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [
                {
                    label: 'Доходы',
                    data: data.income || [],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Расходы',
                    data: data.expenses || [],
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            }
        }
    });
}

function renderCategoryPieChart(data) {
    const ctx = document.getElementById('categoryPieChart');
    if (!ctx) return;
    
    if (charts.categoryPie) {
        charts.categoryPie.destroy();
    }
    
    const colors = [
        '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
        '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4'
    ];
    
    charts.categoryPie = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.categories || [],
            datasets: [{
                data: data.amounts || [],
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function renderBalanceTrendChart(data) {
    const ctx = document.getElementById('balanceTrendChart');
    if (!ctx) return;
    
    if (charts.balanceTrend) {
        charts.balanceTrend.destroy();
    }
    
    charts.balanceTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'Баланс',
                data: data.balance || [],
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ========== TEAM (WORKSPACES) ==========

async function loadTeam() {
    await loadWorkspacesList();
    await loadMembers();
}

async function loadWorkspacesList() {
    try {
        const workspaces = await api.getWorkspaces();
        
        if (workspaces && workspaces.length > 0) {
            const select = document.querySelector('.workspace-select');
            if (select) {
                select.innerHTML = workspaces.map(ws => 
                    `<option value="${ws.workspace_id}" ${ws.workspace_id === currentWorkspaceId ? 'selected' : ''}>
                        ${ws.name}
                    </option>`
                ).join('');
                
                select.onchange = async function() {
                    currentWorkspaceId = parseInt(this.value);
                    await loadMembers();
                    await loadDashboard();
                };
            }
        }
    } catch (error) {
        console.error('❌ Failed to load workspaces:', error);
    }
}

async function loadMembers() {
    try {
        if (!currentWorkspaceId) {
            console.warn('⚠️ No workspace selected');
            return;
        }
        
        const members = await api.getWorkspaceMembers(currentWorkspaceId);
        
        const container = document.querySelector('.members-list');
        if (!container) return;
        
        if (members && members.length > 0) {
            container.innerHTML = members.map(member => {
                const initials = member.user_name ? member.user_name.slice(0, 2).toUpperCase() : 'U';
                return `
                    <div class="member-item">
                        <div class="member-avatar">${initials}</div>
                        <div class="member-info">
                        <div class="member-name">${member.user_name || 'User'}</div>
                        <span class="member-role ${member.role}">${getRoleLabel(member.role)}</span>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-users"></i>
                <p>Нет участников</p>
            </div>
        `;
    }
    } catch (error) {
        console.error('❌ Failed to load members:', error);
    }
}

function getRoleLabel(role) {
    const labels = {
        owner: 'Владелец',
        admin: 'Администратор',
        member: 'Участник',
        viewer: 'Наблюдатель'
    };
    return labels[role] || role;
}

function openInviteModal() {
    // Simple implementation - directly generate invite
    generateInvite();
}

async function generateInvite() {
    try {
        if (!currentWorkspaceId) {
            showError('Workspace не выбран');
            return;
        }
        
        const result = await api.createInvite(currentWorkspaceId, {
            role: 'member',
            expires_in_days: 7
        });
        
        if (result && result.invite_code) {
            const inviteLink = `https://t.me/your_bot?start=invite_${result.invite_code}`;
            
            // Copy to clipboard
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(inviteLink);
                showSuccess('Ссылка приглашения скопирована');
            } else {
                showSuccess(`Код приглашения: ${result.invite_code}`);
            }
        }
    } catch (error) {
        console.error('❌ Failed to generate invite:', error);
        showError('Не удалось создать приглашение');
    }
}

// ========== REPORTS ==========

async function generateReport() {
    const reportType = document.getElementById('report-type').value;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const format = document.querySelector('.format-btn.active')?.dataset.format || 'pdf';
    
    if (!startDate || !endDate) {
        showError('Выберите период отчета');
        return;
    }
    
    if (!currentWorkspaceId) {
        showError('Workspace не выбран');
        return;
    }
    
    showLoading('Генерация отчета...');
    
    try {
        // TODO: Implement reports API endpoint
        const result = await api.generateReport({
            workspace_id: currentWorkspaceId,
            report_type: reportType,
            start_date: startDate,
            end_date: endDate,
            format: format
        });
        
        hideLoading();
        
        if (result && result.download_url) {
            window.open(result.download_url, '_blank');
            showSuccess('Отчет сгенерирован');
        } else {
            showSuccess('Отчет будет доступен в ближайшее время');
        }
    } catch (error) {
        hideLoading();
        showError('Функция генерации отчетов в разработке');
        console.error('❌ Report generation failed:', error);
    }
}

function selectFormat(format) {
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.format-btn').classList.add('active');
}

// ========== SETTINGS ==========

function loadSettings() {
    console.log('⚙️ Loading settings...');
    
    // Load current settings
    const savedCurrency = localStorage.getItem('defaultCurrency') || 'KGS';
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedLanguage = localStorage.getItem('language') || 'ru';
    const savedNotifications = localStorage.getItem('notifications') !== 'false';
    const savedSubscriptions = localStorage.getItem('subscriptions') !== 'false';
    
    // Set currency select
    const currencyEl = document.getElementById('currency-select');
    if (currencyEl) {
        currencyEl.value = savedCurrency;
        console.log('💰 Currency set to:', savedCurrency);
    }
    
    // Set theme select
    const themeEl = document.getElementById('theme-select');
    if (themeEl) {
        themeEl.value = savedTheme;
        console.log('🎨 Theme set to:', savedTheme);
    }
    
    // Set language select
    const languageEl = document.getElementById('language-select');
    if (languageEl) {
        languageEl.value = savedLanguage;
        console.log('🌐 Language set to:', savedLanguage);
    }
    
    // Set notifications toggle
    const notifToggle = document.getElementById('notifications-toggle');
    if (notifToggle) {
        notifToggle.checked = savedNotifications;
        console.log('🔔 Notifications:', savedNotifications);
    }
    
    // Set subscriptions toggle
    const subsToggle = document.getElementById('subscriptions-toggle');
    if (subsToggle) {
        subsToggle.checked = savedSubscriptions;
        console.log('📅 Subscriptions:', savedSubscriptions);
    }
    
    console.log('✅ Settings loaded');
}

function changeCurrency(currency) {
    selectedCurrency = currency;
    localStorage.setItem('defaultCurrency', currency);
    console.log('💰 Currency changed to:', currency);
    showSuccess('Валюта изменена на ' + currency);
}

function changeTheme(theme) {
    if (!theme) {
        // Called from select onchange
        theme = document.getElementById('theme-select')?.value || 'light';
    }
    
    console.log('🎨 Changing theme to:', theme);
    
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    console.log('✅ Theme changed to:', theme);
    showSuccess('Тема изменена на ' + (theme === 'dark' ? 'тёмную' : theme === 'light' ? 'светлую' : 'авто'));
}

function toggleTheme() {
    const isDark = event.target.checked;
    const theme = isDark ? 'dark' : 'light';
    changeTheme(theme);
}

function toggleNotifications() {
    const enabled = event.target.checked;
    localStorage.setItem('notifications', enabled);
    console.log('🔔 Notifications toggled:', enabled);
    showSuccess(enabled ? 'Уведомления включены' : 'Уведомления выключены');
}

// ========== HISTORY ==========

async function loadHistory() {
    try {
        if (!currentWorkspaceId) {
            console.warn('⚠️ No workspace selected');
            return;
        }
        
        const filter = document.getElementById('history-filter')?.value || 'all';
        const period = document.getElementById('history-period')?.value || 'month';
        
        const today = new Date();
        let startDate;
        
        if (period === 'week') {
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === 'month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (period === 'year') {
            startDate = new Date(today.getFullYear(), 0, 1);
        } else {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        }
        
        // Get expenses and income based on filter
        let transactions = [];
        
        if (filter === 'all' || filter === 'expense') {
            const expenses = await api.getExpenses({
                workspace_id: currentWorkspaceId,
                start_date: startDate.toISOString().split('T')[0],
                end_date: today.toISOString().split('T')[0],
                limit: 50
            });
            transactions = transactions.concat(expenses.map(e => ({ ...e, type: 'expense' })));
        }
        
        if (filter === 'all' || filter === 'income') {
            const income = await api.getIncome({
                workspace_id: currentWorkspaceId,
                start_date: startDate.toISOString().split('T')[0],
                end_date: today.toISOString().split('T')[0],
                limit: 50
            });
            transactions = transactions.concat(income.map(i => ({ ...i, type: 'income' })));
        }
        
        // Sort by date
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const container = document.querySelector('#history-screen .transactions-list');
        if (!container) return;
        
        if (transactions.length > 0) {
            container.innerHTML = transactions.map(t => `
                <div class="transaction-item">
                    <div class="transaction-icon ${t.type}">
                        <i class="fa-solid fa-${t.type === 'income' ? 'arrow-down' : 'arrow-up'}"></i>
                    </div>
                    <div class="transaction-info">
                        <div class="transaction-category">${t.category || 'Без категории'}</div>
                        <div class="transaction-description">${t.description || '-'}</div>
                        <div class="transaction-date">${formatDate(t.date)}</div>
                    </div>
                    <div class="transaction-amount ${t.type}">
                        ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>Нет транзакций</p>
                </div>
        `;
    }
    } catch (error) {
        console.error('❌ Failed to load history:', error);
    }
}

// ========== TRANSACTION FORM ==========

async function submitTransaction() {
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const category = document.querySelector('.category-pill.active')?.textContent;
    const date = document.getElementById('transaction-date').value;
    const time = document.getElementById('transaction-time').value;
    const currency = document.getElementById('transaction-currency-select').value;
    
    if (!amount || amount <= 0) {
        showError('Введите сумму');
        return;
    }
    
    if (!category) {
        showError('Выберите категорию');
        return;
    }
    
    showLoading('Сохранение...');
    
    try {
        const transactionData = {
            amount: amount,
            currency: currency,
            category: category,
            description: description,
            date: `${date}T${time}:00`,
            workspace_id: currentWorkspaceId
        };
        
        // Создаём расход или доход через API
        if (transactionType === 'expense') {
            await api.createExpense(transactionData);
        } else {
            await api.createIncome(transactionData);
        }
        
        hideLoading();
        closeModal('add-transaction-modal');
        showSuccess('Транзакция добавлена');
        await loadDashboard();
        
        console.log('✅ Transaction created successfully');
    } catch (error) {
        hideLoading();
        console.error('❌ Failed to create transaction:', error);
        showError('Ошибка сохранения: ' + error.message);
    }
}

// ========== UTILITY FUNCTIONS ==========

function formatCurrency(amount, currency = 'KGS') {
    const symbols = { KGS: 'с', USD: '$', EUR: '€', RUB: '₽' };
    return `${Math.abs(amount).toFixed(0)} ${symbols[currency] || 'с'}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}.${date.getFullYear()}`;
}

function showLoading(message = 'Загрузка...') {
    console.log('⏳ ' + message);
    if (tg.MainButton && typeof tg.MainButton.setText === 'function') {
        try {
            tg.MainButton.setText(message);
            tg.MainButton.showProgress();
        } catch (e) {
            console.log('MainButton not supported');
        }
    }
}

function hideLoading() {
    console.log('✅ Loading complete');
    if (tg.MainButton && typeof tg.MainButton.hideProgress === 'function') {
        try {
            tg.MainButton.hideProgress();
        } catch (e) {
            console.log('MainButton not supported');
        }
    }
}

function showSuccess(message) {
    // Только console.log, без alert и showPopup
    console.log('✅ ' + message);
}

function showError(message) {
    // Только console.error, без alert и showPopup
    console.error('⚠️ ' + message);
}

// ========== EVENT LISTENERS ==========

document.addEventListener('DOMContentLoaded', async function() {
    // Authenticate first
    await authenticateUser();
    
    // Initialize
    switchScreen('home');
    
    // Navigation
    document.querySelectorAll('[data-screen]').forEach(btn => {
        btn.addEventListener('click', function() {
            switchScreen(this.dataset.screen);
        });
    });
    
    // FAB button
    document.querySelector('.fab-button').addEventListener('click', openAddTransactionModal);
    
    // Modal close
    document.querySelectorAll('.modal-overlay, .close-btn').forEach(el => {
        el.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });
    
    // Transaction type toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            toggleTransactionType(this.dataset.type);
        });
    });
    
    // Period change (Analytics)
    const periodSelect = document.querySelector('.period-select');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            loadAnalytics();
        });
    }
    
    // Format buttons (Reports)
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectFormat(this.dataset.format);
        });
    });
    
    // Settings toggles and selects
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            changeTheme(this.value);
        });
    }
    
    const notificationsToggle = document.getElementById('notifications-toggle');
    if (notificationsToggle) {
        notificationsToggle.addEventListener('change', toggleNotifications);
    }
    
    const subscriptionsToggle = document.getElementById('subscriptions-toggle');
    if (subscriptionsToggle) {
        subscriptionsToggle.addEventListener('change', function() {
            const enabled = this.checked;
            localStorage.setItem('subscriptions', enabled);
            showSuccess(enabled ? 'Напоминания включены' : 'Напоминания выключены');
        });
    }
    
    // Currency change
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) {
        currencySelect.addEventListener('change', function() {
            changeCurrency(this.value);
        });
    }
    
    // Language change
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            const lang = this.value;
            localStorage.setItem('language', lang);
            console.log('🌐 Language changed to:', lang);
            showSuccess('Язык изменён на ' + (lang === 'ru' ? 'русский' : lang === 'en' ? 'English' : 'кыргызча'));
            // TODO: Implement i18n translations
        });
    }
    
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Set default dates for reports
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    if (startDateInput) startDateInput.value = firstDay.toISOString().split('T')[0];
    if (endDateInput) endDateInput.value = today.toISOString().split('T')[0];
});
