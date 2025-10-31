// AI Accounter Mini App v2.3.0 - Notifications & Recurring Payments
// Работает через Telegram Bot (без прямого доступа к БД)

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Функция для получения User ID
function getUserId() {
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) {
        throw new Error('Не удалось получить Telegram ID. Откройте приложение через Telegram.');
    }
    return userId;
}

// Валюты
const currencies = {
    'KGS': { symbol: 'с', name: 'Сом' },
    'USD': { symbol: '$', name: 'Доллар' },
    'EUR': { symbol: '€', name: 'Евро' },
    'RUB': { symbol: '₽', name: 'Рубль' }
};

// Категории для доходов и расходов (адаптировано для Кыргызстана)
const categories = {
    income: [
        'Зарплата', 'Продажи товаров', 'Продажи услуг', 'Подработка',
        'Дивиденды от инвестиций', 'Возврат налогов', 'Кэшбек',
        'Партнерские программы', 'Консалтинг', 'Обучение клиентов',
        'Фриланс', 'Аренда имущества'
    ],
    expense: [
        'Продукты питания', 'Транспорт', 'Аренда офиса', 'Зарплата сотрудников',
        'Реклама и маркетинг', 'Налоги и сборы', 'Канцелярия и офис',
        'Связь и интернет', 'Обучение персонала', 'Страхование',
        'Банковские услуги', 'Консалтинг и аудит', 'Ремонт и обслуживание',
        'Коммунальные услуги', 'IT-услуги и софт', 'Командировочные',
        'Кафе и рестораны', 'Медицина', 'Одежда', 'Развлечения',
        'Хозяйственные товары', 'Образование', 'Благотворительность'
    ]
};

let selectedCategory = '';
let selectedCurrency = 'KGS';
let isRecording = false;
let currentEditTransaction = null;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadCategories();
    setCurrentDateTime();
    loadStats();
});

function setupEventListeners() {
    document.getElementById('transaction-form').addEventListener('submit', handleSubmit);
    document.getElementById('operation-type').addEventListener('change', loadCategories);
    document.getElementById('currency').addEventListener('change', function() {
        selectedCurrency = this.value;
        updateCurrencyDisplay();
    });
    document.getElementById('history-filter').addEventListener('change', loadHistory);
    document.getElementById('history-period').addEventListener('change', loadHistory);
}

// === УПРАВЛЕНИЕ ВКЛАДКАМИ ===
function switchTab(tabName) {
    // Скрыть все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Показать выбранную вкладку
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');

    // Загрузить данные для вкладки
    if (tabName === 'stats') {
        loadStats();
    } else if (tabName === 'history') {
        loadHistory();
    } else if (tabName === 'subscriptions') {
        loadSubscriptions();
    } else if (tabName === 'notifications') {
        loadNotifications();
    } else if (tabName === 'budget') {
        loadBudgetForecast();
    }
}

// === УПРАВЛЕНИЕ КАТЕГОРИЯМИ ===
function loadCategories() {
    const operationType = document.getElementById('operation-type').value;
    const categoryGrid = document.getElementById('category-grid');
    const categoryList = categories[operationType];

    categoryGrid.innerHTML = '';
    categoryList.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.textContent = category;
        categoryItem.onclick = () => selectCategory(categoryItem, category);
        categoryGrid.appendChild(categoryItem);
    });
}

function selectCategory(element, category) {
    // Убрать выделение с других категорий
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Выделить выбранную категорию
    element.classList.add('selected');
    selectedCategory = category;
}

function updateCurrencyDisplay() {
    const currency = currencies[selectedCurrency];
    // Можно добавить обновление отображения в UI
}

function quickAdd(type) {
    document.getElementById('operation-type').value = type;
    loadCategories();
    switchTab('add');
}

// === РАБОТА С ФОРМОЙ ===
function setCurrentDateTime() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].substring(0, 5);
    
    document.getElementById('date').value = date;
    document.getElementById('time').value = time;
}

function handleSubmit(event) {
    event.preventDefault();

    if (!selectedCategory) {
        alert('Пожалуйста, выберите категорию');
        return;
    }

    const amount = parseFloat(document.getElementById('amount').value);
    const currency = document.getElementById('currency').value;
    const operationType = document.getElementById('operation-type').value;
    
    const formData = {
        type: operationType,
        amount: amount,
        currency: currency,
        category: selectedCategory,
        description: document.getElementById('description').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value
    };

    sendToBot('add_transaction', formData);
}

function resetForm() {
    document.getElementById('transaction-form').reset();
    selectedCategory = '';
    selectedCurrency = 'KGS';
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('selected');
    });
    setCurrentDateTime();
}

// === ГОЛОСОВОЙ ВВОД ===
function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Голосовой ввод не поддерживается в вашем браузере');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = function() {
        isRecording = true;
        document.querySelector('.voice-btn').textContent = '🔴';
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('description').value = transcript;
        isRecording = false;
        document.querySelector('.voice-btn').textContent = '🎤';
    };

    recognition.onerror = function(event) {
        console.error('Ошибка распознавания речи:', event.error);
        isRecording = false;
        document.querySelector('.voice-btn').textContent = '🎤';
    };

    recognition.start();
}

// === ОТПРАВКА ДАННЫХ НА WEBHOOK ===
async function sendToBot(action, data) {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    
    try {
        const userId = getUserId();
        
        const payload = {
            action: action,
            data: data,
            userId: userId
        };
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Успех
            if (action === 'add_transaction') {
                const currencySymbol = currencies[data.currency].symbol;
                showNotification(`Транзакция ${data.amount} ${currencySymbol} добавлена!`, 'success');
                resetForm();
                loadStats(); // Обновить статистику
                loadHistory(); // Обновить историю
            } else if (action === 'edit_transaction') {
                showNotification('Транзакция изменена!', 'success');
                loadHistory();
            } else if (action === 'delete_transaction') {
                showNotification('Транзакция удалена!', 'success');
                loadHistory();
            } else if (action === 'restore_transaction') {
                showNotification('Транзакция восстановлена!', 'success');
                loadHistory();
            }
        } else {
            showNotification('Ошибка: ' + (result.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Ошибка отправки:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

// === СТАТИСТИКА ===
async function loadStats() {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'get_stats',
                userId: userId
            })
        });
        
        console.log('Response status:', response.status);
        const text = await response.text();
        console.log('Response text:', text);
        
        if (!text) {
            showNotification('API не настроен. Импортируйте MiniApp_API.json в n8n!', 'error');
            return;
        }
        
        const result = JSON.parse(text);
        
        if (result.success) {
            updateStats(result.data);
        } else {
            showNotification('Ошибка: ' + (result.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

function refreshStats() {
    loadStats();
}

function updateStats(stats) {
    const currency = stats.currency || 'KGS';
    const currencySymbol = currencies[currency].symbol;
    
    document.getElementById('monthly-income').textContent = 
        (stats.income || 0).toLocaleString('ru-RU') + ' ' + currencySymbol;
    document.getElementById('monthly-expenses').textContent = 
        (stats.expenses || 0).toLocaleString('ru-RU') + ' ' + currencySymbol;
    document.getElementById('profit').textContent = 
        (stats.profit || 0).toLocaleString('ru-RU') + ' ' + currencySymbol;
    document.getElementById('transactions-count').textContent = stats.count || 0;
    
    const profitElement = document.getElementById('profit');
    profitElement.className = 'stat-value ' + ((stats.profit || 0) >= 0 ? 'positive' : 'negative');
}

// === ИСТОРИЯ ТРАНЗАКЦИЙ ===
async function loadHistory() {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    const filter = document.getElementById('history-filter').value;
    const period = document.getElementById('history-period').value;
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'get_history',
                userId: userId,
                data: {
                    filter: filter,
                    period: period
                }
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateHistory(result.data);
        } else {
            showNotification('Ошибка загрузки истории', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

function updateHistory(history) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    if (!history || history.length === 0) {
        historyList.innerHTML = '<div class="loading">История пуста</div>';
        return;
    }
    
    history.forEach(item => {
        const historyItem = createHistoryItem(item);
        historyList.appendChild(historyItem);
    });
}

function createHistoryItem(item) {
    const currency = item.currency || 'KGS';
    const currencySymbol = currencies[currency].symbol;
    const historyItem = document.createElement('div');
    const isDeleted = item.deleted_at !== null;
    const amount = parseFloat(item.amount) || 0;
    
    historyItem.className = `history-item ${item.type}${isDeleted ? ' deleted' : ''}`;
    
    historyItem.innerHTML = `
        <div class="history-header">
            <span class="history-amount">${amount.toLocaleString('ru-RU')} ${currencySymbol}</span>
            <span class="history-category">${item.category || 'Без категории'}</span>
        </div>
        ${item.description ? `<div class="history-description">${item.description}</div>` : ''}
        <div class="history-date">
            ${new Date(item.date).toLocaleDateString('ru-RU')}
            ${isDeleted ? ' • <strong>Удалено</strong>' : ''}
        </div>
        <div class="history-actions">
            ${!isDeleted ? `
                <button class="action-btn action-btn-edit" onclick="editTransaction(${item.id}, '${item.type}')">
                    ✏️ Изменить
                </button>
                <button class="action-btn action-btn-delete" onclick="deleteTransaction(${item.id}, '${item.type}')">
                    🗑️ Удалить
                </button>
            ` : `
                <button class="action-btn action-btn-restore" onclick="restoreTransaction(${item.id}, '${item.type}')">
                    🔄 Восстановить
                </button>
            `}
            <button class="action-btn action-btn-history" onclick="showTransactionHistory(${item.id}, '${item.type}')">
                📜 История
            </button>
        </div>
    `;
    
    return historyItem;
}

// === v2.2.0 ФУНКЦИИ: РЕДАКТИРОВАНИЕ/УДАЛЕНИЕ/ВОССТАНОВЛЕНИЕ ===

function editTransaction(id, type) {
    const field = prompt('Что изменить?\nВведите: amount, category, description, date или currency');
    if (!field) return;
    
    const validFields = ['amount', 'category', 'description', 'date', 'currency'];
    if (!validFields.includes(field.toLowerCase())) {
        alert('Неверное поле! Используйте: amount, category, description, date, currency');
        return;
    }
    
    const newValue = prompt(`Введите новое значение для ${field}:`);
    if (!newValue) return;
    
    sendToBot('edit_transaction', {
        transaction_id: id,
        transaction_type: type === 'income' ? 'income' : 'expense',
        field: field.toLowerCase(),
        new_value: newValue
    });
    
    showNotification('Изменение отправлено...', 'info');
}

function deleteTransaction(id, type) {
    if (!confirm('Удалить эту транзакцию? Её можно будет восстановить.')) return;
    
    sendToBot('delete_transaction', {
        transaction_id: id,
        transaction_type: type === 'income' ? 'income' : 'expense'
    });
    
    showNotification('Удаление отправлено...', 'info');
}

function restoreTransaction(id, type) {
    if (!confirm('Восстановить эту транзакцию?')) return;
    
    sendToBot('restore_transaction', {
        transaction_id: id,
        transaction_type: type === 'income' ? 'income' : 'expense'
    });
    
    showNotification('Восстановление отправлено...', 'info');
}

function showTransactionHistory(id, type) {
    sendToBot('get_transaction_history', {
        transaction_id: id,
        transaction_type: type === 'income' ? 'income' : 'expense'
    });
    
    showNotification('Загрузка истории...', 'info');
}

// === ОТЧЁТЫ ===
function generateReport(type) {
    const period = document.getElementById('report-period').value;
    
    sendToBot('generate_report', {
        type: type,
        period: period
    });
    
    showNotification(`Генерация ${type.toUpperCase()} отчёта...`, 'info');
}

// === УВЕДОМЛЕНИЯ ===
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = type;
    notification.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(notification, container.firstChild);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// === ОБРАБОТКА СООБЩЕНИЙ ОТ БОТА ===
tg.onEvent('mainButtonClicked', function() {
    // Обработка нажатия главной кнопки
});

window.addEventListener('message', function(event) {
    try {
        const data = JSON.parse(event.data);
        
        switch(data.action) {
            case 'stats_updated':
                updateStats(data.stats);
                break;
            case 'history_loaded':
                updateHistory(data.history);
                break;
            case 'report_generated':
                showNotification('Отчёт успешно создан!', 'success');
                break;
            case 'transaction_updated':
                showNotification('Транзакция успешно изменена!', 'success');
                loadHistory();
                break;
            case 'transaction_deleted':
                showNotification('Транзакция удалена!', 'success');
                loadHistory();
                break;
            case 'transaction_restored':
                showNotification('Транзакция восстановлена!', 'success');
                loadHistory();
                break;
            case 'transaction_history':
                displayTransactionHistory(data.history);
                break;
            case 'error':
                showNotification('Ошибка: ' + data.message, 'error');
                break;
        }
    } catch (e) {
        console.error('Ошибка обработки сообщения:', e);
    }
});

function displayTransactionHistory(history) {
    if (!history || history.length === 0) {
        showNotification('История изменений пуста', 'info');
        return;
    }
    
    let historyText = 'История изменений:\n\n';
    history.forEach((item, index) => {
        historyText += `${index + 1}. ${item.action} - ${item.field_changed || ''}\n`;
        historyText += `   ${item.old_value || ''} → ${item.new_value || ''}\n`;
        historyText += `   ${new Date(item.changed_at).toLocaleString('ru-RU')}\n\n`;
    });
    
    alert(historyText);
}

// Экспорт функций для HTML
window.switchTab = switchTab;
window.quickAdd = quickAdd;
window.startVoiceInput = startVoiceInput;
window.refreshStats = refreshStats;
window.loadHistory = loadHistory;
window.generateReport = generateReport;
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.restoreTransaction = restoreTransaction;
window.showTransactionHistory = showTransactionHistory;

// === v2.3.0: ПОДПИСКИ ===
window.loadSubscriptions = loadSubscriptions;
window.showAddSubscription = showAddSubscription;
window.hideAddSubscription = hideAddSubscription;
window.cancelSubscription = cancelSubscription;

// === v2.3.0: УВЕДОМЛЕНИЯ ===
window.loadNotifications = loadNotifications;
window.filterNotifications = filterNotifications;
window.markNotificationRead = markNotificationRead;
window.markAllAsRead = markAllAsRead;

// === v2.3.0: БЮДЖЕТ И ПРОГНОЗ ===
window.loadBudgetForecast = loadBudgetForecast;
window.refreshBudget = refreshBudget;
window.saveAlertSettings = saveAlertSettings;

// ============================================= 
// v2.3.0: ПОДПИСКИ И RECURRING PAYMENTS
// ============================================= 

let currentFilter = 'all';

async function loadSubscriptions() {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'get_subscriptions',
                userId: userId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateSubscriptionsList(result.data);
        } else {
            showNotification('Ошибка загрузки подписок', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

function updateSubscriptionsList(subscriptions) {
    const subscriptionsList = document.getElementById('subscriptions-list');
    
    if (!subscriptions || subscriptions.length === 0) {
        subscriptionsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>У вас пока нет подписок</p>
                <button class="btn" onclick="showAddSubscription()">➕ Добавить подписку</button>
            </div>
        `;
        document.getElementById('subscriptions-total-amount').textContent = '0 с';
        return;
    }
    
    subscriptionsList.innerHTML = '';
    let totalMonthly = 0;
    let mainCurrency = 'KGS';
    
    subscriptions.forEach(sub => {
        const currency = sub.currency || 'KGS';
        const currencySymbol = currencies[currency].symbol;
        const isActive = !sub.is_active || sub.is_active === true;
        const amount = parseFloat(sub.amount) || 0;
        
        if (sub.frequency === 'monthly') {
            totalMonthly += amount;
            mainCurrency = currency;
        }
        
        const subCard = document.createElement('div');
        subCard.className = `subscription-card ${!isActive ? 'inactive' : ''}`;
        
        const frequencyNames = {
            'daily': 'ежедневно',
            'weekly': 'еженедельно',
            'monthly': 'ежемесячно',
            'yearly': 'ежегодно'
        };
        
        const nextPayment = sub.next_payment_date 
            ? new Date(sub.next_payment_date).toLocaleDateString('ru-RU')
            : 'Не определено';
        
        subCard.innerHTML = `
            <div class="subscription-header">
                <span class="subscription-title">${sub.title}</span>
                <span class="subscription-amount">${amount.toLocaleString('ru-RU')} ${currencySymbol}</span>
            </div>
            <div class="subscription-details">
                <span>📅 ${frequencyNames[sub.frequency] || sub.frequency}</span>
                <span>📆 ${nextPayment}</span>
                <span>📋 ${sub.category || 'Прочее'}</span>
            </div>
            ${!isActive ? '<div style="color: #6c757d; font-size: 12px;">❌ Отменена</div>' : ''}
            <div class="subscription-actions">
                ${isActive ? `
                    <button class="btn btn-danger btn-small" onclick="cancelSubscription(${sub.id})">
                        ❌ Отменить
                    </button>
                ` : ''}
            </div>
        `;
        
        subscriptionsList.appendChild(subCard);
    });
    
    const totalCurrencySymbol = currencies[mainCurrency]?.symbol || 'с';
    document.getElementById('subscriptions-total-amount').textContent = 
        totalMonthly.toLocaleString('ru-RU') + ' ' + totalCurrencySymbol;
}

function showAddSubscription() {
    const form = document.getElementById('add-subscription-form');
    form.style.display = 'flex';
    
    // Инициализация формы
    document.getElementById('subscription-form').onsubmit = handleSubscriptionSubmit;
}

function hideAddSubscription() {
    const form = document.getElementById('add-subscription-form');
    form.style.display = 'none';
    document.getElementById('subscription-form').reset();
}

async function handleSubscriptionSubmit(event) {
    event.preventDefault();
    
    const formData = {
        title: document.getElementById('sub-title').value,
        amount: parseFloat(document.getElementById('sub-amount').value),
        currency: document.getElementById('sub-currency').value,
        category: document.getElementById('sub-category').value,
        frequency: document.getElementById('sub-frequency').value,
        remind_days: parseInt(document.getElementById('sub-remind').value) || 3,
        auto_create: document.getElementById('sub-auto-create').checked
    };
    
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'create_subscription',
                userId: userId,
                data: formData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Подписка создана!', 'success');
            hideAddSubscription();
            loadSubscriptions();
        } else {
            showNotification('Ошибка: ' + (result.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

async function cancelSubscription(subscriptionId) {
    if (!confirm('Отменить эту подписку?')) return;
    
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'cancel_subscription',
                userId: userId,
                data: {
                    subscription_id: subscriptionId
                }
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Подписка отменена!', 'success');
            loadSubscriptions();
        } else {
            showNotification('Ошибка: ' + (result.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

// ============================================= 
// v2.3.0: УВЕДОМЛЕНИЯ
// ============================================= 

async function loadNotifications(filter = 'all') {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'get_notifications',
                userId: userId,
                data: {
                    filter: filter
                }
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateNotificationsList(result.data, filter);
        } else {
            showNotification('Ошибка загрузки уведомлений', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

function updateNotificationsList(notifications, filter) {
    const notificationsList = document.getElementById('notifications-list');
    
    // Фильтрация на клиенте
    let filtered = notifications;
    if (filter === 'unread') {
        filtered = notifications.filter(n => !n.is_read);
    } else if (filter === 'urgent') {
        filtered = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high');
    }
    
    if (!filtered || filtered.length === 0) {
        notificationsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔕</div>
                <p>Уведомлений нет</p>
            </div>
        `;
        return;
    }
    
    notificationsList.innerHTML = '';
    
    filtered.forEach(notif => {
        const notifCard = document.createElement('div');
        const priority = notif.priority || 'normal';
        const isRead = notif.is_read;
        
        notifCard.className = `notification-card ${priority} ${isRead ? 'read' : 'unread'}`;
        
        const typeIcons = {
            'budget_warning': '⚠️',
            'budget_exceeded': '🚨',
            'recurring_reminder': '📅',
            'unusual_spending': '📊',
            'category_limit': '🏷️',
            'recurring_created': '✅'
        };
        
        const icon = typeIcons[notif.notification_type] || '🔔';
        
        notifCard.innerHTML = `
            <div class="notification-header">
                <span class="notification-icon">${icon}</span>
                <span class="notification-title">${notif.title || 'Уведомление'}</span>
                <span class="notification-priority ${priority}">${priority}</span>
            </div>
            <div class="notification-body">
                ${notif.message}
            </div>
            <div class="notification-footer">
                <span class="notification-date">
                    ${new Date(notif.created_at).toLocaleString('ru-RU')}
                </span>
                ${!isRead ? `
                    <button class="notification-action" onclick="markNotificationRead(${notif.id})">
                        ✔️ Прочитано
                    </button>
                ` : ''}
            </div>
        `;
        
        notificationsList.appendChild(notifCard);
    });
}

function filterNotifications(filter) {
    currentFilter = filter;
    
    // Обновить активную кнопку фильтра
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadNotifications(filter);
}

async function markNotificationRead(notificationId) {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'mark_notification_read',
                userId: userId,
                data: {
                    notification_id: notificationId
                }
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadNotifications(currentFilter);
        } else {
            showNotification('Ошибка', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

async function markAllAsRead() {
    if (!confirm('Отметить все уведомления как прочитанные?')) return;
    
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'mark_all_read',
                userId: userId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Все уведомления прочитаны', 'success');
            loadNotifications(currentFilter);
        } else {
            showNotification('Ошибка', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

// ============================================= 
// v2.3.0: БЮДЖЕТ И ПРОГНОЗ
// ============================================= 

async function loadBudgetForecast() {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'get_budget_forecast',
                userId: userId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateBudgetDisplay(result.data);
        } else {
            showNotification('Ошибка загрузки бюджета', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

function updateBudgetDisplay(budget) {
    if (!budget) {
        showNotification('Нет данных о бюджете', 'info');
        return;
    }
    
    const currency = budget.currency || 'KGS';
    const currencySymbol = currencies[currency].symbol;
    
    // Статус бюджета
    const statusElement = document.getElementById('budget-status');
    const percentage = budget.percentage || 0;
    
    if (percentage < 80) {
        statusElement.textContent = '✅ В рамках';
        statusElement.className = 'budget-status ok';
    } else if (percentage < 100) {
        statusElement.textContent = '⚠️ Предупреждение';
        statusElement.className = 'budget-status warning';
    } else {
        statusElement.textContent = '🚨 Превышение';
        statusElement.className = 'budget-status critical';
    }
    
    // Прогресс бар
    const progressFill = document.getElementById('budget-progress');
    progressFill.style.width = Math.min(percentage, 100) + '%';
    
    if (percentage < 80) {
        progressFill.className = 'progress-fill';
    } else if (percentage < 100) {
        progressFill.className = 'progress-fill warning';
    } else {
        progressFill.className = 'progress-fill critical';
    }
    
    // Суммы
    document.getElementById('budget-spent').textContent = 
        (budget.spent || 0).toLocaleString('ru-RU') + ' ' + currencySymbol;
    document.getElementById('budget-total').textContent = 
        '/ ' + (budget.total || 0).toLocaleString('ru-RU') + ' ' + currencySymbol;
    document.getElementById('budget-percentage').textContent = percentage.toFixed(1) + '%';
    
    // Статистика
    document.getElementById('budget-days-left').textContent = budget.days_left || 0;
    document.getElementById('budget-remaining').textContent = 
        (budget.remaining || 0).toLocaleString('ru-RU') + ' ' + currencySymbol;
    document.getElementById('budget-forecast').textContent = 
        (budget.forecast || 0).toLocaleString('ru-RU') + ' ' + currencySymbol;
    
    // Рекомендации
    const dailyAvg = budget.daily_average || 0;
    const dailyLimit = budget.recommended_daily || 0;
    
    document.getElementById('daily-avg').textContent = 
        dailyAvg.toLocaleString('ru-RU') + ' ' + currencySymbol;
    document.getElementById('daily-limit').textContent = 
        dailyLimit.toLocaleString('ru-RU') + ' ' + currencySymbol;
    
    const adviceElement = document.getElementById('budget-advice');
    adviceElement.textContent = budget.recommendation || 'Продолжайте контролировать расходы';
    
    // Настройки алертов (если есть)
    if (budget.alert_settings) {
        document.getElementById('alert-warning').value = budget.alert_settings.warning_threshold || 80;
        document.getElementById('alert-critical').value = budget.alert_settings.critical_threshold || 100;
    }
}

function refreshBudget() {
    loadBudgetForecast();
}

async function saveAlertSettings() {
    const warningThreshold = parseInt(document.getElementById('alert-warning').value);
    const criticalThreshold = parseInt(document.getElementById('alert-critical').value);
    
    if (warningThreshold >= criticalThreshold) {
        showNotification('Предупреждение должно быть меньше критического порога', 'error');
        return;
    }
    
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/miniapp';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'save_alert_settings',
                userId: userId,
                data: {
                    warning_threshold: warningThreshold,
                    critical_threshold: criticalThreshold
                }
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Настройки сохранены!', 'success');
        } else {
            showNotification('Ошибка: ' + (result.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

