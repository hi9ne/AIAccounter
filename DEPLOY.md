# 🚀 Деплой AIAccounter

## Frontend → Cloudflare Pages

### 1. Подготовка
```bash
cd miniapp
```

### 2. Создайте проект на Cloudflare Pages
1. Зайдите на https://dash.cloudflare.com
2. Pages → Create a project → Connect to Git
3. Выберите ваш GitHub репозиторий `AIAccounter`

### 3. Настройки сборки
```
Build command: (оставьте пустым - статические файлы)
Build output directory: /miniapp
Root directory: /
```

### 4. После деплоя получите URL
Например: `https://aiaccounter.pages.dev`

### 5. Обновите конфиг в miniapp-config.js
```javascript
api: {
    baseUrl: 'https://your-railway-backend.up.railway.app/api/v1',
    enabled: true
}
```

---

## Backend → Railway

### 1. Подготовка requirements.txt
Убедитесь что все зависимости указаны:
```bash
cd backend
pip freeze > requirements.txt
```

### 2. Создайте проект на Railway
1. Зайдите на https://railway.app
2. New Project → Deploy from GitHub repo
3. Выберите репозиторий `AIAccounter`
4. Root Directory: `backend`

### 3. Настройте переменные окружения
В Railway Dashboard → Variables добавьте:

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

### 4. Деплой
Railway автоматически задеплоит после коммита.
URL будет примерно: `https://aiaccounter-production.up.railway.app`

### 5. Обновите CORS
После получения Railway URL, обновите `ALLOWED_ORIGINS` добавив ваш Cloudflare Pages URL.

---

## Настройка Telegram Bot

### 1. Обновите Mini App URL в BotFather
```
/setmenubutton
@YourBot
URL: https://aiaccounter.pages.dev
```

### 2. Настройте Webhook (опционально для n8n)
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-n8n-instance.com/webhook/telegram"}'
```

---

## Проверка работы

### 1. Проверьте Backend
```bash
curl https://your-railway-url.up.railway.app/api/v1/categories/currencies
```

Должен вернуть список валют.

### 2. Проверьте Frontend
Откройте `https://aiaccounter.pages.dev` в браузере

### 3. Проверьте через Telegram
Откройте вашего бота в Telegram → Menu button → должно открыться Mini App

---

## Мониторинг

### Railway
- Dashboard показывает логи в реальном времени
- Metrics: CPU, Memory, Network
- Бесплатно: 500 часов/месяц (достаточно для одного проекта)

### Cloudflare Pages
- Analytics встроены
- Unlimited requests на Free плане
- Автоматический SSL

---

## Обновление

### Frontend (Cloudflare Pages)
```bash
git add .
git commit -m "Update frontend"
git push origin main
```
Cloudflare автоматически пересоберет.

### Backend (Railway)
```bash
git add .
git commit -m "Update backend"
git push origin main
```
Railway автоматически задеплоит.

---

## Troubleshooting

### Backend не стартует на Railway
Проверьте логи в Railway Dashboard:
- Установлены ли все зависимости из requirements.txt?
- Правильно ли настроен DATABASE_URL?
- Корректен ли ALLOWED_ORIGINS (JSON формат)?

### Frontend не подключается к Backend
1. Проверьте CORS в backend (ALLOWED_ORIGINS)
2. Убедитесь что miniapp-config.js указывает на Railway URL
3. Проверьте что Railway сервис запущен

### Telegram Mini App не открывается
1. Убедитесь что URL в BotFather правильный
2. Telegram требует HTTPS (Cloudflare Pages дает автоматически)
3. Проверьте что файл index.html доступен по корневому URL
