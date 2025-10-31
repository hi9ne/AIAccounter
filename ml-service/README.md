# ML Forecasting Service
# Инструкция по запуску

## Локальный запуск

### 1. Установка зависимостей
```bash
cd ml-service
pip install -r requirements.txt
```

### 2. Запуск сервиса
```bash
python app.py
```

Сервис будет доступен на `http://localhost:5000`

## Docker запуск

### 1. Сборка образа
```bash
docker build -t aiaccounter-ml:v2.4.0 .
```

### 2. Запуск контейнера
```bash
docker run -d -p 5000:5000 --name aiaccounter-ml aiaccounter-ml:v2.4.0
```

### 3. Просмотр логов
```bash
docker logs -f aiaccounter-ml
```

## Тестирование API

### Health Check
```bash
curl http://localhost:5000/health
```

### Prophet Forecast
```bash
curl -X POST http://localhost:5000/forecast/prophet \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {"date": "2025-01-01", "amount": 50000},
      {"date": "2025-01-02", "amount": 55000},
      {"date": "2025-01-03", "amount": 52000}
    ],
    "periods": 7,
    "confidence": 0.95
  }'
```

### ARIMA Forecast
```bash
curl -X POST http://localhost:5000/forecast/arima \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {"date": "2025-01-01", "amount": 50000},
      {"date": "2025-01-02", "amount": 55000},
      {"date": "2025-01-03", "amount": 52000}
    ],
    "periods": 7,
    "order": [1, 1, 1]
  }'
```

### Auto-Select Best Model
```bash
curl -X POST http://localhost:5000/forecast/auto \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {"date": "2025-01-01", "amount": 50000},
      {"date": "2025-01-02", "amount": 55000}
    ],
    "periods": 7
  }'
```

## Интеграция с n8n

### HTTP Request Node Configuration

**URL:** `http://localhost:5000/forecast/prophet`  
**Method:** POST  
**Body:**
```json
{
  "data": "={{ $json.transactions }}",
  "periods": 30,
  "confidence": 0.95
}
```

## Production Deployment

### Railway / Render / Heroku
1. Загрузите `Dockerfile` и код
2. Установите переменную окружения `PORT=5000`
3. Deploy автоматически соберёт Docker образ

### VPS / Cloud VM
```bash
# Клонируйте репозиторий
git clone <repo>
cd ml-service

# Запустите с gunicorn
gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 app:app
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/forecast/prophet` | POST | Prophet прогноз |
| `/forecast/arima` | POST | ARIMA прогноз |
| `/forecast/auto` | POST | Авто-выбор модели |
| `/train` | POST | Обучение модели |

## Требования

- Python 3.9+
- 1GB RAM минимум
- 2GB RAM рекомендуется (для Prophet)

## Troubleshooting

### Ошибка "ModuleNotFoundError: No module named 'prophet'"
```bash
pip install prophet
```

### Ошибка при установке Prophet
```bash
# Ubuntu/Debian
sudo apt-get install gcc g++ make

# macOS
brew install gcc

# Windows
# Установите Visual Studio Build Tools
```

### Медленный прогноз
- Увеличьте количество workers в gunicorn
- Используйте Redis для кэширования прогнозов
- Оптимизируйте параметры моделей
