// ============================================================================
// AIAccounter Mini App v3.0.0 - Read-Only Analytics Dashboard
// Clean, Fast, Optimized
// ============================================================================

console.log('🚀 AIAccounter v3.0.0 - Analytics Dashboard');

// ===== TELEGRAM WEB APP =====
const tg = window.Telegram?.WebApp || {
    ready: () => console.log('[Mock] Telegram WebApp ready'),
    expand: () => console.log('[Mock] Telegram WebApp expand'),
    initDataUnsafe: { user: { id: null } },
    MainButton: { show: () => {}, hide: () => {}, setText: () => {} }
};

if (window.Telegram?.WebApp) {
    tg.ready();
    tg.expand();
    console.log('✅ Telegram WebApp initialized');
    console.log('📱 Telegram user data:', tg.initDataUnsafe?.user);
} else {
    console.warn('⚠️ Running without Telegram WebApp (testing mode)');
}

// ===== CONFIG =====
const API_BASE = window.MiniAppConfig?.api?.baseUrl?.replace('/api/v1', '') || 
    (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://aiaccounterbackend-production.up.railway.app');

console.log('📡 API Base:', API_BASE);

// ===== STATE =====
let state = {
    currentScreen: 'home',
    currentPeriod: 'week',
    userId: tg.initDataUnsafe?.user?.id || null,
    userName: tg.initDataUnsafe?.user?.first_name || tg.initDataUnsafe?.user?.username || 'Пользователь',
    userPhoto: tg.initDataUnsafe?.user?.photo_url || null,
    currency: 'KGS',
    theme: 'auto'
};

// ===== CACHE =====
const cache = {
    data: new Map(),
    
    set(key, value, ttl = 300) {
        this.data.set(key, {
            value,
            expires: Date.now() + (ttl * 1000)
        });
    },
    
    get(key) {
        const item = this.data.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.data.delete(key);
            return null;
        }
        return item.value;
    },
    
    clear() {
        this.data.clear();
        console.log('🗑️ Cache cleared');
    }
};

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount, currency = state.currency) {
    const symbols = { KGS: 'с', USD: '$', EUR: '€', RUB: '₽' };
    const formatted = new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    
    return `${formatted} ${symbols[currency] || currency}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера';
    }
    
    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long'
    }).format(date);
}

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

// Устанавливает имя и аватар пользователя из Telegram
function ensureUserIdentity() {
    console.log('👤 Updating user identity...');
    console.log('Telegram WebApp object:', window.Telegram?.WebApp);
    console.log('initDataUnsafe:', tg?.initDataUnsafe);
    
    // Освежим данные из Telegram на всякий случай
    const tgUser = tg?.initDataUnsafe?.user || {};
    console.log('Telegram user data:', tgUser);
    
    if (tgUser && tgUser.id) {
        state.userId = tgUser.id;
        state.userName = tgUser.first_name || tgUser.username || 'Пользователь';
        state.userPhoto = tgUser.photo_url || null;
        
        console.log('✅ User identity updated:', {
            id: state.userId,
            name: state.userName,
            photo: state.userPhoto ? 'present' : 'absent'
        });
    } else {
        console.warn('⚠️ No Telegram user data available');
    }

    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
        userNameEl.textContent = state.userName;
        console.log('📝 Username set to:', state.userName);
    }

    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) {
        if (state.userPhoto) {
            avatarEl.style.backgroundImage = `url(${state.userPhoto})`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.innerHTML = '';
            console.log('🖼️ Avatar image set');
        } else {
            // Вернём иконку, если фото нет
            if (!avatarEl.querySelector('i')) {
                avatarEl.innerHTML = '<i class="fas fa-user-circle"></i>';
            }
            avatarEl.style.removeProperty('background-image');
            console.log('👤 Using default avatar icon');
        }
    }
}

// Возвращает диапазон дат для периода в формате YYYY-MM-DD
function getDateRangeFor(period) {
    const end = new Date();
    let start = new Date();
    switch (period) {
        case 'day':
            // за сегодняшний день
            break;
        case 'week':
            start.setDate(end.getDate() - 7);
            break;
        case 'month':
            start.setMonth(end.getMonth() - 1);
            break;
        case 'quarter':
            start.setMonth(end.getMonth() - 3);
            break;
        case 'year':
            start.setFullYear(end.getFullYear() - 1);
            break;
        default:
            start.setMonth(end.getMonth() - 1);
    }
    const toISO = (d) => d.toISOString().split('T')[0];
    return { start_date: toISO(start), end_date: toISO(end) };
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function showError(message) {
    console.error('❌ Error:', message);
    
    // Используем HapticFeedback вместо showAlert
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
    }
    
    // Показываем визуальное уведомление
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Обработка ошибок с перенаправлением на логин
function handleError(error, customMessage = 'Произошла ошибка') {
    console.error('❌ Error:', error);
    
    // Если ошибка 401 - перенаправляем на логин
    if (error.message && (
        error.message.includes('Not authenticated') || 
        error.message.includes('Could not validate credentials') ||
        error.message.includes('401') ||
        error.message.includes('Unauthorized')
    )) {
        localStorage.removeItem('auth_token');
        showError('Сессия истекла. Перенаправление на логин...');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    showError(customMessage);
}

// ===== NAVIGATION =====
function switchScreen(screenName) {
    console.log(`📍 Navigate to: ${screenName}`);
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // Show target screen
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screenName) {
            item.classList.add('active');
        }
    });
    
    state.currentScreen = screenName;
    
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
        case 'history':
            loadHistory();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// ===== AUTHENTICATION =====
async function authenticate() {
    console.log('🔐 Authenticating...');
    
    // Проверяем наличие токена
    const existingToken = localStorage.getItem('auth_token');
    if (existingToken) {
        console.log('✅ Token found');
        api.setToken(existingToken);
        return true;
    }
    
    try {
        const telegramData = tg.initDataUnsafe;
        const userId = telegramData?.user?.id;
        
        // Если нет userId - перенаправляем на логин
        if (!userId) {
            console.warn('⚠️ No Telegram user ID, redirecting to login...');
            window.location.href = 'login.html';
            return false;
        }
        
        const response = await api.authTelegram({
            telegram_chat_id: String(userId), // Конвертируем в строку
            first_name: telegramData?.user?.first_name || 'Пользователь',
            username: telegramData?.user?.username || null,
            last_name: telegramData?.user?.last_name || null,
            language_code: telegramData?.user?.language_code || 'ru'
        });
        
        if (response.access_token) {
            localStorage.setItem('auth_token', response.access_token);
            state.userId = userId;
            state.userName = telegramData?.user?.first_name || 'Пользователь';
            
            document.getElementById('user-name').textContent = state.userName;
            
            console.log('✅ Authentication successful');
            
            // Переключаемся на главный экран (он сам загрузит данные)
            switchScreen('home');
            return true;
        }
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        showError('Ошибка авторизации');
        
        // Перенаправляем на логин при ошибке
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
        return false;
    }
}



// ===== DASHBOARD (HOME) =====
async function loadDashboard() {
    console.log(`📊 Loading dashboard for period: ${state.currentPeriod}`);
    
    const cacheKey = `dashboard:${state.currentPeriod}`;
    const cached = cache.get(cacheKey);
    
    // Показываем индикатор на кнопке обновления
    const refreshBtn = document.querySelector('.icon-btn');
    if (refreshBtn) refreshBtn.classList.add('loading');
    
    try {
        let data;
        if (cached) {
            console.log('📦 Using cached dashboard data');
            data = cached;
        } else {
            data = await api.getOverview({ period: state.currentPeriod });
            cache.set(cacheKey, data, 300); // Cache for 5 minutes
        }

        // Всегда загружаем топ категории (даже при кэше)
        try {
            const range = getDateRangeFor(state.currentPeriod);
            console.log('📊 Loading top categories with range:', range);
            const homeTop = await api.getCategoryAnalytics({ ...range, limit: 3 });
            console.log('📊 Top categories response:', homeTop);
            if (Array.isArray(homeTop)) {
                updateHomeTopCategories(homeTop);
            } else {
                console.warn('⚠️ Top categories is not an array:', homeTop);
            }
        } catch (e) {
            console.warn('Не удалось загрузить топ категории для главной', e);
        }
        
        updateDashboardUI(data);
        
        console.log('✅ Dashboard loaded');
    } catch (error) {
        handleError(error, 'Не удалось загрузить данные');
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

function updateDashboardUI(data) {
    console.log('🎨 Updating dashboard UI', data);
    
    if (!data || !data.balance) {
        console.warn('⚠️ No balance data');
        return;
    }
    
    // Balance
    const balance = data.balance.balance || 0;
    const income = data.balance.total_income || 0;
    const expense = data.balance.total_expense || 0;
    
    document.getElementById('main-balance').textContent = formatCurrency(balance);
    document.getElementById('total-income').textContent = formatCurrency(income);
    document.getElementById('total-expense').textContent = formatCurrency(expense);
    
    // Trend (simplified - можно улучшить с историческими данными)
    const trendEl = document.getElementById('balance-trend');
    if (trendEl && balance !== 0) {
        const isPositive = balance > 0;
        trendEl.innerHTML = `<i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i> ${Math.abs(balance).toFixed(1)}%`;
        trendEl.style.color = isPositive ? 'var(--success)' : 'var(--danger)';
    }
    
    // Stats
    const transactionsCount = (data.balance.income_count || 0) + (data.balance.expense_count || 0);
    document.getElementById('transactions-count').textContent = `${transactionsCount} операций`;
    
    const avgDaily = income > 0 ? (expense / 30).toFixed(0) : 0;
    document.getElementById('avg-daily').textContent = `${formatCurrency(avgDaily)}/день`;
    
    const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;
    document.getElementById('savings-rate').textContent = `${savingsRate}% экономия`;
    
    // Top categories на главной
    if (data.top_categories && data.top_categories.length > 0) {
        updateHomeTopCategories(data.top_categories.slice(0, 3));
    }
    
    // Recent transactions
    if (data.recent_transactions) {
        updateRecentTransactions(data.recent_transactions);
    }
}

function updateHomeTopCategories(categories) {
    const container = document.getElementById('home-top-categories');
    if (!container) return;
    
    if (!categories || categories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-tag"></i><p>Нет данных</p></div>';
        return;
    }
    
    // Фильтруем только валидные категории с суммой > 0
    const validCategories = categories.filter(cat => cat && cat.total && cat.total > 0);
    if (validCategories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-tag"></i><p>Нет данных</p></div>';
        return;
    }
    
    const total = validCategories.reduce((sum, cat) => sum + parseFloat(cat.total || 0), 0);
    
    container.innerHTML = validCategories.map((cat, index) => {
        const amount = parseFloat(cat.total || 0);
        const percent = total > 0 ? ((amount / total) * 100).toFixed(0) : 0;
        const colors = ['#667eea', '#f093fb', '#4facfe'];
        return `
            <div class="top-category-compact">
                <div class="category-indicator" style="background: ${colors[index]}"></div>
                <div class="category-compact-info">
                    <div class="category-compact-name">${cat.category || 'Без категории'}</div>
                    <div class="category-compact-amount">${formatCurrency(amount)}</div>
                </div>
                <div class="category-compact-percent">${percent}%</div>
            </div>
        `;
    }).join('');
}

function updateRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions');
    if (!container) return;
    
    const allTransactions = [
        ...(transactions.expenses || []).map(t => ({ ...t, type: 'expense' })),
        ...(transactions.income || []).map(t => ({ ...t, type: 'income' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    
    if (allTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Нет транзакций</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allTransactions.map(t => `
        <div class="transaction-item">
            <div class="transaction-icon ${t.type}">
                <i class="fas fa-${t.type === 'income' ? 'arrow-down' : 'arrow-up'}"></i>
            </div>
            <div class="transaction-info">
                <div class="transaction-category">${t.category || 'Без категории'}</div>
                <div class="transaction-description">${t.description || '—'}</div>
            </div>
            <div class="transaction-amount">
                <div class="transaction-value ${t.type}">${formatCurrency(t.amount, t.currency)}</div>
                <div class="transaction-date">${formatDate(t.date)}</div>
            </div>
        </div>
    `).join('');
}

// ===== ANALYTICS =====
let customPeriod = {
    startDate: null,
    endDate: null
};

function applyCustomPeriod() {
    const startDate = document.getElementById('custom-start-date')?.value;
    const endDate = document.getElementById('custom-end-date')?.value;
    
    if (!startDate || !endDate) {
        showError('Выберите даты начала и конца периода');
        return;
    }
    
    customPeriod.startDate = startDate;
    customPeriod.endDate = endDate;
    
    loadAnalytics();
}

async function loadAnalytics() {
    console.log('📊 Loading analytics...');
    
    try {
        const periodSelect = document.getElementById('analytics-period');
        const period = periodSelect?.value || 'month';
        
        let params = {};
        if (period === 'custom') {
            const panel = document.getElementById('custom-period-panel');
            if (!customPeriod.startDate || !customPeriod.endDate) {
                if (panel) panel.style.display = 'block';
                // Ждём ввода дат и применения пользователем
                return;
            }
            params = {
                start_date: customPeriod.startDate,
                end_date: customPeriod.endDate
            };
        } else {
            params = getDateRangeFor(period);
        }

        const [stats, topCategories] = await Promise.all([
            api.getIncomeExpenseStats(params),
            api.getCategoryAnalytics({ ...params, limit: 10 })
        ]);
        
        // Объединяем данные
        const analyticsData = {
            ...stats,
            top_categories: topCategories
        };
        
        updateAnalyticsUI(analyticsData);
        loadCharts(analyticsData);
        
        console.log('✅ Analytics loaded');
    } catch (error) {
        handleError(error, 'Не удалось загрузить аналитику');
    }
}

function updateAnalyticsUI(stats) {
    if (!stats) return;
    
    // KPI Cards
    document.getElementById('kpi-income').textContent = formatCurrency(stats.total_income || 0);
    document.getElementById('kpi-expense').textContent = formatCurrency(stats.total_expense || 0);
    document.getElementById('kpi-savings').textContent = formatCurrency(stats.balance || 0);
    
    const savingsRate = stats.total_income > 0 ? ((stats.balance / stats.total_income) * 100).toFixed(1) : 0;
    document.getElementById('kpi-rate').textContent = `${savingsRate}%`;
    
    // Top Categories
    updateTopCategories(stats.top_categories || []);
}

function updateTopCategories(categories) {
    const container = document.getElementById('top-categories-list');
    if (!container) return;
    
    if (!categories || categories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>Нет данных</p></div>';
        return;
    }
    
    // Фильтруем только валидные категории
    const validCategories = categories.filter(cat => cat && cat.total && cat.total > 0);
    if (validCategories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>Нет данных</p></div>';
        return;
    }
    
    const total = validCategories.reduce((sum, cat) => sum + parseFloat(cat.total || 0), 0);
    
    container.innerHTML = validCategories.map(cat => {
        const amount = parseFloat(cat.total || 0);
        const percent = total > 0 ? ((amount / total) * 100).toFixed(0) : 0;
        return `
            <div class="category-item">
                <div class="category-icon">
                    <i class="fas fa-tag"></i>
                </div>
                <div class="category-info">
                    <div class="category-name">${cat.category || 'Без категории'}</div>
                    <div class="category-progress">
                        <div class="category-progress-bar" style="width: ${percent}%"></div>
                    </div>
                </div>
                <div class="category-amount">
                    <div class="category-value">${formatCurrency(amount)}</div>
                    <div class="category-percent">${percent}%</div>
                </div>
            </div>
        `;
    }).join('');
}

function loadCharts(stats) {
    // Trend Chart
    const trendCanvas = document.getElementById('trend-chart');
    if (trendCanvas && typeof Chart !== 'undefined') {
        if (trendCanvas.chart) trendCanvas.chart.destroy();
        
        trendCanvas.chart = new Chart(trendCanvas, {
            type: 'line',
            data: {
                labels: ['Нед 1', 'Нед 2', 'Нед 3', 'Нед 4'],
                datasets: [
                    {
                        label: 'Доходы',
                        data: [stats.total_income * 0.2, stats.total_income * 0.25, stats.total_income * 0.3, stats.total_income * 0.25],
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Расходы',
                        data: [stats.total_expense * 0.25, stats.total_expense * 0.3, stats.total_expense * 0.25, stats.total_expense * 0.2],
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
    
    // Category Pie Chart
    const pieCanvas = document.getElementById('category-pie-chart');
    if (pieCanvas && typeof Chart !== 'undefined' && stats.top_categories) {
        if (pieCanvas.chart) pieCanvas.chart.destroy();
        
        const validCategories = stats.top_categories.filter(c => c && c.total && c.total > 0);
        if (validCategories.length === 0) {
            pieCanvas.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>Нет данных о расходах</p></div>';
        } else {
            pieCanvas.chart = new Chart(pieCanvas, {
                type: 'doughnut',
                data: {
                    labels: validCategories.map(c => c.category || 'Без категории'),
                    datasets: [{
                        data: validCategories.map(c => parseFloat(c.total || 0)),
                        backgroundColor: [
                            '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a',
                            '#f59e0b', '#3b82f6', '#10b981'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 10,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percent = ((value / total) * 100).toFixed(0);
                                    return `${context.label}: ${formatCurrency(value)} (${percent}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
}

// ===== HISTORY =====
let historyFilters = {
    type: 'all',
    period: 'month',
    category: 'all',
    sortBy: 'date_desc' // date_desc, date_asc, amount_desc, amount_asc
};

function openFilters() {
    const panel = document.getElementById('filters-panel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

async function loadHistory() {
    console.log('📜 Loading history...');
    
    const container = document.getElementById('transactions-history');
    if (container) {
        container.innerHTML = '<div class="loading-placeholder"><div class="skeleton-item"></div><div class="skeleton-item"></div><div class="skeleton-item"></div></div>';
    }
    
    try {
        const type = historyFilters.type;
        
        const [expenses, income] = await Promise.all([
            type !== 'income' ? api.getExpenses() : Promise.resolve([]),
            type !== 'expense' ? api.getIncome() : Promise.resolve([])
        ]);
        
        let allTransactions = [
            ...(expenses || []).map(t => ({ ...t, type: 'expense' })),
            ...(income || []).map(t => ({ ...t, type: 'income' }))
        ];
        
        // Фильтрация по категории
        if (historyFilters.category !== 'all') {
            allTransactions = allTransactions.filter(t => t.category === historyFilters.category);
        }
        
        // Сортировка
        allTransactions = sortTransactions(allTransactions, historyFilters.sortBy);
        
        updateHistoryUI(allTransactions);
        
        console.log('✅ History loaded');
    } catch (error) {
        handleError(error, 'Не удалось загрузить историю');
    }
}

function sortTransactions(transactions, sortBy) {
    switch(sortBy) {
        case 'date_desc':
            return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        case 'date_asc':
            return transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
        case 'amount_desc':
            return transactions.sort((a, b) => b.amount - a.amount);
        case 'amount_asc':
            return transactions.sort((a, b) => a.amount - b.amount);
        default:
            return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
}

function updateHistoryUI(transactions) {
    // Summary
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => {
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
    }, 0);
    
    const totalTransactionsEl = document.getElementById('total-transactions');
    if (totalTransactionsEl) totalTransactionsEl.textContent = totalTransactions;
    const totalAmountEl = document.getElementById('total-amount');
    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalAmount);
    
    // Group by date
    const grouped = {};
    transactions.forEach(t => {
        const dateKey = formatDate(t.date);
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(t);
    });
    
    const container = document.getElementById('transactions-history');
    if (!container) return;
    
    if (totalTransactions === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>Нет транзакций</p></div>';
        return;
    }
    
    container.innerHTML = Object.entries(grouped).map(([date, items]) => `
        <div class="date-group">
            <div class="date-header">${date}</div>
            ${items.map(t => `
                <div class="transaction-item">
                    <div class="transaction-icon ${t.type}">
                        <i class="fas fa-${t.type === 'income' ? 'arrow-down' : 'arrow-up'}"></i>
                    </div>
                    <div class="transaction-info">
                        <div class="transaction-category">${t.category || 'Без категории'}</div>
                        <div class="transaction-description">${t.description || '—'}</div>
                    </div>
                    <div class="transaction-amount">
                        <div class="transaction-value ${t.type}">${formatCurrency(t.amount, t.currency)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// ===== SETTINGS =====
function loadSettings() {
    console.log('⚙️ Loading settings...');
    
    // Load saved settings
    const savedCurrency = localStorage.getItem('currency') || 'KGS';
    const savedPeriod = localStorage.getItem('defaultPeriod') || 'week';
    const savedTheme = localStorage.getItem('theme') || 'auto';
    
    document.getElementById('currency-select').value = savedCurrency;
    document.getElementById('default-period').value = savedPeriod;
    document.getElementById('theme-select').value = savedTheme;
    
    state.currency = savedCurrency;
}

// ===== REPORTS =====
async function loadReports() {
    console.log('📄 Loading reports...');
    
    try {
        const response = await api.getReportsHistory();
        console.log('Reports API response:', response);
        
        // Обрабатываем разные форматы ответа
        let reports = [];
        if (Array.isArray(response)) {
            reports = response;
        } else if (response && Array.isArray(response.reports)) {
            reports = response.reports;
        } else if (response && typeof response === 'object') {
            // Если пришёл объект с данными отчётов
            reports = Object.values(response).filter(item => item && typeof item === 'object');
        }
        
        updateReportsUI(reports);
        console.log('✅ Reports loaded:', reports.length);
    } catch (error) {
        console.error('Reports loading error:', error);
        handleError(error, 'Не удалось загрузить отчёты');
    }
}

function updateReportsUI(reports) {
    const container = document.getElementById('reports-list');
    if (!container) return;
    
    if (!Array.isArray(reports) || reports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>Нет отчётов</h3>
                <p>Отчёты будут появляться здесь автоматически</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = reports.map(r => {
        const createdDate = formatDate(r.created_at);
        const periodInfo = r.period_start && r.period_end 
            ? `${new Date(r.period_start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${new Date(r.period_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
            : '';
        
        return `
            <div class="report-item">
                <div class="report-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="report-info">
                    <div class="report-title">${r.title || 'Отчёт'}</div>
                    <div class="report-meta">${createdDate}${periodInfo ? ' • ' + periodInfo : ''}</div>
                </div>
                <div class="report-actions">
                    ${r.pdf_url ? `<button class="icon-btn" onclick="window.open('${r.pdf_url}', '_blank')"><i class="fas fa-download"></i></button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===== SETTINGS HANDLERS =====
function clearCache() {
    cache.clear();
    localStorage.clear();
    showSuccess('Кэш очищен');
    
    // Перезагрузим данные
    setTimeout(() => {
        loadDashboard();
    }, 500);
}

function showSuccess(message) {
    console.log('✅', message);
    
    // Показываем toast вместо alert
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.background = 'var(--success)';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM loaded, initializing...');

    // Установим имя и аватарку пользователя
    ensureUserIdentity();
    
    // Navigation
    document.querySelectorAll('.nav-item[data-screen]').forEach(btn => {
        btn.addEventListener('click', () => {
            switchScreen(btn.dataset.screen);
        });
    });
    
    // Period selector
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentPeriod = btn.dataset.period;
            loadDashboard();
        });
    });
    
    // Analytics period
    const analyticsPeriod = document.getElementById('analytics-period');
    if (analyticsPeriod) {
        analyticsPeriod.addEventListener('change', (e) => {
            const customPanel = document.getElementById('custom-period-panel');
            if (e.target.value === 'custom') {
                if (customPanel) customPanel.style.display = 'block';
            } else {
                if (customPanel) customPanel.style.display = 'none';
                loadAnalytics();
            }
        });
    }
    
    // History filters
    const historyType = document.getElementById('history-type');
    const historyPeriod = document.getElementById('history-period');
    const historyCategory = document.getElementById('history-category');
    const historySort = document.getElementById('history-sort');
    
    if (historyType) {
        historyType.addEventListener('change', (e) => {
            historyFilters.type = e.target.value;
            loadHistory();
        });
    }
    
    if (historyPeriod) {
        historyPeriod.addEventListener('change', (e) => {
            historyFilters.period = e.target.value;
            loadHistory();
        });
    }
    
    if (historyCategory) {
        historyCategory.addEventListener('change', (e) => {
            historyFilters.category = e.target.value;
            loadHistory();
        });
    }
    
    if (historySort) {
        historySort.addEventListener('change', (e) => {
            historyFilters.sortBy = e.target.value;
            loadHistory();
        });
    }

    // Подгружаем категории для фильтра
    (async () => {
        try {
            const [expCats, incCats] = await Promise.all([
                api.getExpenseCategories().catch(() => []),
                api.getIncomeCategories().catch(() => [])
            ]);
            const unique = new Set();
            const options = ['<option value="all">Все категории</option>'];
            [...(expCats || []), ...(incCats || [])].forEach(c => {
                const name = c?.name || c?.category || c;
                if (name && !unique.has(name)) {
                    unique.add(name);
                    options.push(`<option value="${name}">${name}</option>`);
                }
            });
            if (historyCategory) historyCategory.innerHTML = options.join('');
        } catch (e) {
            console.warn('Не удалось загрузить категории для фильтра', e);
        }
    })();
    
    // Settings
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            state.currency = e.target.value;
            localStorage.setItem('currency', e.target.value);
            loadDashboard(); // Reload to apply new currency
        });
    }
    
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            const theme = e.target.value;
            localStorage.setItem('theme', theme);
            
            if (theme === 'auto') {
                document.documentElement.removeAttribute('data-theme');
            } else {
                document.documentElement.setAttribute('data-theme', theme);
            }
        });
    }
    
    const defaultPeriod = document.getElementById('default-period');
    if (defaultPeriod) {
        defaultPeriod.addEventListener('change', (e) => {
            localStorage.setItem('defaultPeriod', e.target.value);
        });
    }
    
    // Initialize
    authenticate().then(async (success) => {
        if (success) {
            // Даём Telegram WebApp время обновить данные
            await new Promise(resolve => setTimeout(resolve, 300));
            // Обновим имя/аватар после авторизации
            ensureUserIdentity();
            // После аутентификации переходим на главный экран
            switchScreen('home');
        }
    });
});

// ===== GLOBAL ERROR HANDLER =====
window.addEventListener('error', (e) => {
    console.error('💥 Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Unhandled rejection:', e.reason);
});

console.log('✅ App initialized');
