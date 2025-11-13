# n8n Workflows

Эта директория содержит все workflow файлы для n8n.

## Workflow список

### 1. AnaliziFinance.json
**Назначение:** Основной Telegram бот для финансового учёта

**Команды:**
- `/start` - Регистрация и приветствие
- `/expense` - Добавить расход
- `/income` - Добавить доход
- `/budget` - Управление бюджетом
- `/balance` - Показать баланс
- `/profile` - Профиль пользователя
- `/categories` - Отчёт по категориям
- `/currency` - Курсы валют
- `/daily_report` - Ежедневный отчёт
- `/weekly_report` - Недельный отчёт (PDF)
- `/monthly_report` - Месячный отчёт (PDF)
- `/help` - Справка по командам

**Callback handlers:**
- Inline кнопки для навигации
- Просмотр бюджета, баланса, профиля
- Просмотр категорий и курсов валют

### 2. ExchangeRates_Daily.json
**Назначение:** Ежедневное обновление курсов валют

**Расписание:** Каждый день в 09:00 (Bishkek time)

**Валюты:** USD, EUR, RUB

**Источник:** National Bank of Kyrgyzstan API

### 3. Recurring_Payments_Checker.json
**Назначение:** Проверка повторяющихся платежей

**Функции:**
- Определение регулярных трат
- Напоминания о подписках
- Анализ паттернов расходов

### 4. BankParser_Kyrgyzstan_PostgreSQL.json
**Назначение:** Парсинг банковских выписок

**Поддерживаемые банки:**
- Optima Bank (Kyrgyzstan)
- KICB
- Другие банки Кыргызстана

**Функции:**
- Автоматический импорт транзакций
- Категоризация расходов
- Распознавание мерчантов

### 5. TaxCalculator_Kyrgyzstan.json
**Назначение:** Калькулятор налогов для Кыргызстана

**Расчёты:**
- Патент для ИП
- ОсОО налоги
- НДС
- Социальные отчисления

### 6. ErrorHandling_PostgreSQL.json
**Назначение:** Централизованная обработка ошибок

**Функции:**
- Логирование ошибок в БД
- Уведомления администраторам
- Мониторинг системы

## Импорт workflow в n8n

1. Откройте n8n UI
2. Перейдите в раздел "Workflows"
3. Нажмите "Import from File"
4. Выберите нужный .json файл
5. Настройте credentials (Telegram, PostgreSQL и т.д.)
6. Активируйте workflow

## Требования

- n8n v1.0+
- PostgreSQL 14+
- Telegram Bot Token
- Node.js 18+

## Настройка credentials в n8n

### PostgreSQL
- Host: localhost
- Port: 5432
- Database: aiaccounter
- User: ваш_пользователь
- Password: ваш_пароль

### Telegram Bot
- Bot Token: получить у @BotFather
- Webhook URL: https://ваш-домен/webhook/telegram

### OpenAI (для AI функций)
- API Key: получить на platform.openai.com
- Model: gpt-4o-mini
