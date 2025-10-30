# 🚀 AI Accounter v2.1 - План разработки

## 📋 Версия: 2.1.0 (В разработке)
**Дата начала:** 30 октября 2025  
**Планируемый релиз:** Ноябрь 2025

---

## 🎯 Основная цель v2.1

**Автоматическая конвертация валют** и улучшение аналитики

---

## 📊 Приоритет 1: Конвертация валют

### Что реализуем:
1. **Интеграция с API курсов валют**
   - Национальный Банк КР (основной источник)
   - Fallback: ExchangeRate-API или Fixer.io
   - Кэширование курсов (обновление раз в день)

2. **Новый инструмент в n8n: Get_exchange_rates**
   - Получение актуальных курсов
   - Автоматическое обновление в БД
   - Хранение истории курсов

3. **Функция конвертации**
   - Конвертация любой валюты в любую
   - Показ статистики в выбранной валюте
   - Команды: "Покажи всё в долларах", "Конвертируй в сомы"

### Технические детали:

#### База данных:
```sql
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10, 6) NOT NULL,
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, from_currency, to_currency)
);

CREATE INDEX idx_rates_date ON exchange_rates(date);
CREATE INDEX idx_rates_currencies ON exchange_rates(from_currency, to_currency);
```

#### API endpoints:
```javascript
// Национальный Банк КР
https://www.nbkr.kg/XML/daily.xml

// Fallback: ExchangeRate-API
https://api.exchangerate-api.com/v4/latest/KGS

// Альтернатива: Fixer.io
https://api.fixer.io/latest?base=KGS&symbols=USD,EUR,RUB
```

#### n8n workflow:
- **Новый workflow:** `ExchangeRates_Daily.json`
- **Триггер:** Cron (каждый день в 10:00)
- **Действия:**
  1. Запрос к API НБ КР
  2. Парсинг XML/JSON
  3. Сохранение в БД
  4. Уведомление в Telegram (опционально)

#### Новый инструмент для AI Agent:
```javascript
// Convert_currency (Postgres Tool)
SELECT 
    {{ $fromAI("amount", "Сумма для конвертации", "number") }} * 
    (SELECT rate FROM exchange_rates 
     WHERE from_currency = UPPER('{{ $fromAI("from", "Из какой валюты", "string") }}')
       AND to_currency = UPPER('{{ $fromAI("to", "В какую валюту", "string") }}')
       AND date = CURRENT_DATE
     LIMIT 1) as converted_amount;
```

---

## 📊 Приоритет 2: Редактирование транзакций

### Что реализуем:
1. **Новый инструмент: Edit_transaction**
   - Поиск транзакции по ID или последней
   - Изменение суммы, категории, описания, валюты
   - Команды: "Измени последний расход", "Исправь сумму на 500"

2. **База данных:**
```sql
-- Добавить поле для отслеживания изменений
ALTER TABLE expenses ADD COLUMN edited_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN edit_count INTEGER DEFAULT 0;
ALTER TABLE income ADD COLUMN edited_at TIMESTAMP;
ALTER TABLE income ADD COLUMN edit_count INTEGER DEFAULT 0;
```

---

## 📊 Приоритет 3: Удаление транзакций

### Что реализуем:
1. **Новый инструмент: Delete_transaction**
   - Soft delete (пометка как удалённая)
   - Восстановление в течение 30 дней
   - Команды: "Удали последний расход", "Отмени транзакцию"

2. **База данных:**
```sql
-- Мягкое удаление
ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN deleted_by TEXT;
ALTER TABLE income ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE income ADD COLUMN deleted_by TEXT;

-- Обновить индексы
CREATE INDEX idx_expenses_not_deleted ON expenses(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_income_not_deleted ON income(id) WHERE deleted_at IS NULL;
```

---

## 🎨 Приоритет 4: Графики и визуализация

### Что реализуем:
1. **Mini App: графики**
   - Chart.js для визуализации
   - Круговая диаграмма расходов по категориям
   - Линейный график динамики по дням
   - Столбчатая диаграмма по валютам

2. **Telegram: генерация изображений**
   - Использование QuickChart.io API
   - Отправка графиков как изображений
   - Команда: "Покажи график расходов"

---

## 💰 Приоритет 5: Бюджеты по валютам

### Что реализуем:
1. **Расширение таблицы budgets:**
```sql
ALTER TABLE budgets ADD COLUMN currency VARCHAR(3) DEFAULT 'KGS';
ALTER TABLE limits ADD COLUMN currency VARCHAR(3) DEFAULT 'KGS';
```

2. **Новые команды:**
   - `/budget 1000 USD` - установить бюджет в долларах
   - `/limit продукты 500 EUR` - лимит в евро
   - Автоконвертация при проверке превышения

---

## 📅 Timeline (План работы)

### Неделя 1: (30 октября - 5 ноября)
- [x] Планирование v2.1
- [ ] Интеграция API курсов валют
- [ ] Создание таблицы exchange_rates
- [ ] Workflow для обновления курсов
- [ ] Тестирование конвертации

### Неделя 2: (6-12 ноября)
- [ ] Инструмент Convert_currency
- [ ] Редактирование транзакций
- [ ] Удаление транзакций
- [ ] Обновление System Message

### Неделя 3: (13-19 ноября)
- [ ] Графики в Mini App
- [ ] Генерация графиков для Telegram
- [ ] Бюджеты по валютам
- [ ] Тестирование всех функций

### Неделя 4: (20-26 ноября)
- [ ] Документация
- [ ] Финальное тестирование
- [ ] Релиз v2.1

---

## 🧪 Критерии готовности

### Для конвертации валют:
- [ ] API курсов работает и обновляется ежедневно
- [ ] Конвертация между всеми парами валют (KGS, USD, EUR, RUB)
- [ ] Кэширование курсов
- [ ] Команды "Покажи в долларах", "Конвертируй в евро"

### Для редактирования:
- [ ] Редактирование последней транзакции
- [ ] Редактирование по ID
- [ ] Изменение всех полей (сумма, валюта, категория, описание)
- [ ] История изменений

### Для удаления:
- [ ] Soft delete (мягкое удаление)
- [ ] Восстановление удалённых транзакций
- [ ] Автоочистка через 30 дней
- [ ] Подтверждение перед удалением

### Для графиков:
- [ ] 3 типа графиков (круг, линия, столбец)
- [ ] Работа в Mini App
- [ ] Генерация для Telegram
- [ ] Фильтрация по периодам

### Для бюджетов:
- [ ] Бюджеты в любой валюте
- [ ] Автоконвертация при проверке
- [ ] Уведомления о превышении
- [ ] Множественные бюджеты (по валютам)

---

## 📚 Документация для v2.1

Создать/обновить:
- [ ] `UPGRADE_TO_2.1.md`
- [ ] `docs/CURRENCY_CONVERSION.md`
- [ ] `docs/EDITING_GUIDE.md`
- [ ] `docs/CHARTS_GUIDE.md`
- [ ] Обновить `CHANGELOG.md`
- [ ] Обновить `README.md`

---

## 🎯 Ключевые метрики v2.1

**Целевые показатели:**
- Конвертация: < 100ms
- Обновление курсов: раз в день
- API доступность: > 99%
- Графики: загрузка < 2 сек
- Редактирование: < 3 команды

---

## 💡 Дополнительные идеи (v2.2+)

### Для будущих версий:
- Прогнозирование расходов ML
- Экспорт в Excel/PDF с графиками
- Recurring transactions (подписки)
- Множественные кошельки
- Геолокация транзакций
- OCR для чеков
- Интеграция с банками
- CRM интеграция

---

**🚀 Начинаем разработку v2.1!**

**Первый шаг:** Интеграция API курсов валют ⏳
