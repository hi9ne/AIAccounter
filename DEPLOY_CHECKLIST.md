# ✅ Deployment Checklist

## Подготовка (Локально)

- [x] Удалены лишние файлы и папки
- [x] Очищена документация от устаревших файлов
- [x] Удалена валюта KZT из системы
- [x] Обновлен .env с правильным форматом ALLOWED_ORIGINS
- [x] DATABASE_URL использует postgresql+asyncpg://
- [x] Создан railway.json для Railway
- [x] Создан Procfile для Railway
- [x] Создан runtime.txt (Python 3.11)
- [x] Обновлен miniapp-config.js с автоопределением URL
- [x] Создан DEPLOY.md с инструкциями
- [x] Обновлен README.md с секцией деплоя
- [x] Создан .env.example без секретов

## Backend → Railway

### 1. Создание проекта
- [ ] Зайти на https://railway.app
- [ ] New Project → Deploy from GitHub repo
- [ ] Выбрать репозиторий AIAccounter
- [ ] Root Directory: `backend`

### 2. Environment Variables
Добавить в Railway Dashboard → Variables:

```env
DATABASE_URL=postgresql+asyncpg://postgres.ggcmoikpztvbatstcnai:AIAccounter_2025@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres

SECRET_KEY=d_23-_22@fsvshkj!en3k2l5m6p7q8r9s0tuvwxzyz
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

TELEGRAM_BOT_TOKEN=8179116260:AAGtKMuBjD1cN5UgU0OGktZQY2ER0gWgMEQ

ALLOWED_ORIGINS=["https://aiaccounter.pages.dev","https://web.telegram.org"]

APITEMPLATE_API_KEY=ec56NDE2MDU6Mzg4MTE6MlNaZ0I4bHlxVUxYaEZCdw=
WEEKLY_TEMPLATE_ID=5a677b23ed6c2fe6
MONTHLY_TEMPLATE_ID=c1177b23eddd4e88
PERIOD_TEMPLATE_ID=49c77b23ede0d4e6

DEBUG=False
```

### 3. После деплоя
- [ ] Скопировать URL Railway (например: `https://aiaccounter-production.up.railway.app`)
- [ ] Проверить работу: `curl https://your-url/api/v1/categories/currencies`

## Frontend → Cloudflare Pages

### 1. Создание проекта
- [ ] Зайти на https://dash.cloudflare.com
- [ ] Pages → Create a project
- [ ] Connect to Git → GitHub
- [ ] Выбрать репозиторий AIAccounter

### 2. Build Settings
```
Framework preset: None
Build command: (оставить пустым)
Build output directory: /miniapp
Root directory: /
```

### 3. После деплоя
- [ ] Скопировать URL Cloudflare (например: `https://aiaccounter.pages.dev`)
- [ ] Открыть в браузере и проверить

### 4. Обновить конфигурацию
Изменить в `miniapp/miniapp-config.js`:
```javascript
baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000/api/v1'
    : 'https://aiaccounter-production.up.railway.app/api/v1', // ← Ваш Railway URL
```

- [ ] Коммит и пуш изменений
- [ ] Cloudflare автоматически пересоберет

## CORS Update

После получения обоих URL, обновить в Railway Variables:
```env
ALLOWED_ORIGINS=["https://aiaccounter.pages.dev","https://web.telegram.org"]
```
Заменить `aiaccounter.pages.dev` на ваш реальный Cloudflare URL.

- [ ] Обновлено в Railway
- [ ] Railway перезапустился

## Telegram Bot Setup

### 1. Обновить Menu Button
```
/setmenubutton
@your_bot_name
URL: https://aiaccounter.pages.dev
```

- [ ] Открыть BotFather
- [ ] Выполнить команды выше
- [ ] Указать ваш Cloudflare Pages URL

### 2. Проверка
- [ ] Открыть бота в Telegram
- [ ] Нажать на кнопку Menu
- [ ] Mini App должно открыться

## Финальная проверка

### Backend
- [ ] `https://your-railway-url/api/v1/categories/currencies` возвращает JSON с валютами
- [ ] `https://your-railway-url/docs` открывает Swagger UI
- [ ] Логи в Railway без ошибок

### Frontend
- [ ] `https://your-cloudflare-url` открывается
- [ ] Страница логина работает
- [ ] После логина открывается главный экран

### Интеграция
- [ ] Mini App открывается через Telegram
- [ ] Можно войти через Telegram авторизацию
- [ ] API запросы работают (проверить в DevTools)
- [ ] Транзакции создаются и отображаются

## Мониторинг

### Railway
- [ ] Dashboard → Logs (проверить на ошибки)
- [ ] Metrics: CPU, Memory в норме
- [ ] Deployments: последний деплой успешен

### Cloudflare Pages
- [ ] Analytics: запросы обрабатываются
- [ ] Last deployment: успешен
- [ ] Custom domain (опционально)

## Troubleshooting

### Backend не стартует
1. Проверить логи в Railway
2. Убедиться что все ENV переменные установлены
3. Проверить DATABASE_URL (должен быть postgresql+asyncpg://)
4. Проверить ALLOWED_ORIGINS (JSON формат)

### Frontend не подключается
1. Проверить miniapp-config.js (правильный Railway URL?)
2. Проверить CORS в Railway (добавлен Cloudflare URL?)
3. Проверить в браузере DevTools → Network (ошибки?)

### Telegram Mini App не открывается
1. BotFather → правильный URL?
2. HTTPS используется? (Cloudflare дает автоматически)
3. index.html доступен по корневому URL?

## Готово! 🎉

- [ ] Все чекбоксы отмечены
- [ ] Приложение работает
- [ ] Telegram Mini App запускается
- [ ] Можно создавать транзакции

---

**Полезные ссылки:**
- Railway: https://railway.app/dashboard
- Cloudflare: https://dash.cloudflare.com
- Документация: [DEPLOY.md](DEPLOY.md)
