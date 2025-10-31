// AI Accounter Mini App v2.4.0 - Workspaces & Analytics
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

// ============================================
// v2.4.0 - Analytics with Chart.js
// ============================================

let incomeExpenseChart = null;
let categoryPieChart = null;
let balanceTrendChart = null;

async function loadAnalytics() {
    const period = document.getElementById('analytics-period').value;
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/analytics-api';
    
    try {
        const userId = getUserId();
        
        // Получаем статистику
        const statsResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_stats',
                userId: userId,
                period: period
            })
        });
        
        const stats = await statsResponse.json();
        
        if (stats.success) {
            updateMetrics(stats.data);
        }
        
        // Получаем данные для графиков
        const chartsResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_chart_data',
                userId: userId,
                period: period
            })
        });
        
        const charts = await chartsResponse.json();
        
        if (charts.success) {
            renderIncomeExpenseChart(charts.data.incomeExpense);
            renderCategoryPieChart(charts.data.categories);
            renderBalanceTrendChart(charts.data.balance);
            renderTopCategories(charts.data.topCategories);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки аналитики:', error);
        showNotification('Ошибка загрузки аналитики', 'error');
    }
}

function updateMetrics(data) {
    document.getElementById('total-income').textContent = formatAmount(data.income || 0);
    document.getElementById('total-expenses').textContent = formatAmount(data.expenses || 0);
    document.getElementById('net-balance').textContent = formatAmount(data.balance || 0);
    
    const savingsRate = data.income > 0 ? ((data.balance / data.income) * 100).toFixed(1) : 0;
    document.getElementById('savings-rate').textContent = savingsRate + '%';
}

function renderIncomeExpenseChart(data) {
    const ctx = document.getElementById('incomeExpenseChart');
    
    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }
    
    incomeExpenseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [
                {
                    label: 'Доходы',
                    data: data.income || [],
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Расходы',
                    data: data.expenses || [],
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderCategoryPieChart(data) {
    const ctx = document.getElementById('categoryPieChart');
    
    if (categoryPieChart) {
        categoryPieChart.destroy();
    }
    
    categoryPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels || [],
            datasets: [{
                data: data.values || [],
                backgroundColor: [
                    'rgb(239, 68, 68)',
                    'rgb(34, 197, 94)',
                    'rgb(59, 130, 246)',
                    'rgb(234, 179, 8)',
                    'rgb(168, 85, 247)',
                    'rgb(236, 72, 153)',
                    'rgb(20, 184, 166)',
                    'rgb(249, 115, 22)',
                    'rgb(156, 163, 175)',
                    'rgb(14, 165, 233)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderBalanceTrendChart(data) {
    const ctx = document.getElementById('balanceTrendChart');
    
    if (balanceTrendChart) {
        balanceTrendChart.destroy();
    }
    
    balanceTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'Баланс',
                data: data.values || [],
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

function renderTopCategories(categories) {
    const container = document.getElementById('top-categories-list');
    
    if (!categories || categories.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Нет данных</p>';
        return;
    }
    
    container.innerHTML = categories.map((cat, index) => `
        <div class="category-item">
            <span class="category-name">${index + 1}. ${cat.name}</span>
            <span>
                <span class="category-amount">${formatAmount(cat.amount)}</span>
                <span class="category-percent">(${cat.percent}%)</span>
            </span>
        </div>
    `).join('');
}

// ============================================
// v2.4.0 - Workspace Management
// ============================================

let currentWorkspaceId = null;

async function loadWorkspaces() {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/workspace-api';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_workspaces',
                user_id: userId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const select = document.getElementById('workspace-select');
            select.innerHTML = result.data.map(ws => 
                `<option value="${ws.workspace_id}" ${ws.is_owner ? '👑' : ''}>${ws.workspace_name}</option>`
            ).join('');
            
            if (result.data.length > 0) {
                currentWorkspaceId = result.data[0].workspace_id;
                loadMembers();
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки workspace:', error);
    }
}

async function switchWorkspace() {
    const select = document.getElementById('workspace-select');
    currentWorkspaceId = parseInt(select.value);
    
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/workspace-api';
    
    try {
        const userId = getUserId();
        
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'switch_workspace',
                user_id: userId,
                workspace_id: currentWorkspaceId
            })
        });
        
        loadMembers();
        showNotification('✅ Workspace переключён!', 'success');
    } catch (error) {
        console.error('Ошибка переключения workspace:', error);
    }
}

function showCreateWorkspaceModal() {
    const name = prompt('Название workspace:');
    if (!name) return;
    
    const description = prompt('Описание (необязательно):');
    
    createWorkspace(name, description);
}

async function createWorkspace(name, description) {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/workspace-api';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_workspace',
                user_id: userId,
                name: name,
                description: description || '',
                currency: 'KGS'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Workspace создан!', 'success');
            loadWorkspaces();
        } else {
            showNotification('Ошибка: ' + (result.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Ошибка создания workspace:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

async function loadMembers() {
    if (!currentWorkspaceId) return;
    
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/workspace-api';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_members',
                user_id: userId,
                workspace_id: currentWorkspaceId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderMembers(result.data);
        }
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
    }
}

function renderMembers(members) {
    const container = document.getElementById('members-list');
    const countElem = document.getElementById('member-count');
    
    countElem.textContent = members.length;
    
    if (members.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Нет участников</p>';
        return;
    }
    
    container.innerHTML = members.map(member => `
        <div class="member-card">
            <div class="member-info">
                <div class="member-name">👤 User ${member.user_id}</div>
                <div class="member-role">
                    <span class="role-badge role-${member.role}">${getRoleEmoji(member.role)} ${member.role}</span>
                </div>
            </div>
            <div class="member-actions">
                ${member.role !== 'owner' ? '<button class="btn-icon" onclick="removeMember(' + member.user_id + ')">🗑️</button>' : ''}
            </div>
        </div>
    `).join('');
}

function getRoleEmoji(role) {
    const emojis = {
        owner: '👑',
        admin: '🛠️',
        editor: '✏️',
        viewer: '👁️'
    };
    return emojis[role] || '👤';
}

async function createInvite() {
    const role = document.getElementById('invite-role').value;
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/workspace-api';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_invite',
                user_id: userId,
                workspace_id: currentWorkspaceId,
                role: role,
                max_uses: 1
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const inviteCode = result.data.invite_code;
            const inviteLink = `https://t.me/YOUR_BOT?start=invite_${inviteCode}`;
            
            document.getElementById('invite-link-input').value = inviteLink;
            document.getElementById('invite-link-result').classList.remove('hidden');
            
            showNotification('✅ Приглашение создано!', 'success');
        } else {
            showNotification('Ошибка: ' + (result.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Ошибка создания приглашения:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

function copyInviteLink() {
    const input = document.getElementById('invite-link-input');
    input.select();
    document.execCommand('copy');
    showNotification('✅ Ссылка скопирована!', 'success');
}

async function removeMember(memberId) {
    if (!confirm('Удалить участника?')) return;
    
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/workspace-api';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'remove_member',
                user_id: userId,
                workspace_id: currentWorkspaceId,
                member_id: memberId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Участник удалён!', 'success');
            loadMembers();
        } else {
            showNotification('Ошибка: ' + (result.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления участника:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

async function loadAuditLogs() {
    if (!currentWorkspaceId) return;
    
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/workspace-api';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_audit_logs',
                user_id: userId,
                workspace_id: currentWorkspaceId,
                limit: 20
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderAuditLogs(result.data);
        }
    } catch (error) {
        console.error('Ошибка загрузки audit logs:', error);
    }
}

function renderAuditLogs(logs) {
    const container = document.getElementById('audit-log-list');
    
    if (!logs || logs.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Нет действий</p>';
        return;
    }
    
    container.innerHTML = logs.map(log => `
        <div class="audit-item">
            <div class="audit-time">${formatDate(log.created_at)}</div>
            <div class="audit-action">
                <span class="audit-user">User ${log.user_id}</span> 
                ${log.action_type} ${log.entity_type || ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// v2.4.0 - Settings
// ============================================

let userPreferences = {
    theme: 'light',
    language: 'ru',
    timezone: 'Asia/Bishkek',
    defaultCurrency: 'KGS',
    notifications: {
        telegram: true,
        push: true,
        email: false
    }
};

async function loadPreferences() {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/workspace-api';
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_user_preferences',
                user_id: userId
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            userPreferences = result.data;
            applyPreferences();
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
    }
}

function applyPreferences() {
    // Применить тему
    document.getElementById('theme-select').value = userPreferences.theme || 'light';
    changeTheme();
    
    // Применить язык
    document.getElementById('language-select').value = userPreferences.language || 'ru';
    
    // Применить валюту
    document.getElementById('default-currency-select').value = userPreferences.defaultCurrency || 'KGS';
    
    // Применить timezone
    document.getElementById('timezone-select').value = userPreferences.timezone || 'Asia/Bishkek';
    
    // Применить уведомления
    if (userPreferences.notifications) {
        document.getElementById('notify-telegram').checked = userPreferences.notifications.telegram !== false;
        document.getElementById('notify-push').checked = userPreferences.notifications.push !== false;
        document.getElementById('notify-email').checked = userPreferences.notifications.email === true;
    }
}

function changeTheme() {
    const theme = document.getElementById('theme-select').value;
    
    if (theme === 'auto') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        document.body.setAttribute('data-theme', theme);
    }
}

function changeLanguage() {
    const language = document.getElementById('language-select').value;
    showNotification('Смена языка будет доступна в следующем релизе', 'info');
}

function changeDefaultCurrency() {
    const currency = document.getElementById('default-currency-select').value;
    selectedCurrency = currency;
    showNotification('Валюта по умолчанию изменена на ' + currency, 'success');
}

function changeTimezone() {
    const timezone = document.getElementById('timezone-select').value;
    showNotification('Часовой пояс изменён на ' + timezone, 'success');
}

async function savePreferences() {
    const webhookUrl = 'https://hi9neee.app.n8n.cloud/webhook/workspace-api';
    
    const preferences = {
        theme: document.getElementById('theme-select').value,
        language: document.getElementById('language-select').value,
        timezone: document.getElementById('timezone-select').value,
        notification_settings: {
            telegram: document.getElementById('notify-telegram').checked,
            push: document.getElementById('notify-push').checked,
            email: document.getElementById('notify-email').checked
        }
    };
    
    try {
        const userId = getUserId();
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_preferences',
                user_id: userId,
                ...preferences
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            userPreferences = preferences;
            applyPreferences();
            showNotification('✅ Настройки сохранены!', 'success');
        } else {
            showNotification('Ошибка: ' + (result.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

// Инициализация v2.4.0 компонентов
document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    
    // Автоматически переключаем на вкладку Analytics при открытии
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
        switchTab(tab);
    }
});
