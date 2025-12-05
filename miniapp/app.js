// ============================================================================
// AIAccounter Mini App v1.2 - Read-Only Analytics Dashboard + Onboarding
// Clean, Fast, Optimized
// ============================================================================

const APP_VERSION = '1.2';

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

// ===== HAPTIC FEEDBACK UTILITY =====
const haptic = {
    // Light impact - для мелких действий (нажатие кнопки, переключение)
    light: () => {
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    },
    // Medium impact - для заметных действий (выбор элемента, открытие модалки)
    medium: () => {
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    },
    // Heavy impact - для важных действий (сохранение, удаление)
    heavy: () => {
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('heavy');
        }
    },
    // Success notification - для успешных операций
    success: () => {
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    },
    // Warning notification - для предупреждений
    warning: () => {
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('warning');
        }
    },
    // Error notification - для ошибок
    error: () => {
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    },
    // Selection changed - для выбора из списка
    selection: () => {
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.selectionChanged();
        }
    }
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

// ===== LANGUAGE FUNCTIONS =====
const languageDisplayNames = {
    ru: 'Русский',
    en: 'English',
    ky: 'Кыргызча'
};

function changeLanguage(lang) {
    if (window.i18n && window.i18n.setLanguage(lang)) {
        localStorage.setItem('app_language', lang);
        updateLanguageDisplay(lang);
        showToast(window.i18n.t('settings_saved'), 'success');
        debug.log('🌍 Language changed to:', lang);
    }
}

function updateLanguageDisplay(lang) {
    const langNameEl = document.getElementById('current-language-name');
    if (langNameEl) {
        langNameEl.textContent = languageDisplayNames[lang] || lang;
    }
}

// ===== UTILITY FUNCTIONS =====

// Performance utilities
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Memoization for expensive computations
const memoize = (fn) => {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args);
        cache.set(key, result);
        // Limit cache size
        if (cache.size > 100) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        return result;
    };
};

// Cached formatters
const currencyFormatter = memoize((amount, currency) => {
    const symbols = { KGS: 'с', USD: '$', EUR: '€', RUB: '₽' };
    const formatted = new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    return `${formatted} ${symbols[currency] || currency}`;
});

function formatCurrency(amount, currency = state.currency) {
    return currencyFormatter(Math.round(amount * 100) / 100, currency);
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
    
    // Haptic feedback for error
    haptic.error();
    
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
    
    // Haptic feedback for navigation
    haptic.light();
    
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
        case 'profile':
            loadProfile();
            loadDailyQuests();
            break;
        case 'achievements':
            loadAchievements();
            break;
        case 'leaderboard':
            loadLeaderboard();
            break;
        case 'more':
            // Статический экран, не требует загрузки данных
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
        case 'budgets':
            loadBudgetsScreen();
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
        
        // Быстрая проверка токена через /auth/verify
        try {
            await api.get('/auth/verify');
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
    
    const cacheKey = `batch:${state.currentPeriod}:${state.currency}`;
    const cached = cache.get(cacheKey);
    
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
        let batchData;
        
        // Используем предзагруженные данные при первой загрузке
        if (!state.isInitialized && state.preloadedData) {
            debug.log('⚡ Using preloaded batch data');
            batchData = state.preloadedData;
            state.isInitialized = true;
            state.preloadedData = null;
        } else if (cached) {
            debug.log('📦 Using cached batch data');
            batchData = cached;
        } else {
            // 🚀 ОДИН ЗАПРОС ВМЕСТО МНОЖЕСТВА!
            debug.log('🚀 Loading batch data...');
            batchData = await api.getBatchAnalytics(state.currentPeriod);
            
            // Кэшируем на 5 минут
            cache.set(cacheKey, batchData, 300);
        }
        
        // Обновляем курсы валют из batch данных
        if (batchData.exchange_rates && batchData.exchange_rates.length > 0) {
            exchangeRates = {};
            batchData.exchange_rates.forEach(rate => {
                const key = `${rate.from_currency}_${rate.to_currency}`;
                exchangeRates[key] = rate.rate;
            });
            cache.set('exchange_rates', exchangeRates, 3600);
        }
        
        // Обновляем Dashboard UI
        updateDashboardUI({ balance: batchData.balance });
        
        // Обновляем топ категории
        if (batchData.top_categories) {
            const cleanedTop = batchData.top_categories.slice(0, 3).map(cat => ({
                ...cat,
                category: (cat.category || 'Без категории').replace(/\s+/g, ' ').trim()
            }));
            updateHomeTopCategories(cleanedTop);
        }
        
        // Обновляем виджет бюджета
        if (batchData.budget) {
            updateBudgetWidget(batchData.budget);
        }
        
        // Обновляем последние транзакции
        if (batchData.recent_transactions) {
            updateRecentTransactions(batchData.recent_transactions);
        }
        
        // Загружаем геймификацию для хедера (в фоне)
        loadGamificationHeader();
        
        perf.end('loadDashboard');
        debug.log('✅ Dashboard loaded via batch API');
    } catch (error) {
        handleError(error, 'Не удалось загрузить данные');
        // Fallback к старому методу
        debug.warn('⚠️ Batch API failed, falling back...');
        await loadDashboardFallback();
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('loading');
        // Убираем skeleton
        const skeleton = document.querySelector('.balance-card .loading-placeholder');
        if (skeleton) skeleton.remove();
    }
}

// Fallback функция для старого метода загрузки
async function loadDashboardFallback() {
    try {
        const range = getDateRangeFor(state.currentPeriod);
        const loadRates = Object.keys(exchangeRates).length === 0 ? loadExchangeRates() : Promise.resolve();
        
        const [data, topCategories] = await Promise.all([
            api.getOverview({ period: state.currentPeriod }),
            api.getCategoryAnalytics({ ...range, limit: 3 }),
            loadRates
        ]);
        
        updateDashboardUI(data);
        if (topCategories) {
            const cleanedTop = topCategories.map(cat => ({
                ...cat,
                category: (cat.category || 'Без категории').replace(/\s+/g, ' ').trim()
            }));
            updateHomeTopCategories(cleanedTop);
        }
        loadBudgetWidget();
    } catch (error) {
        handleError(error, 'Не удалось загрузить данные');
    }
}

// Обновление виджета бюджета из batch данных
function updateBudgetWidget(budgetData) {
    const widget = document.getElementById('budget-widget');
    if (!widget) return;
    
    const emptyState = document.getElementById('budget-empty');
    const progressContainer = widget.querySelector('.budget-progress-container');
    const header = widget.querySelector('.budget-widget-header');
    
    if (!budgetData.has_budget) {
        widget.className = 'budget-widget budget-widget-mini';
        if (progressContainer) progressContainer.style.display = 'none';
        if (header) header.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    if (progressContainer) progressContainer.style.display = 'block';
    if (header) header.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    
    widget.className = `budget-widget budget-widget-mini ${budgetData.status}`;
    
    const percentage = Math.min(budgetData.percentage_used, 100);
    document.getElementById('budget-progress-fill').style.width = `${percentage}%`;
    
    const currency = getCurrencySymbol(budgetData.currency);
    document.getElementById('budget-spent').textContent = formatAmount(budgetData.total_spent) + ' ' + currency;
    document.getElementById('budget-total').textContent = formatAmount(budgetData.budget_amount) + ' ' + currency;
    document.getElementById('budget-percentage').textContent = `${budgetData.percentage_used}%`;
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
        
        // Для custom периода используем старый метод
        if (period === 'custom') {
            await loadAnalyticsLegacy(period);
            return;
        }
        
        // Пробуем использовать batch данные
        const batchCacheKey = `batch:${period}:${state.currency}`;
        let batchData = cache.get(batchCacheKey);
        
        // Если нет в кэше, загружаем batch
        if (!batchData) {
            debug.log('🚀 Loading batch analytics...');
            batchData = await api.getBatchAnalytics(period);
            cache.set(batchCacheKey, batchData, 120);
        }
        
        // Обновляем курсы валют
        if (batchData.exchange_rates && batchData.exchange_rates.length > 0) {
            exchangeRates = {};
            batchData.exchange_rates.forEach(rate => {
                const key = `${rate.from_currency}_${rate.to_currency}`;
                exchangeRates[key] = rate.rate;
            });
        }
        
        // Обновляем бейдж периода
        const periodBadge = document.getElementById('top-categories-period-badge');
        if (periodBadge) {
            const periodTexts = { 'week': 'За неделю', 'month': 'За месяц', 'year': 'За год' };
            periodBadge.textContent = periodTexts[period] || 'За месяц';
        }
        
        // Конвертируем в выбранную валюту
        const origCurrency = 'KGS';
        const stats = {
            total_income: convertAmount(batchData.balance.total_income, origCurrency, state.currency),
            total_expense: convertAmount(batchData.balance.total_expense, origCurrency, state.currency),
            balance: convertAmount(batchData.balance.balance, origCurrency, state.currency),
            currency: state.currency
        };
        
        // Конвертируем категории
        const convertedCategories = (batchData.top_categories || []).map(cat => ({
            ...cat,
            category: (cat.category || 'Без категории').replace(/\s+/g, ' ').trim(),
            amount: convertAmount(cat.total_amount || 0, origCurrency, state.currency),
            total: convertAmount(cat.total_amount || 0, origCurrency, state.currency),
            total_amount: convertAmount(cat.total_amount || 0, origCurrency, state.currency),
            currency: state.currency
        }));
        
        const analyticsData = { ...stats, top_categories: convertedCategories };
        
        updateAnalyticsUI(analyticsData);
        setTimeout(() => loadCharts(analyticsData), 100);
        
        // Используем тренды и паттерны из batch данных
        if (batchData.trends) {
            updateTrendsFromBatch(batchData.trends);
        }
        if (batchData.patterns) {
            updatePatternsFromBatch(batchData.patterns);
        }
        
        perf.end('loadAnalytics');
        debug.log('✅ Analytics loaded via batch API');
        
    } catch (error) {
        debug.warn('⚠️ Batch analytics failed, falling back...', error);
        await loadAnalyticsLegacy();
    }
}

// Legacy функция для custom периодов и fallback
async function loadAnalyticsLegacy(period = null) {
    try {
        const periodSelect = document.getElementById('analytics-period');
        period = period || periodSelect?.value || 'month';
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
        
        // Загружаем тренды и паттерны
        setTimeout(() => {
            loadTrendsData();
            loadPatternsData();
        }, 200);
        
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
    sortBy: 'date_desc', // date_desc, date_asc, amount_desc, amount_asc
    search: '',
    amountMin: null,
    amountMax: null
};

let searchDebounceTimer = null;

// === EXPORT FUNCTIONS ===
function showExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) {
        modal.classList.add('open');
        // Setup custom period toggle
        const periodSelect = document.getElementById('export-period');
        if (periodSelect) {
            periodSelect.onchange = toggleExportCustomDates;
        }
        // Set default dates for custom period
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        
        document.getElementById('export-date-end').value = endDate.toISOString().split('T')[0];
        document.getElementById('export-date-start').value = startDate.toISOString().split('T')[0];
    }
}

function closeExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) {
        modal.classList.remove('open');
    }
}

function toggleExportCustomDates() {
    const periodSelect = document.getElementById('export-period');
    const customDates = document.getElementById('export-custom-dates');
    if (periodSelect && customDates) {
        customDates.style.display = periodSelect.value === 'custom' ? 'block' : 'none';
    }
}

async function downloadExport() {
    const format = document.querySelector('input[name="export-format"]:checked')?.value || 'xlsx';
    const period = document.getElementById('export-period')?.value || 'month';
    const type = document.getElementById('export-type')?.value || 'all';
    
    // Calculate dates based on period
    let startDate, endDate;
    const now = new Date();
    endDate = now.toISOString().split('T')[0];
    
    switch (period) {
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
            break;
        case 'quarter':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0];
            break;
        case 'year':
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
            break;
        case 'all':
            startDate = null;
            break;
        case 'custom':
            startDate = document.getElementById('export-date-start')?.value;
            endDate = document.getElementById('export-date-end')?.value;
            break;
    }
    
    const params = { format };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (type !== 'all') params.type = type;
    
    try {
        showToast('Подготовка файла...', 'info');
        await api.exportTransactions(params);
        showToast('Файл скачан!', 'success');
        closeExportModal();
    } catch (error) {
        console.error('Export error:', error);
        showToast('Ошибка экспорта', 'error');
    }
}

function toggleFilters() {
    const panel = document.getElementById('filters-panel');
    if (panel) {
        panel.classList.toggle('collapsed');
    }
}

function openFilters() {
    const panel = document.getElementById('filters-panel');
    if (panel) {
        panel.classList.remove('collapsed');
    }
}

function clearSearch() {
    const searchInput = document.getElementById('history-search');
    const clearBtn = document.getElementById('search-clear-btn');
    if (searchInput) {
        searchInput.value = '';
        historyFilters.search = '';
    }
    if (clearBtn) clearBtn.style.display = 'none';
    loadHistory();
    updateActiveFiltersUI();
}

function resetFilters() {
    // Сбрасываем все фильтры
    historyFilters = {
        type: 'all',
        period: 'month',
        category: 'all',
        sortBy: 'date_desc',
        search: '',
        amountMin: null,
        amountMax: null
    };
    
    // Обновляем UI
    const typeSelect = document.getElementById('history-type');
    const periodSelect = document.getElementById('history-period');
    const categorySelect = document.getElementById('history-category');
    const sortSelect = document.getElementById('history-sort');
    const searchInput = document.getElementById('history-search');
    const amountMinInput = document.getElementById('history-amount-min');
    const amountMaxInput = document.getElementById('history-amount-max');
    const clearBtn = document.getElementById('search-clear-btn');
    
    if (typeSelect) typeSelect.value = 'all';
    if (periodSelect) periodSelect.value = 'month';
    if (categorySelect) categorySelect.value = 'all';
    if (sortSelect) sortSelect.value = 'date_desc';
    if (searchInput) searchInput.value = '';
    if (amountMinInput) amountMinInput.value = '';
    if (amountMaxInput) amountMaxInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    
    updateActiveFiltersUI();
    loadHistory();
}

function updateActiveFiltersUI() {
    const container = document.getElementById('active-filters');
    if (!container) return;
    
    const chips = [];
    
    if (historyFilters.search) {
        chips.push(`<div class="filter-chip">
            <span class="filter-chip-label">Поиск:</span>
            <span class="filter-chip-value">${historyFilters.search}</span>
            <button class="filter-chip-remove" onclick="removeFilter('search')"><i class="fas fa-times"></i></button>
        </div>`);
    }
    
    if (historyFilters.type !== 'all') {
        const typeLabel = historyFilters.type === 'income' ? 'Доходы' : 'Расходы';
        chips.push(`<div class="filter-chip">
            <span class="filter-chip-label">Тип:</span>
            <span class="filter-chip-value">${typeLabel}</span>
            <button class="filter-chip-remove" onclick="removeFilter('type')"><i class="fas fa-times"></i></button>
        </div>`);
    }
    
    if (historyFilters.category !== 'all') {
        chips.push(`<div class="filter-chip">
            <span class="filter-chip-label">Категория:</span>
            <span class="filter-chip-value">${historyFilters.category}</span>
            <button class="filter-chip-remove" onclick="removeFilter('category')"><i class="fas fa-times"></i></button>
        </div>`);
    }
    
    if (historyFilters.amountMin !== null) {
        chips.push(`<div class="filter-chip">
            <span class="filter-chip-label">От:</span>
            <span class="filter-chip-value">${formatAmount(historyFilters.amountMin)}</span>
            <button class="filter-chip-remove" onclick="removeFilter('amountMin')"><i class="fas fa-times"></i></button>
        </div>`);
    }
    
    if (historyFilters.amountMax !== null) {
        chips.push(`<div class="filter-chip">
            <span class="filter-chip-label">До:</span>
            <span class="filter-chip-value">${formatAmount(historyFilters.amountMax)}</span>
            <button class="filter-chip-remove" onclick="removeFilter('amountMax')"><i class="fas fa-times"></i></button>
        </div>`);
    }
    
    if (chips.length > 0) {
        container.style.display = 'flex';
        container.innerHTML = chips.join('');
    } else {
        container.style.display = 'none';
    }
}

function removeFilter(filterName) {
    switch(filterName) {
        case 'search':
            historyFilters.search = '';
            const searchInput = document.getElementById('history-search');
            const clearBtn = document.getElementById('search-clear-btn');
            if (searchInput) searchInput.value = '';
            if (clearBtn) clearBtn.style.display = 'none';
            break;
        case 'type':
            historyFilters.type = 'all';
            const typeSelect = document.getElementById('history-type');
            if (typeSelect) typeSelect.value = 'all';
            break;
        case 'category':
            historyFilters.category = 'all';
            const categorySelect = document.getElementById('history-category');
            if (categorySelect) categorySelect.value = 'all';
            break;
        case 'amountMin':
            historyFilters.amountMin = null;
            const amountMinInput = document.getElementById('history-amount-min');
            if (amountMinInput) amountMinInput.value = '';
            break;
        case 'amountMax':
            historyFilters.amountMax = null;
            const amountMaxInput = document.getElementById('history-amount-max');
            if (amountMaxInput) amountMaxInput.value = '';
            break;
    }
    updateActiveFiltersUI();
    loadHistory();
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
    
    // Сбрасываем состояние при новой загрузке (не loadMore)
    if (!loadMore) {
        historyState.currentPage = 1;
        historyState.hasMore = true;
    }
    
    debug.log('📜 Loading history...', { loadMore, currentPage: historyState.currentPage, hasMore: historyState.hasMore, loading: historyState.loading });
    
    if (historyState.loading) {
        debug.warn('⚠️ Already loading, skipping...');
        return;
    }
    
    const container = document.getElementById('transactions-history');
    
    // Кэш для первой страницы с учётом всех фильтров
    const cacheKey = `history:${historyFilters.type}:${historyFilters.category}:${historyFilters.period}:${historyFilters.search || ''}:${state.currency}`;
    if (!loadMore) {
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
        
        // Вычисляем даты для периода
        const dateRange = getDateRangeFor(historyFilters.period);
        
        // Загружаем через единый endpoint /transactions
        const params = { 
            page: historyState.currentPage, 
            page_size: historyState.pageSize
        };
        
        // Добавляем type только если не 'all'
        if (type && type !== 'all') {
            params.type = type;
        }
        
        // Добавляем поиск
        if (historyFilters.search) {
            params.search = historyFilters.search;
        }
        
        // Добавляем фильтр по сумме
        if (historyFilters.amountMin !== null) {
            params.amount_min = historyFilters.amountMin;
        }
        if (historyFilters.amountMax !== null) {
            params.amount_max = historyFilters.amountMax;
        }
        
        // Добавляем категорию (на бэкенде)
        if (historyFilters.category && historyFilters.category !== 'all') {
            params.category = historyFilters.category;
        }
        
        // Добавляем период
        if (historyFilters.period !== 'all' && dateRange.start_date) {
            params.start_date = dateRange.start_date;
            params.end_date = dateRange.end_date;
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
        
        // Сортировка на клиенте (серверная сортировка по умолчанию по дате)
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
        
        // Кэшируем первую страницу (5 минут) с учётом всех фильтров
        if (historyState.currentPage === 2) {  // currentPage уже увеличен
            const historyCacheKey = `history:${historyFilters.type}:${historyFilters.category}:${historyFilters.period}:${historyFilters.search || ''}:${state.currency}`;
            cache.set(historyCacheKey, {
                transactions: historyState.allTransactions,
                hasMore: historyState.hasMore
            }, 300);
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

// Render paginated transactions (optimized with DocumentFragment)
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
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    Object.entries(grouped).forEach(([date, items]) => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.textContent = date;
        dateGroup.appendChild(dateHeader);
        
        items.forEach(t => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
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
            `;
            dateGroup.appendChild(item);
        });
        
        fragment.appendChild(dateGroup);
    });
    
    // Single DOM update
    container.innerHTML = '';
    container.appendChild(fragment);
    
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

// ===== PROFILE & GAMIFICATION =====

let gamificationData = null;
let achievementsData = null;

async function loadProfile() {
    debug.log('👤 Loading profile...');
    
    const lang = localStorage.getItem('app_language') || 'ru';
    
    // Проверяем кэш
    const cacheKey = `profile:${lang}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        debug.log('📦 Using cached profile');
        gamificationData = cached;
        updateProfileUI(gamificationData);
        syncProfileSettings();
        return;
    }
    
    try {
        // Загружаем данные геймификации
        const response = await api.getGamificationProfile(lang);
        debug.log('👤 Profile response:', response);
        
        if (response.success) {
            gamificationData = response.data;
            debug.log('👤 Gamification data:', gamificationData);
            updateProfileUI(gamificationData);
            
            // Кэшируем на 5 минут
            cache.set(cacheKey, gamificationData, 300);
        } else {
            debug.error('Profile API error:', response);
        }
    } catch (error) {
        debug.error('Failed to load profile:', error);
    }
    
    // Синхронизируем настройки с профилем
    syncProfileSettings();
}

function updateProfileUI(data) {
    if (!data) return;
    
    // Обновляем бейдж на главной
    const levelBadge = document.getElementById('user-level-badge');
    const levelText = document.getElementById('user-level-text');
    if (levelText) {
        levelText.textContent = `Ур. ${data.level}`;
    }
    
    // Обновляем профиль
    const profileUsername = document.getElementById('profile-username');
    if (profileUsername) {
        profileUsername.textContent = localStorage.getItem('user_name') || 'Пользователь';
    }
    
    const profileLevelName = document.getElementById('profile-level-name');
    if (profileLevelName) {
        profileLevelName.textContent = data.level_name;
    }
    
    const profileLevelNum = document.getElementById('profile-level-num');
    if (profileLevelNum) {
        profileLevelNum.textContent = `(Ур. ${data.level})`;
    }
    
    // XP бар
    const xpBar = document.getElementById('profile-xp-bar');
    if (xpBar) {
        xpBar.style.width = `${data.xp_percentage}%`;
    }
    
    const xpText = document.getElementById('profile-xp-text');
    if (xpText) {
        xpText.textContent = `${data.xp_progress} / ${data.xp_for_level} XP`;
    }
    
    // Статистика
    const streakEl = document.getElementById('profile-streak');
    if (streakEl) {
        streakEl.textContent = data.current_streak;
    }
    
    const achievementsEl = document.getElementById('profile-achievements');
    if (achievementsEl) {
        achievementsEl.textContent = data.total_achievements;
    }
    
    const transactionsEl = document.getElementById('profile-transactions');
    if (transactionsEl) {
        transactionsEl.textContent = data.total_transactions;
    }
}

function syncProfileSettings() {
    // Синхронизируем значения настроек с профилем
    const savedCurrency = localStorage.getItem('currency') || 'KGS';
    const savedPeriod = localStorage.getItem('defaultPeriod') || 'week';
    const savedTheme = localStorage.getItem('theme') || 'auto';
    const savedLanguage = localStorage.getItem('app_language') || 'ru';
    
    // Профиль - валюта
    const profileCurrency = document.getElementById('profile-currency-select');
    if (profileCurrency) profileCurrency.value = savedCurrency;
    
    // Профиль - язык
    const profileLanguage = document.getElementById('profile-language-select');
    if (profileLanguage) profileLanguage.value = savedLanguage;
    
    // Профиль - тема
    const profileTheme = document.getElementById('profile-theme-select');
    if (profileTheme) profileTheme.value = savedTheme;
    
    // Профиль - период
    const profilePeriod = document.getElementById('profile-default-period');
    if (profilePeriod) profilePeriod.value = savedPeriod;
}

// Обработчики настроек в профиле
function updateUsageType(value) {
    localStorage.setItem('usage_type', value);
    showSuccess('Режим обновлён');
}

function updateCurrency(value) {
    state.currency = value;
    localStorage.setItem('currency', value);
    showSuccess('Валюта обновлена');
    loadDashboard();
}

function updateTheme(value) {
    localStorage.setItem('theme', value);
    
    // Apply theme directly
    if (value === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', value);
    }
    
    showSuccess('Тема обновлена');
}

function updateDefaultPeriod(value) {
    state.currentPeriod = value;
    localStorage.setItem('defaultPeriod', value);
    showSuccess('Период обновлён');
}

// Загрузка геймификации для хедера (легковесная)
async function loadGamificationHeader() {
    try {
        const lang = localStorage.getItem('app_language') || 'ru';
        const response = await api.getGamificationProfile(lang);
        
        if (response.success && response.data) {
            gamificationData = response.data;
            
            // Обновляем бейдж уровня в хедере
            const levelText = document.getElementById('user-level-text');
            if (levelText) {
                levelText.textContent = `Ур. ${response.data.level}`;
            }
        }
    } catch (error) {
        debug.warn('Failed to load gamification header:', error);
    }
}

// ===== ACHIEVEMENTS =====

async function loadAchievements() {
    debug.log('🏆 Loading achievements...');
    
    const lang = localStorage.getItem('app_language') || 'ru';
    const listEl = document.getElementById('achievements-list');
    
    // Проверяем кэш
    const cacheKey = `achievements:${lang}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        debug.log('📦 Using cached achievements');
        achievementsData = cached;
        renderAchievements(achievementsData.achievements);
        updateAchievementsStats(achievementsData.stats);
        return;
    }
    
    if (listEl) {
        listEl.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;padding:60px 0;width:100%"><div style="width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite"></div></div>';
    }
    
    try {
        const response = await api.getAchievements(lang);
        debug.log('🏆 Achievements response:', response);
        
        if (response.success) {
            achievementsData = response.data;
            debug.log('🏆 Achievements data:', achievementsData);
            renderAchievements(achievementsData.achievements);
            updateAchievementsStats(achievementsData.stats);
            
            // Кэшируем на 5 минут
            cache.set(cacheKey, achievementsData, 300);
        } else {
            debug.error('Achievements API error:', response);
        }
    } catch (error) {
        debug.error('Failed to load achievements:', error);
        const t = window.i18n?.t || (k => k);
        if (listEl) {
            listEl.innerHTML = `<div class="empty-state">${t('failed_load_achievements')}</div>`;
        }
    }
}

function renderAchievements(achievements, filter = 'all') {
    const listEl = document.getElementById('achievements-list');
    if (!listEl) return;
    
    let filtered = achievements;
    
    if (filter === 'unlocked') {
        filtered = achievements.filter(a => a.unlocked);
    } else if (filter === 'locked') {
        filtered = achievements.filter(a => !a.unlocked);
    }
    
    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="empty-state">Нет достижений в этой категории</div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    filtered.forEach(ach => {
        const card = document.createElement('div');
        card.className = `achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`;
        
        card.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-info">
                <div class="achievement-name">${ach.name}</div>
                <div class="achievement-desc">${ach.description}</div>
                ${!ach.unlocked ? `
                    <div class="achievement-progress">
                        <div class="achievement-progress-bar">
                            <div class="achievement-progress-fill" style="width: ${ach.percentage}%"></div>
                        </div>
                        <span class="achievement-progress-text">${ach.progress}/${ach.max_progress}</span>
                    </div>
                ` : ''}
            </div>
            <div class="achievement-xp">+${ach.xp_reward} XP</div>
        `;
        
        fragment.appendChild(card);
    });
    
    listEl.innerHTML = '';
    listEl.appendChild(fragment);
}

function updateAchievementsStats(stats) {
    const countEl = document.getElementById('achievements-count');
    if (countEl) {
        countEl.textContent = `${stats.unlocked}/${stats.total}`;
    }
    
    const ringEl = document.getElementById('achievements-ring');
    if (ringEl) {
        const circumference = 283; // 2 * PI * 45
        const offset = circumference - (circumference * stats.percentage / 100);
        ringEl.style.strokeDashoffset = offset;
    }
}

function filterAchievements(filter) {
    // Обновляем активную кнопку
    document.querySelectorAll('.achievements-filter .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === filter);
    });
    
    if (achievementsData) {
        renderAchievements(achievementsData.achievements, filter);
    }
}

// ===== GAMIFICATION NOTIFICATIONS =====

function showGamificationNotification(data) {
    if (!data) return;
    
    // Level up
    if (data.xp?.level_up) {
        showAchievementToast({
            icon: '⬆️',
            title: 'Новый уровень!',
            message: `Вы достигли уровня ${data.xp.new_level}!`
        });
    }
    
    // Новые достижения
    if (data.achievements?.length > 0) {
        data.achievements.forEach(ach => {
            showAchievementToast({
                icon: ach.icon,
                title: ach.name,
                message: `+${ach.xp_reward} XP`
            });
        });
    }
    
    // Streak milestone
    if (data.streak?.streak_milestone) {
        showAchievementToast({
            icon: '🔥',
            title: `${data.streak.streak_milestone} дней подряд!`,
            message: `+${data.streak.bonus_xp} XP бонус`
        });
    }
}

function showAchievementToast(data) {
    // Haptic feedback for achievement
    haptic.medium();
    
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast achievement-toast';
    toast.innerHTML = `
        <span class="toast-icon">${data.icon}</span>
        <div class="toast-content">
            <div class="toast-title">${data.title}</div>
            <div class="toast-message">${data.message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== DAILY QUESTS =====

async function loadDailyQuests() {
    debug.log('📋 Loading daily quests...');
    
    const lang = localStorage.getItem('app_language') || 'ru';
    const listEl = document.getElementById('daily-quests-list');
    
    if (!listEl) return;
    
    try {
        const response = await api.getDailyQuests(lang);
        debug.log('📋 Daily quests response:', response);
        
        if (response.success && response.data) {
            renderDailyQuests(response.data);
        }
    } catch (error) {
        debug.error('Failed to load daily quests:', error);
        const t = window.i18n?.t || (k => k);
        listEl.innerHTML = `<div class="empty-state" style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px">${t('failed_load_quests')}</div>`;
    }
}

function renderDailyQuests(data) {
    const listEl = document.getElementById('daily-quests-list');
    const footerEl = document.getElementById('daily-quests-footer');
    const bonusBadge = document.getElementById('daily-bonus-badge');
    const t = window.i18n?.t || (k => k);
    
    if (!listEl) return;
    
    const quests = data.quests || [];
    
    if (quests.length === 0) {
        listEl.innerHTML = `<div class="empty-state" style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px">${t('no_quests')}</div>`;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    quests.forEach(quest => {
        const item = document.createElement('div');
        item.className = `daily-quest-item ${quest.completed ? 'completed' : ''}`;
        
        const progress = Math.min(100, (quest.progress / quest.target) * 100);
        
        item.innerHTML = `
            <div class="daily-quest-check">
                ${quest.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="daily-quest-info">
                <div class="daily-quest-title">${quest.title}</div>
                <div class="daily-quest-progress-bar">
                    <div class="daily-quest-progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="daily-quest-xp">+${quest.xp} XP</div>
        `;
        
        fragment.appendChild(item);
    });
    
    listEl.innerHTML = '';
    listEl.appendChild(fragment);
    
    // Показываем бонус если все выполнены
    if (data.all_completed) {
        if (footerEl) footerEl.style.display = 'block';
        if (bonusBadge) {
            bonusBadge.style.display = 'inline-block';
            if (data.bonus_claimed) {
                bonusBadge.textContent = '✓ +25 XP';
                bonusBadge.style.background = 'rgba(34, 197, 94, 0.15)';
                bonusBadge.style.color = '#22c55e';
            }
        }
    } else {
        if (footerEl) footerEl.style.display = 'none';
        if (bonusBadge) bonusBadge.style.display = 'none';
    }
}

// ===== LEADERBOARD =====

let currentLeaderboardPeriod = 'week';

async function loadLeaderboard(period = null) {
    if (period) {
        currentLeaderboardPeriod = period;
        
        // Обновляем активную кнопку
        document.querySelectorAll('.leaderboard-period-filter .period-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === period);
        });
    }
    
    debug.log('🏆 Loading leaderboard:', currentLeaderboardPeriod);
    
    const listEl = document.getElementById('leaderboard-list');
    const userCard = document.getElementById('leaderboard-user-card');
    const t = window.i18n?.t || (k => k);
    
    if (listEl) {
        listEl.innerHTML = '<div style="display:flex;justify-content:center;padding:40px"><div style="width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite"></div></div>';
    }
    
    try {
        const response = await api.getLeaderboard(currentLeaderboardPeriod, 20);
        debug.log('🏆 Leaderboard response:', response);
        
        if (response.success && response.data) {
            renderLeaderboard(response.data);
        }
    } catch (error) {
        debug.error('Failed to load leaderboard:', error);
        if (listEl) {
            listEl.innerHTML = `<div class="empty-state">${t('failed_load_leaderboard')}</div>`;
        }
    }
}

function renderLeaderboard(data) {
    const listEl = document.getElementById('leaderboard-list');
    const t = window.i18n?.t || (k => k);
    
    // Обновляем карточку пользователя
    const positionBadge = document.getElementById('user-position-badge');
    const positionLevel = document.getElementById('user-position-level');
    const positionXp = document.getElementById('user-position-xp');
    
    if (positionBadge) positionBadge.textContent = `#${data.user_position || '?'}`;
    
    // Находим данные текущего пользователя
    const currentUser = data.leaders?.find(l => l.is_current_user);
    if (currentUser) {
        if (positionLevel) positionLevel.textContent = `Ур. ${currentUser.level} - ${currentUser.level_name}`;
        if (positionXp) positionXp.textContent = `${currentUser.total_xp} XP`;
    }
    
    if (!listEl) return;
    
    const leaders = data.leaders || [];
    
    if (leaders.length === 0) {
        listEl.innerHTML = `<div class="empty-state">${t('no_participants')}</div>`;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    leaders.forEach((leader, index) => {
        const item = document.createElement('div');
        const isTop3 = index < 3;
        item.className = `leaderboard-item ${isTop3 ? 'top-3' : ''} ${leader.is_current_user ? 'current-user' : ''}`;
        
        item.innerHTML = `
            <div class="leaderboard-rank">${leader.position}</div>
            <div class="leaderboard-user-info">
                <div class="leaderboard-level-name">${leader.level_name}</div>
                <div class="leaderboard-streak">
                    <span>🔥</span>
                    <span>${leader.current_streak} ${t('days_streak')}</span>
                </div>
            </div>
            <div class="leaderboard-xp">${leader.total_xp} XP</div>
        `;
        
        fragment.appendChild(item);
    });
    
    listEl.innerHTML = '';
    listEl.appendChild(fragment);
}

// ===== XP & LEVEL UP ANIMATIONS =====

function showXPPopup(amount, reason = '') {
    // Haptic feedback for XP gain
    haptic.light();
    
    // Удаляем предыдущий попап если есть
    const existing = document.querySelector('.xp-popup');
    if (existing) existing.remove();
    
    const popup = document.createElement('div');
    popup.className = 'xp-popup';
    popup.innerHTML = `
        <div class="xp-popup-icon">⭐</div>
        <div class="xp-popup-amount">+${amount} XP</div>
        ${reason ? `<div class="xp-popup-text">${reason}</div>` : ''}
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => popup.remove(), 2500);
}

function showLevelUpPopup(level, levelName) {
    // Strong haptic feedback for level up!
    haptic.heavy();
    setTimeout(() => haptic.success(), 200);
    
    const popup = document.createElement('div');
    popup.className = 'level-up-popup';
    popup.innerHTML = `
        <div class="level-up-content">
            <div class="level-up-icon">🎉</div>
            <div class="level-up-title">Новый уровень!</div>
            <div class="level-up-level">${level}</div>
            <div class="level-up-name">${levelName}</div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Закрыть по клику
    popup.addEventListener('click', () => {
        haptic.light();
        popup.style.animation = 'levelUpBgIn 0.3s ease reverse';
        setTimeout(() => popup.remove(), 300);
    });
    
    // Автозакрытие через 4 секунды
    setTimeout(() => {
        if (popup.parentNode) {
            popup.style.animation = 'levelUpBgIn 0.3s ease reverse';
            setTimeout(() => popup.remove(), 300);
        }
    }, 4000);
}

// Улучшенная версия showGamificationNotification
function showGamificationNotificationEnhanced(data) {
    if (!data) return;
    
    // Level up - показываем большой попап
    if (data.xp?.level_up) {
        showLevelUpPopup(data.xp.new_level, data.xp.new_level_name || `Уровень ${data.xp.new_level}`);
    } else if (data.xp?.amount) {
        // Показываем XP попап только если нет level up
        showXPPopup(data.xp.amount);
    }
    
    // Новые достижения
    if (data.achievements?.length > 0) {
        // Показываем с задержкой если был level up
        const delay = data.xp?.level_up ? 2500 : 0;
        
        data.achievements.forEach((ach, index) => {
            setTimeout(() => {
                showAchievementToast({
                    icon: ach.icon,
                    title: ach.name,
                    message: `+${ach.xp_reward} XP`
                });
            }, delay + (index * 500));
        });
    }
    
    // Streak milestone
    if (data.streak?.streak_milestone) {
        setTimeout(() => {
            showAchievementToast({
                icon: '🔥',
                title: `${data.streak.streak_milestone} дней подряд!`,
                message: `+${data.streak.bonus_xp} XP бонус`
            });
        }, data.achievements?.length ? 1500 : 0);
    }
}

// ===== SETTINGS =====
async function loadSettings() {
    debug.log('⚙️ Loading settings...');
    
    // Load saved settings
    const savedCurrency = localStorage.getItem('currency') || 'KGS';
    const savedPeriod = localStorage.getItem('defaultPeriod') || 'week';
    const savedTheme = localStorage.getItem('theme') || 'auto';
    const savedLanguage = localStorage.getItem('app_language') || 'ru';
    
    // Apply language
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.value = savedLanguage;
    }
    updateLanguageDisplay(savedLanguage);
    
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
    
    // Load usage type from server
    const usageTypeSelect = document.getElementById('usage-type-select');
    const usageTypeDesc = document.getElementById('usage-type-desc');
    
    try {
        const profile = await api.getProfile();
        const usageType = profile.usage_type || 'personal';
        localStorage.setItem('usageType', usageType);
        
        if (usageTypeSelect) {
            usageTypeSelect.value = usageType;
        }
        if (usageTypeDesc) {
            usageTypeDesc.textContent = usageType === 'business' ? 'Бизнес финансы' : 'Личные финансы';
        }
        debug.log('👤 Usage type loaded:', usageType);
    } catch (e) {
        // Используем сохранённое значение
        const savedUsageType = localStorage.getItem('usageType') || 'personal';
        if (usageTypeSelect) {
            usageTypeSelect.value = savedUsageType;
        }
        if (usageTypeDesc) {
            usageTypeDesc.textContent = savedUsageType === 'business' ? 'Бизнес финансы' : 'Личные финансы';
        }
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
    
    // Haptic feedback for success
    haptic.success();
    
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

// Универсальная функция toast
function showToast(message, type = 'success') {
    if (type === 'error') {
        showError(message);
    } else {
        showSuccess(message);
    }
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
    const historySearch = document.getElementById('history-search');
    const historyAmountMin = document.getElementById('history-amount-min');
    const historyAmountMax = document.getElementById('history-amount-max');
    const searchClearBtn = document.getElementById('search-clear-btn');
    
    // Дебаунсинг для фильтров - задержка 300мс
    let historyDebounceTimer;
    const debouncedLoadHistory = () => {
        clearTimeout(historyDebounceTimer);
        // НЕ очищаем кэш - каждая комбинация фильтров имеет свой кэш
        historyDebounceTimer = setTimeout(() => {
            loadHistory();
            updateActiveFiltersUI();
        }, 300);
    };
    
    // Поиск с дебаунсом 500мс
    if (historySearch) {
        historySearch.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            historyFilters.search = value;
            
            // Показываем/скрываем кнопку очистки
            if (searchClearBtn) {
                searchClearBtn.style.display = value ? 'flex' : 'none';
            }
            
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                // НЕ очищаем кэш - каждый поиск имеет свой кэш
                loadHistory();
                updateActiveFiltersUI();
            }, 500);
        });
    }
    
    // Фильтр по минимальной сумме
    if (historyAmountMin) {
        historyAmountMin.addEventListener('change', (e) => {
            const value = e.target.value;
            historyFilters.amountMin = value ? parseFloat(value) : null;
            debouncedLoadHistory();
        });
    }
    
    // Фильтр по максимальной сумме
    if (historyAmountMax) {
        historyAmountMax.addEventListener('change', (e) => {
            const value = e.target.value;
            historyFilters.amountMax = value ? parseFloat(value) : null;
            debouncedLoadHistory();
        });
    }
    
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
    
    // Usage Type (Personal/Business)
    const usageTypeSelect = document.getElementById('usage-type-select');
    if (usageTypeSelect) {
        usageTypeSelect.addEventListener('change', async (e) => {
            const newType = e.target.value;
            debug.log('👤 Changing usage type to:', newType);
            
            try {
                await api.updateProfile({ usage_type: newType });
                localStorage.setItem('usageType', newType);
                
                // Обновляем описание
                const desc = document.getElementById('usage-type-desc');
                if (desc) {
                    desc.textContent = newType === 'business' ? 'Бизнес финансы' : 'Личные финансы';
                }
                
                showSuccess(newType === 'business' ? 'Режим: Бизнес' : 'Режим: Личный');
            } catch (error) {
                console.error('Failed to update usage type:', error);
                showError('Не удалось изменить тип');
                // Откатываем селектор
                usageTypeSelect.value = localStorage.getItem('usageType') || 'personal';
            }
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
        
        // 2.5 Проверка онбординга (ОБЯЗАТЕЛЬНЫЙ)
        debug.log('🎯 Checking onboarding status...');
        if (window.OnboardingModule) {
            const needsOnboarding = await OnboardingModule.checkAndStart();
            if (needsOnboarding) {
                debug.log('📋 Onboarding started, pausing app init...');
                return; // Онбординг покажется, приложение загрузится после его завершения
            }
        }
        debug.log('✅ Onboarding completed or skipped');
        
        // 3. Предзагрузка данных через BATCH API
        debug.log('⚡ Starting batch data preload...');
        try {
            const batchData = await api.getBatchAnalytics(state.currentPeriod);
            
            // Обновляем курсы валют
            if (batchData.exchange_rates) {
                const ratesObj = {};
                batchData.exchange_rates.forEach(rate => {
                    const key = `${rate.from_currency}_${rate.to_currency}`;
                    ratesObj[key] = rate.rate;
                });
                exchangeRates = ratesObj;
                cache.set('exchange_rates', ratesObj, 3600);
            }
            
            // Кэшируем batch данные
            cache.set(`batch:${state.currentPeriod}:${state.currency}`, batchData, 120);
            state.preloadedData = batchData;
            
            debug.log('⚡ Batch data preloaded successfully');
        } catch (e) {
            debug.warn('⚠️ Batch preload failed, will load on demand:', e);
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

// ===== TRENDS & PATTERNS =====

// Обновление трендов из batch данных
function updateTrendsFromBatch(trends) {
    debug.log('📈 Updating trends from batch...', trends);
    
    const origCurrency = 'KGS';
    
    // Расходы
    const expenseCurrent = convertAmount(trends.expenses?.current || 0, origCurrency, state.currency);
    const expensePrev = convertAmount(trends.expenses?.previous || 0, origCurrency, state.currency);
    const expenseChange = trends.expenses?.change_percent || 0;
    
    const hasExpenseData = expenseCurrent > 0 || expensePrev > 0;
    document.getElementById('trend-expense-current').textContent = hasExpenseData ? formatCurrency(expenseCurrent) : '0 с';
    document.getElementById('trend-expense-prev').textContent = hasExpenseData ? formatCurrency(expensePrev) : '0 с';
    
    const expenseChangeEl = document.getElementById('trend-expense-change');
    if (expenseChangeEl) {
        if (hasExpenseData) {
            const sign = expenseChange > 0 ? '+' : '';
            expenseChangeEl.textContent = `${sign}${expenseChange}%`;
            expenseChangeEl.className = 'trend-change ' + 
                (expenseChange > 5 ? '' : (expenseChange < -5 ? 'positive' : 'neutral'));
        } else {
            expenseChangeEl.textContent = '0%';
            expenseChangeEl.className = 'trend-change neutral';
        }
    }
    
    const expenseBarWidth = expensePrev > 0 ? Math.min((expenseCurrent / expensePrev) * 100, 150) : (expenseCurrent > 0 ? 100 : 0);
    document.getElementById('trend-expense-bar').style.width = `${Math.min(expenseBarWidth, 100)}%`;
    
    // Доходы
    const incomeCurrent = convertAmount(trends.income?.current || 0, origCurrency, state.currency);
    const incomePrev = convertAmount(trends.income?.previous || 0, origCurrency, state.currency);
    const incomeChange = trends.income?.change_percent || 0;
    
    const hasIncomeData = incomeCurrent > 0 || incomePrev > 0;
    document.getElementById('trend-income-current').textContent = hasIncomeData ? formatCurrency(incomeCurrent) : '0 с';
    document.getElementById('trend-income-prev').textContent = hasIncomeData ? formatCurrency(incomePrev) : '0 с';
    
    const incomeChangeEl = document.getElementById('trend-income-change');
    if (incomeChangeEl) {
        if (hasIncomeData) {
            const sign = incomeChange > 0 ? '+' : '';
            incomeChangeEl.textContent = `${sign}${incomeChange}%`;
            incomeChangeEl.className = 'trend-change ' + 
                (incomeChange > 5 ? 'positive' : (incomeChange < -5 ? '' : 'neutral'));
        } else {
            incomeChangeEl.textContent = '0%';
            incomeChangeEl.className = 'trend-change neutral';
        }
    }
    
    const incomeBarWidth = incomePrev > 0 ? Math.min((incomeCurrent / incomePrev) * 100, 150) : (incomeCurrent > 0 ? 100 : 0);
    document.getElementById('trend-income-bar').style.width = `${Math.min(incomeBarWidth, 100)}%`;
    
    // Прогноз
    if (trends.projection) {
        const projectedTotal = convertAmount(trends.projection.estimated_total || 0, origCurrency, state.currency);
        document.getElementById('projection-total').textContent = formatCurrency(projectedTotal);
        document.getElementById('projection-days').textContent = trends.projection.days_left || 0;
    }
    
    // Очищаем категории трендов (их нет в batch)
    const container = document.getElementById('category-trends-list');
    if (container) {
        container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon"><i class="fas fa-chart-line"></i></div>
                <div class="empty-state-text">Анализ категорий</div>
                <div class="empty-state-hint">Данные обновляются ежемесячно</div>
            </div>
        `;
    }
    
    debug.log('✅ Trends updated from batch');
}

// Обновление паттернов из batch данных
function updatePatternsFromBatch(patterns) {
    debug.log('📅 Updating patterns from batch...', patterns);
    
    const weekdayPatterns = patterns.weekday_patterns || [];
    renderWeekdayBars(weekdayPatterns, 'KGS');
    
    const insightEl = document.getElementById('weekday-insight-text');
    if (insightEl) {
        const maxDay = weekdayPatterns.reduce((max, p) => 
            (p.average || 0) > (max.average || 0) ? p : max, { average: 0 });
        if (maxDay.average > 0) {
            insightEl.textContent = `Больше всего вы тратите в ${maxDay.day_short || 'N/A'}`;
        } else {
            insightEl.textContent = 'Недостаточно данных для анализа';
        }
    }
    
    debug.log('✅ Patterns updated from batch');
}

async function loadTrendsData() {
    debug.log('📈 Loading trends data...');
    
    try {
        const data = await api.getSpendingTrends();
        debug.log('📈 Trends data:', data);
        
        if (!data) return;
        
        // Конвертируем в выбранную валюту
        const origCurrency = data.currency || 'KGS';
        
        // Расходы
        const expenseCurrent = convertAmount(data.expenses?.current || 0, origCurrency, state.currency);
        const expensePrev = convertAmount(data.expenses?.previous || 0, origCurrency, state.currency);
        const expenseChange = data.expenses?.change_percent || 0;
        
        // Показываем актуальные данные или placeholder
        const hasExpenseData = expenseCurrent > 0 || expensePrev > 0;
        document.getElementById('trend-expense-current').textContent = hasExpenseData ? formatCurrency(expenseCurrent) : '0 с';
        document.getElementById('trend-expense-prev').textContent = hasExpenseData ? formatCurrency(expensePrev) : '0 с';
        
        const expenseChangeEl = document.getElementById('trend-expense-change');
        if (expenseChangeEl) {
            if (hasExpenseData) {
                const sign = expenseChange > 0 ? '+' : '';
                expenseChangeEl.textContent = `${sign}${expenseChange}%`;
                expenseChangeEl.className = 'trend-change ' + 
                    (expenseChange > 5 ? '' : (expenseChange < -5 ? 'positive' : 'neutral'));
            } else {
                expenseChangeEl.textContent = '0%';
                expenseChangeEl.className = 'trend-change neutral';
            }
        }
        
        // Прогресс-бар расходов (относительно прошлого месяца)
        const expenseBarWidth = expensePrev > 0 ? Math.min((expenseCurrent / expensePrev) * 100, 150) : (expenseCurrent > 0 ? 100 : 0);
        document.getElementById('trend-expense-bar').style.width = `${Math.min(expenseBarWidth, 100)}%`;
        
        // Доходы
        const incomeCurrent = convertAmount(data.income?.current || 0, origCurrency, state.currency);
        const incomePrev = convertAmount(data.income?.previous || 0, origCurrency, state.currency);
        const incomeChange = data.income?.change_percent || 0;
        
        const hasIncomeData = incomeCurrent > 0 || incomePrev > 0;
        document.getElementById('trend-income-current').textContent = hasIncomeData ? formatCurrency(incomeCurrent) : '0 с';
        document.getElementById('trend-income-prev').textContent = hasIncomeData ? formatCurrency(incomePrev) : '0 с';
        
        const incomeChangeEl = document.getElementById('trend-income-change');
        if (incomeChangeEl) {
            if (hasIncomeData) {
                const sign = incomeChange > 0 ? '+' : '';
                incomeChangeEl.textContent = `${sign}${incomeChange}%`;
                incomeChangeEl.className = 'trend-change ' + 
                    (incomeChange > 5 ? 'positive' : (incomeChange < -5 ? '' : 'neutral'));
            } else {
                incomeChangeEl.textContent = '0%';
                incomeChangeEl.className = 'trend-change neutral';
            }
        }
        
        // Прогресс-бар доходов
        const incomeBarWidth = incomePrev > 0 ? Math.min((incomeCurrent / incomePrev) * 100, 150) : (incomeCurrent > 0 ? 100 : 0);
        document.getElementById('trend-income-bar').style.width = `${Math.min(incomeBarWidth, 100)}%`;
        
        // Прогноз
        const projectedTotal = convertAmount(data.projection?.estimated_total || 0, origCurrency, state.currency);
        document.getElementById('projection-total').textContent = formatCurrency(projectedTotal);
        document.getElementById('projection-days').textContent = data.projection?.days_left || 0;
        
        // Тренды по категориям
        renderCategoryTrends(data.category_trends || [], origCurrency);
        
        debug.log('✅ Trends loaded');
        
    } catch (error) {
        debug.error('❌ Error loading trends:', error);
    }
}

function renderCategoryTrends(trends, origCurrency) {
    const container = document.getElementById('category-trends-list');
    if (!container) return;
    
    const t = window.i18n?.t || (k => k);
    
    if (!trends.length) {
        container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon"><i class="fas fa-chart-line"></i></div>
                <div class="empty-state-text">${t('insufficient_data')}</div>
                <div class="empty-state-hint">${t('need_2_months')}</div>
            </div>
        `;
        return;
    }
    
    const categoryIcons = {
        'Продукты': '🛒',
        'Транспорт': '🚗',
        'Кафе': '☕',
        'Развлечения': '🎮',
        'Жильё': '🏠',
        'Здоровье': '💊',
        'Одежда': '👕',
        'Подписки': '📱',
        'Образование': '📚',
        'Путешествия': '✈️'
    };
    
    container.innerHTML = trends.map(trend => {
        const current = convertAmount(trend.current || 0, origCurrency, state.currency);
        const previous = convertAmount(trend.previous || 0, origCurrency, state.currency);
        const change = trend.change_percent || 0;
        const icon = categoryIcons[trend.category] || '📦';
        
        const changeClass = trend.trend === 'up' ? 'up' : (trend.trend === 'down' ? 'down' : 'stable');
        const sign = change > 0 ? '+' : '';
        
        return `
            <div class="category-trend-item">
                <div class="category-trend-icon">${icon}</div>
                <div class="category-trend-info">
                    <div class="category-trend-name">${escapeHtml(trend.category)}</div>
                    <div class="category-trend-values">
                        ${formatCurrency(current)} vs ${formatCurrency(previous)}
                    </div>
                </div>
                <span class="category-trend-change ${changeClass}">${sign}${change}%</span>
            </div>
        `;
    }).join('');
}

async function loadPatternsData() {
    debug.log('📅 Loading patterns data...');
    
    try {
        const data = await api.getSpendingPatterns();
        debug.log('📅 Patterns data:', data);
        
        if (!data) return;
        
        // Рендерим бары по дням недели
        renderWeekdayBars(data.weekday_patterns || [], data.currency || 'KGS');
        
        // Инсайт
        const insightEl = document.getElementById('weekday-insight-text');
        if (insightEl && data.insights?.recommendation) {
            insightEl.textContent = data.insights.recommendation;
        } else if (insightEl) {
            insightEl.textContent = 'Недостаточно данных для анализа паттернов';
        }
        
        debug.log('✅ Patterns loaded');
        
    } catch (error) {
        debug.error('❌ Error loading patterns:', error);
    }
}

function renderWeekdayBars(patterns, origCurrency) {
    const container = document.getElementById('weekday-bars');
    const insightEl = document.getElementById('weekday-insight');
    if (!container) return;
    
    const t = window.i18n?.t || (k => k);
    
    if (!patterns.length || patterns.every(p => !p.average)) {
        container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon"><i class="fas fa-calendar-week"></i></div>
                <div class="empty-state-text">${t('no_expense_data')}</div>
                <div class="empty-state-hint">${t('add_transactions_patterns')}</div>
            </div>
        `;
        if (insightEl) insightEl.style.display = 'none';
        return;
    }
    
    if (insightEl) insightEl.style.display = 'flex';
    
    // Находим максимальное значение для масштабирования
    const maxAvg = Math.max(...patterns.map(p => p.average || 0));
    
    // Находим самый затратный день
    const maxDayIndex = patterns.reduce((maxIdx, p, idx, arr) => 
        (p.average || 0) > (arr[maxIdx]?.average || 0) ? idx : maxIdx, 0);
    
    container.innerHTML = patterns.map((p, idx) => {
        const avg = convertAmount(p.average || 0, origCurrency, state.currency);
        const heightPercent = maxAvg > 0 ? ((p.average || 0) / maxAvg * 100) : 0;
        const isHighlight = idx === maxDayIndex && (p.average || 0) > 0;
        
        return `
            <div class="weekday-bar-item ${isHighlight ? 'highlight' : ''}">
                <div class="weekday-bar-wrap">
                    <div class="weekday-bar ${isHighlight ? 'highlight' : ''}" style="height: ${heightPercent}%">
                        ${heightPercent > 20 ? `<span class="weekday-bar-value">${formatAmount(avg)}</span>` : ''}
                    </div>
                </div>
                <span class="weekday-label">${p.day_short}</span>
            </div>
        `;
    }).join('');
}

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
    setupBudgetPresets();
});

// ═══════════════════════════════════════════════════════════════════════════
// BUDGET WIDGET
// ═══════════════════════════════════════════════════════════════════════════

let currentBudgetData = null;

async function loadBudgetWidget() {
    debug.log('💰 Loading budget widget...');
    
    const widget = document.getElementById('budget-widget');
    if (!widget) return;
    
    try {
        const data = await api.getCurrentBudgetStatus();
        currentBudgetData = data;
        debug.log('💰 Budget data:', data);
        
        const emptyState = document.getElementById('budget-empty');
        const progressContainer = widget.querySelector('.budget-progress-container');
        const header = widget.querySelector('.budget-widget-header');
        
        if (!data.has_budget) {
            // Бюджет не установлен - показываем "Установить бюджет"
            widget.className = 'budget-widget budget-widget-mini';
            if (progressContainer) progressContainer.style.display = 'none';
            if (header) header.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'flex';
            }
            return;
        }
        
        // Бюджет установлен - показываем виджет
        if (progressContainer) progressContainer.style.display = 'block';
        if (header) header.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';
        
        // Обновляем класс статуса
        widget.className = `budget-widget budget-widget-mini ${data.status}`;
        
        // Прогресс-бар
        const percentage = Math.min(data.percentage_used, 100);
        document.getElementById('budget-progress-fill').style.width = `${percentage}%`;
        
        // Суммы
        const currency = getCurrencySymbol(data.currency);
        document.getElementById('budget-spent').textContent = formatAmount(data.total_spent) + ' ' + currency;
        document.getElementById('budget-total').textContent = formatAmount(data.budget_amount) + ' ' + currency;
        document.getElementById('budget-percentage').textContent = `${data.percentage_used}%`;
        
        debug.log('✅ Budget widget updated');
        
    } catch (error) {
        debug.error('❌ Error loading budget:', error);
        // Показываем состояние "установить бюджет" при ошибке
        const widget = document.getElementById('budget-widget');
        if (widget) {
            const emptyState = document.getElementById('budget-empty');
            const progressContainer = widget.querySelector('.budget-progress-container');
            const header = widget.querySelector('.budget-widget-header');
            
            if (progressContainer) progressContainer.style.display = 'none';
            if (header) header.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'flex';
            }
        }
    }
}

function formatAmount(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return Math.round(num).toLocaleString('ru-RU');
    }
    return Math.round(num).toString();
}

function getCurrencySymbol(currency) {
    const symbols = {
        'KGS': 'с',
        'USD': '$',
        'EUR': '€',
        'RUB': '₽'
    };
    return symbols[currency] || currency;
}

function openBudgetModal() {
    debug.log('📝 Opening budget modal');
    
    const modal = document.getElementById('budget-modal');
    if (!modal) return;
    
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const monthName = getMonthName(now.getMonth());
    
    document.getElementById('budget-modal-title').textContent = `Бюджет на ${monthName}`;
    document.getElementById('budget-edit-month').value = currentMonth;
    
    // Заполняем текущее значение если есть
    const input = document.getElementById('budget-amount-input');
    if (currentBudgetData && currentBudgetData.has_budget) {
        input.value = Math.round(currentBudgetData.budget_amount);
    } else {
        input.value = '';
    }
    
    // Валюта
    const suffix = document.getElementById('budget-currency-suffix');
    if (suffix) {
        suffix.textContent = getCurrencySymbol(state.currency || 'KGS');
    }
    
    modal.classList.add('open');
}

function closeBudgetModal() {
    const modal = document.getElementById('budget-modal');
    if (modal) modal.classList.remove('open');
}

function setupBudgetPresets() {
    const presetButtons = document.querySelectorAll('.budget-preset-btn');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.dataset.amount;
            const input = document.getElementById('budget-amount-input');
            if (input && amount) {
                input.value = amount;
                input.focus();
            }
        });
    });
}

async function submitBudget(event) {
    event.preventDefault();
    
    const month = document.getElementById('budget-edit-month').value;
    const amount = parseFloat(document.getElementById('budget-amount-input').value);
    
    if (!month || !amount || amount <= 0) {
        showToast('Введите корректную сумму', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('budget-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
    
    try {
        await api.createBudget({
            month: month,
            budget_amount: amount,
            currency: state.currency || 'KGS'
        });
        
        showToast('Бюджет сохранён', 'success');
        closeBudgetModal();
        
        // Обновляем виджет
        await loadBudgetWidget();
        
    } catch (error) {
        debug.error('❌ Error saving budget:', error);
        showToast('Не удалось сохранить бюджет', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Сохранить';
    }
}

function getMonthName(monthIndex) {
    const months = [
        'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
        'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
    ];
    return months[monthIndex] || '';
}

function getMonthNameFull(monthStr) {
    // monthStr format: YYYY-MM
    const [year, month] = monthStr.split('-');
    const months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUDGETS SCREEN
// ═══════════════════════════════════════════════════════════════════════════

async function loadBudgetsScreen() {
    debug.log('💰 Loading budgets screen...');
    
    // Проверяем кэш
    const cacheKey = `budgets:${state.currency}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
        debug.log('📦 Using cached budgets screen');
        updateBudgetCurrentCard(cached.currentStatus);
        updateBudgetsHistory(cached.budgets, cached.currentStatus, true); // true = fromCache
        return;
    }
    
    try {
        // Загружаем текущий статус
        const currentStatus = await api.getCurrentBudgetStatus();
        updateBudgetCurrentCard(currentStatus);
        
        // Загружаем историю
        const budgets = await api.getBudgets({ limit: 12 });
        
        // Обогащаем бюджеты статусами и кэшируем результат
        const currentMonth = currentStatus?.month || new Date().toISOString().slice(0, 7);
        const historyBudgets = budgets.filter(b => b.month !== currentMonth);
        
        const enrichedBudgets = await Promise.all(
            historyBudgets.slice(0, 6).map(async (budget) => {
                try {
                    const status = await api.getBudgetStatus(budget.month);
                    return { ...budget, ...status };
                } catch {
                    return { ...budget, total_spent: 0, percentage_used: 0, status: 'on_track' };
                }
            })
        );
        
        // Показываем историю
        updateBudgetsHistory(enrichedBudgets, currentStatus, true);
        
        // Кэшируем на 5 минут (с уже обогащёнными данными)
        cache.set(cacheKey, { currentStatus, budgets: enrichedBudgets }, 300);
        
    } catch (error) {
        debug.error('❌ Error loading budgets screen:', error);
        showToast('Ошибка загрузки бюджетов', 'error');
    }
}

function updateBudgetCurrentCard(data) {
    const card = document.getElementById('budget-current-card');
    if (!card) return;
    
    if (!data.has_budget) {
        // Бюджет не установлен
        card.className = 'budget-current-card';
        card.innerHTML = `
            <div class="empty-state small" onclick="openBudgetModal()" style="cursor:pointer">
                <i class="fas fa-plus-circle" style="color: var(--accent)"></i>
                <p>Нажмите чтобы установить бюджет</p>
            </div>
        `;
        return;
    }
    
    // Обновляем класс статуса
    card.className = `budget-current-card ${data.status}`;
    
    // Название месяца
    document.getElementById('budget-current-month').textContent = 
        data.month_name || getMonthNameFull(data.month);
    
    // Статус
    const statusEl = document.getElementById('budget-current-status');
    const statusTexts = {
        'on_track': '✅ В норме',
        'warning': '⚠️ Близко к лимиту',
        'over_budget': '🚨 Превышен'
    };
    statusEl.textContent = statusTexts[data.status] || '✅ В норме';
    
    // Прогресс-бар
    const percentage = Math.min(data.percentage_used, 100);
    document.getElementById('budget-current-fill').style.width = `${percentage}%`;
    
    // Суммы
    const currency = getCurrencySymbol(data.currency);
    document.getElementById('budget-current-spent').textContent = 
        formatAmount(data.total_spent) + ' ' + currency;
    document.getElementById('budget-current-total').textContent = 
        '/ ' + formatAmount(data.budget_amount) + ' ' + currency;
    
    // Статистика
    const remaining = data.remaining;
    document.getElementById('budget-current-remaining').textContent = 
        (remaining >= 0 ? '' : '-') + formatAmount(Math.abs(remaining)) + ' ' + currency;
    document.getElementById('budget-current-percent').textContent = 
        data.percentage_used + '%';
}

async function updateBudgetsHistory(budgets, currentStatus, fromCache = false) {
    const listEl = document.getElementById('budgets-history-list');
    if (!listEl) return;
    
    // Если данные уже обогащены (из кэша или после loadBudgetsScreen)
    let historyWithStatus = budgets;
    
    // Если это сырые данные - нужно фильтровать и обогащать
    if (!fromCache) {
        const currentMonth = currentStatus?.month || new Date().toISOString().slice(0, 7);
        const historyBudgets = budgets.filter(b => b.month !== currentMonth);
        
        if (historyBudgets.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state small">
                    <i class="fas fa-calendar-check"></i>
                    <p>История бюджетов появится здесь</p>
                </div>
            `;
            return;
        }
        
        // Для каждого бюджета получаем статус (расходы)
        historyWithStatus = await Promise.all(
            historyBudgets.slice(0, 6).map(async (budget) => {
                try {
                    const status = await api.getBudgetStatus(budget.month);
                    return { ...budget, ...status };
                } catch {
                    return { ...budget, total_spent: 0, percentage_used: 0, status: 'on_track' };
                }
            })
        );
    }
    
    if (historyWithStatus.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state small">
                <i class="fas fa-calendar-check"></i>
                <p>История бюджетов появится здесь</p>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = historyWithStatus.map(budget => {
        const [year, month] = budget.month.split('-');
        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const currency = getCurrencySymbol(budget.currency);
        
        return `
            <div class="budget-history-item" onclick="showBudgetDetails('${budget.month}')">
                <div class="month-badge">
                    <span class="month-num">${month}</span>
                    <span>${year}</span>
                </div>
                <div class="budget-info">
                    <div class="budget-month-name">${monthNames[parseInt(month) - 1]} ${year}</div>
                    <div class="budget-amounts">${formatAmount(budget.total_spent || 0)} / ${formatAmount(budget.budget_amount)} ${currency}</div>
                </div>
                <span class="budget-percent ${budget.status || 'on_track'}">${budget.percentage_used || 0}%</span>
            </div>
        `;
    }).join('');
}

function showBudgetDetails(month) {
    // Можно открыть модалку с деталями или просто показать тост
    debug.log('Show budget details for:', month);
    showToast(`Бюджет за ${getMonthNameFull(month)}`, 'info');
}

// ===== GLOBAL ERROR HANDLER =====
window.addEventListener('error', (e) => {
    console.error('💥 Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 Unhandled rejection:', e.reason);
});

debug.log('✅ App initialized');
