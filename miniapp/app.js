// ============================================================================
// AIAccounter Mini App v3.0.0 - Read-Only Analytics Dashboard
// Clean, Fast, Optimized
// ============================================================================

console.log('🚀 AIAccounter v3.0.0 - Analytics Dashboard');

// ===== TELEGRAM WEB APP =====
const tg = window.Telegram?.WebApp;

// Определяем режим работы
const IS_LOCALHOST = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

if (tg) {
    tg.ready();
    tg.expand();
    console.log('✅ Telegram WebApp initialized');
    console.log('📱 Telegram user data:', tg.initDataUnsafe?.user);
} else {
    console.warn('⚠️ Running without Telegram WebApp (browser mode)');
}

// ===== CONFIG =====
const API_BASE = window.MiniAppConfig?.api?.baseUrl?.replace('/api/v1', '') || 
    (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://aiaccounterbackend-production.up.railway.app');

console.log('📡 API Base:', API_BASE);

// Для тестирования в браузере на localhost - используем тестовый ID
const TEST_USER_ID = 1109421300;

// ===== STATE =====
let state = {
    currentScreen: 'home',
    currentPeriod: 'week',
    userId: tg?.initDataUnsafe?.user?.id || (IS_LOCALHOST ? TEST_USER_ID : null),
    userName: tg?.initDataUnsafe?.user?.first_name || tg?.initDataUnsafe?.user?.username || 'Test User',
    userPhoto: tg?.initDataUnsafe?.user?.photo_url || null,
    currency: 'KGS',
    theme: 'auto',
    isInitialized: false,
    preloadedData: null
};

// ===== CACHE =====
const cache = {
    data: new Map(),
    
    set(key, value, ttl = 300) {
        this.data.set(key, {
            value,
            expires: Date.now() + (ttl * 1000)
        });
        
        // Сохраняем в localStorage для persistent кэша
        try {
            localStorage.setItem(`cache_${key}`, JSON.stringify({
                value,
                expires: Date.now() + (ttl * 1000)
            }));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    },
    
    get(key) {
        // Сначала проверяем memory cache
        let item = this.data.get(key);
        
        // Если нет в памяти, проверяем localStorage
        if (!item) {
            try {
                const stored = localStorage.getItem(`cache_${key}`);
                if (stored) {
                    item = JSON.parse(stored);
                    if (Date.now() <= item.expires) {
                        // Восстанавливаем в memory cache
                        this.data.set(key, item);
                        console.log('💾 Restored from localStorage:', key);
                    } else {
                        localStorage.removeItem(`cache_${key}`);
                        return null;
                    }
                }
            } catch (e) {
                console.warn('Failed to read from localStorage:', e);
            }
        }
        
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.data.delete(key);
            localStorage.removeItem(`cache_${key}`);
            return null;
        }
        return item.value;
    },
    
    clear() {
        this.data.clear();
        // Очищаем localStorage кэш
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
        console.log('🗑️ Cache cleared');
    },
    
    clearMatching(prefix) {
        for (const key of this.data.keys()) {
            if (key.startsWith(prefix)) {
                this.data.delete(key);
                localStorage.removeItem(`cache_${key}`);
            }
        }
        console.log(`🗑️ Cleared cache with prefix: ${prefix}`);
    }
};

// ===== CURRENCY CONVERSION =====
let exchangeRates = {}; // Кэш курсов валют

// Загрузка курсов валют
async function loadExchangeRates() {
    try {
        const rates = await api.get('/rates/latest');
        exchangeRates = {};
        rates.forEach(rate => {
            const key = `${rate.from_currency}_${rate.to_currency}`;
            exchangeRates[key] = rate.rate;
        });
        console.log('✅ Exchange rates loaded:', Object.keys(exchangeRates).length, 'pairs');
        return exchangeRates;
    } catch (error) {
        console.error('❌ Failed to load exchange rates:', error);
        // Устанавливаем базовые курсы по умолчанию
        exchangeRates = {
            'USD_KGS': 87.5,
            'EUR_KGS': 95.0,
            'RUB_KGS': 0.95,
            'KGS_USD': 0.0114,
            'KGS_EUR': 0.0105,
            'KGS_RUB': 1.05
        };
        return exchangeRates;
    }
}

// Конвертация суммы
function convertAmount(amount, fromCurrency, toCurrency) {
    if (!amount || amount === 0) return 0;
    if (fromCurrency === toCurrency) return amount;
    
    const key = `${fromCurrency}_${toCurrency}`;
    const reverseKey = `${toCurrency}_${fromCurrency}`;
    
    if (exchangeRates[key]) {
        return amount * exchangeRates[key];
    } else if (exchangeRates[reverseKey]) {
        return amount / exchangeRates[reverseKey];
    } else {
        console.warn(`⚠️ No exchange rate for ${fromCurrency} -> ${toCurrency}`);
        return amount; // Возвращаем исходную сумму если нет курса
    }
}

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
    } else if (IS_LOCALHOST && TEST_USER_ID) {
        // В браузере на localhost используем тестовый ID
        state.userId = TEST_USER_ID;
        console.log('🧪 Using TEST_USER_ID for localhost:', TEST_USER_ID);
    } else {
        console.warn('⚠️ No Telegram user data available');
    }

    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
        const displayName = (IS_LOCALHOST && !tgUser.id) ? `${state.userName} (TEST)` : state.userName;
        userNameEl.textContent = displayName;
        console.log('📝 Username set to:', displayName);
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

// Обработка ошибок
function handleError(error, customMessage = 'Произошла ошибка') {
    console.error('❌ Error:', error);
    
    // Если ошибка 401 - токен истёк, перезапускаем авторизацию
    if (error.message && (
        error.message.includes('Not authenticated') || 
        error.message.includes('Could not validate credentials') ||
        error.message.includes('401') ||
        error.message.includes('Unauthorized')
    )) {
        localStorage.removeItem('auth_token');
        showError('Авторизация обновляется...');
        // Автоматически перезапускаем авторизацию
        setTimeout(() => {
            authenticate().then(success => {
                if (success) {
                    showSuccess('Авторизация успешна');
                    loadDashboard();
                }
            });
        }, 1000);
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
        console.log('✅ Token found, setting...');
        api.setToken(existingToken);
        
        // Проверим валидность токена простым запросом
        try {
            await api.getOverview({ period: 'week' });
            console.log('✅ Token is valid');
            return true;
        } catch (e) {
            console.warn('⚠️ Token invalid, re-authenticating...');
            localStorage.removeItem('auth_token');
            // Продолжаем к новой авторизации ниже
        }
    }
    
    try {
        const telegramData = tg?.initDataUnsafe;
        let userId = telegramData?.user?.id;
        
        // Если нет userId из Telegram, используем тестовый на localhost
        if (!userId && IS_LOCALHOST && TEST_USER_ID) {
            userId = TEST_USER_ID;
            console.log('🧪 Using TEST_USER_ID for authentication:', userId);
        }
        
        // Если всё ещё нет userId - показываем ошибку
        if (!userId) {
            console.warn('⚠️ No Telegram user ID');
            const errorMsg = window.Telegram?.WebApp 
                ? 'Не удалось получить данные из Telegram' 
                : 'Установите TEST_USER_ID в app.js для тестирования';
            showError(errorMsg);
            return false;
        }
        
        console.log('🔄 Authenticating with Telegram ID:', userId);
        
        const authData = {
            telegram_chat_id: String(userId),
            first_name: telegramData?.user?.first_name || state.userName,
            username: telegramData?.user?.username || null,
            last_name: telegramData?.user?.last_name || null,
            language_code: telegramData?.user?.language_code || 'ru'
        };
        
        console.log('Auth data:', authData);
        
        const response = await api.authTelegram(authData);
        
        console.log('Auth response:', response);
        
        if (response.access_token) {
            localStorage.setItem('auth_token', response.access_token);
            api.setToken(response.access_token);
            state.userId = userId;
            
            console.log('✅ Authentication successful');
            return true;
        } else {
            console.error('❌ No access token in response');
            showError('Сервер не вернул токен авторизации');
            return false;
        }
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        console.error('Error message:', error.message);
        
        // Показываем конкретную ошибку от сервера
        const errorMsg = error.message || 'Ошибка авторизации';
        showError(errorMsg);
        return false;
    }
}



// ===== DASHBOARD (HOME) =====
async function loadDashboard() {
    console.log(`📊 Loading dashboard for period: ${state.currentPeriod}, currency: ${state.currency}`);
    
    const cacheKey = `dashboard:${state.currentPeriod}:${state.currency}`;
    const cached = cache.get(cacheKey);
    
    // Preload analytics в фоне для быстрого перехода
    setTimeout(() => {
        const analyticsKey = `analytics:${state.currentPeriod}:${state.currency}`;
        if (!cache.get(analyticsKey)) {
            console.log('📦 Preloading analytics in background...');
            loadAnalytics().catch(e => console.warn('Preload analytics failed:', e));
        }
    }, 1000);
    
    // Показываем индикатор на кнопке обновления
    const refreshBtn = document.querySelector('.icon-btn');
    if (refreshBtn) refreshBtn.classList.add('loading');
    
    try {
        // Используем предзагруженные данные при первой загрузке
        if (!state.isInitialized && state.preloadedData) {
            console.log('⚡ Using preloaded data');
            const { overview, topCategories, rates } = state.preloadedData;
            exchangeRates = rates;
            
            // Конвертируем топ категории
            if (Array.isArray(topCategories)) {
                const convertedTop = topCategories.slice(0, 3).map(cat => {
                    const origCurrency = cat.currency || 'KGS';
                    const originalAmount = cat.total_amount || cat.amount || cat.total || 0;
                    const cleanCategory = (cat.category || 'Без категории').replace(/\s+/g, ' ').trim();
                    return {
                        ...cat,
                        category: cleanCategory,
                        amount: convertAmount(originalAmount, origCurrency, state.currency),
                        total: convertAmount(originalAmount, origCurrency, state.currency),
                        total_amount: convertAmount(originalAmount, origCurrency, state.currency),
                        currency: state.currency
                    };
                });
                updateHomeTopCategories(convertedTop);
            }
            
            updateDashboardUI(overview);
            cache.set(cacheKey, overview, 300);
            state.isInitialized = true;
            state.preloadedData = null;
            console.log('✅ Dashboard loaded from preload');
            return;
        }
        
        let data, topCategories;
        
        if (cached) {
            console.log('📦 Using cached dashboard data');
            data = cached;
            // Загружаем только топ категории
            const range = getDateRangeFor(state.currentPeriod);
            topCategories = await api.getCategoryAnalytics({ ...range, limit: 3 });
        } else {
            // Параллельная загрузка всех данных сразу
            const range = getDateRangeFor(state.currentPeriod);
            const loadRates = Object.keys(exchangeRates).length === 0 ? loadExchangeRates() : Promise.resolve();
            
            [data, topCategories] = await Promise.all([
                api.getOverview({ period: state.currentPeriod }),
                api.getCategoryAnalytics({ ...range, limit: 3 }),
                loadRates
            ]);
            
            cache.set(cacheKey, data, 300);
        }

        // Конвертируем топ категории
        if (Array.isArray(topCategories)) {
            const convertedTop = topCategories.map(cat => {
                const origCurrency = cat.currency || 'KGS';
                const originalAmount = cat.total_amount || cat.amount || cat.total || 0;
                const cleanCategory = (cat.category || 'Без категории').replace(/\s+/g, ' ').trim();
                return {
                    ...cat,
                    category: cleanCategory,
                    amount: convertAmount(originalAmount, origCurrency, state.currency),
                    total: convertAmount(originalAmount, origCurrency, state.currency),
                    total_amount: convertAmount(originalAmount, origCurrency, state.currency),
                    currency: state.currency
                };
            });
            updateHomeTopCategories(convertedTop);
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
    
    // Balance - конвертируем все суммы
    const origCurrency = data.balance.currency || 'KGS';
    const balance = convertAmount(data.balance.balance || 0, origCurrency, state.currency);
    const income = convertAmount(data.balance.total_income || 0, origCurrency, state.currency);
    const expense = convertAmount(data.balance.total_expense || 0, origCurrency, state.currency);
    
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
    // API может вернуть amount, total или total_amount
    const validCategories = categories.filter(cat => {
        const value = cat.total_amount || cat.amount || cat.total || 0;
        return cat && value > 0;
    });
    
    if (validCategories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-tag"></i><p>Нет данных</p></div>';
        return;
    }
    
    const total = validCategories.reduce((sum, cat) => sum + parseFloat(cat.total_amount || cat.amount || cat.total || 0), 0);
    
    container.innerHTML = validCategories.map((cat, index) => {
        const amount = parseFloat(cat.total_amount || cat.amount || cat.total || 0);
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
    
    let allTransactions = [
        ...(transactions.expenses || []).map(t => ({ ...t, type: 'expense' })),
        ...(transactions.income || []).map(t => ({ ...t, type: 'income' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    
    // Конвертируем в выбранную валюту
    allTransactions = allTransactions.map(t => {
        const origCurrency = t.currency || 'KGS';
        return {
            ...t,
            amount: convertAmount(t.amount, origCurrency, state.currency),
            currency: state.currency
        };
    });
    
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
                <div class="transaction-value ${t.type}">${formatCurrency(t.amount)}</div>
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
        
        // Применяем сохраненный период если селектор еще не трогали
        if (periodSelect && periodSelect.value === 'month') {
            const savedPeriod = localStorage.getItem('defaultPeriod') || 'week';
            periodSelect.value = savedPeriod;
            console.log('📊 Applied saved period to analytics:', savedPeriod);
        }
        
        const period = periodSelect?.value || 'month';
        
        let params = {};
        if (period === 'custom') {
            const panel = document.getElementById('custom-period-panel');
            if (!customPeriod.startDate || !customPeriod.endDate) {
                if (panel) panel.style.display = 'block';
                return;
            }
            params = {
                start_date: customPeriod.startDate,
                end_date: customPeriod.endDate
            };
        } else {
            params = getDateRangeFor(period);
        }

        const cacheKey = `analytics:${period}:${state.currency}:${params.start_date || ''}`;
        const cached = cache.get(cacheKey);
        
        let stats, topCategories;
        
        if (cached) {
            console.log('📦 Using cached analytics data');
            ({ stats, topCategories } = cached);
        } else {
            [stats, topCategories] = await Promise.all([
                api.getIncomeExpenseStats(params),
                api.getCategoryAnalytics({ ...params, limit: 10 })
            ]);
            
            // Кэшируем на 2 минуты
            cache.set(cacheKey, { stats, topCategories }, 120);
        }
        
        // Обновляем бейдж периода
        const periodBadge = document.getElementById('top-categories-period-badge');
        if (periodBadge) {
            const periodTexts = {
                'week': 'За неделю',
                'month': 'За месяц',
                'year': 'За год',
                'custom': 'Период'
            };
            periodBadge.textContent = periodTexts[period] || 'За месяц';
        }
        
        console.log('📊 Raw stats from API:', stats);
        console.log('📊 Raw topCategories from API:', topCategories);
        
        // Конвертируем все суммы в выбранную валюту
        const origCurrency = stats.currency || 'KGS';
        stats.total_income = convertAmount(stats.total_income || 0, origCurrency, state.currency);
        stats.total_expense = convertAmount(stats.total_expense || 0, origCurrency, state.currency);
        stats.balance = convertAmount(stats.balance || 0, origCurrency, state.currency);
        stats.currency = state.currency;
        
        // Конвертируем топ категории
        const convertedCategories = topCategories.map(cat => {
            console.log('📊 Converting category:', cat);
            const catCurrency = cat.currency || 'KGS';
            // API возвращает total_amount, а не amount или total
            const originalAmount = cat.total_amount || cat.amount || cat.total || 0;
            const convertedAmount = convertAmount(originalAmount, catCurrency, state.currency);
            // Очищаем название категории от лишних пробелов и переносов строк
            const cleanCategory = (cat.category || 'Без категории').replace(/\s+/g, ' ').trim();
            console.log(`💱 ${cleanCategory}: ${originalAmount} ${catCurrency} -> ${convertedAmount} ${state.currency}`);
            return {
                ...cat,
                category: cleanCategory,
                amount: convertedAmount,
                total: convertedAmount,
                total_amount: convertedAmount,
                currency: state.currency
            };
        });
        
        console.log('📊 Converted categories:', convertedCategories);
        
        // Объединяем данные
        const analyticsData = {
            ...stats,
            top_categories: convertedCategories
        };
        
        updateAnalyticsUI(analyticsData);
        
        // Ленивая загрузка графиков - загружаем через небольшую задержку
        setTimeout(() => loadCharts(analyticsData), 100);
        
        console.log('✅ Analytics loaded');
    } catch (error) {
        handleError(error, 'Не удалось загрузить аналитику');
    }
}

function updateAnalyticsUI(stats) {
    if (!stats) return;
    
    // KPI Cards - используем уже сконвертированные значения из loadAnalytics
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
    
    console.log('📊 updateTopCategories called with:', categories);
    
    if (!categories || categories.length === 0) {
        console.warn('⚠️ No categories provided');
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>Нет данных</p></div>';
        return;
    }
    
    // Фильтруем только валидные категории
    // API может вернуть amount, total или total_amount
    const validCategories = categories.filter(cat => {
        const value = cat.total_amount || cat.amount || cat.total || 0;
        console.log(`Category ${cat.category}: total_amount=${cat.total_amount}, amount=${cat.amount}, total=${cat.total}, value=${value}`);
        return cat && value > 0;
    });
    
    console.log('✅ Valid categories:', validCategories);
    
    if (validCategories.length === 0) {
        console.warn('⚠️ No valid categories after filtering');
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>Нет данных</p></div>';
        return;
    }
    
    const total = validCategories.reduce((sum, cat) => sum + parseFloat(cat.total_amount || cat.amount || cat.total || 0), 0);
    
    container.innerHTML = validCategories.map(cat => {
        const amount = parseFloat(cat.total_amount || cat.amount || cat.total || 0);
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
        
        const validCategories = stats.top_categories.filter(c => {
            const value = c.total_amount || c.total || c.amount || 0;
            return c && value > 0;
        });
        
        if (validCategories.length === 0) {
            pieCanvas.parentElement.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>Нет данных о расходах</p></div>';
        } else {
            pieCanvas.chart = new Chart(pieCanvas, {
                type: 'doughnut',
                data: {
                    labels: validCategories.map(c => c.category || 'Без категории'),
                    datasets: [{
                        data: validCategories.map(c => parseFloat(c.total_amount || c.total || c.amount || 0)),
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
    
    const cacheKey = `history:${historyFilters.type}:${historyFilters.category}:${state.currency}`;
    const cached = cache.get(cacheKey);
    
    const container = document.getElementById('transactions-history');
    
    try {
        let allTransactions;
        
        if (cached) {
            console.log('📦 Using cached history data');
            allTransactions = cached;
        } else {
            if (container) {
                container.innerHTML = '<div class="loading-placeholder"><div class="skeleton-item"></div><div class="skeleton-item"></div><div class="skeleton-item"></div></div>';
            }
            
            // Загружаем курсы валют если еще не загружены
            if (Object.keys(exchangeRates).length === 0) {
                await loadExchangeRates();
            }
            
            const type = historyFilters.type;
            
            const [expenses, income] = await Promise.all([
                type !== 'income' ? api.getExpenses() : Promise.resolve([]),
                type !== 'expense' ? api.getIncome() : Promise.resolve([])
            ]);
            
            allTransactions = [
                ...(expenses || []).map(t => ({ ...t, type: 'expense' })),
                ...(income || []).map(t => ({ ...t, type: 'income' }))
            ];
            
            // Конвертируем все транзакции в выбранную валюту
            allTransactions = allTransactions.map(t => {
                const origCurrency = t.currency || 'KGS';
                return {
                    ...t,
                    originalAmount: t.amount,
                    originalCurrency: origCurrency,
                    amount: convertAmount(t.amount, origCurrency, state.currency),
                    currency: state.currency
                };
            });
            
            // Кэшируем на 3 минуты
            cache.set(cacheKey, allTransactions, 180);
        }
        
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
                        <div class="transaction-value ${t.type}">${formatCurrency(t.amount)}</div>
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
    
    // Apply currency
    state.currency = savedCurrency;
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) {
        currencySelect.value = savedCurrency;
    }
    
    // Apply default period
    state.currentPeriod = savedPeriod;
    const defaultPeriodSelect = document.getElementById('default-period');
    if (defaultPeriodSelect) {
        defaultPeriodSelect.value = savedPeriod;
    }
    
    // Update period buttons on home screen
    document.querySelectorAll('.period-btn').forEach(btn => {
        if (btn.dataset.period === savedPeriod) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Apply theme
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
    
    if (savedTheme === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    console.log('✅ Settings loaded:', { currency: savedCurrency, period: savedPeriod, theme: savedTheme });
}

// ===== REPORTS =====
async function loadReports() {
    console.log('📄 Loading reports...');
    
    const cacheKey = `reports:list`;
    const cached = cache.get(cacheKey);
    
    const container = document.getElementById('reports-list');
    
    try {
        let reports;
        
        if (cached) {
            console.log('📦 Using cached reports data');
            reports = cached;
        } else {
            if (container) {
                container.innerHTML = `
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Загрузка отчётов...</p>
                    </div>
                `;
            }
            
            const response = await api.getReportsHistory();
            console.log('Reports API response:', response);
            
            // Обрабатываем разные форматы ответа
            if (Array.isArray(response)) {
                reports = response;
            } else if (response && Array.isArray(response.reports)) {
                reports = response.reports;
            } else if (response && typeof response === 'object') {
                // Если пришёл объект с данными отчётов
                reports = Object.values(response).filter(item => item && typeof item === 'object');
            } else {
                reports = [];
            }
            
            // Кэшируем на 5 минут (отчеты обновляются редко)
            cache.set(cacheKey, reports, 300);
        }
        
        updateReportsUI(reports);
        console.log('✅ Reports loaded:', reports.length);
    } catch (error) {
        console.error('Reports loading error:', error);
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Ошибка загрузки</h3>
                    <p>${error.message || 'Не удалось загрузить отчёты'}</p>
                    <button class="btn-primary" onclick="loadReports()">Попробовать снова</button>
                </div>
            `;
        }
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
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentPeriod = btn.dataset.period;
            console.log('🔄 Period changed to:', state.currentPeriod);
            // Очищаем кэш для нового периода
            cache.clear();
            await loadDashboard();
        });
    });
    
    // Analytics period
    const analyticsPeriod = document.getElementById('analytics-period');
    if (analyticsPeriod) {
        analyticsPeriod.addEventListener('change', (e) => {
            const customPanel = document.getElementById('custom-period-panel');
            const period = e.target.value;
            
            // Обновляем бейдж сразу
            const periodBadge = document.getElementById('top-categories-period-badge');
            if (periodBadge) {
                const periodTexts = {
                    'week': 'За неделю',
                    'month': 'За месяц',
                    'year': 'За год',
                    'custom': 'Период'
                };
                periodBadge.textContent = periodTexts[period] || 'За месяц';
            }
            
            if (period === 'custom') {
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
    
    // Дебаунсинг для фильтров - задержка 300мс
    let historyDebounceTimer;
    const debouncedLoadHistory = () => {
        clearTimeout(historyDebounceTimer);
        // Очищаем кэш истории при изменении фильтров
        cache.clearMatching('history');
        historyDebounceTimer = setTimeout(() => loadHistory(), 300);
    };
    
    if (historyType) {
        historyType.addEventListener('change', (e) => {
            historyFilters.type = e.target.value;
            debouncedLoadHistory();
        });
    }
    
    if (historyPeriod) {
        historyPeriod.addEventListener('change', (e) => {
            historyFilters.period = e.target.value;
            debouncedLoadHistory();
        });
    }
    
    if (historyCategory) {
        historyCategory.addEventListener('change', (e) => {
            historyFilters.category = e.target.value;
            debouncedLoadHistory();
        });
    }
    
    if (historySort) {
        historySort.addEventListener('change', (e) => {
            historyFilters.sortBy = e.target.value;
            debouncedLoadHistory();
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
        currencySelect.addEventListener('change', async (e) => {
            state.currency = e.target.value;
            localStorage.setItem('currency', e.target.value);
            console.log('💱 Currency changed to:', state.currency);
            
            // Очищаем только зависимые кэши
            cache.clearMatching('dashboard');
            cache.clearMatching('history');
            cache.clearMatching('analytics');
            
            // Перезагружаем текущий экран
            if (state.currentScreen === 'home') {
                await loadDashboard();
            } else if (state.currentScreen === 'analytics') {
                await loadAnalytics();
            } else if (state.currentScreen === 'history') {
                await loadHistory();
            }
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
    (async () => {
        // 1. Загружаем настройки СРАЗУ (до аутентификации)
        console.log('⚙️ Applying saved settings...');
        const savedCurrency = localStorage.getItem('currency') || 'KGS';
        const savedTheme = localStorage.getItem('theme') || 'auto';
        const savedPeriod = localStorage.getItem('defaultPeriod') || 'week';
        
        state.currency = savedCurrency;
        state.currentPeriod = savedPeriod;
        
        // Применяем тему сразу
        if (savedTheme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
        console.log('✅ Settings applied:', { currency: savedCurrency, theme: savedTheme, period: savedPeriod });
        
        // 2. Аутентификация СНАЧАЛА (чтобы получить токен)
        console.log('🔐 Starting authentication...');
        const authSuccess = await authenticate();
        
        if (!authSuccess) {
            console.error('❌ Authentication failed, stopping initialization');
            return;
        }
        
        console.log('✅ Authentication successful, token set');
        
        // 3. Предзагрузка данных УЖЕ С ТОКЕНОМ
        console.log('⚡ Starting data preload with token...');
        try {
            const range = getDateRangeFor(state.currentPeriod);
            const [rates, overview, topCategories] = await Promise.all([
                api.get('/rates/latest').then(r => {
                    const ratesObj = {};
                    r.forEach(rate => {
                        const key = `${rate.from_currency}_${rate.to_currency}`;
                        ratesObj[key] = rate.rate;
                    });
                    console.log('✅ Rates preloaded:', Object.keys(ratesObj).length, 'pairs');
                    return ratesObj;
                }),
                api.getOverview({ period: state.currentPeriod }),
                api.getCategoryAnalytics({ ...range, limit: 10 })
            ]);
            
            state.preloadedData = { rates, overview, topCategories };
            console.log('⚡ All data preloaded successfully');
        } catch (e) {
            console.warn('⚠️ Preload failed, will load on demand:', e);
        }
        
        // 4. Финальная инициализация
        ensureUserIdentity();
        switchScreen('home');
    })();
});

// ===== GLOBAL ERROR HANDLER =====
window.addEventListener('error', (e) => {
    console.error('💥 Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Unhandled rejection:', e.reason);
});

console.log('✅ App initialized');
