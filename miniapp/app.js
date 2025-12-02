// ============================================================================
// AIAccounter Mini App v1.1 - Read-Only Analytics Dashboard
// Clean, Fast, Optimized
// ============================================================================

const APP_VERSION = '1.1';

// ===== TELEGRAM WEB APP =====
const tg = window.Telegram?.WebApp;

// Определяем режим работы (глобально для всех скриптов)
window.IS_LOCALHOST = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

// Debug logger - only logs on localhost
const debug = {
    log: (...args) => window.IS_LOCALHOST && console.log('[APP]', ...args),
    warn: (...args) => window.IS_LOCALHOST && console.warn('[APP]', ...args),
    error: (...args) => console.error('[APP]', ...args), // Errors always logged
    info: (...args) => window.IS_LOCALHOST && console.info('[APP]', ...args)
};

debug.log(`🚀 AIAccounter v${APP_VERSION} - Analytics Dashboard`);

if (tg) {
    tg.ready();
    tg.expand();
    debug.log('✅ Telegram WebApp initialized');
    debug.log('📱 Telegram user data:', tg.initDataUnsafe?.user);
} else {
    debug.warn('⚠️ Running without Telegram WebApp (browser mode)');
}

// ===== CONFIG =====
const API_BASE = window.MiniAppConfig?.api?.baseUrl?.replace('/api/v1', '') || 
    (window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://aiaccounterbackend-production.up.railway.app');

debug.log('📡 API Base:', API_BASE);

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

// ===== API =====
const api = window.api;

// ===== PERFORMANCE MONITOR =====
const perf = {
    marks: {},
    start(label) {
        this.marks[label] = performance.now();
    },
    end(label) {
        if (this.marks[label]) {
            const duration = performance.now() - this.marks[label];
            debug.log(`⏱️ ${label}: ${duration.toFixed(1)}ms`);
            delete this.marks[label];
            return duration;
        }
        return 0;
    }
};

// ===== CACHE =====
const cache = {
    data: new Map(),
    version: APP_VERSION,
    
    set(key, value, ttl = 300) {
        const versionedKey = `${this.version}_${key}`;
        this.data.set(versionedKey, {
            value,
            expires: Date.now() + (ttl * 1000)
        });
        
        // Сохраняем в localStorage для persistent кэша
        try {
            localStorage.setItem(`cache_${versionedKey}`, JSON.stringify({
                value,
                expires: Date.now() + (ttl * 1000),
                version: this.version
            }));
        } catch (e) {
            debug.warn('Failed to save to localStorage:', e);
        }
    },
    
    get(key) {
        const versionedKey = `${this.version}_${key}`;
        // Сначала проверяем memory cache
        let item = this.data.get(versionedKey);
        
        // Если нет в памяти, проверяем localStorage
        if (!item) {
            try {
                const stored = localStorage.getItem(`cache_${versionedKey}`);
                if (stored) {
                    item = JSON.parse(stored);
                    // Проверяем версию
                    if (item.version !== this.version) {
                        localStorage.removeItem(`cache_${versionedKey}`);
                        return null;
                    }
                    if (Date.now() <= item.expires) {
                        // Восстанавливаем в memory cache
                        this.data.set(versionedKey, item);
                        debug.log('💾 Restored from localStorage:', key);
                    } else {
                        localStorage.removeItem(`cache_${versionedKey}`);
                        return null;
                    }
                }
            } catch (e) {
                debug.warn('Failed to read from localStorage:', e);
            }
        }
        
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.data.delete(versionedKey);
            localStorage.removeItem(`cache_${versionedKey}`);
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
        debug.log('🗑️ Cache cleared');
    },
    
    clearMatching(prefix) {
        const versionedPrefix = `${this.version}_${prefix}`;
        for (const key of this.data.keys()) {
            if (key.startsWith(versionedPrefix) || key.startsWith(prefix)) {
                this.data.delete(key);
                localStorage.removeItem(`cache_${key}`);
            }
        }
        debug.log(`🗑️ Cleared cache with prefix: ${prefix}`);
    }
};

// ===== CURRENCY CONVERSION =====
let exchangeRates = {}; // Кэш курсов валют

// Загрузка курсов валют
async function loadExchangeRates() {
    // Проверяем кэш курсов (1 час TTL)
    const cachedRates = cache.get('exchange_rates');
    if (cachedRates) {
        exchangeRates = cachedRates;
        debug.log('💾 Exchange rates from cache:', Object.keys(exchangeRates).length, 'pairs');
        return exchangeRates;
    }
    
    try {
        const rates = await api.get('/rates/latest');
        exchangeRates = {};
        rates.forEach(rate => {
            const key = `${rate.from_currency}_${rate.to_currency}`;
            exchangeRates[key] = rate.rate;
        });
        
        // Кэшируем на 1 час (курсы обновляются редко)
        cache.set('exchange_rates', exchangeRates, 3600);
        debug.log('✅ Exchange rates loaded:', Object.keys(exchangeRates).length, 'pairs');
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
        debug.warn(`⚠️ No exchange rate for ${fromCurrency} -> ${toCurrency}`);
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
    debug.log('👤 Updating user identity...');
    debug.log('Telegram WebApp object:', window.Telegram?.WebApp);
    debug.log('initDataUnsafe:', tg?.initDataUnsafe);
    
    // Освежим данные из Telegram на всякий случай
    const tgUser = tg?.initDataUnsafe?.user || {};
    debug.log('Telegram user data:', tgUser);
    
    if (tgUser && tgUser.id) {
        state.userId = tgUser.id;
        state.userName = tgUser.first_name || tgUser.username || 'Пользователь';
        state.userPhoto = tgUser.photo_url || null;
        
        debug.log('✅ User identity updated:', {
            id: state.userId,
            name: state.userName,
            photo: state.userPhoto ? 'present' : 'absent'
        });
    } else if (IS_LOCALHOST && TEST_USER_ID) {
        // В браузере на localhost используем тестовый ID
        state.userId = TEST_USER_ID;
        debug.log('🧪 Using TEST_USER_ID for localhost:', TEST_USER_ID);
    } else {
        debug.warn('⚠️ No Telegram user data available');
    }

    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
        const displayName = (IS_LOCALHOST && !tgUser.id) ? `${state.userName} (TEST)` : state.userName;
        userNameEl.textContent = displayName;
        debug.log('📝 Username set to:', displayName);
    }

    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) {
        if (state.userPhoto) {
            avatarEl.style.backgroundImage = `url(${state.userPhoto})`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.innerHTML = '';
            debug.log('🖼️ Avatar image set');
        } else {
            // Вернём иконку, если фото нет
            if (!avatarEl.querySelector('i')) {
                avatarEl.innerHTML = '<i class="fas fa-user-circle"></i>';
            }
            avatarEl.style.removeProperty('background-image');
            debug.log('👤 Using default avatar icon');
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
    debug.log(`📍 Navigate to: ${screenName}`);
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // Show target screen
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(item => {
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
            // Загружаем AI инсайты после основной аналитики
            setTimeout(() => loadAIInsights(), 500);
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
        case 'categories':
            loadCategories();
            break;
        case 'recurring':
            loadRecurringPayments();
            break;
        case 'debts':
            loadDebts();
            break;
    }
}

// ===== AUTHENTICATION =====
async function authenticate() {
    debug.log('🔐 Authenticating...');
    
    // Проверяем наличие токена
    const existingToken = localStorage.getItem('auth_token');
    if (existingToken) {
        debug.log('✅ Token found, setting...');
        api.setToken(existingToken);
        
        // Проверим валидность токена простым запросом
        try {
            await api.getOverview({ period: 'week' });
            debug.log('✅ Token is valid');
            return true;
        } catch (e) {
            debug.warn('⚠️ Token invalid, re-authenticating...');
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
            debug.log('🧪 Using TEST_USER_ID for authentication:', userId);
        }
        
        // Если всё ещё нет userId - показываем ошибку
        if (!userId) {
            debug.warn('⚠️ No Telegram user ID');
            const errorMsg = window.Telegram?.WebApp 
                ? 'Не удалось получить данные из Telegram' 
                : 'Установите TEST_USER_ID в app.js для тестирования';
            showError(errorMsg);
            return false;
        }
        
        debug.log('🔄 Authenticating with Telegram ID:', userId);
        
        const authData = {
            telegram_chat_id: String(userId),
            first_name: telegramData?.user?.first_name || state.userName,
            username: telegramData?.user?.username || null,
            last_name: telegramData?.user?.last_name || null,
            language_code: telegramData?.user?.language_code || 'ru'
        };
        
        debug.log('Auth data:', authData);
        
        const response = await api.authTelegram(authData);
        
        debug.log('Auth response:', response);
        
        if (response.access_token) {
            localStorage.setItem('auth_token', response.access_token);
            api.setToken(response.access_token);
            state.userId = userId;
            
            debug.log('✅ Authentication successful');
            
            // Подключаем WebSocket для real-time updates
            if (typeof wsManager !== 'undefined') {
                wsManager.connect(response.access_token).catch(err => {
                    debug.warn('⚠️ WebSocket connection failed:', err);
                });
            }
            
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
    perf.start('loadDashboard');
    debug.log(`📊 Loading dashboard for period: ${state.currentPeriod}, currency: ${state.currency}`);
    
    const cacheKey = `dashboard:${state.currentPeriod}:${state.currency}`;
    const cached = cache.get(cacheKey);
    
    // Preload analytics в фоне для быстрого перехода (только если нет кэша)
    if (!cache.get(`analytics:${state.currentPeriod}:${state.currency}`)) {
        setTimeout(() => {
            debug.log('📦 Preloading analytics in background...');
            loadAnalytics().catch(e => debug.warn('Preload analytics failed:', e));
        }, 2000);
    }
    
    // Показываем skeleton только если нет кэша
    if (!cached && !state.preloadedData) {
        const balanceCard = document.querySelector('.balance-card');
        if (balanceCard && !balanceCard.querySelector('.skeleton-item')) {
            const skeleton = document.createElement('div');
            skeleton.className = 'loading-placeholder';
            skeleton.innerHTML = '<div class="skeleton-item"></div>';
            balanceCard.appendChild(skeleton);
        }
    }
    
    // Показываем индикатор на кнопке обновления
    const refreshBtn = document.querySelector('.icon-btn');
    if (refreshBtn) refreshBtn.classList.add('loading');
    
    try {
        // Используем предзагруженные данные при первой загрузке
        if (!state.isInitialized && state.preloadedData) {
            debug.log('⚡ Using preloaded data');
            const { overview, topCategories, rates } = state.preloadedData;
            exchangeRates = rates;
            
            // Данные уже сконвертированы на сервере
            if (Array.isArray(topCategories)) {
                const cleanedTop = topCategories.slice(0, 3).map(cat => ({
                    ...cat,
                    category: (cat.category || 'Без категории').replace(/\s+/g, ' ').trim()
                }));
                updateHomeTopCategories(cleanedTop);
            }
            
            updateDashboardUI(overview);
            cache.set(cacheKey, overview, 300);
            state.isInitialized = true;
            state.preloadedData = null;
            debug.log('✅ Dashboard loaded from preload');
            return;
        }
        
        let dashboardData;
        
        if (cached) {
            debug.log('📦 Using cached dashboard data');
            dashboardData = cached;
        } else {
            // Параллельная загрузка всех данных сразу
            const range = getDateRangeFor(state.currentPeriod);
            const loadRates = Object.keys(exchangeRates).length === 0 ? loadExchangeRates() : Promise.resolve();
            
            const [data, topCategories] = await Promise.all([
                api.getOverview({ period: state.currentPeriod }),
                api.getCategoryAnalytics({ ...range, limit: 3 }),
                loadRates
            ]);
            
            // Данные уже сконвертированы на сервере, только чистим названия
            const cleanedTop = Array.isArray(topCategories) ? topCategories.map(cat => ({
                ...cat,
                category: (cat.category || 'Без категории').replace(/\s+/g, ' ').trim()
            })) : [];
            
            dashboardData = { ...data, topCategories: cleanedTop };
            cache.set(cacheKey, dashboardData, 300);
        }
        
        // Обновляем UI
        updateDashboardUI(dashboardData);
        if (dashboardData.topCategories) {
            updateHomeTopCategories(dashboardData.topCategories);
        }
        perf.end('loadDashboard');
        debug.log('✅ Dashboard loaded');
    } catch (error) {
        handleError(error, 'Не удалось загрузить данные');
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('loading');
        // Убираем skeleton
        const skeleton = document.querySelector('.balance-card .loading-placeholder');
        if (skeleton) skeleton.remove();
    }
}

function updateDashboardUI(data) {
    debug.log('🎨 Updating dashboard UI', data);
    
    if (!data || !data.balance) {
        debug.warn('⚠️ No balance data');
        return;
    }
    
    // Balance - данные приходят в KGS, конвертируем в выбранную валюту
    const origCurrency = data.balance.currency || 'KGS';
    const balance = convertAmount(data.balance.balance || 0, origCurrency, state.currency);
    const income = convertAmount(data.balance.total_income || 0, origCurrency, state.currency);
    const expense = convertAmount(data.balance.total_expense || 0, origCurrency, state.currency);
    
    // Батчим DOM операции
    requestAnimationFrame(() => {
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
    
        // Stats cards
        const transactionsCount = (data.balance.income_count || 0) + (data.balance.expense_count || 0);
        const countEl = document.getElementById('transactions-count');
        if (countEl) countEl.textContent = transactionsCount;
        
        const avgDaily = expense > 0 ? (expense / 30).toFixed(0) : 0;
        const avgEl = document.getElementById('avg-daily');
        if (avgEl) avgEl.textContent = formatCurrency(avgDaily);
        
        const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
        const rateEl = document.getElementById('savings-rate');
        if (rateEl) rateEl.textContent = `${savingsRate}%`;
        
        // Update trend indicators
        const rateTrend = document.getElementById('savings-rate-trend');
        if (rateTrend) {
            if (savingsRate > 0) {
                rateTrend.innerHTML = `<i class="fas fa-arrow-up"></i>`;
                rateTrend.classList.add('positive');
                rateTrend.classList.remove('negative');
            } else if (savingsRate < 0) {
                rateTrend.innerHTML = `<i class="fas fa-arrow-down"></i>`;
                rateTrend.classList.add('negative');
                rateTrend.classList.remove('positive');
            } else {
                rateTrend.innerHTML = `<i class="fas fa-minus"></i>`;
                rateTrend.classList.remove('positive', 'negative');
            }
        }
    });
    
    // Recent transactions (асинхронно)
    if (data.recent_transactions) {
        requestAnimationFrame(() => updateRecentTransactions(data.recent_transactions));
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
    const validCategories = categories.filter(cat => {
        const value = cat.total_amount || cat.amount || cat.total || 0;
        return cat && value > 0;
    });
    
    if (validCategories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-tag"></i><p>Нет данных</p></div>';
        return;
    }
    
    // Конвертируем суммы из KGS в выбранную валюту (данные приходят в KGS с бэка)
    const convertedCategories = validCategories.map(cat => {
        const origAmount = parseFloat(cat.total_amount || cat.amount || cat.total || 0);
        const origCurrency = cat.currency || 'KGS';
        return {
            ...cat,
            convertedAmount: convertAmount(origAmount, origCurrency, state.currency)
        };
    });
    
    const total = convertedCategories.reduce((sum, cat) => sum + cat.convertedAmount, 0);
    const colors = ['#667eea', '#f093fb', '#4facfe'];
    
    // Используем DocumentFragment для батчинга
    const fragment = document.createDocumentFragment();
    convertedCategories.forEach((cat, index) => {
        const amount = cat.convertedAmount;
        const percent = total > 0 ? ((amount / total) * 100).toFixed(0) : 0;
        
        const div = document.createElement('div');
        div.className = 'top-category-compact';
        div.innerHTML = `
            <div class="category-indicator" style="background: ${colors[index]}"></div>
            <div class="category-compact-info">
                <div class="category-compact-name">${cat.category || 'Без категории'}</div>
                <div class="category-compact-amount">${formatCurrency(amount)}</div>
            </div>
            <div class="category-compact-percent">${percent}%</div>
        `;
        fragment.appendChild(div);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function updateRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions');
    if (!container) return;
    
    // Транзакции приходят в разных валютах, конвертируем в выбранную валюту
    let allTransactions = [
        ...(transactions.expenses || []).map(t => ({ ...t, type: 'expense' })),
        ...(transactions.income || []).map(t => ({ ...t, type: 'income' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    
    // Конвертируем из оригинальной валюты в выбранную валюту пользователя
    allTransactions = allTransactions.map(t => {
        const origCurrency = t.original_currency || t.currency || 'KGS';
        const origAmount = t.original_amount || t.amount;
        return {
            ...t,
            amount: convertAmount(origAmount, origCurrency, state.currency),
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
        <div class="tx-item-modern">
            <div class="tx-icon-modern ${t.type}">
                <i class="fas fa-${t.type === 'income' ? 'arrow-down' : 'arrow-up'}"></i>
            </div>
            <div class="tx-info-modern">
                <div class="tx-cat-modern">${t.category || 'Без категории'}</div>
                <div class="tx-desc-modern">${t.description || formatDate(t.date)}</div>
            </div>
            <div class="tx-amount-modern ${t.type}">${formatCurrency(t.amount)}</div>
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
    perf.start('loadAnalytics');
    debug.log('📊 Loading analytics...');
    
    // Показываем лоадер
    const chartContainer = document.querySelector('.chart-container canvas')?.parentElement;
    const categoriesContainer = document.getElementById('categories-chart-container');
    
    if (chartContainer) {
        chartContainer.innerHTML = '<div class="loading-placeholder" style="height: 200px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--text-secondary);"></i></div>';
    }
    
    try {
        const periodSelect = document.getElementById('analytics-period');
        
        // Применяем сохраненный период если селектор еще не трогали
        if (periodSelect && periodSelect.value === 'month') {
            const savedPeriod = localStorage.getItem('defaultPeriod') || 'week';
            periodSelect.value = savedPeriod;
            debug.log('📊 Applied saved period to analytics:', savedPeriod);
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
        
        // Загружаем курсы если нужно
        if (Object.keys(exchangeRates).length === 0) {
            await loadExchangeRates();
        }

        const cacheKey = `analytics:${period}:${state.currency}:${params.start_date || ''}`;
        const cached = cache.get(cacheKey);
        
        let stats, topCategories;
        
        if (cached) {
            debug.log('📦 Using cached analytics data');
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
        
        debug.log('📊 Raw stats from API:', stats);
        debug.log('📊 Raw topCategories from API:', topCategories);
        
        // Конвертируем все суммы в выбранную валюту
        const origCurrency = stats.currency || 'KGS';
        stats.total_income = convertAmount(stats.total_income || 0, origCurrency, state.currency);
        stats.total_expense = convertAmount(stats.total_expense || 0, origCurrency, state.currency);
        stats.balance = convertAmount(stats.balance || 0, origCurrency, state.currency);
        stats.currency = state.currency;
        
        // Конвертируем топ категории
        const convertedCategories = topCategories.map(cat => {
            debug.log('📊 Converting category:', cat);
            const catCurrency = cat.currency || 'KGS';
            // API возвращает total_amount, а не amount или total
            const originalAmount = cat.total_amount || cat.amount || cat.total || 0;
            const convertedAmount = convertAmount(originalAmount, catCurrency, state.currency);
            // Очищаем название категории от лишних пробелов и переносов строк
            const cleanCategory = (cat.category || 'Без категории').replace(/\s+/g, ' ').trim();
            debug.log(`💱 ${cleanCategory}: ${originalAmount} ${catCurrency} -> ${convertedAmount} ${state.currency}`);
            return {
                ...cat,
                category: cleanCategory,
                amount: convertedAmount,
                total: convertedAmount,
                total_amount: convertedAmount,
                currency: state.currency
            };
        });
        
        debug.log('📊 Converted categories:', convertedCategories);
        
        // Объединяем данные
        const analyticsData = {
            ...stats,
            top_categories: convertedCategories
        };
        
        updateAnalyticsUI(analyticsData);
        
        // Ленивая загрузка графиков - загружаем через небольшую задержку
        setTimeout(() => loadCharts(analyticsData), 100);
        
        perf.end('loadAnalytics');
        debug.log('✅ Analytics loaded');
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
    
    debug.log('📊 updateTopCategories called with:', categories);
    
    if (!categories || categories.length === 0) {
        debug.warn('⚠️ No categories provided');
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>Нет данных</p></div>';
        return;
    }
    
    // Фильтруем только валидные категории
    // API может вернуть amount, total или total_amount
    const validCategories = categories.filter(cat => {
        const value = cat.total_amount || cat.amount || cat.total || 0;
        debug.log(`Category ${cat.category}: total_amount=${cat.total_amount}, amount=${cat.amount}, total=${cat.total}, value=${value}`);
        return cat && value > 0;
    });
    
    debug.log('✅ Valid categories:', validCategories);
    
    if (validCategories.length === 0) {
        debug.warn('⚠️ No valid categories after filtering');
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

// История транзакций с pagination
let historyState = {
    currentPage: 1,
    pageSize: 30,
    hasMore: true,
    loading: false,
    allTransactions: [] // Храним все загруженные транзакции
};

async function loadHistory(loadMore = false) {
    perf.start('loadHistory');
    debug.log('📜 Loading history...', { loadMore, currentPage: historyState.currentPage, hasMore: historyState.hasMore, loading: historyState.loading });
    
    if (historyState.loading) {
        debug.warn('⚠️ Already loading, skipping...');
        return;
    }
    
    const container = document.getElementById('transactions-history');
    
    // Кэш только для первой страницы без фильтров
    const cacheKey = `history:${historyFilters.type}:${historyFilters.category}:${state.currency}:p1`;
    if (!loadMore && historyState.currentPage === 1) {
        const cached = cache.get(cacheKey);
        if (cached) {
            debug.log('📦 Using cached history');
            historyState.allTransactions = cached.transactions;
            historyState.hasMore = cached.hasMore;
            historyState.currentPage = 2;
            renderHistoryTransactions(historyState.allTransactions);
            perf.end('loadHistory');
            return;
        }
    }
    
    try {
        historyState.loading = true;
        
        if (!loadMore) {
            historyState.currentPage = 1;
            historyState.hasMore = true;
            if (container) {
                container.innerHTML = '<div class="loading-placeholder"><div class="skeleton-item"></div><div class="skeleton-item"></div><div class="skeleton-item"></div></div>';
            }
        } else {
            // Show loading state in existing button if present
            const loadMoreBtn = document.getElementById('load-more-btn');
            if (loadMoreBtn) {
                loadMoreBtn.disabled = true;
                loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
            }
        }
        
        // Загружаем курсы валют если еще не загружены
        if (Object.keys(exchangeRates).length === 0) {
            await loadExchangeRates();
        }
        
        const type = historyFilters.type;
        
        // Загружаем через единый endpoint /transactions
        const params = { 
            page: historyState.currentPage, 
            page_size: historyState.pageSize
        };
        
        // Добавляем type только если не 'all'
        if (type && type !== 'all') {
            params.type = type;
        }
        
        const data = await api.getTransactions(params);
        
        debug.log('📊 API Response:', { 
            count: data.items?.length || 0, 
            has_next: data.has_next, 
            total: data.total 
        });
        
        let newTransactions = data.items || [];
        
        // Конвертируем все транзакции в выбранную валюту
        newTransactions = newTransactions.map(t => {
            const origCurrency = t.currency || 'KGS';
            return {
                ...t,
                originalAmount: t.amount,
                originalCurrency: origCurrency,
                amount: convertAmount(t.amount, origCurrency, state.currency),
                currency: state.currency
            };
        });
        
        // Фильтрация по категории
        if (historyFilters.category !== 'all') {
            newTransactions = newTransactions.filter(t => t.category === historyFilters.category);
        }
        
        // Сортировка
        newTransactions = sortTransactions(newTransactions, historyFilters.sortBy);
        
        // Обновляем массив всех транзакций
        if (loadMore) {
            historyState.allTransactions = [...historyState.allTransactions, ...newTransactions];
        } else {
            historyState.allTransactions = newTransactions;
        }
        
        // Проверяем, есть ли еще данные
        historyState.hasMore = data.has_next;
        debug.log('🔄 hasMore:', historyState.hasMore);
        
        // Увеличиваем номер страницы для следующей загрузки
        historyState.currentPage++;
        
        // ВАЖНО: Устанавливаем loading = false ДО рендера
        historyState.loading = false;
        
        // Кэшируем первую страницу (2 минуты)
        if (historyState.currentPage === 2) {  // currentPage уже увеличен
            const historyCacheKey = `history:${historyFilters.type}:${historyFilters.category}:${state.currency}:p1`;
            cache.set(historyCacheKey, {
                transactions: historyState.allTransactions,
                hasMore: historyState.hasMore
            }, 120);
        }
        
        // Рендерим все транзакции
        debug.log('🎨 Rendering', historyState.allTransactions.length, 'transactions, hasMore:', historyState.hasMore);
        renderHistoryTransactions(historyState.allTransactions);
        
        debug.log('✅ Loading complete, new state:', { currentPage: historyState.currentPage, hasMore: historyState.hasMore, loading: historyState.loading });
        
        perf.end('loadHistory');
        debug.log(`✅ History loaded. Page: ${historyState.currentPage - 1}, Has more: ${historyState.hasMore}`);
    } catch (error) {
        historyState.loading = false;
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

// Render paginated transactions (always replace)
function renderHistoryTransactions(transactions) {
    debug.log('🎨 renderHistoryTransactions called:', { count: transactions.length, hasMore: historyState.hasMore, loading: historyState.loading });
    const container = document.getElementById('transactions-history');
    if (!container) return;
    
    // Remove existing load more button if present
    const existingBtn = document.getElementById('load-more-btn');
    if (existingBtn) existingBtn.remove();
    
    if (transactions.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>Нет транзакций</p></div>';
        return;
    }
    
    // Group by date
    const grouped = {};
    transactions.forEach(t => {
        const dateKey = formatDate(t.date);
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(t);
    });
    
    const html = Object.entries(grouped).map(([date, items]) => `
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
    
    container.innerHTML = html;
    
    // Add load more button if there are more pages
    if (historyState.hasMore) {
        debug.log('➕ Adding "Load More" button');
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-btn';
        loadMoreBtn.className = 'btn-load-more';
        loadMoreBtn.innerHTML = historyState.loading 
            ? '<i class="fas fa-spinner fa-spin"></i> <span>Загрузка...</span>' 
            : '<i class="fas fa-arrow-down"></i> <span>Загрузить еще</span>';
        loadMoreBtn.disabled = historyState.loading;
        loadMoreBtn.onclick = () => loadHistory(true);
        container.parentElement.appendChild(loadMoreBtn);
        debug.log('✅ Button added to DOM');
    } else {
        debug.log('❌ No more pages, button not added');
    }
}

// ===== SETTINGS =====
function loadSettings() {
    debug.log('⚙️ Loading settings...');
    
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
    
    // Update period pills on home screen
    document.querySelectorAll('.pill[data-period]').forEach(btn => {
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
    
    debug.log('✅ Settings loaded:', { currency: savedCurrency, period: savedPeriod, theme: savedTheme });
}

// ===== REPORTS =====
async function loadReports() {
    debug.log('📄 Loading reports...');
    
    const cacheKey = `reports:list`;
    const cached = cache.get(cacheKey);
    
    const container = document.getElementById('reports-list');
    
    try {
        let reports;
        
        if (cached) {
            debug.log('📦 Using cached reports data');
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
            debug.log('Reports API response:', response);
            
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
        debug.log('✅ Reports loaded:', reports.length);
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
    debug.log('✅', message);
    
    // Показываем toast
    const toast = document.createElement('div');
    toast.className = 'success-toast';
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
    debug.log('🎯 DOM loaded, initializing...');

    // Применяем сохраненную тему НЕМЕДЛЕННО перед всем остальным
    const savedTheme = localStorage.getItem('theme') || 'auto';
    if (savedTheme === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    debug.log('🎨 Theme applied early:', savedTheme);

    // Регистрируем Service Worker с автообновлением
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                debug.log('✅ Service Worker registered');
                
                // Проверяем обновления каждые 30 секунд
                setInterval(() => {
                    registration.update();
                }, 30000);
                
                // Автоматически обновляем при обнаружении новой версии
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    debug.log('🔄 New Service Worker found, updating...');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            debug.log('✅ New version available, reloading...');
                            window.location.reload();
                        }
                    });
                });
            })
            .catch(err => debug.warn('⚠️ Service Worker registration failed:', err));
    }

    // Очищаем старые версии кэша из localStorage
    const storedVersion = localStorage.getItem('app_version');
    if (storedVersion !== APP_VERSION) {
        debug.log(`🔄 Version changed from ${storedVersion} to ${APP_VERSION}, clearing old cache...`);
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cache_') && !key.includes(APP_VERSION)) {
                localStorage.removeItem(key);
            }
        });
        localStorage.setItem('app_version', APP_VERSION);
        debug.log('✅ Old cache cleared');
    }

    // Установим имя и аватарку пользователя
    ensureUserIdentity();
    
    // Navigation
    document.querySelectorAll('.nav-btn[data-screen]').forEach(btn => {
        btn.addEventListener('click', () => {
            switchScreen(btn.dataset.screen);
        });
    });
    
    // Period selector (segments)
    document.querySelectorAll('.segment[data-period]').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentPeriod = btn.dataset.period;
            debug.log('🔄 Period changed to:', state.currentPeriod);
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
            debug.warn('Не удалось загрузить категории для фильтра', e);
        }
    })();
    
    // Settings
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) {
        currencySelect.addEventListener('change', async (e) => {
            state.currency = e.target.value;
            localStorage.setItem('currency', e.target.value);
            debug.log('💱 Currency changed to:', state.currency);
            
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
            
            // Форсируем перерисовку текущего экрана
            debug.log('🎨 Theme changed, reloading current screen...');
            setTimeout(() => {
                if (state.currentScreen === 'home') {
                    loadDashboard();
                } else if (state.currentScreen === 'analytics') {
                    loadAnalytics();
                } else if (state.currentScreen === 'history') {
                    loadHistory();
                }
            }, 100);
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
        debug.log('⚙️ Applying saved settings...');
        const savedCurrency = localStorage.getItem('currency') || 'KGS';
        const savedTheme = localStorage.getItem('theme') || 'auto';
        const savedPeriod = localStorage.getItem('defaultPeriod') || 'week';
        
        state.currency = savedCurrency;
        state.currentPeriod = savedPeriod;
        
        // Применяем тему сразу с небольшой задержкой для загрузки CSS
        requestAnimationFrame(() => {
            if (savedTheme === 'auto') {
                document.documentElement.removeAttribute('data-theme');
            } else {
                document.documentElement.setAttribute('data-theme', savedTheme);
            }
            debug.log('✅ Settings applied:', { currency: savedCurrency, theme: savedTheme, period: savedPeriod });
        });
        
        // 2. Аутентификация СНАЧАЛА (чтобы получить токен)
        debug.log('🔐 Starting authentication...');
        const authSuccess = await authenticate();
        
        if (!authSuccess) {
            console.error('❌ Authentication failed, stopping initialization');
            return;
        }
        
        debug.log('✅ Authentication successful, token set');
        
        // 3. Предзагрузка данных УЖЕ С ТОКЕНОМ
        debug.log('⚡ Starting data preload with token...');
        try {
            const range = getDateRangeFor(state.currentPeriod);
            const [rates, overview, topCategories] = await Promise.all([
                api.get('/rates/latest').then(r => {
                    const ratesObj = {};
                    r.forEach(rate => {
                        const key = `${rate.from_currency}_${rate.to_currency}`;
                        ratesObj[key] = rate.rate;
                    });
                    debug.log('✅ Rates preloaded:', Object.keys(ratesObj).length, 'pairs');
                    return ratesObj;
                }),
                api.getOverview({ period: state.currentPeriod }),
                api.getCategoryAnalytics({ ...range, limit: 10 })
            ]);
            
            state.preloadedData = { rates, overview, topCategories };
            debug.log('⚡ All data preloaded successfully');
        } catch (e) {
            debug.warn('⚠️ Preload failed, will load on demand:', e);
        }
        
        // 4. Финальная инициализация
        ensureUserIdentity();
        switchScreen('home');
    })();
});

// ===== CATEGORIES =====
let categoriesState = {
    currentType: 'expense',
    allCategories: [],
    loading: false
};

async function loadCategories() {
    debug.log('📁 Loading categories...');
    
    if (categoriesState.loading) return;
    categoriesState.loading = true;
    
    const cacheKey = 'categories:all';
    const cached = cache.get(cacheKey);
    
    // Если есть кэш - используем его
    if (cached) {
        debug.log('📦 Using cached categories');
        categoriesState.allCategories = cached;
        renderCategories();
        categoriesState.loading = false;
        return;
    }
    
    // Показываем лоадер в обоих контейнерах
    const defaultList = document.getElementById('default-categories-list');
    const userList = document.getElementById('user-categories-list');
    const loaderHtml = '<div class="loading-placeholder"><div class="skeleton-item"></div><div class="skeleton-item"></div></div>';
    
    if (defaultList) defaultList.innerHTML = loaderHtml;
    if (userList) userList.innerHTML = loaderHtml;
    
    try {
        const data = await api.getAllCategories();
        debug.log('📁 Categories loaded:', data);
        
        categoriesState.allCategories = [
            ...data.expense_categories.map(c => ({ ...c, type: 'expense' })),
            ...data.income_categories.map(c => ({ ...c, type: 'income' }))
        ];
        
        // Кэшируем на 10 минут (категории редко меняются)
        cache.set(cacheKey, categoriesState.allCategories, 600);
        
        renderCategories();
    } catch (error) {
        if (defaultList) defaultList.innerHTML = '';
        if (userList) userList.innerHTML = '';
        handleError(error, 'Не удалось загрузить категории');
    } finally {
        categoriesState.loading = false;
    }
}

function switchCategoryTab(type) {
    categoriesState.currentType = type;
    
    // Update type toggle buttons
    document.querySelectorAll('#categories-screen .type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    renderCategories();
}

function renderCategories() {
    const type = categoriesState.currentType;
    const categories = categoriesState.allCategories.filter(c => c.type === type);
    
    const defaultCategories = categories.filter(c => c.is_default);
    const userCategories = categories.filter(c => !c.is_default);
    
    // Update counts
    document.getElementById('default-categories-count').textContent = defaultCategories.length;
    document.getElementById('user-categories-count').textContent = userCategories.length;
    
    // Render default categories
    const defaultList = document.getElementById('default-categories-list');
    defaultList.innerHTML = defaultCategories.map(cat => `
        <div class="category-card">
            <div class="category-icon">${cat.icon || '📁'}</div>
            <div class="category-name">${cat.name}</div>
        </div>
    `).join('');
    
    // Render user categories
    const userList = document.getElementById('user-categories-list');
    const noUserCats = document.getElementById('no-user-categories');
    
    if (userCategories.length === 0) {
        userList.innerHTML = '';
        noUserCats.style.display = 'block';
    } else {
        noUserCats.style.display = 'none';
        userList.innerHTML = userCategories.map(cat => `
            <div class="category-card user-category" onclick="confirmDeleteCategory(${cat.id}, '${cat.name}')">
                <div class="category-icon">${cat.icon || '📁'}</div>
                <div class="category-name">${cat.name}</div>
                <button class="delete-btn" onclick="event.stopPropagation(); confirmDeleteCategory(${cat.id}, '${cat.name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
}

function openAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    modal.style.display = 'flex';
    
    // Set default type based on current tab
    const currentType = categoriesState.currentType;
    document.getElementById('new-category-type').value = currentType;
    
    // Set radio button
    const radioBtn = document.querySelector(`input[name="cat-type"][value="${currentType}"]`);
    if (radioBtn) radioBtn.checked = true;
    
    // Reset form
    document.getElementById('new-category-name').value = '';
    document.getElementById('new-category-icon').value = '📁';
    
    // Reset emoji picker
    document.querySelectorAll('#emoji-picker .emoji').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.emoji === '📁');
    });
    
    // Setup emoji picker
    document.querySelectorAll('#emoji-picker .emoji').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('#emoji-picker .emoji').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('new-category-icon').value = btn.dataset.emoji;
        };
    });
    
    // Setup type radio buttons
    document.querySelectorAll('input[name="cat-type"]').forEach(radio => {
        radio.onchange = () => {
            document.getElementById('new-category-type').value = radio.value;
        };
    });
}

function closeAddCategoryModal() {
    document.getElementById('add-category-modal').style.display = 'none';
}

async function submitAddCategory(event) {
    event.preventDefault();
    
    const name = document.getElementById('new-category-name').value.trim();
    const type = document.getElementById('new-category-type').value;
    const icon = document.getElementById('new-category-icon').value;
    
    if (!name) {
        showError('Введите название категории');
        return;
    }
    
    try {
        await api.createCategory({ name, type, icon });
        showSuccess(`Категория "${name}" добавлена`);
        closeAddCategoryModal();
        
        // Reload categories
        await loadCategories();
        
        // Switch to the type of newly created category
        switchCategoryTab(type);
    } catch (error) {
        handleError(error, 'Не удалось создать категорию');
    }
}

function confirmDeleteCategory(id, name) {
    if (confirm(`Удалить категорию "${name}"?`)) {
        deleteCategory(id, name);
    }
}

async function deleteCategory(id, name) {
    try {
        await api.deleteCategory(id);
        showSuccess(`Категория "${name}" удалена`);
        await loadCategories();
    } catch (error) {
        handleError(error, 'Не удалось удалить категорию');
    }
}

// ===== RECURRING PAYMENTS =====

const recurringState = {
    items: [],
    loading: false,
    editingId: null
};

async function loadRecurringPayments() {
    const listEl = document.getElementById('recurring-list');
    const emptyEl = document.getElementById('recurring-empty');
    const loadingEl = document.getElementById('recurring-loading');
    
    if (!listEl) return;
    
    const cacheKey = `recurring:${state.currency}`;
    const cached = cache.get(cacheKey);
    
    // Если есть кэш - используем
    if (cached) {
        debug.log('📦 Using cached recurring payments');
        recurringState.items = cached.items;
        updateRecurringSummary(cached.summary, cached.items);
        if (cached.items.length === 0) {
            emptyEl.style.display = 'flex';
        } else {
            emptyEl.style.display = 'none';
            renderRecurringPayments(cached.items);
        }
        return;
    }
    
    try {
        recurringState.loading = true;
        loadingEl.style.display = 'flex';
        listEl.innerHTML = '';
        emptyEl.style.display = 'none';
        
        // Загружаем курсы если нужно
        if (Object.keys(exchangeRates).length === 0) {
            await loadExchangeRates();
        }
        
        const response = await api.getRecurringPayments(true);
        recurringState.items = response.items || [];
        
        // Update summary - передаём все items для подсчёта суммы
        const summary = await api.getUpcomingSummary(30);
        updateRecurringSummary(summary, recurringState.items);
        
        // Кэшируем на 5 минут
        cache.set(cacheKey, { items: recurringState.items, summary }, 300);
        
        loadingEl.style.display = 'none';
        
        if (recurringState.items.length === 0) {
            emptyEl.style.display = 'flex';
            return;
        }
        
        renderRecurringPayments(recurringState.items);
        
    } catch (error) {
        loadingEl.style.display = 'none';
        handleError(error, 'Не удалось загрузить подписки');
    } finally {
        recurringState.loading = false;
    }
}

function updateRecurringSummary(summary, allItems) {
    const totalEl = document.getElementById('recurring-upcoming-total');
    const countEl = document.getElementById('recurring-active-count');
    
    // Считаем сумму всех активных подписок (не только за 30 дней)
    if (totalEl && allItems && allItems.length > 0) {
        let totalConverted = 0;
        allItems.forEach(item => {
            totalConverted += convertAmount(item.amount || 0, item.currency || 'KGS', state.currency);
        });
        totalEl.textContent = formatCurrency(totalConverted);
    } else if (totalEl) {
        totalEl.textContent = formatCurrency(0);
    }
    
    if (countEl) {
        countEl.textContent = allItems?.length || summary.total_payments || '0';
    }
}

function renderRecurringPayments(items) {
    const listEl = document.getElementById('recurring-list');
    if (!listEl) return;
    
    const currencySymbols = { KGS: 'с', USD: '$', EUR: '€', RUB: '₽' };
    const frequencyLabels = {
        daily: 'ежедневно',
        weekly: 'еженедельно',
        monthly: 'ежемесячно',
        yearly: 'ежегодно'
    };
    
    listEl.innerHTML = items.map(item => {
        const daysUntil = item.days_until_payment;
        let statusClass = '';
        let dateText = '';
        
        if (daysUntil < 0) {
            statusClass = 'overdue';
            dateText = `просрочено ${Math.abs(daysUntil)} дн.`;
        } else if (daysUntil === 0) {
            statusClass = 'due-soon';
            dateText = 'сегодня';
        } else if (daysUntil === 1) {
            statusClass = 'due-soon';
            dateText = 'завтра';
        } else if (daysUntil <= 3) {
            statusClass = 'due-soon';
            dateText = `через ${daysUntil} дн.`;
        } else {
            dateText = `через ${daysUntil} дн.`;
        }
        
        const symbol = currencySymbols[item.currency] || item.currency;
        const freq = frequencyLabels[item.frequency] || item.frequency;
        
        return `
            <div class="recurring-item ${statusClass}">
                <div class="recurring-item-main">
                    <div class="recurring-icon">🔄</div>
                    <div class="recurring-info">
                        <div class="recurring-name">${escapeHtml(item.title)}</div>
                        <div class="recurring-meta">
                            <span class="recurring-category">
                                <i class="fas fa-tag"></i> ${escapeHtml(item.category)}
                            </span>
                            <span class="recurring-frequency">${freq}</span>
                        </div>
                    </div>
                    <div class="recurring-amount">
                        <div class="amount">${formatCurrency(convertAmount(item.amount, item.currency || 'KGS', state.currency))}</div>
                        <div class="next-date ${statusClass}">${dateText}</div>
                    </div>
                </div>
                <div class="recurring-actions">
                    <button class="btn-mark-paid" onclick="markRecurringPaid(${item.id})">
                        <i class="fas fa-check"></i> Оплачено
                    </button>
                    <button class="btn-edit" onclick="editRecurring(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="confirmDeleteRecurring(${item.id}, '${escapeHtml(item.title)}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openAddRecurringModal() {
    recurringState.editingId = null;
    
    const modal = document.getElementById('recurring-modal');
    const title = document.getElementById('recurring-modal-title');
    const submitBtn = document.getElementById('recurring-submit-btn');
    
    title.textContent = 'Новая подписка';
    submitBtn.textContent = 'Добавить';
    
    // Reset form
    document.getElementById('recurring-edit-id').value = '';
    document.getElementById('recurring-name').value = '';
    document.getElementById('recurring-amount').value = '';
    document.getElementById('recurring-currency').value = 'KGS';
    document.getElementById('recurring-category').value = 'Подписки';
    document.getElementById('recurring-frequency').value = 'monthly';
    document.getElementById('recurring-reminder-days').value = '3';
    
    // Set default next date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('recurring-next-date').value = today;
    
    modal.style.display = 'flex';
}

function closeRecurringModal() {
    document.getElementById('recurring-modal').style.display = 'none';
    recurringState.editingId = null;
}

async function editRecurring(id) {
    const item = recurringState.items.find(i => i.id === id);
    if (!item) return;
    
    recurringState.editingId = id;
    
    const modal = document.getElementById('recurring-modal');
    const title = document.getElementById('recurring-modal-title');
    const submitBtn = document.getElementById('recurring-submit-btn');
    
    title.textContent = 'Редактировать';
    submitBtn.textContent = 'Сохранить';
    
    // Fill form
    document.getElementById('recurring-edit-id').value = id;
    document.getElementById('recurring-name').value = item.title;
    document.getElementById('recurring-amount').value = item.amount;
    document.getElementById('recurring-currency').value = item.currency;
    document.getElementById('recurring-category').value = item.category;
    document.getElementById('recurring-frequency').value = item.frequency;
    document.getElementById('recurring-next-date').value = item.next_payment_date;
    document.getElementById('recurring-reminder-days').value = item.remind_days_before || 3;
    
    modal.style.display = 'flex';
}

async function submitRecurring(event) {
    event.preventDefault();
    
    const data = {
        title: document.getElementById('recurring-name').value.trim(),
        amount: parseFloat(document.getElementById('recurring-amount').value),
        currency: document.getElementById('recurring-currency').value,
        category: document.getElementById('recurring-category').value,
        frequency: document.getElementById('recurring-frequency').value,
        next_payment_date: document.getElementById('recurring-next-date').value,
        remind_days_before: parseInt(document.getElementById('recurring-reminder-days').value) || 3
    };
    
    if (!data.title || !data.amount || !data.next_payment_date) {
        showError('Заполните все обязательные поля');
        return;
    }
    
    try {
        if (recurringState.editingId) {
            await api.updateRecurringPayment(recurringState.editingId, data);
            showSuccess('Подписка обновлена');
        } else {
            await api.createRecurringPayment(data);
            showSuccess('Подписка добавлена');
        }
        
        closeRecurringModal();
        await loadRecurringPayments();
        
    } catch (error) {
        handleError(error, 'Не удалось сохранить подписку');
    }
}

async function markRecurringPaid(id) {
    const item = recurringState.items.find(i => i.id === id);
    if (!item) return;
    
    const createExpense = confirm('Создать расход автоматически?');
    
    try {
        await api.markRecurringPaymentPaid(id, createExpense);
        showSuccess(`"${item.title}" отмечено как оплаченное`);
        await loadRecurringPayments();
    } catch (error) {
        handleError(error, 'Не удалось отметить как оплаченное');
    }
}

function confirmDeleteRecurring(id, name) {
    if (confirm(`Удалить подписку "${name}"?`)) {
        deleteRecurring(id);
    }
}

async function deleteRecurring(id) {
    try {
        await api.deleteRecurringPayment(id);
        showSuccess('Подписка удалена');
        await loadRecurringPayments();
    } catch (error) {
        handleError(error, 'Не удалось удалить подписку');
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== DEBTS FUNCTIONALITY =====

const debtsState = {
    items: [],
    filter: 'all',
    editingId: null
};

async function loadDebts() {
    const listEl = document.getElementById('debts-list');
    const emptyEl = document.getElementById('debts-empty');
    
    const cacheKey = `debts:${state.currency}`;
    const cached = cache.get(cacheKey);
    
    // Если есть кэш - используем
    if (cached) {
        debug.log('📦 Using cached debts');
        debtsState.items = cached.items;
        updateDebtsSummary(cached.summary);
        renderDebts();
        return;
    }
    
    try {
        // Показываем лоадер
        if (listEl) {
            listEl.innerHTML = '<div class="loading-placeholder"><div class="skeleton-item"></div><div class="skeleton-item"></div><div class="skeleton-item"></div></div>';
        }
        if (emptyEl) emptyEl.style.display = 'none';
        
        // Загружаем курсы если нужно
        if (Object.keys(exchangeRates).length === 0) {
            await loadExchangeRates();
        }
        
        const [debtsData, summaryData] = await Promise.all([
            api.getDebts(false),
            api.getDebtSummary()
        ]);
        
        debtsState.items = debtsData.items || [];
        updateDebtsSummary(summaryData);
        
        // Кэшируем на 5 минут
        cache.set(cacheKey, { items: debtsState.items, summary: summaryData }, 300);
        
        renderDebts();
        
    } catch (error) {
        if (listEl) listEl.innerHTML = '';
        handleError(error, 'Не удалось загрузить долги');
    }
}

function updateDebtsSummary(summary) {
    const givenEl = document.getElementById('debt-given-total');
    const receivedEl = document.getElementById('debt-received-total');
    const balanceEl = document.getElementById('debt-net-balance');
    
    // Конвертируем суммы в выбранную валюту (summary приходит в KGS)
    const givenConverted = convertAmount(summary.total_given_remaining || 0, 'KGS', state.currency);
    const receivedConverted = convertAmount(summary.total_received_remaining || 0, 'KGS', state.currency);
    const balanceConverted = convertAmount(summary.net_balance || 0, 'KGS', state.currency);
    
    if (givenEl) givenEl.textContent = formatCurrency(givenConverted);
    if (receivedEl) receivedEl.textContent = formatCurrency(receivedConverted);
    if (balanceEl) {
        balanceEl.textContent = (balanceConverted >= 0 ? '+' : '') + formatCurrency(balanceConverted);
        balanceEl.style.color = balanceConverted >= 0 ? 'var(--success)' : 'var(--danger)';
    }
}

function renderDebts() {
    const listEl = document.getElementById('debts-list');
    const emptyEl = document.getElementById('debts-empty');
    if (!listEl) return;
    
    let items = debtsState.items;
    
    // Фильтруем
    if (debtsState.filter === 'given') {
        items = items.filter(d => d.debt_type === 'given');
    } else if (debtsState.filter === 'received') {
        items = items.filter(d => d.debt_type === 'received');
    }
    
    if (items.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    
    listEl.innerHTML = items.map(debt => {
        const isGiven = debt.debt_type === 'given';
        const typeLabel = isGiven ? 'Мне должны' : 'Я должен';
        const initial = debt.person_name.charAt(0).toUpperCase();
        const progress = debt.paid_percentage || 0;
        
        let dueDateHtml = '';
        if (debt.due_date) {
            const dueClass = debt.is_overdue ? 'overdue' : '';
            const dueText = debt.is_overdue 
                ? `Просрочено на ${Math.abs(debt.days_until_due)} дн.`
                : `До ${formatDate(debt.due_date)}`;
            dueDateHtml = `<span class="debt-due-date ${dueClass}">${dueText}</span>`;
        }
        
        return `
            <div class="debt-item ${debt.is_settled ? 'settled' : ''} ${debt.is_overdue ? 'overdue' : ''}">
                <div class="debt-item-header">
                    <div class="debt-person">
                        <div class="debt-avatar ${debt.debt_type}">${initial}</div>
                        <div>
                            <div class="debt-name">${escapeHtml(debt.person_name)}</div>
                            <span class="debt-type-badge ${debt.debt_type}">${typeLabel}</span>
                        </div>
                    </div>
                    <div class="debt-amount-info">
                        <div class="debt-amount ${debt.debt_type}">${formatCurrency(convertAmount(debt.original_amount, debt.currency || 'KGS', state.currency))}</div>
                        ${!debt.is_settled ? `<div class="debt-remaining">Осталось: ${formatCurrency(convertAmount(debt.remaining_amount, debt.currency || 'KGS', state.currency))}</div>` : '<div class="debt-remaining">✓ Погашен</div>'}
                    </div>
                </div>
                
                ${!debt.is_settled ? `
                <div class="debt-progress">
                    <div class="debt-progress-bar ${debt.debt_type}" style="width: ${progress}%"></div>
                </div>
                ` : ''}
                
                <div class="debt-meta">
                    <span>${debt.description || 'Без описания'}</span>
                    ${dueDateHtml}
                </div>
                
                ${!debt.is_settled ? `
                <div class="debt-actions">
                    <button class="btn-add-payment" onclick="openDebtPaymentModal(${debt.id})">
                        <i class="fas fa-plus"></i> Внести платёж
                    </button>
                    <button class="btn-settle" onclick="settleDebt(${debt.id})">
                        <i class="fas fa-check"></i> Погасить
                    </button>
                    <button class="btn-debt-delete" onclick="confirmDeleteDebt(${debt.id}, '${escapeHtml(debt.person_name)}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function setupDebtTabs() {
    document.querySelectorAll('#debts-screen .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#debts-screen .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            debtsState.filter = tab.dataset.filter;
            renderDebts();
        });
    });
}

function openAddDebtModal() {
    debtsState.editingId = null;
    
    const modal = document.getElementById('debt-modal');
    document.getElementById('debt-modal-title').textContent = 'Новый долг';
    document.getElementById('debt-submit-btn').textContent = 'Добавить';
    
    // Reset form
    document.getElementById('debt-edit-id').value = '';
    document.getElementById('debt-type').value = 'given';
    document.getElementById('debt-person').value = '';
    document.getElementById('debt-amount').value = '';
    document.getElementById('debt-currency').value = 'KGS';
    document.getElementById('debt-due-date').value = '';
    document.getElementById('debt-description').value = '';
    
    // Reset type buttons
    document.querySelectorAll('#debt-modal .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'given');
    });
    
    modal.style.display = 'flex';
}

function closeDebtModal() {
    document.getElementById('debt-modal').style.display = 'none';
    debtsState.editingId = null;
}

function setupDebtTypeButtons() {
    document.querySelectorAll('#debt-modal .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#debt-modal .toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('debt-type').value = btn.dataset.type;
        });
    });
}

async function submitDebt(event) {
    event.preventDefault();
    
    const data = {
        debt_type: document.getElementById('debt-type').value,
        person_name: document.getElementById('debt-person').value.trim(),
        original_amount: parseFloat(document.getElementById('debt-amount').value),
        currency: document.getElementById('debt-currency').value,
        due_date: document.getElementById('debt-due-date').value || null,
        description: document.getElementById('debt-description').value.trim() || null
    };
    
    if (!data.person_name || !data.original_amount) {
        showError('Заполните обязательные поля');
        return;
    }
    
    try {
        if (debtsState.editingId) {
            await api.updateDebt(debtsState.editingId, data);
            showSuccess('Долг обновлён');
        } else {
            await api.createDebt(data);
            showSuccess('Долг добавлен');
        }
        
        closeDebtModal();
        await loadDebts();
        
    } catch (error) {
        handleError(error, 'Не удалось сохранить долг');
    }
}

function openDebtPaymentModal(debtId) {
    const debt = debtsState.items.find(d => d.id === debtId);
    if (!debt) return;
    
    document.getElementById('debt-payment-id').value = debtId;
    document.getElementById('debt-payment-amount').value = '';
    document.getElementById('debt-payment-amount').max = debt.remaining_amount;
    document.getElementById('debt-remaining-hint').textContent = `Остаток: ${formatCurrency(debt.remaining_amount, debt.currency)}`;
    document.getElementById('debt-payment-note').value = '';
    document.getElementById('debt-create-transaction').checked = true;
    
    document.getElementById('debt-payment-modal').style.display = 'flex';
}

function closeDebtPaymentModal() {
    document.getElementById('debt-payment-modal').style.display = 'none';
}

async function submitDebtPayment(event) {
    event.preventDefault();
    
    const debtId = parseInt(document.getElementById('debt-payment-id').value);
    const data = {
        amount: parseFloat(document.getElementById('debt-payment-amount').value),
        note: document.getElementById('debt-payment-note').value.trim() || null,
        create_transaction: document.getElementById('debt-create-transaction').checked
    };
    
    if (!data.amount || data.amount <= 0) {
        showError('Укажите сумму платежа');
        return;
    }
    
    try {
        await api.addDebtPayment(debtId, data);
        showSuccess('Платёж добавлен');
        closeDebtPaymentModal();
        await loadDebts();
    } catch (error) {
        handleError(error, 'Не удалось добавить платёж');
    }
}

async function settleDebt(id) {
    const debt = debtsState.items.find(d => d.id === id);
    if (!debt) return;
    
    if (!confirm(`Отметить долг "${debt.person_name}" как полностью погашенный?`)) return;
    
    try {
        await api.settleDebt(id);
        showSuccess('Долг погашен');
        await loadDebts();
    } catch (error) {
        handleError(error, 'Не удалось погасить долг');
    }
}

function confirmDeleteDebt(id, name) {
    if (confirm(`Удалить долг "${name}"?`)) {
        deleteDebt(id);
    }
}

async function deleteDebt(id) {
    try {
        await api.deleteDebt(id);
        showSuccess('Долг удалён');
        await loadDebts();
    } catch (error) {
        handleError(error, 'Не удалось удалить долг');
    }
}

// ===== AI INSIGHTS (integrated into Analytics) =====

const aiState = {
    insights: [],
    recommendations: [],
    loading: false
};

async function loadAIInsights() {
    if (aiState.loading) return;
    
    const container = document.getElementById('ai-insights-container');
    const loadingEl = document.getElementById('ai-loading');
    const listEl = document.getElementById('ai-insights-list');
    
    if (!container) return;
    
    const cacheKey = 'ai:insights';
    const cached = cache.get(cacheKey);
    
    // Если есть кэш - используем
    if (cached) {
        debug.log('📦 Using cached AI insights');
        aiState.insights = cached.insights;
        aiState.recommendations = cached.recommendations;
        renderIntegratedAIInsights();
        return;
    }
    
    aiState.loading = true;
    if (loadingEl) loadingEl.style.display = 'flex';
    if (listEl) listEl.innerHTML = '';
    
    try {
        const [analysis, insights] = await Promise.all([
            api.getAIAnalysis(30).catch(() => null),
            api.getAIInsights(5).catch(() => ({ items: [] }))
        ]);
        
        aiState.insights = insights.items || [];
        aiState.recommendations = analysis?.recommendations || [];
        
        // Кэшируем на 10 минут (AI анализ тяжёлый)
        cache.set(cacheKey, {
            insights: aiState.insights,
            recommendations: aiState.recommendations
        }, 600);
        
        renderIntegratedAIInsights();
        
    } catch (error) {
        console.error('AI Insights error:', error);
        if (listEl) {
            listEl.innerHTML = '<p class="empty-text">Не удалось загрузить инсайты</p>';
        }
    } finally {
        aiState.loading = false;
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function renderIntegratedAIInsights() {
    const listEl = document.getElementById('ai-insights-list');
    if (!listEl) return;
    
    const allInsights = [];
    
    // Add insights
    aiState.insights.forEach(insight => {
        allInsights.push({
            icon: getInsightIcon(insight.insight_type),
            title: insight.title,
            message: insight.message,
            priority: insight.priority || 'normal'
        });
    });
    
    // Add recommendations
    aiState.recommendations.forEach(rec => {
        allInsights.push({
            icon: getRecommendationIcon(rec.type),
            title: rec.title,
            message: rec.message,
            priority: rec.priority || 'normal',
            saving: rec.potential_saving
        });
    });
    
    if (!allInsights.length) {
        listEl.innerHTML = `
            <div class="ai-insight-card empty">
                <i class="fas fa-check-circle"></i>
                <span>Всё отлично! Продолжайте в том же духе 👍</span>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = allInsights.slice(0, 5).map(insight => `
        <div class="ai-insight-card ${insight.priority}">
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-content">
                <div class="insight-title">${escapeHtml(insight.title)}</div>
                <div class="insight-message">${escapeHtml(insight.message)}</div>
                ${insight.saving ? `<div class="insight-saving">💰 Экономия: ${formatCurrency(insight.saving)}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function getInsightIcon(type) {
    const icons = {
        'savings_rate': '💰',
        'frequency': '📊',
        'trend': '📈',
        'anomaly': '⚠️',
        'budget': '🎯'
    };
    return icons[type] || '💡';
}

function getRecommendationIcon(type) {
    const icons = {
        'budget_alert': '🚨',
        'saving_opportunity': '💰',
        'pattern_insight': '📊'
    };
    return icons[type] || '💡';
}

// Initialize debt tabs and type buttons
document.addEventListener('DOMContentLoaded', () => {
    setupDebtTabs();
    setupDebtTypeButtons();
});

// ===== GLOBAL ERROR HANDLER =====
window.addEventListener('error', (e) => {
    console.error('💥 Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Unhandled rejection:', e.reason);
});

debug.log('✅ App initialized');
