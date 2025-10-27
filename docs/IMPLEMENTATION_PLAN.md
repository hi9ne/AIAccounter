# 📋 План реализации улучшений AI Accounter

Этот документ содержит подробный план всех 15 улучшений системы с примерами кода и инструкциями.

---

## ✅ 1. Обработка ошибок и валидация

**Статус:** ✅ Завершено  
**Файл:** `ErrorHandlingWorkflow.json`

### Что реализовано:
- ✅ Валидация суммы (не отрицательная, не больше 10 млн)
- ✅ Проверка формата даты (ДД.ММ.ГГГГ)
- ✅ Обязательная категория
- ✅ Проверка на дубликаты
- ✅ Логирование ошибок в отдельный лист Google Sheets

###  Как использовать:
1. Импортируйте `ErrorHandlingWorkflow.json` в n8n
2. Создайте лист "Логи ошибок" в вашей Google Таблице со столбцами:
   - Timestamp
   - Error Type
   - User ID
   - Data
   - Message
3. Подключите этот workflow к основному через HTTP Request или Execute Workflow

---

## 🤖 2. Расширенные команды бота

**Статус:** 🔄 В процессе

### Новые команды:

#### `/start` - Приветствие
```
🎉 Добро пожаловать в AI Accounter!
💰 Я помогу вам вести учёт финансов.
```

#### `/help` - Полная справка
Показывает все доступные команды с примерами

#### `/budget <сумма>` - Установка бюджета
```
Пример: /budget 100000
Установит месячный бюджет в 100 000 ₽
```

#### `/limit <категория> <сумма>` - Лимит по категории
```
Пример: /limit продукты 15000
Установит лимит на продукты 15 000 ₽ в месяц
```

#### `/export` - Экспорт данных
Экспортирует все данные в Excel файл и отправляет в чат

#### `/compare <период1> <период2>` - Сравнение периодов
```
Пример: /compare апрель май
Сравнит расходы и доходы за апрель и май
```

#### `/forecast` - Прогноз расходов
Анализирует историю и прогнозирует расходы на следующий месяц

#### `/tax <тип>` - Расчёт налогов
```
/tax усн6 - УСН 6% от доходов
/tax усн15 - УСН 15% (доходы - расходы)
/tax ндс - НДС 20%
/tax взносы - Страховые взносы ИП
```

#### `/report <период>` - Генерация отчёта
```
/report день - за сегодня
/report неделя - за текущую неделю
/report месяц - за текущий месяц
/report квартал - за квартал
/report год - за год
```

### Как реализовать:
1. Создайте новый workflow в n8n
2. Добавьте Telegram Trigger node
3. Добавьте Switch node для роутинга команд
4. Для каждой команды создайте обработчик

---

## 📧 3. Парсинг банковских уведомлений

**Статус:** ⏳ Ожидает

### Поддерживаемые банки:

#### **Сбербанк** (SMS/Email)
Формат SMS: `Покупка 1,234.56р МАГАЗИН 01.01.23 12:34 Карта *1234 Доступно 10,000р`

```javascript
// Regex для парсинга Сбербанк
const sberPattern = /(?:Покупка|Оплата|Списание)\s+([\d,\.]+)р\s+(.+?)\s+(\d{2}\.\d{2}\.\d{2})/;
const match = smsText.match(sberPattern);

if (match) {
  return {
    amount: parseFloat(match[1].replace(',', '.')),
    description: match[2].trim(),
    date: match[3],
    bank: 'Сбербанк'
  };
}
```

#### **Тинькофф** (Push/Email)
Формат: `Покупка, -350 ₽ OZON.RU Баланс: 12,345.67 ₽`

```javascript
// Regex для Тинькофф
const tinkoffPattern = /(?:Покупка|Оплата),\s*-?([\d,\.]+)\s*₽\s+(.+?)\s+Баланс:/;
const match = pushText.match(tinkoffPattern);

if (match) {
  return {
    amount: parseFloat(match[1].replace(',', '')),
    description: match[2].trim(),
    date: new Date().toISOString(),
    bank: 'Тинькофф'
  };
}
```

#### **Альфа-Банк** (SMS)
Формат: `ALFA-BANK Покупка 1234.56 RUB МАГАЗИН Карта *1234`

```javascript
// Regex для Альфа-Банк
const alfaPattern = /ALFA-BANK\s+(?:Покупка|Оплата)\s+([\d\.]+)\s+RUB\s+(.+?)\s+Карта/;
const match = smsText.match(alfaPattern);

if (match) {
  return {
    amount: parseFloat(match[1]),
    description: match[2].trim(),
    date: new Date().toISOString(),
    bank: 'Альфа-Банк'
  };
}
```

### Архитектура workflow:

```
[Email Trigger/IMAP] 
    ↓
[Parse Bank Name]
    ↓
[Switch: Bank Type]
    ├→ [Parse Sberbank]
    ├→ [Parse Tinkoff]
    └→ [Parse Alfa-Bank]
        ↓
[AI Category Detection] (OpenAI)
    ↓
[Validation]
    ↓
[Save to Google Sheets]
    ↓
[Send Telegram Notification]
```

---

## 📊 4. Генерация PDF/Excel отчётов

**Статус:** ⏳ Ожидает

### PDF Отчёты (с графиками)

#### Используемые инструменты:
- HTML Template + Puppeteer (через n8n)
- Google Charts API для графиков
- Custom CSS для стилизации

#### Структура отчёта:
```html
<!DOCTYPE html>
<html>
<head>
    <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
    <style>
        body { font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>💰 Финансовый отчёт</h1>
        <p>{{ period }}</p>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <h3>Доходы</h3>
            <p class="amount positive">{{ income }} ₽</p>
        </div>
        <div class="stat-card">
            <h3>Расходы</h3>
            <p class="amount negative">{{ expenses }} ₽</p>
        </div>
        <div class="stat-card">
            <h3>Прибыль</h3>
            <p class="amount">{{ profit }} ₽</p>
        </div>
    </div>
    
    <div id="pie_chart" style="width: 100%; height: 400px;"></div>
    <div id="line_chart" style="width: 100%; height: 400px;"></div>
    
    <script>
        google.charts.load('current', {'packages':['corechart']});
        google.charts.setOnLoadCallback(drawCharts);
        
        function drawCharts() {
            // Круговая диаграмма категорий
            var pieData = google.visualization.arrayToDataTable([
                ['Category', 'Amount'],
                {{ categories_data }}
            ]);
            
            var pieOptions = {
                title: 'Расходы по категориям',
                colors: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b']
            };
            
            var pieChart = new google.visualization.PieChart(document.getElementById('pie_chart'));
            pieChart.draw(pieData, pieOptions);
            
            // Линейный график динамики
            var lineData = google.visualization.arrayToDataTable([
                ['Date', 'Income', 'Expenses'],
                {{ timeline_data }}
            ]);
            
            var lineOptions = {
                title: 'Динамика доходов и расходов',
                curveType: 'function',
                colors: ['#28a745', '#dc3545']
            };
            
            var lineChart = new google.visualization.LineChart(document.getElementById('line_chart'));
            lineChart.draw(lineData, lineOptions);
        }
    </script>
</body>
</html>
```

### Excel Отчёты

#### n8n Nodes:
1. **Google Sheets → Read Data**
2. **Code Node → Process Data**
3. **Spreadsheet File Node → Create Excel**
4. **Telegram Node → Send File**

```javascript
// Code Node для подготовки данных
const transactions = $input.all();

// Группировка по категориям
const byCategory = transactions.reduce((acc, t) => {
  const cat = t.json.category;
  if (!acc[cat]) acc[cat] = 0;
  acc[cat] += t.json.amount;
  return acc;
}, {});

// Подготовка для Excel
return Object.entries(byCategory).map(([category, amount]) => ({
  json: {
    'Категория': category,
    'Сумма': amount,
    '% от общей суммы': (amount / totalExpenses * 100).toFixed(2) + '%'
  }
}));
```

---

## 💰 5. Система бюджетирования

**Статус:** ⏳ Ожидает

### Функции:

#### 1. Установка бюджета
- Общий месячный бюджет
- Лимиты по категориям
- Автоматический расчёт остатка

#### 2. Уведомления
- **80% бюджета** - предупреждение
- **100% бюджета** - критическое уведомление
- **Превышение лимита** по категории

#### 3. Хранение данных
Создайте листы в Google Sheets:

**Лист "Бюджеты":**
| User ID | Month | Budget Amount | Current Spent | Remaining |
|---------|-------|---------------|---------------|-----------|
| 123456  | январь 2025 | 100000 | 45000 | 55000 |

**Лист "Лимиты":**
| User ID | Category | Limit Amount | Current Spent | Month |
|---------|----------|--------------|---------------|-------|
| 123456  | продукты | 15000 | 8500 | январь 2025 |

### Workflow для проверки бюджета:

```
[After Transaction Save]
    ↓
[Read Current Budget]
    ↓
[Calculate Total Spent]
    ↓
[Check Percentage]
    ├→ >= 80% → [Send Warning]
    ├→ >= 100% → [Send Critical Alert]
    └→ < 80% → [Continue]
        ↓
[Check Category Limit]
    ├→ Exceeded → [Send Category Alert]
    └→ OK → [End]
```

---

## 💸 6. Налоговый калькулятор

**Статус:** ⏳ Ожидает

### Поддерживаемые системы налогообложения:

#### **УСН 6% (Упрощенная система, доходы)**
```javascript
// Расчёт УСН 6%
const income = getTotalIncome(period);
const taxBase = income;
const taxRate = 0.06;
const taxAmount = taxBase * taxRate;

// Уменьшение на страховые взносы (макс 50%)
const insurancePayments = getInsurancePayments(period);
const maxDeduction = taxAmount * 0.5;
const deduction = Math.min(insurancePayments, maxDeduction);
const finalTax = taxAmount - deduction;

return {
  income: income,
  taxBase: taxBase,
  taxBeforeDeduction: taxAmount,
  insuranceDeduction: deduction,
  finalTax: finalTax,
  message: `
📊 Расчёт УСН 6%

💰 Доходы: ${income.toLocaleString()} ₽
📈 Налоговая база: ${taxBase.toLocaleString()} ₽
💸 Налог (6%): ${taxAmount.toLocaleString()} ₽
🔻 Вычет (страх.взносы): ${deduction.toLocaleString()} ₽
✅ Налог к уплате: ${finalTax.toLocaleString()} ₽
  `
};
```

#### **УСН 15% (Упрощенная система, доходы минус расходы)**
```javascript
// Расчёт УСН 15%
const income = getTotalIncome(period);
const expenses = getTotalExpenses(period);
const taxBase = Math.max(income - expenses, 0);
const taxRate = 0.15;
const taxAmount = taxBase * taxRate;

// Минимальный налог (1% от доходов)
const minTax = income * 0.01;
const finalTax = Math.max(taxAmount, minTax);

return {
  income: income,
  expenses: expenses,
  profit: taxBase,
  taxAmount: taxAmount,
  minTax: minTax,
  finalTax: finalTax,
  message: `
📊 Расчёт УСН 15%

💰 Доходы: ${income.toLocaleString()} ₽
💸 Расходы: ${expenses.toLocaleString()} ₽
📈 Прибыль: ${taxBase.toLocaleString()} ₽
💸 Налог (15%): ${taxAmount.toLocaleString()} ₽
⚠️ Минимальный налог (1%): ${minTax.toLocaleString()} ₽
✅ Налог к уплате: ${finalTax.toLocaleString()} ₽
  `
};
```

#### **НДС 20%**
```javascript
// Расчёт НДС
const totalWithVAT = getTotalIncome(period);
const vatRate = 0.20;
const vatAmount = totalWithVAT * vatRate / (1 + vatRate);
const baseAmount = totalWithVAT - vatAmount;

return {
  totalWithVAT: totalWithVAT,
  baseAmount: baseAmount,
  vatAmount: vatAmount,
  message: `
📊 Расчёт НДС 20%

💰 Сумма с НДС: ${totalWithVAT.toLocaleString()} ₽
📉 Сумма без НДС: ${baseAmount.toLocaleString()} ₽
💸 НДС к уплате: ${vatAmount.toLocaleString()} ₽
  `
};
```

#### **Страховые взносы ИП (2025)**
```javascript
// Фиксированные взносы ИП на 2025 год
const pensionInsurance = 49500; // ПФР
const medicalInsurance = 16000; // ФОМС
const fixedTotal = pensionInsurance + medicalInsurance;

// Дополнительный взнос (1% с доходов свыше 300k)
const income = getTotalIncome(period);
const additionalBase = Math.max(income - 300000, 0);
const additionalPayment = additionalBase * 0.01;
const maxAdditional = pensionInsurance * 8; // Максимум 8-кратный размер
const finalAdditional = Math.min(additionalPayment, maxAdditional);

const total = fixedTotal + finalAdditional;

return {
  pensionFixed: pensionInsurance,
  medicalFixed: medicalInsurance,
  fixedTotal: fixedTotal,
  income: income,
  additionalPayment: finalAdditional,
  total: total,
  message: `
📊 Страховые взносы ИП (2025)

Фиксированные взносы:
💰 ПФР: ${pensionInsurance.toLocaleString()} ₽
🏥 ФОМС: ${medicalInsurance.toLocaleString()} ₽
📊 Итого фиксированных: ${fixedTotal.toLocaleString()} ₽

Дополнительные взносы:
💸 Доходы: ${income.toLocaleString()} ₽
📈 База (свыше 300k): ${additionalBase.toLocaleString()} ₽
💰 Доп. взнос (1%): ${finalAdditional.toLocaleString()} ₽

✅ ВСЕГО К УПЛАТЕ: ${total.toLocaleString()} ₽
  `
};
```

### Напоминания о сроках уплаты:

```javascript
// Даты уплаты налогов
const taxDeadlines = {
  'УСН': [
    { date: '2025-04-25', type: 'Авансовый платеж за 1 квартал' },
    { date: '2025-07-25', type: 'Авансовый платеж за полугодие' },
    { date: '2025-10-25', type: 'Авансовый платеж за 9 месяцев' },
    { date: '2026-04-28', type: 'Годовой налог за 2025' }
  ],
  'Страховые взносы': [
    { date: '2025-12-31', type: 'Фиксированные взносы' },
    { date: '2026-07-01', type: 'Дополнительные взносы (1%)' }
  ]
};

// Отправка напоминаний за 7 дней
```

---

## 📅 7. Еженедельные автоматические сводки

**Статус:** ⏳ Ожидает

### Schedule Trigger (Cron):
- **Каждое воскресенье в 20:00**
- Часовой пояс: Asia/Novosibirsk

### Формат сводки:

```
📊 Недельная финансовая сводка
🗓 23.10 - 29.10.2025

💰 ДОХОДЫ: 85,000 ₽
💸 РАСХОДЫ: 42,500 ₽
📈 ПРИБЫЛЬ: 42,500 ₽ (+5% к прошлой неделе)

🏆 ТОП-3 КАТЕГОРИИ РАСХОДОВ:
1️⃣ Продукты питания: 12,000 ₽ (28%)
2️⃣ Транспорт: 8,500 ₽ (20%)
3️⃣ Развлечения: 6,000 ₽ (14%)

📊 СРАВНЕНИЕ С ПРОШЛОЙ НЕДЕЛЕЙ:
Доходы: +8,000 ₽ (↑10%)
Расходы: -2,500 ₽ (↓6%)

💡 РЕКОМЕНДАЦИИ:
• Расходы на продукты выше среднего на 15%
• Отличная работа! Прибыль выросла
• До лимита по транспорту осталось: 3,500 ₽

⏰ НАПОМИНАНИЯ:
• 25 апреля - уплата авансового платежа УСН
• 31 декабря - страховые взносы ИП
```

### Workflow структура:

```
[Schedule Trigger: Sundays 20:00]
    ↓
[Get Week Range]
    ↓
[Read Transactions from Sheets]
    ↓
[Calculate Statistics]
    ├→ Total Income
    ├→ Total Expenses
    ├→ Profit
    ├→ Top Categories
    └→ Week-over-week Comparison
        ↓
[Generate Message with AI]
    ↓
[Get All Active Users]
    ↓
[For Each User]
    └→ [Send Telegram Message]
```

---

## 🤖 8. Улучшенный AI-промпт

**Статус:** ⏳ Ожидает

### Дополнения к системному промпту:

```
🔄 РАСПОЗНАВАНИЕ ПОДПИСОК:
Если пользователь упоминает регулярные платежи, определи это как подписку:
- "Оплатил Netflix 999 руб" → Подписка: Netflix, 999₽/месяц
- "Продлил Spotify" → Спроси сумму и сохрани как подписку

Автоматически предлагай отслеживать подписки:
"💡 Это похоже на подписку. Хотите, чтобы я напоминал о следующем платеже?"

📊 АНАЛИЗ И РЕКОМЕНДАЦИИ:
После каждой значительной траты (>5000₽) предлагай:
- Сравнение с прошлым месяцем по этой категории
- Процент от месячного бюджета
- Альтернативные варианты экономии (если применимо)

⚠️ ПРЕДУПРЕЖДЕНИЯ О БЮДЖЕТЕ:
Проверяй лимиты после каждой операции:
- Если потрачено >80% лимита категории: "⚠️ Внимание! Использовано 85% лимита на продукты"
- Если превышен лимит: "🚨 Превышен лимит на развлечения на 2,500₽"
- Если близок месячный бюджет: "⚠️ Осталось 15% от месячного бюджета"

💡 УМНЫЕ ВОПРОСЫ:
Задавай уточняющие вопросы:
- "Купил телефон за 50000" → "Это для бизнеса или личное? Это поможет правильно учесть расход"
- "Оплатил рекламу" → "В какой платформе? (Google Ads, Яндекс.Директ, VK Реклама)"

📈 ПРОАКТИВНАЯ АНАЛИТИКА:
В конце каждого дня (если были транзакции):
"📊 За сегодня: Доходы +15,000₽, Расходы -3,500₽. Прибыль: +11,500₽
Осталось до конца месяца: 45,000₽ от бюджета (65%)"

🎯 ЦЕЛИ И ПЛАНИРОВАНИЕ:
Помогай ставить финансовые цели:
- "Хочу накопить 500000 на отпуск" → Рассчитай сколько откладывать в месяц
- "Нужно снизить расходы на 20%" → Проанализируй где можно сэкономить

🔍 АНОМАЛИИ:
Автоматически определяй необычные траты:
- "⚠️ Расход на такси сегодня в 3 раза выше среднего"
- "💡 Странно, обычно вы не тратите больше 2000₽ на кафе"

📅 СЕЗОННОСТЬ:
Учитывай сезонные паттерны:
- "В декабре расходы обычно на 30% выше из-за праздников"
- "Летом траты на транспорт снижаются на 40%"
```

---

## 👥 9. Многопользовательность

**Статус:** ⏳ Ожидает

### Архитектура:

#### 1. Идентификация пользователя
```javascript
// В каждом workflow добавить
const userId = $json.message.from.id;
const userName = $json.message.from.username;
const firstName = $json.message.from.first_name;
```

#### 2. Структура Google Sheets

**Вариант A: Отдельные листы для каждого пользователя**
```
Таблица: "Финансы"
├─ Доходы_123456 (User ID)
├─ Расходы_123456
├─ Доходы_789012
├─ Расходы_789012
└─ Пользователи (справочник)
```

**Вариант B: Один лист с колонкой User ID** (Рекомендуется)
```
Таблица: "Финансы"
├─ Доходы (User ID | Дата | Категория | Сумма | ...)
├─ Расходы (User ID | Дата | Категория | Сумма | ...)
└─ Пользователи (User ID | Username | First Name | Registered Date | Settings)
```

#### 3. Фильтрация данных

В каждом workflow добавить фильтр:
```javascript
// Google Sheets Read Node - Options
{
  "filtersUI": {
    "values": [
      {
        "lookupColumn": "User ID",
        "lookupValue": "={{ $json.user_id }}"
      }
    ]
  }
}
```

#### 4. Регистрация пользователя

При первом обращении:
```javascript
// Check if user exists
const userId = $json.message.from.id;
const existingUser = await checkUserExists(userId);

if (!existingUser) {
  // Register new user
  await registerUser({
    user_id: userId,
    username: $json.message.from.username,
    first_name: $json.message.from.first_name,
    registered_date: new Date().toISOString(),
    settings: {
      language: 'ru',
      timezone: 'Asia/Novosibirsk',
      currency: 'RUB',
      budget: null,
      categories: []
    }
  });
  
  // Send welcome message
  return "🎉 Добро пожаловать! Ваш аккаунт создан.";
}
```

#### 5. Настройки пользователя

Лист "Настройки пользователей":
| User ID | Language | Timezone | Currency | Weekly Report | Budget Alerts |
|---------|----------|----------|----------|---------------|---------------|
| 123456  | ru | Asia/Novosibirsk | RUB | true | true |

---

## 🔗 10-11. Интеграции с CRM и платежными системами

**Статус:** ⏳ Ожидает

### **Bitrix24**
```javascript
// Webhook для получения сделок
const bitrix24Url = 'https://your-domain.bitrix24.ru/rest/1/xxxxx/crm.deal.list';

// Sync closed deals as income
const deals = await fetchClosedDeals(bitrix24Url, { dateFrom, dateTo });

deals.forEach(deal => {
  addIncome({
    date: deal.CLOSEDATE,
    amount: deal.OPPORTUNITY,
    category: 'продажи товаров',
    description: `Сделка: ${deal.TITLE}`,
    source: 'Bitrix24'
  });
});
```

### **amoCRM**
```javascript
// API амоCRM
const amoApiUrl = 'https://your-domain.amocrm.ru/api/v4/leads';
const headers = {
  'Authorization': `Bearer ${amoAccessToken}`
};

const closedLeads = await fetch(`${amoApiUrl}?filter[statuses][0][id]=142`, { headers });
// 142 - status_id "Успешно реализовано"
```

### **Stripe**
```javascript
// Webhook для Stripe
app.post('/webhook/stripe', async (req, res) => {
  const event = req.body;
  
  if (event.type === 'payment_intent.succeeded') {
    const payment = event.data.object;
    
    await addIncome({
      date: new Date(payment.created * 1000).toISOString(),
      amount: payment.amount / 100, // cents to rubles
      category: 'продажи услуг',
      description: `Stripe payment: ${payment.description}`,
      source: 'Stripe'
    });
  }
  
  res.json({ received: true });
});
```

### **YooMoney (ЮMoney)**
```javascript
// Webhook YooMoney
app.post('/webhook/yoomoney', async (req, res) => {
  const notification = req.body;
  
  // Verify signature
  const hash = crypto
    .createHash('sha1')
    .update(`${notification.notification_type}&${notification.operation_id}&${notification.amount}&${notification.currency}&${notification.datetime}&${notification.sender}&${notification.codepro}&${notificationSecret}&${notification.label}`)
    .digest('hex');
  
  if (hash === notification.sha1_hash) {
    await addIncome({
      date: notification.datetime,
      amount: parseFloat(notification.amount),
      category: 'продажи услуг',
      description: `ЮMoney: ${notification.label}`,
      source: 'YooMoney'
    });
  }
  
  res.status(200).send();
});
```

### **Tinkoff API**
```javascript
// Tinkoff Business API
const tinkoffApi = 'https://business.tinkoff.ru/openapi/api/v1';
const headers = {
  'Authorization': `Bearer ${tinkoffToken}`
};

// Получить выписку
const statement = await fetch(`${tinkoffApi}/bank-statement?from=${dateFrom}&to=${dateTo}`, { headers });

statement.operation.forEach(op => {
  if (op.operationType === 'Debit') {
    addIncome({
      date: op.operationDate,
      amount: op.amount,
      category: detectCategory(op.description),
      description: op.description,
      source: 'Tinkoff'
    });
  }
});
```

---

## 📱 12. Улучшение Mini App

**Статус:** ⏳ Ожидает

### Добавить графики (Chart.js):

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

<canvas id="expensesPieChart"></canvas>
<canvas id="incomeExpensesLineChart"></canvas>

<script>
// Круговая диаграмма расходов по категориям
const pieCtx = document.getElementById('expensesPieChart').getContext('2d');
new Chart(pieCtx, {
    type: 'pie',
    data: {
        labels: ['Продукты', 'Транспорт', 'Развлечения', 'Здоровье', 'Прочее'],
        datasets: [{
            data: [12000, 8500, 6000, 4500, 3000],
            backgroundColor: [
                '#667eea',
                '#764ba2',
                '#f093fb',
                '#4facfe',
                '#43e97b'
            ]
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom'
            },
            title: {
                display: true,
                text: 'Расходы по категориям'
            }
        }
    }
});

// Линейный график динамики
const lineCtx = document.getElementById('incomeExpensesLineChart').getContext('2d');
new Chart(lineCtx, {
    type: 'line',
    data: {
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        datasets: [{
            label: 'Доходы',
            data: [0, 0, 0, 50000, 0, 25000, 0],
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            tension: 0.4
        }, {
            label: 'Расходы',
            data: [3000, 2500, 4000, 3500, 5000, 8000, 6000],
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'top'
            },
            title: {
                display: true,
                text: 'Динамика за неделю'
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});
</script>
```

### Добавить темную тему:

```css
/* Темная тема */
@media (prefers-color-scheme: dark) {
    :root {
        --bg-color: #1a1a1a;
        --text-color: #ffffff;
        --card-bg: #2d2d2d;
        --border-color: #404040;
    }
    
    body {
        background: var(--bg-color);
        color: var(--text-color);
    }
    
    .stat-card, .history-item {
        background: var(--card-bg);
        border-color: var(--border-color);
    }
}

/* Переключатель темы */
.theme-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--tg-theme-button-color);
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    cursor: pointer;
}
```

### Офлайн режим (PWA):

```javascript
// manifest.json
{
  "name": "AI Accounter",
  "short_name": "Accounter",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}

// service-worker.js
const CACHE_NAME = 'ai-accounter-v1';
const urlsToCache = [
  '/',
  '/TelegramMiniApp.html',
  '/styles.css',
  '/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### Редактирование операций:

```javascript
function editTransaction(id) {
    // Загрузить данные транзакции
    const transaction = transactions.find(t => t.id === id);
    
    // Заполнить форму
    document.getElementById('transaction-id').value = transaction.id;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('category').value = transaction.category;
    document.getElementById('description').value = transaction.description;
    
    // Показать кнопку "Обновить" вместо "Создать"
    document.getElementById('submit-btn').textContent = 'Обновить';
    document.getElementById('cancel-btn').style.display = 'block';
}

function deleteTransaction(id) {
    if (confirm('Удалить эту операцию?')) {
        tg.sendData(JSON.stringify({
            action: 'delete_transaction',
            id: id
        }));
    }
}
```

---

## 💾 13. Система резервного копирования

**Статус:** ⏳ Ожидает

### Автоматический backup в Google Drive:

```
[Schedule Trigger: Daily 03:00]
    ↓
[Read All Data from Sheets]
    ↓
[Create Excel File]
    ↓
[Upload to Google Drive]
    └→ Folder: "AIAccounter_Backups/2025/октябрь/"
        ↓
[Delete Old Backups] (> 90 days)
    ↓
[Send Notification] (weekly report)
```

### История изменений:

Создайте лист "История изменений":
| Timestamp | User ID | Action | Table | Row ID | Old Data | New Data |
|-----------|---------|--------|-------|--------|----------|----------|
| 2025-10-27 15:30 | 123456 | UPDATE | Расходы | 1234 | {"amount": 100} | {"amount": 150} |

### Восстановление данных:

```javascript
// Workflow для восстановления
function restoreFromBackup(backupDate) {
  // Загрузить backup файл
  const backupFile = await getBackupFromDrive(backupDate);
  
  // Создать копию текущих данных
  await createBackup('before_restore');
  
  // Восстановить данные
  await clearCurrentData();
  await importFromBackup(backupFile);
  
  return 'Данные восстановлены из резервной копии от ' + backupDate;
}
```

---

## 📊 14. Расширенная аналитика

**Статус:** ⏳ Ожидает

### Сравнение периодов:

```javascript
// Команда: /compare апрель май
async function comparePeriods(period1, period2) {
  const data1 = await getDataForPeriod(period1);
  const data2 = await getDataForPeriod(period2);
  
  return `
📊 Сравнение: ${period1} vs ${period2}

💰 ДОХОДЫ:
${period1}: ${data1.income.toLocaleString()} ₽
${period2}: ${data2.income.toLocaleString()} ₽
Изменение: ${((data2.income - data1.income) / data1.income * 100).toFixed(1)}%

💸 РАСХОДЫ:
${period1}: ${data1.expenses.toLocaleString()} ₽
${period2}: ${data2.expenses.toLocaleString()} ₽
Изменение: ${((data2.expenses - data1.expenses) / data1.expenses * 100).toFixed(1)}%

📈 ПРИБЫЛЬ:
${period1}: ${data1.profit.toLocaleString()} ₽
${period2}: ${data2.profit.toLocaleString()} ₽
Изменение: ${((data2.profit - data1.profit) / data1.profit * 100).toFixed(1)}%

📋 ТОП ИЗМЕНЕНИЯ ПО КАТЕГОРИЯМ:
${getTopChanges(data1.categories, data2.categories)}
  `;
}
```

### Топ категорий:

```javascript
function getTopCategories(period, type = 'expense', limit = 5) {
  const categories = getCategories(period, type);
  const sorted = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  let result = `🏆 ТОП-${limit} категорий ${type === 'expense' ? 'расходов' : 'доходов'}:\n\n`;
  
  sorted.forEach(([cat, amount], index) => {
    const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'][index];
    const percent = (amount / total * 100).toFixed(1);
    result += `${emoji} ${cat}: ${amount.toLocaleString()} ₽ (${percent}%)\n`;
  });
  
  return result;
}
```

### Прогнозирование:

```javascript
// Простой линейный прогноз на основе истории
function forecastNextMonth() {
  const last3Months = getLastNMonths(3);
  
  // Средние значения
  const avgIncome = calculateAverage(last3Months.map(m => m.income));
  const avgExpenses = calculateAverage(last3Months.map(m => m.expenses));
  
  // Тренд (растет или падает)
  const incomeTrend = calculateTrend(last3Months.map(m => m.income));
  const expensesTrend = calculateTrend(last3Months.map(m => m.expenses));
  
  // Прогноз
  const forecastIncome = avgIncome * (1 + incomeTrend);
  const forecastExpenses = avgExpenses * (1 + expensesTrend);
  const forecastProfit = forecastIncome - forecastExpenses;
  
  return `
🔮 Прогноз на следующий месяц

На основе данных за последние 3 месяца:

💰 Прогноз доходов: ${forecastIncome.toLocaleString()} ₽
   Тренд: ${incomeTrend > 0 ? '↗️' : '↘️'} ${(incomeTrend * 100).toFixed(1)}%

💸 Прогноз расходов: ${forecastExpenses.toLocaleString()} ₽
   Тренд: ${expensesTrend > 0 ? '↗️' : '↘️'} ${(expensesTrend * 100).toFixed(1)}%

📈 Ожидаемая прибыль: ${forecastProfit.toLocaleString()} ₽

💡 Точность прогноза: ±15%
  `;
}
```

### Выявление аномалий:

```javascript
function detectAnomalies(transactions) {
  const anomalies = [];
  
  // Средняя сумма по каждой категории
  const avgByCategory = calculateAverages(transactions);
  
  transactions.forEach(t => {
    const avg = avgByCategory[t.category];
    const deviation = (t.amount - avg) / avg;
    
    // Если отклонение больше 100%
    if (Math.abs(deviation) > 1.0) {
      anomalies.push({
        transaction: t,
        deviation: deviation,
        message: `⚠️ Необычная трата: ${t.category} - ${t.amount.toLocaleString()} ₽ 
(обычно ~${avg.toLocaleString()} ₽, отклонение ${(deviation * 100).toFixed(0)}%)`
      });
    }
  });
  
  return anomalies;
}
```

---

## 🎨 15. Кастомные категории

**Статус:** ⏳ Ожидает

### Команды для управления категориями:

```
/category add <название> <тип> <иконка> - Добавить категорию
/category edit <id> <параметр> <значение> - Редактировать
/category delete <id> - Удалить
/category list - Показать все категории
/category group <название_группы> <категория1,категория2> - Создать группу
```

### Структура хранения:

Лист "Пользовательские категории":
| User ID | Category ID | Name | Type | Icon | Color | Parent Group | Is Active |
|---------|-------------|------|------|------|-------|--------------|-----------|
| 123456  | custom_1 | Подписки | expense | 📱 | #667eea | Регулярные платежи | true |

### Примеры использования:

```javascript
// Добавление категории
user: "/category add Подписки расход 📱"
bot: "✅ Категория создана: 📱 Подписки (расход)"

// Создание группы
user: "/category group Регулярные Подписки,Интернет,Коммуналка"
bot: "✅ Группа создана: Регулярные
Включает: Подписки, Интернет, Коммуналка"

// Использование
user: "Оплатил Netflix 999 руб"
bot: "💾 Сохранено:
📱 Подписки: 999 ₽
📊 Группа: Регулярные платежи (3,500 ₽ в месяц)"
```

---

## 🎯 Следующие шаги

1. ✅ **Импортируйте ErrorHandlingWorkflow.json** в n8n
2. ⏳ Создайте дополнительные листы в Google Sheets
3. ⏳ Настройте credentials для всех интеграций
4. ⏳ Протестируйте каждый workflow отдельно
5. ⏳ Интегрируйте с основным workflow

---

## 📞 Поддержка

Если нужна помощь с реализацией конкретного пункта - спрашивайте! 

Я могу создать для вас:
- Готовые JSON файлы workflow
- Примеры кода
- Инструкции по настройке
- Скрипты для автоматизации

**Удачи с проектом! 🚀**
