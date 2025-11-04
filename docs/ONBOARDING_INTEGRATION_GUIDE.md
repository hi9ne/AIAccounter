# Интеграция системы онбординга в AIAccounter

## 📋 Обзор

Система обязательной анкеты для новых пользователей перед использованием бота.

### Что спрашивается у пользователя:

1. **Тип использования**: Бизнес / Личные / Фриланс / Семейный бюджет
2. **Валюта**: Сом / Доллар / Евро / Рубль / Тенге
3. **Месячный бюджет**: Примерная сумма
4. **Сфера деятельности**: Профессия/род занятий
5. **Страна**: Кыргызстан / Казахстан / Россия / Другая

## 🔧 Шаг 1: Выполнить SQL-миграцию

Выполните файл: `migrations/add_onboarding_system.sql`

Это создаст:
- Расширенную таблицу `users` с полями онбординга
- Таблицу `user_onboarding_answers` для хранения ответов
- Функции для проверки и управления онбордингом:
  - `check_onboarding_completed(user_id)` - проверка завершенности
  - `get_onboarding_step(user_id)` - получение текущего шага
  - `save_onboarding_answer(user_id, step, answer)` - сохранение ответа
  - `get_user_profile(user_id)` - полный профиль пользователя

## 🤖 Шаг 2: Добавить узлы в n8n workflow

### 2.1 Check Onboarding (PostgreSQL node)

Добавьте СРАЗУ ПОСЛЕ "Telegram Bot Trigger":

```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "=SELECT * FROM get_user_profile({{ $('Telegram Bot Trigger').first().json.message.from.id }});",
    "options": {}
  },
  "type": "n8n-nodes-base.postgres",
  "name": "Check Onboarding",
  "position": [-850, 32]
}
```

### 2.2 Onboarding Router (IF node)

Проверяет, завершен ли онбординг:

```json
{
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $json.onboarding_completed }}",
          "value2": true
        }
      ]
    }
  },
  "type": "n8n-nodes-base.if",
  "name": "Onboarding Router",
  "position": [-650, 32]
}
```

Выходы:
- **true** → существующий Switch node (Edit Fields)
- **false** → новый узел "Handle Onboarding"

### 2.3 Handle Onboarding (Switch node)

Обрабатывает ответы на анкету:

```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "values": [
        {
          "conditions": {
            "string": [
              {
                "value1": "={{ $('Telegram Bot Trigger').first().json.message.text }}",
                "value2": "/start"
              }
            ]
          },
          "renameOutput": true,
          "outputKey": "start_command"
        },
        {
          "conditions": {
            "number": [
              {
                "value1": "={{ $('Check Onboarding').first().json.onboarding_step }}",
                "operation": "equal",
                "value2": 0
              }
            ]
          },
          "renameOutput": true,
          "outputKey": "step_0"
        },
        {
          "conditions": {
            "number": [
              {
                "value1": "={{ $('Check Onboarding').first().json.onboarding_step }}",
                "operation": "equal",
                "value2": 1
              }
            ]
          },
          "renameOutput": true,
          "outputKey": "step_1"
        }
      ]
    }
  },
  "type": "n8n-nodes-base.switch",
  "name": "Handle Onboarding"
}
```

### 2.4 Get Onboarding Question (PostgreSQL)

Получает следующий вопрос:

```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "=SELECT * FROM get_onboarding_step({{ $('Telegram Bot Trigger').first().json.message.from.id }});",
    "options": {}
  },
  "type": "n8n-nodes-base.postgres",
  "name": "Get Onboarding Question"
}
```

### 2.5 Send Onboarding Question (Telegram)

```json
{
  "parameters": {
    "operation": "sendMessage",
    "chatId": "={{ $('Telegram Bot Trigger').first().json.message.chat.id }}",
    "text": "={{ $('Get Onboarding Question').first().json.next_question }}",
    "additionalFields": {
      "reply_markup": {
        "keyboard": [
          ["💼 Бизнес", "👤 Личные финансы"],
          ["👨‍💼 Фриланс", "👨‍👩‍👧 Семейный бюджет"]
        ],
        "resize_keyboard": true,
        "one_time_keyboard": true
      }
    }
  },
  "type": "n8n-nodes-base.telegram",
  "name": "Send Onboarding Question"
}
```

### 2.6 Save Onboarding Answer (PostgreSQL)

Сохраняет ответ пользователя:

```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "=SELECT * FROM save_onboarding_answer(\n  {{ $('Telegram Bot Trigger').first().json.message.from.id }},\n  {{ $('Check Onboarding').first().json.onboarding_step }},\n  '{{ $('Telegram Bot Trigger').first().json.message.text }}'\n);",
    "options": {}
  },
  "type": "n8n-nodes-base.postgres",
  "name": "Save Onboarding Answer"
}
```

### 2.7 Check If Completed (IF node)

```json
{
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $('Save Onboarding Answer').first().json.completed }}",
          "value2": true
        }
      ]
    }
  },
  "type": "n8n-nodes-base.if",
  "name": "Check If Completed"
}
```

Выходы:
- **true** → Send Completion Message + стоп
- **false** → Get Onboarding Question (петля для следующего вопроса)

### 2.8 Send Completion Message (Telegram)

```json
{
  "parameters": {
    "operation": "sendMessage",
    "chatId": "={{ $('Telegram Bot Trigger').first().json.message.chat.id }}",
    "text": "🎉 Спасибо! Анкета заполнена. Теперь вы можете пользоваться всеми функциями бота!\\n\\nВаши настройки:\\n💰 Валюта: {{ $('Check Onboarding').first().json.currency_symbol }}\\n📊 Тип: {{ $('Check Onboarding').first().json.usage_type }}\\n\\nНапишите любой расход или доход для начала работы!",
    "additionalFields": {}
  },
  "type": "n8n-nodes-base.telegram",
  "name": "Send Completion Message"
}
```

## 🎨 Шаг 3: Клавиатуры для каждого шага

### Шаг 0: Тип использования
```javascript
{
  "keyboard": [
    ["💼 Бизнес", "👤 Личные финансы"],
    ["👨‍💼 Фриланс", "👨‍👩‍👧 Семейный бюджет"]
  ],
  "resize_keyboard": true,
  "one_time_keyboard": true
}
```

### Шаг 1: Валюта
```javascript
{
  "keyboard": [
    ["🇰🇬 Сом (KGS)", "💵 Доллар (USD)"],
    ["💶 Евро (EUR)", "₽ Рубль (RUB)"],
    ["🇰🇿 Тенге (KZT)"]
  ],
  "resize_keyboard": true,
  "one_time_keyboard": true
}
```

### Шаг 2: Месячный бюджет
```javascript
{
  "keyboard": [
    ["До 30,000"],
    ["30,000 - 100,000"],
    ["100,000 - 500,000"],
    ["Более 500,000"]
  ],
  "resize_keyboard": true,
  "one_time_keyboard": true
}
```

### Шаг 3: Сфера деятельности
Обычный текстовый ввод (без клавиатуры)

### Шаг 4: Страна
```javascript
{
  "keyboard": [
    ["🇰🇬 Кыргызстан"],
    ["🇰🇿 Казахстан"],
    ["🇷🇺 Россия"],
    ["🌍 Другая"]
  ],
  "resize_keyboard": true,
  "one_time_keyboard": true
}
```

## 🔄 Шаг 4: Парсинг ответов

Создайте Code node "Parse Onboarding Answer" для обработки ответов:

```javascript
const text = $('Telegram Bot Trigger').first().json.message.text;
const step = $('Check Onboarding').first().json.onboarding_step;

let parsedValue = text;

// Парсинг в зависимости от шага
switch(step) {
  case 0: // usage_type
    if (text.includes('Бизнес')) parsedValue = 'business';
    else if (text.includes('Личные')) parsedValue = 'personal';
    else if (text.includes('Фриланс')) parsedValue = 'freelance';
    else if (text.includes('Семейный')) parsedValue = 'family';
    break;
    
  case 1: // preferred_currency
    if (text.includes('Сом') || text.includes('KGS')) parsedValue = 'KGS';
    else if (text.includes('Доллар') || text.includes('USD')) parsedValue = 'USD';
    else if (text.includes('Евро') || text.includes('EUR')) parsedValue = 'EUR';
    else if (text.includes('Рубль') || text.includes('RUB')) parsedValue = 'RUB';
    else if (text.includes('Тенге') || text.includes('KZT')) parsedValue = 'KZT';
    break;
    
  case 2: // monthly_budget
    // Извлекаем число из текста
    const match = text.match(/[\d,]+/g);
    if (match) {
      parsedValue = match.join('').replace(/,/g, '');
    } else if (text.includes('Более')) {
      parsedValue = '500000';
    } else if (text.includes('До')) {
      parsedValue = '30000';
    }
    break;
    
  case 3: // occupation
    parsedValue = text;
    break;
    
  case 4: // country
    if (text.includes('Кыргызстан')) parsedValue = 'Кыргызстан';
    else if (text.includes('Казахстан')) parsedValue = 'Казахстан';
    else if (text.includes('Россия')) parsedValue = 'Россия';
    else parsedValue = text.replace('🌍 ', '');
    break;
}

return [{
  json: {
    step: step,
    raw_text: text,
    parsed_value: parsedValue
  }
}];
```

## 📱 Шаг 5: Интеграция с Mini App

### API Endpoint: GET /api/onboarding/status

```javascript
// Webhook node
{
  "parameters": {
    "httpMethod": "GET",
    "path": "/api/onboarding/status",
    "responseMode": "responseNode",
    "options": {}
  },
  "type": "n8n-nodes-base.webhook",
  "name": "Webhook Get Onboarding Status"
}
```

Добавьте PostgreSQL node после webhook:

```sql
SELECT * FROM get_user_profile(
  {{ $('Webhook Get Onboarding Status').first().json.query.user_id }}::BIGINT
);
```

### API Endpoint: POST /api/onboarding/answer

```javascript
// Webhook node
{
  "parameters": {
    "httpMethod": "POST",
    "path": "/api/onboarding/answer",
    "responseMode": "responseNode",
    "options": {}
  },
  "type": "n8n-nodes-base.webhook",
  "name": "Webhook Submit Onboarding Answer"
}
```

PostgreSQL node:

```sql
SELECT * FROM save_onboarding_answer(
  {{ $json.body.user_id }}::BIGINT,
  {{ $json.body.step }}::INTEGER,
  '{{ $json.body.answer }}'
);
```

### API Endpoint: GET /api/user/profile

```javascript
// Webhook node для получения полного профиля
{
  "parameters": {
    "httpMethod": "GET",
    "path": "/api/user/profile",
    "responseMode": "responseNode",
    "options": {}
  }
}
```

## 🎨 Шаг 6: UI для Mini App

Создайте файл `miniapp/onboarding.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Настройка профиля</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        .onboarding-container {
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
        }
        .question {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .options {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .option-btn {
            padding: 15px;
            background: var(--tg-theme-button-color);
            color: var(--tg-theme-button-text-color);
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
        }
        .progress {
            height: 4px;
            background: #e0e0e0;
            margin-bottom: 20px;
        }
        .progress-bar {
            height: 100%;
            background: var(--tg-theme-button-color);
            transition: width 0.3s;
        }
    </style>
</head>
<body>
    <div class="onboarding-container">
        <div class="progress">
            <div class="progress-bar" id="progress"></div>
        </div>
        <div class="question" id="question"></div>
        <div class="options" id="options"></div>
    </div>
    
    <script>
        const tg = window.Telegram.WebApp;
        const userId = tg.initDataUnsafe?.user?.id;
        let currentStep = 0;
        
        const questions = [
            {
                text: "Как вы планируете использовать бота?",
                options: [
                    { label: "💼 Бизнес", value: "business" },
                    { label: "👤 Личные финансы", value: "personal" },
                    { label: "👨‍💼 Фриланс", value: "freelance" },
                    { label: "👨‍👩‍👧 Семейный бюджет", value: "family" }
                ]
            },
            {
                text: "В какой валюте вести учет?",
                options: [
                    { label: "🇰🇬 Сом (KGS)", value: "KGS" },
                    { label: "💵 Доллар (USD)", value: "USD" },
                    { label: "💶 Евро (EUR)", value: "EUR" },
                    { label: "₽ Рубль (RUB)", value: "RUB" },
                    { label: "🇰🇿 Тенге (KZT)", value: "KZT" }
                ]
            },
            // ... остальные вопросы
        ];
        
        async function saveAnswer(answer) {
            const response = await fetch('/api/onboarding/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    step: currentStep,
                    answer: answer
                })
            });
            const data = await response.json();
            
            if (data.completed) {
                tg.close();
            } else {
                currentStep++;
                showQuestion();
            }
        }
        
        function showQuestion() {
            const q = questions[currentStep];
            document.getElementById('question').textContent = q.text;
            document.getElementById('progress').style.width = 
                ((currentStep + 1) / questions.length * 100) + '%';
                
            const optionsDiv = document.getElementById('options');
            optionsDiv.innerHTML = '';
            
            q.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = opt.label;
                btn.onclick = () => saveAnswer(opt.value);
                optionsDiv.appendChild(btn);
            });
        }
        
        showQuestion();
    </script>
</body>
</html>
```

## ✅ Шаг 7: Тестирование

1. Выполните SQL-миграцию
2. Импортируйте обновленный workflow
3. Удалите тестового пользователя из таблицы users:
   ```sql
   DELETE FROM users WHERE telegram_user_id = YOUR_TEST_ID;
   ```
4. Напишите `/start` в Telegram боте
5. Пройдите анкету
6. Проверьте, что после завершения можно добавлять расходы

## 🎯 Результат

- ✅ Новые пользователи проходят обязательную анкету
- ✅ До завершения онбординга функции бота недоступны
- ✅ Сохраняется выбранная валюта и тип использования
- ✅ Анкета доступна в Telegram и Mini App
- ✅ Можно редактировать профиль через команду `/settings`

## 📝 Дополнительные команды

### /settings - редактировать профиль
Вызывает `reset_onboarding(user_id)` и запускает анкету заново

### /profile - посмотреть свой профиль
Показывает текущие настройки из `get_user_profile(user_id)`
