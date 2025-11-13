# 🚀 Быстрый старт AIAccounter Backend

## 📦 Установка (первый запуск)

```powershell
# 1. Перейти в папку backend
cd C:\Users\berdi\OneDrive\Desktop\projects\AIAccounter\backend

# 2. Создать виртуальное окружение
python -m venv venv

# 3. Активировать
.\venv\Scripts\activate

# 4. Установить зависимости
pip install -r requirements.txt
```

## ⚙️ Настройка

### Создать файл `.env` (скопировать из .env.example):

```bash
DATABASE_URL=postgresql://postgres.ggcmoikpztvbatstcnai:AIAccounter_2025@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# APITemplate.io (опционально, для PDF отчётов)
APITEMPLATE_API_KEY=
WEEKLY_TEMPLATE_ID=
MONTHLY_TEMPLATE_ID=
PERIOD_TEMPLATE_ID=
```

## 🎯 Запуск

```powershell
# Запустить сервер
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Сервер будет доступен на:
- **API:** http://localhost:8000
- **Swagger Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## 🧪 Быстрый тест

### 1. Авторизация через Telegram

```bash
POST http://localhost:8000/api/v1/auth/telegram
Content-Type: application/json

{
  "telegram_chat_id": "123456789",
  "first_name": "Иван",
  "last_name": "Петров",
  "telegram_username": "ivan_petrov"
}
```

Ответ: `{"access_token": "eyJ...", "token_type": "bearer"}`

### 2. Получить профиль

```bash
GET http://localhost:8000/api/v1/users/me
Authorization: Bearer eyJ...
```

### 3. Создать workspace

```bash
POST http://localhost:8000/api/v1/workspaces/
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "name": "Мой бюджет",
  "description": "Личные финансы",
  "currency": "KGS"
}
```

### 4. Получить категории

```bash
GET http://localhost:8000/api/v1/categories/all
Authorization: Bearer eyJ...
```

### 5. Добавить расход

```bash
POST http://localhost:8000/api/v1/expenses/
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "workspace_id": 1,
  "amount": 500,
  "category": "🍔 Еда",
  "description": "Обед в кафе",
  "date": "2025-11-12"
}
```

### 6. Получить аналитику

```bash
GET http://localhost:8000/api/v1/analytics/dashboard?workspace_id=1&period=month
Authorization: Bearer eyJ...
```

## 📊 Все эндпоинты

| Группа | Префикс | Описание |
|--------|---------|----------|
| Auth | `/api/v1/auth` | Telegram авторизация |
| Users | `/api/v1/users` | Профиль и статистика |
| Categories | `/api/v1/categories` | Категории расходов/доходов |
| Workspaces | `/api/v1/workspaces` | Рабочие пространства |
| Rates | `/api/v1/rates` | Курсы валют |
| Analytics | `/api/v1/analytics` | Графики и статистика |
| Reports | `/api/v1/reports` | PDF отчёты |
| Expenses | `/api/v1/expenses` | Расходы (CRUD) |
| Income | `/api/v1/income` | Доходы (CRUD) |
| Budget | `/api/v1/budget` | Бюджеты (CRUD) |

## 🔧 Полезные команды

```powershell
# Проверить синтаксис
python -m py_compile app/main.py

# Форматировать код (если установлен black)
black app/

# Проверить типы (если установлен mypy)
mypy app/

# Запустить с другим портом
uvicorn app.main:app --reload --port 8080

# Запустить без автоперезагрузки (production)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 📝 Что работает

✅ JWT аутентификация  
✅ Telegram Mini App авто-регистрация  
✅ 10 групп эндпоинтов (60+ endpoints)  
✅ PostgreSQL функции интегрированы  
✅ APITemplate.io для PDF  
✅ Swagger документация  

## ⚠️ Требует настройки

- ⚙️ **SECRET_KEY** в .env (для production)
- 📄 **APITemplate.io** API ключ (для PDF отчётов)
- 🗄️ **PostgreSQL** функции должны быть выполнены (миграции)

## 🐛 Troubleshooting

### Ошибка подключения к БД
```
Проверить DATABASE_URL в .env
```

### Ошибка импорта модулей
```powershell
pip install -r requirements.txt --upgrade
```

### JWT токен не работает
```
Проверить SECRET_KEY в .env
```

---

**Готово к разработке!** 🎉
