# 🚀 AI Accounter v2.1.0 - Quick Start

**📅 30 октября 2025** | **⏱️ 20 минут до запуска**

---

## ⚡ Быстрый старт

### 1️⃣ База данных (5 мин)

```bash
# Откройте Supabase SQL Editor
# Скопируйте содержимое migrations/add_exchange_rates.sql
# Нажмите RUN
```

**Проверка:**
```sql
SELECT COUNT(*) FROM exchange_rates;
-- Должно быть > 0
```

---

### 2️⃣ n8n Workflows (5 мин)

**Workflow #1: ExchangeRates_Daily**
```bash
# n8n → Import → ExchangeRates_Daily.json
# Настройте Telegram ID в ноде "Set Admin Telegram ID"
# Активируйте workflow
# Execute Workflow (тестовый запуск)
```

**Workflow #2: AnaliziFinance**
```bash
# Сделайте backup старого workflow (Download)
# n8n → Import → AnaliziFinance.json (замените)
# Проверьте credentials (OpenAI, Postgres, Telegram)
# Активируйте workflow
```

---

### 3️⃣ Тестирование (10 мин)

Отправьте боту:

```
1. "Какой курс доллара?"
   ✅ Должен показать курс

2. "Конвертируй 1000 сом в доллары"
   ✅ Должен конвертировать

3. "100 долларов в сомах?"
   ✅ Обратная конвертация

4. "Переведи 50 евро в рубли"
   ✅ Кросс-конвертация

5. "Покажи статистику в долларах"
   ✅ Статистика с конвертацией

6. "Все курсы"
   ✅ Список всех курсов
```

---

## 💡 Что нового?

### 🎯 Главное:
- **Конвертация валют** в реальном времени
- **Актуальные курсы** обновляются ежедневно в 10:00
- **Статистика** в любой валюте
- **Естественные команды** на русском

### 🏗️ Архитектура:
```
ExchangeRate-API (источник)
    ↓
ExchangeRates_Daily (обновление ежедневно)
    ↓
exchange_rates таблица (хранение)
    ↓
Convert_currency + Get_exchange_rates (AI инструменты)
    ↓
Пользователь получает конвертацию
```

### 📊 Поддержка:
- **4 валюты:** KGS, USD, EUR, RUB
- **16+ пар:** все комбинации валют
- **Исторические данные:** 365 дней

---

## 🎯 Команды AI

### Конвертация:
```
"Конвертируй X в Y"
"Сколько будет X в Y?"
"Переведи X в Y"
"X валюта_1 to валюта_2"
```

### Курсы:
```
"Какой курс X?"
"Все курсы"
"Покажи курсы валют"
"Курс X"
```

### Статистика:
```
"Статистика в X"
"Покажи статистику в X"
"Расходы в X"
```

---

## 🔧 Структура файлов

```
AIAccounter/
├── migrations/
│   └── add_exchange_rates.sql       ⭐ NEW - миграция БД
├── ExchangeRates_Daily.json         ⭐ NEW - обновление курсов
├── AnaliziFinance.json              🔄 UPDATED - новые инструменты
├── UPGRADE_TO_2.1.md                ⭐ NEW - инструкция
├── CHANGELOG.md                     🔄 UPDATED - v2.1.0
├── ROADMAP_v2.1.md                  ⭐ NEW - план
└── docs/
    ├── CURRENCY_CONVERSION.md       ⭐ NEW - руководство
    ├── RELEASE_v2.1.md              ⭐ NEW - релиз
    └── ...
```

---

## 📋 Checklist

### Перед запуском:
- [ ] v2.0 установлена и работает
- [ ] Supabase доступна
- [ ] n8n доступен
- [ ] Есть доступ к SQL Editor
- [ ] Есть backup старых workflows

### После установки:
- [ ] Таблица `exchange_rates` создана
- [ ] Функции `get_exchange_rate()` и `convert_amount()` работают
- [ ] View `v_latest_rates` доступен
- [ ] `ExchangeRates_Daily` активен
- [ ] `AnaliziFinance` обновлён и активен
- [ ] Все 6 тестов проходят

---

## ⚠️ Частые проблемы

### "Функция convert_amount() не найдена"
```sql
-- Проверьте, что миграция выполнена
SELECT proname FROM pg_proc WHERE proname = 'convert_amount';
```

### "Курсы не обновляются"
```bash
# Проверьте статус workflow
# n8n → Executions → ExchangeRates_Daily
# Запустите вручную: Execute Workflow
```

### "AI не понимает команды"
```bash
# Проверьте System Message в AnaliziFinance
# Должна быть секция "💱 КОНВЕРТАЦИЯ ВАЛЮТ"
```

---

## 📚 Полная документация

| Документ | Описание |
|----------|----------|
| **UPGRADE_TO_2.1.md** | 📖 Пошаговая инструкция с чеклистами |
| **docs/CURRENCY_CONVERSION.md** | 👥 Руководство для пользователей |
| **docs/RELEASE_v2.1.md** | 📦 Полная документация релиза |
| **ROADMAP_v2.1.md** | 🗺️ План разработки v2.1 |
| **CHANGELOG.md** | 📝 История изменений |

---

## 🎯 Критерии успеха

✅ Все 6 тестов проходят  
✅ Курсы обновляются автоматически  
✅ Уведомления приходят в Telegram  
✅ Конвертация работает для всех валют  
✅ Нет ошибок в execution logs  

---

## 🆘 Помощь

- 📧 **Email:** support@aiaccounter.kg
- 💬 **GitHub:** https://github.com/hi9ne/AIAccounter/issues
- 📖 **Docs:** `docs/` в репозитории

---

## 🎉 Готово!

**v2.1.0** готов к внедрению! Следуйте инструкции в **UPGRADE_TO_2.1.md**

**Время:** ~20 минут | **Статус:** Ready for Testing

---

**📅 30 октября 2025** | **🏷️ v2.1.0** | **👨‍💻 AI Accounter Team**
