# AIAccounter Backend (FastAPI)

## Установка

1. Создайте виртуальное окружение:
```bash
python -m venv venv
```

2. Активируйте виртуальное окружение:
```bash
# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Установите зависимости:
```bash
pip install -r requirements.txt
```

4. Создайте файл `.env` из `.env.example`:
```bash
cp .env.example .env
```

5. Настройте переменные окружения в `.env`:
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/aiaccounter
SECRET_KEY=your-secret-key-here
```

## Запуск

### Режим разработки (с hot reload):
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Продакшн:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Документация API

После запуска сервера документация доступна по адресам:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Структура проекта

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Точка входа FastAPI
│   ├── config.py            # Настройки приложения
│   ├── database.py          # Подключение к БД
│   ├── models/              # SQLAlchemy модели
│   │   ├── __init__.py
│   │   └── models.py
│   ├── schemas/             # Pydantic схемы
│   │   ├── __init__.py
│   │   └── schemas.py
│   ├── api/                 # API endpoints
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── expenses.py
│   │       ├── income.py
│   │       └── budget.py
│   └── utils/               # Утилиты
├── requirements.txt
├── .env.example
└── README.md
```

## API Endpoints

### Expenses (Расходы)
- `POST /api/v1/expenses/` - Создать расход
- `GET /api/v1/expenses/` - Получить список расходов
- `GET /api/v1/expenses/{id}` - Получить расход
- `PUT /api/v1/expenses/{id}` - Обновить расход
- `DELETE /api/v1/expenses/{id}` - Удалить расход
- `GET /api/v1/expenses/stats/summary` - Сводка по расходам
- `GET /api/v1/expenses/stats/by-category` - Расходы по категориям

### Income (Доходы)
- `POST /api/v1/income/` - Создать доход
- `GET /api/v1/income/` - Получить список доходов
- `GET /api/v1/income/{id}` - Получить доход
- `PUT /api/v1/income/{id}` - Обновить доход
- `DELETE /api/v1/income/{id}` - Удалить доход

### Budget (Бюджет)
- `POST /api/v1/budget/` - Создать/обновить бюджет
- `GET /api/v1/budget/{month}` - Получить бюджет
- `GET /api/v1/budget/{month}/status` - Статус бюджета с расходами
- `PUT /api/v1/budget/{month}` - Обновить бюджет
- `DELETE /api/v1/budget/{month}` - Удалить бюджет

## TODO

- [ ] Добавить JWT аутентификацию
- [ ] Добавить роуты для workspaces
- [ ] Добавить роуты для analytics
- [ ] Добавить роуты для exchange rates
- [ ] Добавить роуты для reports (PDF generation)
- [ ] Добавить background tasks для отчётов
- [ ] Интеграция с Telegram Bot
- [ ] Добавить тесты
