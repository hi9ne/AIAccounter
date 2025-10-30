// AI Accounter Mini App v2.2.0 - Main Application
// Работает через Telegram Bot (без прямого доступа к БД)

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Дефолтный User ID (ваш Telegram ID)
const DEFAULT_USER_ID = 1109421300;

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
    
    const userId = tg.initDataUnsafe?.user?.id || DEFAULT_USER_ID;
    
    const payload = {
        action: action,
        data: data,
        userId: userId
    };
    
    try {
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
    const userId = tg.initDataUnsafe?.user?.id || DEFAULT_USER_ID;
    
    try {
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
    const userId = tg.initDataUnsafe?.user?.id || DEFAULT_USER_ID;
    const filter = document.getElementById('history-filter').value;
    const period = document.getElementById('history-period').value;
    
    try {
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
