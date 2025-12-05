// ============================================================================
// AIAccounter - Onboarding Module
// Mandatory setup wizard for new users
// ============================================================================

const OnboardingModule = (() => {
    // Debug logger
    const debug = {
        log: (...args) => window.IS_LOCALHOST && console.log('[ONBOARDING]', ...args),
        warn: (...args) => window.IS_LOCALHOST && console.warn('[ONBOARDING]', ...args),
        error: (...args) => console.error('[ONBOARDING]', ...args)
    };

    // State
    let state = {
        currentStep: 0,
        totalSteps: 5,
        data: {
            currency: 'KGS',
            usage_type: null,
            monthly_budget: null,
            categories: [],
            notifications: {
                daily_reminder: true,
                weekly_report: true,
                budget_alerts: true,
                reminder_time: '20:00'
            }
        },
        categoryTemplates: []
    };

    // Currency options
    const currencies = [
        { code: 'KGS', flag: '🇰🇬', name: 'Сом' },
        { code: 'USD', flag: '🇺🇸', name: 'Доллар' },
        { code: 'EUR', flag: '🇪🇺', name: 'Евро' },
        { code: 'RUB', flag: '🇷🇺', name: 'Рубль' }
    ];

    // Budget presets based on usage type
    const budgetPresets = {
        personal: [
            { value: 30000, label: '30 000' },
            { value: 50000, label: '50 000' },
            { value: 100000, label: '100 000' },
            { value: 150000, label: '150 000' },
            { value: 200000, label: '200 000' }
        ],
        business: [
            { value: 100000, label: '100 000' },
            { value: 250000, label: '250 000' },
            { value: 500000, label: '500 000' },
            { value: 1000000, label: '1 000 000' },
            { value: 2000000, label: '2 000 000' }
        ]
    };

    // ===== API Calls =====
    async function checkOnboardingStatus() {
        // Проверяем кэш - если онбординг завершён, не делаем запрос
        const cachedCompleted = localStorage.getItem('onboarding_completed');
        if (cachedCompleted === 'true') {
            debug.log('Onboarding status from cache: completed');
            return { completed: true, current_step: 5 };
        }
        
        try {
            const response = await api.get('/onboarding/status');
            debug.log('Onboarding status:', response);
            
            // Кэшируем если завершён
            if (response.completed) {
                localStorage.setItem('onboarding_completed', 'true');
            }
            
            return response;
        } catch (e) {
            debug.error('Failed to check onboarding status:', e);
            return { completed: false, current_step: 0 };
        }
    }

    async function loadCategoryTemplates(usageType) {
        try {
            const response = await api.get(`/onboarding/categories/${usageType}`);
            // API возвращает {expense_categories: [...], income_categories: [...]}
            const allCategories = [
                ...response.expense_categories,
                ...response.income_categories
            ];
            state.categoryTemplates = allCategories;
            debug.log('Category templates loaded:', allCategories.length);
            return allCategories;
        } catch (e) {
            debug.error('Failed to load category templates:', e);
            return [];
        }
    }

    async function saveStep(stepNum, data) {
        try {
            const response = await api.post(`/onboarding/step/${stepNum}`, data);
            debug.log(`Step ${stepNum} saved:`, response);
            return response;
        } catch (e) {
            debug.error(`Failed to save step ${stepNum}:`, e);
            throw e;
        }
    }

    async function completeOnboarding() {
        try {
            const response = await api.post('/onboarding/complete', {});
            debug.log('Onboarding completed:', response);
            return response;
        } catch (e) {
            debug.error('Failed to complete onboarding:', e);
            throw e;
        }
    }

    // ===== Render Functions =====
    function createOnboardingOverlay() {
        // Remove existing if any
        const existing = document.getElementById('onboarding-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-container">
                <div class="onboarding-progress">
                    <div class="progress-steps">
                        ${[1,2,3,4,5].map(i => `
                            <div class="progress-step" data-step="${i}">
                                <div class="step-dot"></div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
                <div class="onboarding-content" id="onboarding-content">
                    <!-- Content will be rendered here -->
                </div>
                <div class="onboarding-footer" id="onboarding-footer">
                    <!-- Footer buttons will be rendered here -->
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });

        return overlay;
    }

    function updateProgress(step) {
        const fill = document.querySelector('.progress-fill');
        const steps = document.querySelectorAll('.progress-step');
        
        if (fill) {
            const percent = ((step) / state.totalSteps) * 100;
            fill.style.width = `${percent}%`;
        }
        
        steps.forEach((el, i) => {
            el.classList.remove('active', 'completed');
            if (i + 1 < step) el.classList.add('completed');
            if (i + 1 === step) el.classList.add('active');
        });
    }

    // ===== Step Renderers =====
    function renderWelcome() {
        const content = document.getElementById('onboarding-content');
        const footer = document.getElementById('onboarding-footer');
        
        content.innerHTML = `
            <div class="onboarding-step welcome-step">
                <div class="step-icon">👋</div>
                <h1>Добро пожаловать в AIAccounter!</h1>
                <p class="step-description">
                    Умный помощник для учёта финансов.<br>
                    Настроим приложение под тебя за пару минут.
                </p>
                <div class="welcome-features">
                    <div class="feature">
                        <span class="feature-icon">💬</span>
                        <span class="feature-text">Записывай траты голосом или текстом</span>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">📊</span>
                        <span class="feature-text">Смотри статистику и отчёты</span>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🤖</span>
                        <span class="feature-text">Получай AI-советы по экономии</span>
                    </div>
                </div>
            </div>
        `;
        
        footer.innerHTML = `
            <button class="onboarding-btn primary" onclick="OnboardingModule.nextStep()">
                Начать настройку →
            </button>
        `;
        
        updateProgress(0);
    }

    function renderStep1Currency() {
        const content = document.getElementById('onboarding-content');
        const footer = document.getElementById('onboarding-footer');
        
        content.innerHTML = `
            <div class="onboarding-step">
                <div class="step-header">
                    <span class="step-number">Шаг 1 из 5</span>
                    <h2>💰 Основная валюта</h2>
                </div>
                <p class="step-description">
                    В какой валюте ведёшь учёт?<br>
                    Все суммы будут показываться в выбранной валюте.
                </p>
                <div class="options-list currency-options">
                    ${currencies.map(c => `
                        <div class="option-card ${state.data.currency === c.code ? 'selected' : ''}" 
                             data-value="${c.code}" 
                             onclick="OnboardingModule.selectCurrency('${c.code}')">
                            <span class="option-flag">${c.flag}</span>
                            <span class="option-label">${c.name} (${c.code})</span>
                            <span class="option-check">✓</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        footer.innerHTML = `
            <button class="onboarding-btn secondary" onclick="OnboardingModule.prevStep()">
                ← Назад
            </button>
            <button class="onboarding-btn primary" onclick="OnboardingModule.nextStep()">
                Продолжить →
            </button>
        `;
        
        updateProgress(1);
    }

    function renderStep2UsageType() {
        const content = document.getElementById('onboarding-content');
        const footer = document.getElementById('onboarding-footer');
        
        content.innerHTML = `
            <div class="onboarding-step">
                <div class="step-header">
                    <span class="step-number">Шаг 2 из 5</span>
                    <h2>🎯 Тип использования</h2>
                </div>
                <p class="step-description">
                    Для чего будешь использовать?<br>
                    Это поможет настроить категории под тебя.
                </p>
                <div class="options-list usage-options">
                    <div class="option-card large ${state.data.usage_type === 'personal' ? 'selected' : ''}" 
                         data-value="personal" 
                         onclick="OnboardingModule.selectUsageType('personal')">
                        <div class="option-icon">👤</div>
                        <div class="option-content">
                            <span class="option-title">Личные финансы</span>
                            <span class="option-subtitle">Ежедневные траты, зарплата, накопления</span>
                        </div>
                        <span class="option-check">✓</span>
                    </div>
                    <div class="option-card large ${state.data.usage_type === 'business' ? 'selected' : ''}" 
                         data-value="business" 
                         onclick="OnboardingModule.selectUsageType('business')">
                        <div class="option-icon">💼</div>
                        <div class="option-content">
                            <span class="option-title">Бизнес</span>
                            <span class="option-subtitle">Доходы от клиентов, расходы на бизнес, фриланс</span>
                        </div>
                        <span class="option-check">✓</span>
                    </div>
                </div>
            </div>
        `;
        
        footer.innerHTML = `
            <button class="onboarding-btn secondary" onclick="OnboardingModule.prevStep()">
                ← Назад
            </button>
            <button class="onboarding-btn primary" onclick="OnboardingModule.nextStep()" 
                    ${!state.data.usage_type ? 'disabled' : ''}>
                Продолжить →
            </button>
        `;
        
        updateProgress(2);
    }

    function renderStep3Budget() {
        const content = document.getElementById('onboarding-content');
        const footer = document.getElementById('onboarding-footer');
        const presets = budgetPresets[state.data.usage_type] || budgetPresets.personal;
        const currencySymbol = getCurrencySymbol(state.data.currency);
        
        content.innerHTML = `
            <div class="onboarding-step">
                <div class="step-header">
                    <span class="step-number">Шаг 3 из 5</span>
                    <h2>📊 Месячный бюджет</h2>
                </div>
                <p class="step-description">
                    Сколько планируешь тратить в месяц?<br>
                    Поможет отслеживать прогресс.
                </p>
                
                <div class="budget-input-wrapper">
                    <input type="number" 
                           id="budget-input" 
                           class="budget-input" 
                           placeholder="Введите сумму"
                           value="${state.data.monthly_budget || ''}"
                           oninput="OnboardingModule.updateBudget(this.value)">
                    <span class="budget-currency">${currencySymbol}</span>
                </div>
                
                <div class="budget-presets">
                    ${presets.map(p => `
                        <button class="preset-btn ${state.data.monthly_budget === p.value ? 'selected' : ''}" 
                                onclick="OnboardingModule.selectBudgetPreset(${p.value})">
                            ${p.label}
                        </button>
                    `).join('')}
                </div>
                
                <div class="budget-hint">
                    <span class="hint-icon">💡</span>
                    <span>Можно изменить в настройках</span>
                </div>
            </div>
        `;
        
        footer.innerHTML = `
            <button class="onboarding-btn secondary" onclick="OnboardingModule.prevStep()">
                ← Назад
            </button>
            <button class="onboarding-btn primary" onclick="OnboardingModule.nextStep()"
                    ${!state.data.monthly_budget ? 'disabled' : ''}>
                Продолжить →
            </button>
        `;
        
        updateProgress(3);
    }

    function renderStep4Categories() {
        const content = document.getElementById('onboarding-content');
        const footer = document.getElementById('onboarding-footer');
        
        const expenseCategories = state.categoryTemplates.filter(c => c.type === 'expense');
        const incomeCategories = state.categoryTemplates.filter(c => c.type === 'income');
        
        // Default: all selected
        if (state.data.categories.length === 0) {
            state.data.categories = state.categoryTemplates.map(c => c.code);
        }
        
        content.innerHTML = `
            <div class="onboarding-step">
                <div class="step-header">
                    <span class="step-number">Шаг 4 из 5</span>
                    <h2>📁 Категории</h2>
                </div>
                <p class="step-description">
                    Выбери категории для учёта.<br>
                    Можно добавить или убрать позже.
                </p>
                
                <div class="categories-section">
                    <div class="section-header">
                        <span>💸 Расходы</span>
                        <button class="select-all-btn" onclick="OnboardingModule.toggleAllCategories('expense')">
                            Выбрать все
                        </button>
                    </div>
                    <div class="categories-grid">
                        ${expenseCategories.map(c => `
                            <div class="category-chip ${state.data.categories.includes(c.code) ? 'selected' : ''}"
                                 data-code="${c.code}"
                                 onclick="OnboardingModule.toggleCategory('${c.code}')">
                                <span class="cat-icon">${c.icon}</span>
                                <span class="cat-name">${c.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="categories-section">
                    <div class="section-header">
                        <span>💰 Доходы</span>
                        <button class="select-all-btn" onclick="OnboardingModule.toggleAllCategories('income')">
                            Выбрать все
                        </button>
                    </div>
                    <div class="categories-grid">
                        ${incomeCategories.map(c => `
                            <div class="category-chip ${state.data.categories.includes(c.code) ? 'selected' : ''}"
                                 data-code="${c.code}"
                                 onclick="OnboardingModule.toggleCategory('${c.code}')">
                                <span class="cat-icon">${c.icon}</span>
                                <span class="cat-name">${c.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        footer.innerHTML = `
            <button class="onboarding-btn secondary" onclick="OnboardingModule.prevStep()">
                ← Назад
            </button>
            <button class="onboarding-btn primary" onclick="OnboardingModule.nextStep()"
                    ${state.data.categories.length === 0 ? 'disabled' : ''}>
                Продолжить →
            </button>
        `;
        
        updateProgress(4);
    }

    function renderStep5Notifications() {
        const content = document.getElementById('onboarding-content');
        const footer = document.getElementById('onboarding-footer');
        
        content.innerHTML = `
            <div class="onboarding-step">
                <div class="step-header">
                    <span class="step-number">Шаг 5 из 5</span>
                    <h2>🔔 Уведомления</h2>
                </div>
                <p class="step-description">
                    Настрой напоминания для учёта.<br>
                    Поможет не забывать записывать траты.
                </p>
                
                <div class="notifications-list">
                    <div class="notification-item">
                        <div class="notification-info">
                            <span class="notification-icon">⏰</span>
                            <div class="notification-text">
                                <span class="notification-title">Ежедневное напоминание</span>
                                <span class="notification-desc">Напомню записать траты в 21:00</span>
                            </div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" 
                                   ${state.data.notifications.daily_reminder ? 'checked' : ''}
                                   onchange="OnboardingModule.toggleNotification('daily_reminder', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div class="notification-item">
                        <div class="notification-info">
                            <span class="notification-icon">📊</span>
                            <div class="notification-text">
                                <span class="notification-title">Еженедельный отчёт</span>
                                <span class="notification-desc">Сводка расходов за неделю</span>
                            </div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" 
                                   ${state.data.notifications.weekly_report ? 'checked' : ''}
                                   onchange="OnboardingModule.toggleNotification('weekly_report', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div class="notification-item">
                        <div class="notification-info">
                            <span class="notification-icon">⚠️</span>
                            <div class="notification-text">
                                <span class="notification-title">Превышение бюджета</span>
                                <span class="notification-desc">Предупрежу при 80% и 100%</span>
                            </div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" 
                                   ${state.data.notifications.budget_alerts ? 'checked' : ''}
                                   onchange="OnboardingModule.toggleNotification('budget_alerts', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        footer.innerHTML = `
            <button class="onboarding-btn secondary" onclick="OnboardingModule.prevStep()">
                ← Назад
            </button>
            <button class="onboarding-btn primary success" onclick="OnboardingModule.finish()">
                Завершить ✓
            </button>
        `;
        
        updateProgress(5);
    }

    function renderComplete() {
        const content = document.getElementById('onboarding-content');
        const footer = document.getElementById('onboarding-footer');
        
        content.innerHTML = `
            <div class="onboarding-step complete-step">
                <div class="success-animation">
                    <div class="success-circle">
                        <span class="success-icon">✓</span>
                    </div>
                </div>
                <h1>Всё готово! 🎉</h1>
                <p class="step-description">
                    Настройка завершена.<br>
                    Можешь начинать записывать финансы!
                </p>
                <div class="complete-summary">
                    <div class="summary-item">
                        <span class="summary-icon">💰</span>
                        <span>Валюта: ${state.data.currency}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-icon">${state.data.usage_type === 'personal' ? '👤' : '💼'}</span>
                        <span>${state.data.usage_type === 'personal' ? 'Личные финансы' : 'Бизнес'}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-icon">📊</span>
                        <span>Бюджет: ${formatMoney(state.data.monthly_budget, state.data.currency)}/мес</span>
                    </div>
                </div>
            </div>
        `;
        
        footer.innerHTML = `
            <button class="onboarding-btn primary large" onclick="OnboardingModule.close()">
                Начать использование →
            </button>
        `;
    }

    // ===== Helpers =====
    function getCurrencySymbol(code) {
        const symbols = { 'KGS': 'сом', 'USD': '$', 'EUR': '€', 'RUB': '₽' };
        return symbols[code] || code;
    }

    function formatMoney(amount, currency) {
        if (!amount) return '0';
        const formatted = new Intl.NumberFormat('ru-RU').format(amount);
        const symbol = getCurrencySymbol(currency);
        return `${formatted} ${symbol}`;
    }

    // ===== Event Handlers =====
    function selectCurrency(code) {
        state.data.currency = code;
        document.querySelectorAll('.currency-options .option-card').forEach(el => {
            el.classList.toggle('selected', el.dataset.value === code);
        });
        debug.log('Currency selected:', code);
    }

    function selectUsageType(type) {
        state.data.usage_type = type;
        document.querySelectorAll('.usage-options .option-card').forEach(el => {
            el.classList.toggle('selected', el.dataset.value === type);
        });
        // Enable continue button
        const continueBtn = document.querySelector('#onboarding-footer .primary');
        if (continueBtn) continueBtn.disabled = false;
        debug.log('Usage type selected:', type);
    }

    function selectBudgetPreset(value) {
        state.data.monthly_budget = value;
        const input = document.getElementById('budget-input');
        if (input) input.value = value;
        document.querySelectorAll('.preset-btn').forEach(el => {
            el.classList.toggle('selected', parseInt(el.textContent.replace(/\s/g, '')) === value);
        });
        const continueBtn = document.querySelector('#onboarding-footer .primary');
        if (continueBtn) continueBtn.disabled = false;
        debug.log('Budget preset selected:', value);
    }

    function updateBudget(value) {
        const numValue = parseInt(value) || 0;
        state.data.monthly_budget = numValue > 0 ? numValue : null;
        document.querySelectorAll('.preset-btn').forEach(el => el.classList.remove('selected'));
        const continueBtn = document.querySelector('#onboarding-footer .primary');
        if (continueBtn) continueBtn.disabled = !state.data.monthly_budget;
        debug.log('Budget updated:', numValue);
    }

    function toggleCategory(code) {
        const index = state.data.categories.indexOf(code);
        if (index > -1) {
            state.data.categories.splice(index, 1);
        } else {
            state.data.categories.push(code);
        }
        
        const chip = document.querySelector(`.category-chip[data-code="${code}"]`);
        if (chip) chip.classList.toggle('selected');
        
        const continueBtn = document.querySelector('#onboarding-footer .primary');
        if (continueBtn) continueBtn.disabled = state.data.categories.length === 0;
        debug.log('Categories:', state.data.categories);
    }

    function toggleAllCategories(type) {
        const categories = state.categoryTemplates.filter(c => c.type === type);
        const codes = categories.map(c => c.code);
        const allSelected = codes.every(code => state.data.categories.includes(code));
        
        if (allSelected) {
            // Deselect all of this type
            codes.forEach(code => {
                const idx = state.data.categories.indexOf(code);
                if (idx > -1) state.data.categories.splice(idx, 1);
            });
        } else {
            // Select all of this type
            codes.forEach(code => {
                if (!state.data.categories.includes(code)) {
                    state.data.categories.push(code);
                }
            });
        }
        
        // Update UI
        document.querySelectorAll('.category-chip').forEach(el => {
            el.classList.toggle('selected', state.data.categories.includes(el.dataset.code));
        });
        
        const continueBtn = document.querySelector('#onboarding-footer .primary');
        if (continueBtn) continueBtn.disabled = state.data.categories.length === 0;
    }

    function toggleNotification(key, value) {
        state.data.notifications[key] = value;
        
        if (key === 'daily_reminder') {
            const timeWrapper = document.getElementById('reminder-time-wrapper');
            if (timeWrapper) {
                timeWrapper.classList.toggle('hidden', !value);
            }
        }
        debug.log('Notification toggled:', key, value);
    }

    function setReminderTime(value) {
        state.data.notifications.reminder_time = value;
        debug.log('Reminder time set:', value);
    }

    // ===== Navigation =====
    async function nextStep() {
        const overlay = document.getElementById('onboarding-overlay');
        const content = document.getElementById('onboarding-content');
        
        // Add transition
        content.classList.add('slide-out-left');
        
        try {
            // Save current step to backend
            if (state.currentStep === 1) {
                await saveStep(1, { currency: state.data.currency });
            } else if (state.currentStep === 2) {
                await saveStep(2, { usage_type: state.data.usage_type });
                // Load category templates for selected type
                await loadCategoryTemplates(state.data.usage_type);
            } else if (state.currentStep === 3) {
                await saveStep(3, { monthly_budget: state.data.monthly_budget });
            } else if (state.currentStep === 4) {
                await saveStep(4, { selected_categories: state.data.categories });
            }
        } catch (e) {
            content.classList.remove('slide-out-left');
            showToast('Ошибка сохранения. Попробуйте снова.');
            return;
        }
        
        setTimeout(() => {
            state.currentStep++;
            renderCurrentStep();
            content.classList.remove('slide-out-left');
            content.classList.add('slide-in-right');
            setTimeout(() => content.classList.remove('slide-in-right'), 300);
        }, 150);
    }

    function prevStep() {
        const content = document.getElementById('onboarding-content');
        content.classList.add('slide-out-right');
        
        setTimeout(() => {
            state.currentStep--;
            renderCurrentStep();
            content.classList.remove('slide-out-right');
            content.classList.add('slide-in-left');
            setTimeout(() => content.classList.remove('slide-in-left'), 300);
        }, 150);
    }

    async function finish() {
        const content = document.getElementById('onboarding-content');
        const footer = document.getElementById('onboarding-footer');
        
        // Show loading
        footer.innerHTML = `
            <button class="onboarding-btn primary large" disabled>
                <span class="loading-spinner"></span> Сохранение...
            </button>
        `;
        
        try {
            // Save step 5 (notifications) - format for backend
            const notificationData = {
                notifications: {
                    daily_summary: state.data.notifications.daily_reminder,
                    daily_summary_time: state.data.notifications.reminder_time,
                    weekly_report: state.data.notifications.weekly_report,
                    monthly_report: true,
                    budget_warning: state.data.notifications.budget_alerts,
                    budget_warning_threshold: 80,
                    large_expense: true,
                    large_expense_threshold: 10,
                    debt_reminder: true,
                    debt_reminder_days: 3,
                    recurring_reminder: true,
                    recurring_reminder_days: 3
                }
            };
            await saveStep(5, notificationData);
            
            // Complete onboarding
            await completeOnboarding();
            
            // Update local storage
            localStorage.setItem('currency', state.data.currency);
            localStorage.setItem('onboarding_completed', 'true');
            
            // Show complete screen
            state.currentStep = 6;
            renderComplete();
        } catch (e) {
            debug.error('Failed to finish onboarding:', e);
            showToast('Ошибка сохранения. Попробуйте снова.');
            footer.innerHTML = `
                <button class="onboarding-btn secondary" onclick="OnboardingModule.prevStep()">
                    ← Назад
                </button>
                <button class="onboarding-btn primary success" onclick="OnboardingModule.finish()">
                    Завершить ✓
                </button>
            `;
        }
    }

    function close() {
        const overlay = document.getElementById('onboarding-overlay');
        overlay.classList.remove('visible');
        
        setTimeout(() => {
            overlay.remove();
            // Trigger app reload to apply new settings
            if (typeof loadDashboard === 'function') {
                loadDashboard();
            }
            // Reload page to reinitialize with new settings
            window.location.reload();
        }, 300);
    }

    function renderCurrentStep() {
        switch (state.currentStep) {
            case 0: renderWelcome(); break;
            case 1: renderStep1Currency(); break;
            case 2: renderStep2UsageType(); break;
            case 3: renderStep3Budget(); break;
            case 4: renderStep4Categories(); break;
            case 5: renderStep5Notifications(); break;
            case 6: renderComplete(); break;
        }
    }

    function showToast(message) {
        // Use existing toast or create new
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    // ===== Public API =====
    async function init() {
        debug.log('Checking onboarding status...');
        
        const status = await checkOnboardingStatus();
        
        if (status.completed) {
            debug.log('Onboarding already completed');
            return false; // No need to show onboarding
        }
        
        debug.log('Starting onboarding, current step:', status.current_step);
        
        // Restore state from server (data is nested in status.data)
        state.currentStep = status.current_step || 0;
        if (status.data) {
            if (status.data.usage_type) state.data.usage_type = status.data.usage_type;
            if (status.data.currency) state.data.currency = status.data.currency;
            if (status.data.monthly_budget) state.data.monthly_budget = status.data.monthly_budget;
        }
        
        debug.log('Restored state:', state.data);
        
        // If step 2+ completed, load categories
        if (state.currentStep >= 2 && state.data.usage_type) {
            debug.log('Loading categories for:', state.data.usage_type);
            await loadCategoryTemplates(state.data.usage_type);
        }
        
        // Show onboarding
        createOnboardingOverlay();
        renderCurrentStep();
        
        return true; // Onboarding shown
    }

    async function checkAndStart() {
        return await init();
    }

    // Export public methods
    return {
        init,
        checkAndStart,
        nextStep,
        prevStep,
        finish,
        close,
        selectCurrency,
        selectUsageType,
        selectBudgetPreset,
        updateBudget,
        toggleCategory,
        toggleAllCategories,
        toggleNotification,
        setReminderTime
    };
})();

// Make available globally
window.OnboardingModule = OnboardingModule;
