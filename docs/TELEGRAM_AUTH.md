# 🔐 Telegram Authentication для Mini App

## Как это работает

Когда пользователь открывает Telegram Mini App, он автоматически получает JWT токен без регистрации/логина.

## Frontend (Telegram Mini App)

### 1. Получение данных пользователя

```javascript
// В вашем React/Vue/Vanilla JS приложении

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();

// Получение данных пользователя
const user = tg.initDataUnsafe.user;

if (!user) {
    console.error('Не удалось получить данные пользователя');
    return;
}

console.log('User:', user);
// {
//   id: 123456789,
//   first_name: "Иван",
//   last_name: "Петров",
//   username: "ivan_petrov",
//   language_code: "ru"
// }
```

### 2. Аутентификация и получение токена

```javascript
async function authenticateUser() {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    
    if (!user) {
        throw new Error('User data not available');
    }
    
    try {
        const response = await fetch('https://your-api.com/api/v1/auth/telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                telegram_chat_id: user.id.toString(),
                username: user.username || null,
                first_name: user.first_name || null,
                last_name: user.last_name || null,
                language_code: user.language_code || 'ru'
            })
        });
        
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        
        // Сохраняем токен
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('token_expires', Date.now() + (data.expires_in * 1000));
        
        console.log('✅ Аутентификация успешна!');
        return data.access_token;
        
    } catch (error) {
        console.error('❌ Ошибка аутентификации:', error);
        throw error;
    }
}
```

### 3. Использование токена для API запросов

```javascript
// Функция для получения токена из localStorage
function getAuthToken() {
    const token = localStorage.getItem('access_token');
    const expires = localStorage.getItem('token_expires');
    
    // Проверяем не истёк ли токен
    if (!token || !expires || Date.now() >= parseInt(expires)) {
        // Токен истёк, нужна реаутентификация
        return null;
    }
    
    return token;
}

// Пример запроса к защищённому endpoint
async function getUserProfile() {
    const token = getAuthToken();
    
    if (!token) {
        // Повторная аутентификация
        await authenticateUser();
        return getUserProfile(); // Retry
    }
    
    try {
        const response = await fetch('https://your-api.com/api/v1/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            // Токен невалидный, реаутентификация
            localStorage.removeItem('access_token');
            await authenticateUser();
            return getUserProfile();
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Error fetching profile:', error);
        throw error;
    }
}

// Пример создания расхода
async function createExpense(expenseData) {
    const token = getAuthToken();
    
    const response = await fetch('https://your-api.com/api/v1/expenses/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(expenseData)
    });
    
    return await response.json();
}
```

### 4. Axios interceptor (если используете Axios)

```javascript
import axios from 'axios';

// Настройка axios instance
const api = axios.create({
    baseURL: 'https://your-api.com/api/v1'
});

// Request interceptor - автоматически добавляем токен
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - обработка 401 (реаутентификация)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                // Реаутентификация
                await authenticateUser();
                
                // Повторяем оригинальный запрос с новым токеном
                const token = localStorage.getItem('access_token');
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            } catch (authError) {
                return Promise.reject(authError);
            }
        }
        
        return Promise.reject(error);
    }
);

// Использование
async function getExpenses() {
    const response = await api.get('/expenses/');
    return response.data;
}

async function createExpense(data) {
    const response = await api.post('/expenses/', data);
    return response.data;
}
```

### 5. React Hook пример

```javascript
import { useState, useEffect } from 'react';

export function useAuth() {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    
    useEffect(() => {
        authenticateUser();
    }, []);
    
    const authenticateUser = async () => {
        setLoading(true);
        
        try {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            
            const response = await fetch('/api/v1/auth/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegram_chat_id: tgUser.id.toString(),
                    username: tgUser.username,
                    first_name: tgUser.first_name,
                    last_name: tgUser.last_name,
                    language_code: tgUser.language_code || 'ru'
                })
            });
            
            const data = await response.json();
            setToken(data.access_token);
            localStorage.setItem('access_token', data.access_token);
            
            // Получаем полную информацию о пользователе
            const userResponse = await fetch('/api/v1/auth/me', {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            const userData = await userResponse.json();
            setUser(userData);
            
        } catch (error) {
            console.error('Auth error:', error);
        } finally {
            setLoading(false);
        }
    };
    
    return { token, user, loading, authenticateUser };
}

// Использование в компоненте
function App() {
    const { token, user, loading } = useAuth();
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    if (!token) {
        return <div>Authentication failed</div>;
    }
    
    return (
        <div>
            <h1>Welcome, {user?.first_name}!</h1>
            {/* Остальное приложение */}
        </div>
    );
}
```

## Backend API

### POST /api/v1/auth/telegram

Аутентификация через Telegram Mini App.

**Request:**
```json
{
    "telegram_chat_id": "123456789",
    "username": "ivan_petrov",
    "first_name": "Иван",
    "last_name": "Петров",
    "language_code": "ru"
}
```

**Response:**
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 1800
}
```

### GET /api/v1/auth/me

Получить информацию о текущем пользователе.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
    "user_id": 1,
    "telegram_chat_id": "123456789",
    "username": "ivan_petrov",
    "first_name": "Иван",
    "last_name": "Петров",
    "language": "ru",
    "is_active": true,
    "created_at": "2025-11-12T10:00:00Z"
}
```

## Безопасность

- ✅ JWT токены истекают через 30 минут (настраивается)
- ✅ Пользователь создаётся автоматически при первом входе
- ✅ Данные пользователя обновляются при каждой аутентификации
- ✅ Все защищённые endpoints требуют валидный токен
- ⚠️ В production добавьте проверку `initData` от Telegram для предотвращения подделки

## Проверка initData (для production)

```python
# В будущем можно добавить проверку подписи Telegram
import hmac
import hashlib

def verify_telegram_init_data(init_data: str, bot_token: str) -> bool:
    """Проверка подлинности initData от Telegram"""
    # Парсинг init_data
    # Проверка HMAC подписи
    # См. документацию Telegram WebApp
    pass
```

---

**Готово!** Теперь ваш Mini App автоматически аутентифицирует пользователей через Telegram 🚀
