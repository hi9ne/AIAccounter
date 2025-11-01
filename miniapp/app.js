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

// Import configuration
const config = window.MiniAppConfig || {
    mode: 'n8n',
    n8nWebhooks: {
        miniapp: 'https://hi9neee.app.n8n.cloud/webhook/miniapp',
        workspace: 'https://hi9neee.app.n8n.cloud/webhook/workspace',
        analytics: 'https://hi9neee.app.n8n.cloud/webhook/analytics',
        reports: 'https://hi9neee.app.n8n.cloud/webhook/reports'
    }
};

// Current state
let currentScreen = 'home';
let currentWorkspaceId = null;
let currentUserId = null;
let selectedCurrency = 'KGS';
let transactionType = 'expense';

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
        if (!userId) return null;

        const payload = {
            user_id: userId,
            workspace_id: currentWorkspaceId,
            action: action,
            ...data
        };

        const response = await fetch(config.n8nWebhooks[endpoint], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Network error');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        // Не показываем alert для каждой ошибки API - только логируем
        return null;
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
    const result = await apiCall('workspace', 'get_user_workspaces');
    if (result && result.workspaces && result.workspaces.length > 0) {
        currentWorkspaceId = result.workspaces[0].id;
    } else {
        // Create default workspace
        const createResult = await apiCall('workspace', 'create_workspace', {
            name: 'Мой кошелек',
            type: 'personal'
        });
        if (createResult) {
            currentWorkspaceId = createResult.workspace_id;
        }
    }
}

async function loadBalance() {
    const result = await apiCall('miniapp', 'get_stats', {
        period: 'month'
    });
    
    if (!result) {
        console.warn('⚠️ Не удалось загрузить баланс');
        return;
    }
    
    if (result) {
        const balance = result.balance || 0;
        const change = result.change || 0;
        const changePercent = result.change_percent || 0;
        
        document.querySelector('.balance-amount').textContent = formatCurrency(balance);
        
        const changeEl = document.querySelector('.balance-change');
        const changeClass = change >= 0 ? 'change-positive' : 'change-negative';
        changeEl.querySelector('span').className = changeClass;
        changeEl.querySelector('span').textContent = `${change >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
    }
}

async function loadQuickStats() {
    const result = await apiCall('analytics', 'get_income_expense_stats', {
        period: 'month'
    });
    
    if (!result) {
        console.warn('⚠️ Не удалось загрузить статистику');
        return;
    }
    
    if (result) {
        document.querySelector('.stat-item.income .stat-value').textContent = 
            formatCurrency(result.total_income || 0);
        document.querySelector('.stat-item.expense .stat-value').textContent = 
            formatCurrency(result.total_expenses || 0);
    }
}

async function loadRecentTransactions() {
    const result = await apiCall('miniapp', 'get_history', {
        filter: 'all',
        period: 'week',
        limit: 5
    });
    
    const container = document.querySelector('.transactions-list');
    
    if (!result) {
        console.warn('⚠️ Не удалось загрузить транзакции');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-exclamation-circle"></i>
                <p>Не удалось загрузить данные</p>
            </div>
        `;
        return;
    }
    
    if (result && result.transactions && result.transactions.length > 0) {
        container.innerHTML = result.transactions.map(t => `
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
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-inbox"></i>
                <p>Нет транзакций</p>
            </div>
        `;
    }
}

// ========== ANALYTICS ==========

let charts = {
    incomeExpense: null,
    categoryPie: null,
    balanceTrend: null
};

async function loadAnalytics() {
    const period = document.querySelector('.period-select').value || 'month';
    
    await Promise.all([
        loadMetrics(period),
        loadCharts(period)
    ]);
}

async function loadMetrics(period) {
    const result = await apiCall('analytics', 'get_income_expense_stats', { period });
    
    if (result) {
        document.querySelectorAll('.metric-value')[0].textContent = formatCurrency(result.total_income || 0);
        document.querySelectorAll('.metric-value')[1].textContent = formatCurrency(result.total_expenses || 0);
        document.querySelectorAll('.metric-value')[2].textContent = formatCurrency(result.balance || 0);
        
        const savingsRate = result.total_income > 0 
            ? ((result.balance / result.total_income) * 100).toFixed(0)
            : 0;
        document.querySelectorAll('.metric-value')[3].textContent = `${savingsRate}%`;
    }
}

async function loadCharts(period) {
    // Income vs Expense Chart
    const incomeExpenseData = await apiCall('analytics', 'get_chart_data', { 
        period,
        chart_type: 'income_expense'
    });
    
    if (incomeExpenseData) {
        renderIncomeExpenseChart(incomeExpenseData);
    }
    
    // Category Pie Chart
    const categoryData = await apiCall('analytics', 'get_top_categories', { 
        period,
        limit: 10
    });
    
    if (categoryData) {
        renderCategoryPieChart(categoryData);
    }
    
    // Balance Trend Chart
    const trendData = await apiCall('analytics', 'get_balance_trend', { period });
    
    if (trendData) {
        renderBalanceTrendChart(trendData);
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
    const result = await apiCall('workspace', 'get_user_workspaces');
    
    if (result && result.workspaces) {
        const select = document.querySelector('.workspace-select');
        select.innerHTML = result.workspaces.map(ws => 
            `<option value="${ws.id}" ${ws.id === currentWorkspaceId ? 'selected' : ''}>
                ${ws.name}
            </option>`
        ).join('');
        
        select.onchange = async function() {
            currentWorkspaceId = this.value;
            await loadMembers();
            await loadDashboard();
        };
    }
}

async function loadMembers() {
    const result = await apiCall('workspace', 'get_workspace_members');
    
    const container = document.querySelector('.members-list');
    
    if (result && result.members && result.members.length > 0) {
        container.innerHTML = result.members.map(member => {
            const initials = member.name ? member.name.slice(0, 2).toUpperCase() : 'U';
            return `
                <div class="member-item">
                    <div class="member-avatar">${initials}</div>
                    <div class="member-info">
                        <div class="member-name">${member.name || 'User'}</div>
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
    
    showLoading('Генерация отчета...');
    
    const result = await apiCall('reports', 'generate_report', {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        format: format,
        language: 'ru'
    });
    
    hideLoading();
    
    if (result && result.download_url) {
        window.open(result.download_url, '_blank');
        showSuccess('Отчет сгенерирован');
    } else {
        showError('Ошибка генерации отчета');
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
    // Load current settings
    const savedCurrency = localStorage.getItem('defaultCurrency') || 'KGS';
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedNotifications = localStorage.getItem('notifications') !== 'false';
    
    document.getElementById('default-currency').value = savedCurrency;
    document.querySelector('[data-theme-toggle]').checked = savedTheme === 'dark';
    document.querySelector('[data-notifications-toggle]').checked = savedNotifications;
}

function changeCurrency(currency) {
    selectedCurrency = currency;
    localStorage.setItem('defaultCurrency', currency);
    showSuccess('Валюта изменена');
}

function toggleTheme() {
    const isDark = event.target.checked;
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function toggleNotifications() {
    const enabled = event.target.checked;
    localStorage.setItem('notifications', enabled);
}

// ========== HISTORY ==========

async function loadHistory() {
    const filter = document.getElementById('history-filter')?.value || 'all';
    const period = document.getElementById('history-period')?.value || 'month';
    
    const result = await apiCall('miniapp', 'get_history', {
        filter: filter,
        period: period,
        limit: 50
    });
    
    const container = document.querySelector('#history-screen .transactions-list');
    
    if (result && result.transactions && result.transactions.length > 0) {
        container.innerHTML = result.transactions.map(t => `
            <div class="transaction-item">
                <div class="transaction-icon ${t.type}">
                    <i class="fa-solid fa-${t.type === 'income' ? 'arrow-down' : 'arrow-up'}"></i>
                </div>
                <div class="transaction-info">
                    <div class="transaction-category">${t.category}</div>
                    <div class="transaction-description">${t.description || '-'}</div>
                    <div class="transaction-date">${formatDate(t.created_at)}</div>
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
}

// ========== TRANSACTION FORM ==========

async function submitTransaction() {
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const category = document.querySelector('.category-pill.active')?.textContent;
    const date = document.getElementById('transaction-date').value;
    const time = document.getElementById('transaction-time').value;
    const currency = document.getElementById('currency-select').value;
    
    if (!amount || amount <= 0) {
        showError('Введите сумму');
        return;
    }
    
    if (!category) {
        showError('Выберите категорию');
        return;
    }
    
    showLoading('Сохранение...');
    
    const result = await apiCall('miniapp', 'add_transaction', {
        type: transactionType,
        amount: amount,
        currency: currency,
        category: category,
        description: description,
        date: `${date}T${time}:00`
    });
    
    hideLoading();
    
    if (result && result.success) {
        closeModal('add-transaction-modal');
        showSuccess('Транзакция добавлена');
        await loadDashboard();
    } else {
        showError('Ошибка сохранения');
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

document.addEventListener('DOMContentLoaded', function() {
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
    
    // Settings toggles
    const themeToggle = document.querySelector('[data-theme-toggle]');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
    
    const notificationsToggle = document.querySelector('[data-notifications-toggle]');
    if (notificationsToggle) {
        notificationsToggle.addEventListener('change', toggleNotifications);
    }
    
    // Currency change
    const currencySelect = document.getElementById('default-currency');
    if (currencySelect) {
        currencySelect.addEventListener('change', function() {
            changeCurrency(this.value);
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
