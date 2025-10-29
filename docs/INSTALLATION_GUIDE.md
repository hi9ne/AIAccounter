# 🚀 Руководство по установке AI Accounter# 🚀 Инструкция по установке AI Accounter



Полная пошаговая инструкция по установке системы автоматизации финансового учёта.## Шаг 1: Подготовка Google Sheets



**Время установки:** 30-40 минут  ### Создайте Google Таблицу со следующими листами:

**Уровень сложности:** Средний  

**Требуемые навыки:** Базовые знания SQL и n8n#### 1. Лист "Доходы"

Столбцы:

---| Текущая дата | Категория | Сумма | Описание | Тип операции | Источник |

|--------------|-----------|-------|----------|--------------|----------|

## 📋 Требования

#### 2. Лист "Расходы"

### ОбязательноСтолбцы:

- **n8n** - платформа автоматизации (самостоятельно или облако)| Текущая дата | Категория | Сумма | Описание | Тип операции | Источник |

- **PostgreSQL база данных** - рекомендуем [Supabase](https://supabase.com) (бесплатно)|--------------|-----------|-------|----------|--------------|----------|

- **Telegram Bot** - создайте через [@BotFather](https://t.me/botfather)

- **OpenAI API ключ** - получите на [platform.openai.com](https://platform.openai.com)#### 3. Лист "Бюджеты"

Столбцы:

### Опционально| User ID | Month | Budget Amount | Last Updated |

- **Email IMAP** - для парсинга банковских уведомлений|---------|-------|---------------|--------------|

- **Домен** - для Telegram Mini App

#### 4. Лист "Лимиты"

---Столбцы:

| User ID | Category | Limit Amount | Month | Last Updated |

## Шаг 1: Настройка PostgreSQL (Supabase)|---------|----------|--------------|-------|--------------|



### 1.1 Создание проекта#### 5. Лист "Пользователи"

Столбцы:

1. Перейдите на https://supabase.com| User ID | Username | First Name | Telegram Chat ID | Registered Date |

2. Нажмите **"Start your project"**|---------|----------|------------|------------------|-----------------|

3. Войдите через GitHub (или email)

4. Нажмите **"New Project"**#### 6. Лист "Логи ошибок"

5. Заполните:Столбцы:

   - **Name:** `ai-accounter`| Timestamp | Error Type | User ID | Data | Message |

   - **Database Password:** придумайте надёжный пароль (сохраните!)|-----------|------------|---------|------|---------|

   - **Region:** выберите ближайший (Frankfurt для КР)

   - **Plan:** Free (достаточно для начала)---

6. Нажмите **"Create new project"**

7. Подождите 2-3 минуты## Шаг 2: Настройка n8n



### 1.2 Инициализация базы данных### Установка n8n (если еще не установлен):



1. В левом меню выберите **"SQL Editor"****Windows PowerShell:**

2. Нажмите **"New query"**```powershell

3. Скопируйте **весь** SQL из вашего init файлаnpm install -g n8n

4. Вставьте в редакторn8n start

5. Нажмите **"Run"** (или F5)```

6. Должно появиться: ✅ **"Success. No rows returned"**

Откройте в браузере: http://localhost:5678

### 1.3 Проверка таблиц

---

1. Перейдите в **"Table Editor"**

2. Убедитесь, что созданы таблицы:## Шаг 3: Настройка Credentials

   - ✅ users

   - ✅ income### 1. Google Sheets API

   - ✅ expenses1. В n8n: Settings → Credentials → Add Credential → Google Sheets OAuth2

   - ✅ budgets2. Следуйте инструкциям для подключения Google аккаунта

   - ✅ limits3. Дайте доступ к Google Sheets

   - ✅ error_logs

### 2. Telegram Bot

### 1.4 Получение connection string1. Создайте бота через @BotFather в Telegram

2. Получите токен API

1. Перейдите в **Settings → Database**3. В n8n: Settings → Credentials → Add Credential → Telegram API

2. Найдите раздел **"Connection string"**4. Вставьте токен

3. Выберите **"URI"**

4. Скопируйте строку вида:### 3. OpenAI API

   ```1. Получите API ключ на https://platform.openai.com/api-keys

   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres2. В n8n: Settings → Credentials → Add Credential → OpenAI

   ```3. Вставьте API ключ

5. **Замените** `[YOUR-PASSWORD]` на ваш реальный пароль

6. **Сохраните** - понадобится для n8n!### 4. Email (IMAP) - для парсинга банковских уведомлений

1. В n8n: Settings → Credentials → Add Credential → IMAP

### 1.5 Отключение RLS (для n8n)2. Настройте Gmail или другой email:

   - Email: ваш@gmail.com

RLS (Row Level Security) нужно временно отключить для работы через n8n:   - Password: пароль приложения (не обычный пароль!)

   - Host: imap.gmail.com

```sql   - Port: 993

ALTER TABLE users DISABLE ROW LEVEL SECURITY;   - SSL: включено

ALTER TABLE income DISABLE ROW LEVEL SECURITY;

ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;**Для Gmail:**

ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;1. Включите двухфакторную аутентификацию

ALTER TABLE limits DISABLE ROW LEVEL SECURITY;2. Создайте пароль приложения: https://myaccount.google.com/apppasswords

```

---

**Важно:** Для продакшена используйте `service_role` ключ вместо отключения RLS.

## Шаг 4: Импорт Workflow

---

### Импортируйте файлы в следующем порядке:

## Шаг 2: Установка n8n

1. **ErrorHandlingWorkflow.json**

### Вариант A: Локальная установка (рекомендуется для тестирования)   - Workflow → Import → выберите файл

   - Настройте Google Sheets ID в узлах

```powershell   - Активируйте: Active = ON

# Установка n8n глобально

npm install -g n8n2. **FixedAnaliziFinance_v3.json** (основной)

   - Импортируйте

# Запуск   - Замените системный промпт на содержимое `ImprovedAI_Prompt_Kyrgyzstan.txt`

n8n start   - Укажите ID вашей Google Таблицы во всех узлах

```   - Укажите Telegram Credentials

   - Укажите OpenAI Credentials

Откройте в браузере: http://localhost:5678   - Активируйте



### Вариант B: n8n Cloud3. **TaxCalculator_Kyrgyzstan.json**

   - Импортируйте

1. Зарегистрируйтесь на https://n8n.io   - Скопируйте Webhook URL

2. Создайте новый workspace   - Активируйте

3. Перейдите в редактор workflows

4. **WeeklyReport.json**

### Вариант C: Docker   - Импортируйте

   - Укажите ID Google Таблицы

```bash   - Укажите Telegram Credentials

docker run -it --rm \   - Проверьте временную зону: Asia/Bishkek

  --name n8n \   - Активируйте

  -p 5678:5678 \

  -v ~/.n8n:/home/node/.n8n \5. **BudgetSystem.json**

  n8nio/n8n   - Импортируйте

```   - Укажите ID Google Таблицы

   - Укажите Telegram Credentials

---   - Активируйте



## Шаг 3: Создание Telegram бота---



1. Откройте Telegram и найдите [@BotFather](https://t.me/botfather)## Шаг 5: Настройка Mini App (опционально)

2. Отправьте команду: `/newbot`

3. Введите имя бота: `AI Accounter`1. Откройте файл `TelegramMiniApp.html`

4. Введите username: `YourNameAccounter_bot` (должен быть уникальным)2. Найдите и замените:

5. **Скопируйте токен** вида: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`   - `webhook_url` - на ваш webhook URL из n8n

6. **Сохраните токен** - понадобится для n8n!3. Загрузите HTML на веб-хостинг (например, GitHub Pages, Netlify)

4. В @BotFather: `/setmenubutton` → укажите URL вашего Mini App

### Настройка команд бота (опционально)

---

```

/setcommands - в диалоге с @BotFather## Шаг 6: Тестирование



budget - Установить месячный бюджет### Тест 1: Добавление расхода

limit - Установить лимит по категорииНапишите боту:

check - Проверить бюджет и лимиты```

help - Справка по использованиюКупил продукты за 500 сом

``````



---Ожидаемый результат: запись в листе "Расходы"



## Шаг 4: Получение OpenAI API ключа### Тест 2: Добавление дохода

```

1. Перейдите на https://platform.openai.comДоход 40000 зарплата

2. Зарегистрируйтесь или войдите```

3. Перейдите в **API keys**

4. Нажмите **"Create new secret key"**Ожидаемый результат: запись в листе "Доходы"

5. Дайте название: `n8n-ai-accounter`

6. **Скопируйте ключ** (он показывается только один раз!)### Тест 3: Установка бюджета

7. **Сохраните ключ**```

/budget 50000

**Стоимость:** ~$0.50-2.00 в месяц при активном использовании```



---Ожидаемый результат: запись в листе "Бюджеты"



## Шаг 5: Настройка credentials в n8n### Тест 4: Установка лимита

```

### 5.1 PostgreSQL (Supabase)/limit продукты 15000

```

1. В n8n: **Settings → Credentials**

2. **Add Credential → Postgres**Ожидаемый результат: запись в листе "Лимиты"

3. Заполните:

   - **Name:** `Supabase PostgreSQL`### Тест 5: Аналитика

   - **Connection String:** вставьте из Шага 1.4```

   - **SSL:** Enabled ✅Сколько потратил в октябре?

4. Нажмите **"Test Connection"**```

5. Должно быть: ✅ **"Connection successful"**

6. Нажмите **"Save"**Ожидаемый результат: AI анализ расходов за октябрь



### 5.2 Telegram Bot---



1. **Add Credential → Telegram Bot API**## Шаг 7: Настройка банковского парсинга (опционально)

2. Заполните:

   - **Name:** `AI Accounter Bot`### Для автоматического импорта транзакций:

   - **Access Token:** вставьте токен из Шага 3

3. Нажмите **"Save"**1. Настройте пересылку банковских уведомлений:

   - KICB: Settings → Email notifications → включите

### 5.3 OpenAI   - Optima Bank: Settings → SMS to Email → включите

   - Другие банки: проверьте настройки уведомлений

1. **Add Credential → OpenAI**

2. Заполните:2. Настройте автопересылку в Gmail:

   - **Name:** `OpenAI GPT-4o`   - Settings → Filters and Blocked Addresses → Create a new filter

   - **API Key:** вставьте ключ из Шага 4   - From: `@kicb.kg` OR `@optimabank.kg` OR `bakai` OR `dos-kredobank`

3. Нажмите **"Save"**   - Forward to: ваш email для n8n



### 5.4 Email IMAP (опционально - для банковского парсера)3. В n8n импортируйте банковский парсер (будет создан отдельно)



1. **Add Credential → IMAP**---

2. Настройте Gmail:

   - **Email:** ваш@gmail.com## Шаг 8: Проверка еженедельных отчётов

   - **Password:** пароль приложения (не обычный пароль!)

   - **Host:** imap.gmail.comWorkflow "Weekly Report" запускается каждое воскресенье в 20:00 по времени Бишкека.

   - **Port:** 993

   - **SSL:** Enabled ✅Для немедленного теста:

1. Откройте workflow "WeeklyReport"

**Для Gmail:**2. Нажмите "Execute Workflow"

1. Включите 2FA: https://myaccount.google.com/security3. Проверьте получение отчёта в Telegram

2. Создайте пароль приложения: https://myaccount.google.com/apppasswords

---

---

## Troubleshooting (Решение проблем)

## Шаг 6: Импорт workflows

### Проблема: Бот не отвечает

Импортируйте JSON файлы в n8n **в следующем порядке:****Решение:**

1. Проверьте, что workflow активен (Active = ON)

### 6.1 Основной бот (AnaliziFinance.json)2. Проверьте Telegram Credentials

3. Проверьте Execution Log в n8n

1. **Workflows → Import from File**

2. Выберите `AnaliziFinance.json`### Проблема: Не сохраняется в Google Sheets

3. После импорта откройте workflow**Решение:**

4. **Замените credentials:**1. Проверьте Google Sheets Credentials

   - Найдите узел "Telegram Bot Trigger" → выберите ваш Telegram credential2. Проверьте ID таблицы в узлах

   - Найдите узел "OpenAI Chat Model" → выберите ваш OpenAI credential3. Проверьте права доступа к таблице

   - Найдите все узлы "Postgres" → выберите Supabase credential

5. Нажмите **"Save"**### Проблема: AI неправильно определяет категорию

6. Переключите **"Active" → ON****Решение:**

1. Проверьте OpenAI Credentials

### 6.2 Система бюджетирования (BudgetSystem.json)2. Проверьте системный промпт

3. Обучите AI примерами

1. Импортируйте `BudgetSystem.json`

2. Замените credentials (Telegram, Postgres)### Проблема: Еженедельные отчёты не приходят

3. Активируйте**Решение:**

1. Проверьте временную зону: Asia/Bishkek

### 6.3 Еженедельные отчёты (WeeklyReport.json)2. Проверьте Cron expression: `0 20 * * 0`

3. Проверьте лист "Пользователи" заполнен

1. Импортируйте `WeeklyReport.json`

2. Откройте workflow---

3. Найдите узел **"Schedule Trigger"**

4. Проверьте настройки:## Дополнительные настройки

   - **Days:** Sunday

   - **Hour:** 20### Изменение валюты:

   - **Minute:** 0По умолчанию используются сомы (KGS). Для изменения:

   - **Timezone:** Asia/Bishkek1. Откройте `ImprovedAI_Prompt_Kyrgyzstan.txt`

5. Замените credentials (Postgres, Telegram)2. Найдите: "Валюта по умолчанию: сом (KGS)"

6. Активируйте3. Замените на свою валюту



### 6.4 Налоговый калькулятор (TaxCalculator_Kyrgyzstan.json)### Добавление своих категорий:

1. Откройте `ImprovedAI_Prompt_Kyrgyzstan.txt`

1. Импортируйте `TaxCalculator_Kyrgyzstan.json`2. Найдите списки категорий

2. Активируйте (credentials не требуются - webhook)3. Добавьте свои категории через запятую

4. Обновите промпт в основном workflow

### 6.5 Банковский парсер (опционально)

### Изменение временной зоны:

1. Импортируйте `BankParser_Kyrgyzstan_PostgreSQL.json`1. В каждом workflow найдите параметр `timeZone`

2. Замените credentials (IMAP, Postgres, OpenAI)2. Измените `Asia/Bishkek` на свою зону

3. Активируйте3. Список зон: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones



### 6.6 Обработка ошибок (опционально)---



1. Импортируйте `ErrorHandling_PostgreSQL.json`## Безопасность

2. Замените credentials (Postgres)

3. Активируйте### Рекомендации:

1. **Не публикуйте API ключи** в открытом доступе

---2. **Используйте отдельный email** для банковских уведомлений

3. **Регулярно делайте backup** Google Sheets

## Шаг 7: Тестирование4. **Ограничьте доступ** к Google Таблице только нужным пользователям

5. **Используйте сложные пароли** для всех сервисов

### Тест 1: Регистрация пользователя

---

1. Найдите вашего бота в Telegram

2. Отправьте любое сообщение: `Привет`## Поддержка

3. Откройте Supabase → Table Editor → users

4. Должна появиться ваша запись с Telegram IDЕсли возникли проблемы:

1. Проверьте Execution Log в n8n

### Тест 2: Добавление расхода2. Проверьте лист "Логи ошибок" в Google Sheets

3. Проверьте все credentials

Напишите боту:4. Перезапустите n8n

```

Купил продукты за 500 сом---

```

## Готово! 🎉

**Ожидаемый результат:**

- Бот ответит подтверждениемТеперь ваш AI Accounter настроен и готов к работе!

- В Supabase → expenses появится запись

**Основные команды:**

### Тест 3: Добавление дохода- Просто пишите боту о тратах и доходах

- `/budget <сумма>` - установить бюджет

```- `/limit <категория> <сумма>` - установить лимит

Доход 40000 зарплата- `/help` - справка

```

**Автоматика:**

**Ожидаемый результат:**- ✅ Еженедельные отчёты каждое воскресенье

- Подтверждение от бота- ✅ Уведомления о превышении бюджета

- Запись в таблице income- ✅ AI-анализ и рекомендации

- ✅ Автоматическая категоризация

### Тест 4: Установка бюджета

**Удачи с учётом финансов! 💰**

```
/budget 50000
```

**Ожидаемый результат:**
```
✅ Бюджет установлен: 50,000 сом на 2025-10

💡 Вы получите уведомление:
  • При достижении 80% бюджета
  • При превышении 100%
```

### Тест 5: Установка лимита

```
/limit продукты 15000
```

**Ожидаемый результат:**
```
✅ Лимит установлен:
Категория: продукты
Сумма: 15,000 сом
Период: 2025-10
```

### Тест 6: Аналитика

```
Сколько потратил в октябре?
```

**Ожидаемый результат:**
AI проанализирует данные и выдаст отчёт.

### Тест 7: Голосовой ввод

Отправьте голосовое сообщение:
> "Купил кофе за сто сом"

**Ожидаемый результат:**
- Транскрипция через Whisper
- Добавление транзакции

### Тест 8: Еженедельный отчёт (ручной запуск)

1. Откройте workflow "WeeklyReport"
2. Нажмите **"Execute Workflow"**
3. Проверьте Telegram - должен прийти отчёт

---

## Troubleshooting

### Проблема: "Could not connect to database"

**Решение:**
1. Проверьте connection string (есть ли пробелы?)
2. Убедитесь, что пароль правильный
3. Проверьте, что SSL включён
4. Попробуйте в DBeaver/pgAdmin подключиться

### Проблема: "Telegram bot не отвечает"

**Решение:**
1. Проверьте, что workflow активен (Active = ON)
2. Проверьте токен бота
3. Посмотрите Execution Log в n8n (есть ли ошибки?)
4. Убедитесь, что webhook зарегистрирован

### Проблема: "Permission denied" в PostgreSQL

**Решение:**
1. Отключите RLS (см. Шаг 1.5)
2. Или используйте `service_role` ключ вместо `anon`

### Проблема: "OpenAI API error"

**Решение:**
1. Проверьте, что на балансе есть средства
2. Проверьте правильность API ключа
3. Убедитесь, что модель `gpt-4o-mini` доступна

---

## Готово! 🎉

Ваш AI Accounter настроен и готов к работе!

**Полезные ссылки:**
- 📖 [Примеры использования](READY_WORKFLOWS.md)
- 🔧 [Расширенная настройка](IMPLEMENTATION_PLAN.md)
- 💬 [GitHub Issues](https://github.com/hi9ne/AIAccounter/issues)
