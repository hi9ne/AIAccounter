# 📱 MiniApp - Инструкция по использованию

## ✅ Что готово

MiniApp теперь работает с FastAPI вместо n8n webhooks!

**Запущено:**
- 🚀 Backend API: http://localhost:8000
- 📱 MiniApp: http://localhost:5173/index.html

---

## 🔧 Конфигурация

**Файл:** `miniapp-config.js`

```javascript
const MINIAPP_CONFIG = {
    // FastAPI Backend
    api: {
        baseUrl: 'http://localhost:8000/api/v1',
        enabled: true
    },
    
    // Режим работы
    mode: 'api', // FastAPI
    
    // Настройки
    defaultCurrency: 'KGS',
    timezone: 'Asia/Bishkek',
    language: 'ru'
};
```

---

## 📡 API Helper

**Файл:** `api-helper.js` - новый модуль для работы с FastAPI

**Использование в app.js:**

```javascript
// Получить категории
const categories = await window.api.getAllCategories();

// Добавить расход
const expense = await window.api.createExpense({
    amount: 5000,
    currency: 'KGS',
    category: 'food',
    description: 'Обед',
    date: '2025-11-12'
});

// Получить аналитику
const overview = await window.api.getOverview({
    start_date: '2025-11-01',
    end_date: '2025-11-30'
});

// Создать workspace
const workspace = await window.api.createWorkspace({
    name: 'Моя компания',
    description: 'Основной workspace',
    currency: 'KGS'
});
```

---

## 🎯 Доступные методы API Helper

### Авторизация
- `api.authTelegram(data)` - Авторизация через Telegram
- `api.setToken(token)` - Установить JWT токен

### Категории (без авторизации)
- `api.getExpenseCategories()` - 35 категорий расходов
- `api.getIncomeCategories()` - 15 категорий доходов
- `api.getCurrencies()` - 5 валют
- `api.getAllCategories()` - Всё сразу

### Workspaces
- `api.getWorkspaces()` - Список workspaces
- `api.createWorkspace(data)` - Создать
- `api.getWorkspace(id)` - Получить детали
- `api.getWorkspaceMembers(id)` - Участники
- `api.createInvite(id, data)` - Создать приглашение
- `api.acceptInvite(code)` - Принять приглашение
- `api.getWorkspaceInvites(id)` - Список приглашений

### Расходы
- `api.getExpenses(params)` - Список с фильтрами
- `api.createExpense(data)` - Добавить
- `api.updateExpense(id, data)` - Обновить
- `api.deleteExpense(id)` - Удалить

### Доходы
- `api.getIncome(params)` - Список
- `api.createIncome(data)` - Добавить
- `api.updateIncome(id, data)` - Обновить
- `api.deleteIncome(id)` - Удалить

### Бюджет
- `api.getBudget(params)` - Текущий бюджет
- `api.createBudget(data)` - Создать
- `api.updateBudget(id, data)` - Обновить

### Курсы валют
- `api.getRates()` - Текущие курсы
- `api.getRate(from, to)` - Конкретная пара
- `api.convertAmount(data)` - Конвертация
- `api.refreshRates()` - Обновить с НБКР

### Аналитика
- `api.getOverview(params)` - Общий обзор
- `api.getIncomeExpenseStats(params)` - Доходы vs Расходы
- `api.getCategoryAnalytics(params)` - По категориям
- `api.getTrends(params)` - Тренды
- `api.getPatterns(params)` - Паттерны трат
- `api.getInsights(params)` - Инсайты
- `api.getForecast(params)` - Прогноз

### Отчёты
- `api.getReports(params)` - Список отчётов
- `api.generateReport(data)` - Создать отчёт
- `api.getReport(id)` - Детали
- `api.downloadReport(id)` - Скачать PDF

### Пользователь
- `api.getCurrentUser()` - Текущий пользователь
- `api.updateUser(data)` - Обновить профиль
- `api.getUserPreferences()` - Настройки

---

## 🚀 Запуск

### 1. Запустить Backend API
```bash
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Запустить MiniApp Server
```bash
cd miniapp
python server.py
```

### 3. Открыть в браузере
http://localhost:5173/index.html

---

## 🔐 Авторизация

### Вариант 1: Telegram WebApp (рекомендуется)

MiniApp автоматически получает данные пользователя из Telegram:

```javascript
const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe.user;

// Авторизация
const response = await api.authTelegram({
    id: user.id,
    first_name: user.first_name,
    username: user.username,
    auth_date: Date.now() / 1000,
    hash: tg.initData // hash от Telegram
});

// Сохранить токен
api.setToken(response.access_token);
```

### Вариант 2: Тестовый режим (для разработки)

Добавьте тестового пользователя в БД и используйте его токен:

```javascript
// Установить токен вручную (для тестирования)
api.setToken('your_jwt_token_here');

// Теперь можно делать запросы
const user = await api.getCurrentUser();
```

---

## 🎨 Интеграция с app.js

Нужно обновить функции в `app.js` для использования нового API Helper:

### Было (n8n):
```javascript
async function loadDashboard() {
    const response = await fetch(config.n8nWebhooks.analytics, {
        method: 'POST',
        body: JSON.stringify({ user_id: currentUserId })
    });
    const data = await response.json();
}
```

### Стало (FastAPI):
```javascript
async function loadDashboard() {
    try {
        const data = await api.getOverview({
            start_date: '2025-11-01',
            end_date: '2025-11-30'
        });
        
        // Обновить UI
        document.getElementById('total-balance').textContent = 
            `${data.balance} ${data.currency}`;
        
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showError('Не удалось загрузить данные');
    }
}
```

---

## 📝 TODO: Обновить app.js

Нужно заменить все вызовы n8n webhooks на методы API Helper:

1. **loadDashboard()** → `api.getOverview()`
2. **loadAnalytics()** → `api.getCategoryAnalytics()`
3. **addTransaction()** → `api.createExpense()` / `api.createIncome()`
4. **loadTeam()** → `api.getWorkspaceMembers()`
5. **createInvite()** → `api.createInvite()`

---

## 🧪 Тестирование

### Проверить API Helper в консоли браузера:

```javascript
// 1. Проверить категории (без авторизации)
const categories = await api.getAllCategories();
console.log(categories);

// 2. Проверить курсы валют
const rates = await api.getRates();
console.log(rates);

// 3. Установить токен (замените на реальный)
api.setToken('your_jwt_token');

// 4. Получить текущего пользователя
const user = await api.getCurrentUser();
console.log(user);

// 5. Создать расход
const expense = await api.createExpense({
    amount: 1000,
    currency: 'KGS',
    category: 'food',
    description: 'Тест',
    date: '2025-11-12'
});
console.log(expense);
```

---

## 🐛 Troubleshooting

### Проблема: CORS ошибки

**Решение:** Убедитесь что backend настроен на localhost:5173

```python
# backend/app/config.py
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",  # MiniApp
]
```

### Проблема: 401 Unauthorized

**Решение:** Нужен JWT токен

```javascript
// Получить токен через авторизацию
const response = await api.authTelegram({...});
api.setToken(response.access_token);
```

### Проблема: API Helper не найден

**Решение:** Проверьте что api-helper.js подключён в index.html:

```html
<script src="miniapp-config.js"></script>
<script src="api-helper.js"></script>
<script src="app.js"></script>
```

---

## 📊 Структура проекта

```
miniapp/
├── index.html           # Основной HTML
├── style.css           # Стили
├── app.js              # Логика приложения (нужно обновить)
├── api-helper.js       # ✨ НОВЫЙ: API для FastAPI
├── miniapp-config.js   # Конфигурация
└── server.py           # HTTP сервер
```

---

## 🎯 Следующие шаги

1. ✅ API Helper создан
2. ✅ Конфигурация обновлена
3. ✅ Сервер запущен
4. ⏳ Обновить app.js для использования API Helper
5. ⏳ Реализовать авторизацию через Telegram
6. ⏳ Протестировать все функции

---

**🎉 MiniApp готов к работе с FastAPI!**

Откройте http://localhost:5173/index.html и начните тестирование.
