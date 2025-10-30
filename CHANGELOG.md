# 🔄 Changelog - Telegram Mini App

## [2.0.0] - Мультивалютность и улучшения

### ✨ Новые функции

#### Мультивалютность
- 💱 Поддержка 4 валют: KGS (сом), USD, EUR, RUB
- 🏦 Автоматическое определение символа валюты
- 📊 Статистика с учётом валюты
- 📋 История с отображением валюты каждой транзакции

#### Улучшенные категории
- ➕ Добавлено 6 новых категорий расходов:
  - Кафе и рестораны
  - Медицина
  - Одежда
  - Развлечения
  - Хозяйственные товары
  - Образование
  - Благотворительность
  
- ➕ Добавлено 2 новые категории доходов:
  - Фриланс
  - Аренда имущества

#### Интеграция
- 🔗 Прямое подключение к Supabase (опционально)
- 🤖 Режим работы через Telegram Bot (по умолчанию)
- ⚙️ Конфигурационный файл для настроек

#### UI/UX улучшения
- 📱 Улучшенный адаптивный дизайн
- 🌙 Поддержка темной темы Telegram
- 📅 Отображение даты в истории транзакций
- 💫 Анимации и плавные переходы
- ✅ Информативные уведомления с символом валюты

### 🔧 Технические изменения

#### Архитектура
```javascript
// Новая структура данных транзакции
{
    type: 'income' | 'expense',
    amount: number,
    currency: 'KGS' | 'USD' | 'EUR' | 'RUB',
    category: string,
    description: string,
    date: string,
    time: string,
    telegram_user_id: number
}
```

#### Новые функции
- `updateCurrencyDisplay()` - обновление отображения валюты
- `sendToSupabase()` - прямая отправка в Supabase
- `resetForm()` - сброс формы с сохранением дефолтной валюты

#### API изменения
```javascript
// Для режима Supabase
POST /rest/v1/expenses
POST /rest/v1/income

Headers:
- apikey: SUPABASE_ANON_KEY
- Authorization: Bearer SUPABASE_ANON_KEY
- Content-Type: application/json

Body:
{
    "amount": 1000,
    "currency": "KGS",
    "category": "Продукты",
    "description": "Покупка в супермаркете",
    "date": "2025-01-28T14:30:00",
    "telegram_user_id": 123456789
}
```

### 🗃️ База данных

#### Требуемая миграция
```sql
-- Добавление поля currency
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KGS' NOT NULL;
ALTER TABLE income ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KGS' NOT NULL;

-- Ограничения
ALTER TABLE expenses ADD CONSTRAINT expenses_currency_check 
CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB'));

ALTER TABLE income ADD CONSTRAINT income_currency_check 
CHECK (currency IN ('KGS', 'USD', 'EUR', 'RUB'));

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency);
CREATE INDEX IF NOT EXISTS idx_income_currency ON income(currency);
```

### 📝 Миграция с версии 1.x

1. **Обновите базу данных:**
```bash
# Выполните SQL из migrations/add_currency_field.sql
psql -h your-supabase-host -U postgres -d postgres -f migrations/add_currency_field.sql
```

2. **Обновите n8n workflow:**
- Импортируйте обновлённый `AnaliziFinance.json`
- Или обновите вручную Add_expense и Add_income инструменты

3. **Обновите Mini App:**
- Замените `TelegramMiniApp.html` на новую версию
- Создайте `miniapp-config.js` из `miniapp-config.example.js`
- Загрузите на хостинг

4. **Проверьте совместимость:**
```javascript
// Старые транзакции без currency будут иметь 'KGS' по умолчанию
SELECT * FROM expenses WHERE currency IS NULL;
-- Должно быть пусто после миграции
```

### 🐛 Исправления

- Исправлено: форма не очищалась после отправки
- Исправлено: категория не сбрасывалась
- Исправлено: время не обновлялось автоматически
- Исправлено: статистика показывала ₽ вместо выбранной валюты
- Улучшено: обработка ошибок при отправке данных
- Улучшено: отображение пустой истории

### ⚡ Производительность

- Оптимизация: кэширование списка категорий
- Оптимизация: уменьшение размера HTML (сжатие CSS)
- Оптимизация: lazy loading для истории транзакций

### 🔐 Безопасность

- Добавлена проверка telegram_user_id
- Улучшена валидация форм
- Добавлена защита от SQL инъекций (через Supabase RLS)

### 📚 Документация

- ➕ Добавлен `MINIAPP_SETUP.md` - полное руководство по настройке
- ➕ Добавлен `miniapp-config.example.js` - пример конфигурации
- ➕ Добавлен `CHANGELOG.md` - этот файл
- 🔄 Обновлён `README.md` - упоминание мультивалютности

---

## [1.0.0] - Первый релиз

### Основные функции
- Добавление доходов/расходов
- Выбор категории
- Голосовой ввод
- Статистика
- История транзакций
- Интеграция с Telegram Bot

---

## 🔮 Планы на будущее (v2.1+)

### В разработке
- [ ] Конвертация валют в реальном времени
- [ ] Графики расходов по категориям
- [ ] PDF отчёты с брендингом
- [ ] Бюджеты с прогресс-баром
- [ ] Recurring transactions (подписки)
- [ ] Множественные счета (кошельки)
- [ ] Тёмная тема (кастомная)
- [ ] Виджеты для быстрого доступа

### Идеи
- [ ] Геолокация для транзакций
- [ ] QR-сканер чеков
- [ ] OCR для чеков
- [ ] Импорт банковских выписок
- [ ] Экспорт в 1C
- [ ] Интеграция с CRM
- [ ] Мультипользовательский режим (семья/команда)
- [ ] Цели накоплений
- [ ] Инвестиционный портфель

---

**📅 Последнее обновление:** 28 января 2025  
**🏷️ Текущая версия:** 2.0.0  
**👨‍💻 Автор:** AI Accounter Team
