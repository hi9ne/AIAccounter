# 📱 Telegram Mini App v2.2.0 - Руководство по настройке

## 🚀 Быстрый старт

### 1. Подготовка Mini App

**Структура проекта:**
```
miniapp/
├── index.html (179 lines) - Главная страница
├── style.css (395 lines) - Стили + v2.2.0 UI
├── app.js (411 lines) - JavaScript логика + v2.2.0 функции
└── miniapp-config.js - Конфигурация
```

**Важно:** Mini App теперь состоит из 3 файлов, а не одного монолитного HTML!

1. Убедитесь, что `miniapp-config.js` настроен:
   ```javascript
   mode: 'bot', // ✅ Безопасный режим
   n8nWebhook: null // ✅ Не используется в bot режиме
   ```

2. Все 3 файла должны быть на хостинге в одной папке

### 2. Варианты хостинга

#### Вариант A: GitHub Pages (рекомендуется 🌟)

**Преимущества:** Бесплатно, HTTPS автоматически, простое обновление

```bash
# 1. Создайте репозиторий на GitHub (если ещё нет)
cd C:\Users\KK\Desktop\AIAccounter
git init
git add miniapp/
git commit -m "Add Telegram Mini App v2.2.0"
git branch -M main
git remote add origin https://github.com/ВАШ_USERNAME/AIAccounter.git
git push -u origin main

# 2. Включите GitHub Pages:
# - Settings → Pages
# - Source: main branch
# - Folder: /miniapp
# - Save

# 3. Получите URL:
# https://ВАШ_USERNAME.github.io/AIAccounter/
```

#### Вариант B: Cloudflare Pages
```bash
# 1. Зарегистрируйтесь на pages.cloudflare.com
# 2. Подключите GitHub репозиторий
# 3. Укажите папку: miniapp
# 4. Deploy
# URL: https://aiaccounter.pages.dev
```

#### Вариант C: Vercel (бесплатно)
```bash
npm install -g vercel
cd miniapp
vercel --prod
# Получите URL: https://aiaccounter.vercel.app
```

#### Вариант D: Свой сервер (Nginx)
```nginx
server {
    listen 443 ssl;
    server_name miniapp.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/miniapp;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

Загрузите файлы:
```bash
scp -r miniapp/* user@server:/var/www/miniapp/
```

**⚠️ ВАЖНО:** Все 3 файла (index.html, style.css, app.js) должны быть в одной папке!

### 3. Регистрация Mini App в Telegram

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/mybots`
3. Выберите вашего бота (например @AIAccounterBot)
4. Нажмите **Bot Settings** → **Menu Button**
5. Отправьте `/setmenubutton`
6. Введите название кнопки: `💼 Открыть приложение`
7. Вставьте URL: `https://ВАШ_USERNAME.github.io/AIAccounter/`

**Альтернативный способ (через /newapp):**
```
/newapp
→ Выберите бота

Название: AI Accounter
Описание: Учёт финансов для бизнеса в Кыргызстане v2.2.0
Фото: Загрузите иконку 512x512 px
Demo GIF: /empty (необязательно)
URL: https://ВАШ_USERNAME.github.io/AIAccounter/
```

**Проверка:**
```
/mybots → Ваш бот → Bot Settings → Menu Button
```

Должно быть:
```
💼 Открыть приложение
URL: https://ВАШ_USERNAME.github.io/AIAccounter/
```

### 4. Настройка n8n для Mini App

#### Шаг 1: Обновите Telegram Bot Trigger

Откройте workflow **AnaliziFinance.json** в n8n:

1. Найдите узел **Telegram Bot Trigger** (первый узел)
2. Добавьте `web_app_data` в настройки:
   ```json
   {
     "updates": ["message", "callback_query", "inline_query", "web_app_data"]
   }
   ```

#### Шаг 2: Добавьте обработку Web App Data

После Telegram Trigger добавьте узел **Switch** "Determine Message Type":

```javascript
// Условие 1: Mini App Data
$json.message.web_app_data !== undefined

// Условие 2: Text Command  
$json.message.text !== undefined
```

#### Шаг 3: Парсинг данных из Mini App

Добавьте узел **Function** "Parse Mini App Data":

```javascript
const webAppData = $input.item.json.message.web_app_data.data;
const parsedData = JSON.parse(webAppData);

// Структура parsedData:
// {
//   action: 'add_transaction' | 'edit_transaction' | 'delete_transaction' | 
//           'restore_transaction' | 'get_stats' | 'get_history' | 
//           'get_transaction_history' | 'generate_report',
//   data: { ... }
// }

return {
  json: {
    action: parsedData.action,
    data: parsedData.data,
    userId: $input.item.json.message.from.id,
    chatId: $input.item.json.message.chat.id,
    username: $input.item.json.message.from.username || 'Unknown'
  }
};
```

#### Шаг 4: Маршрутизация по действиям

Добавьте узел **Switch** "Route by Action":

```javascript
// Output 1: add_transaction
{{ $json.action === 'add_transaction' }}

// Output 2: edit_transaction (v2.2.0)
{{ $json.action === 'edit_transaction' }}

// Output 3: delete_transaction (v2.2.0)
{{ $json.action === 'delete_transaction' }}

// Output 4: restore_transaction (v2.2.0)
{{ $json.action === 'restore_transaction' }}

// Output 5: get_stats
{{ $json.action === 'get_stats' }}

// Output 6: get_history
{{ $json.action === 'get_history' }}

// Output 7: get_transaction_history (v2.2.0)
{{ $json.action === 'get_transaction_history' }}

// Output 8: generate_report
{{ $json.action === 'generate_report' }}
```

#### Шаг 5: Подключите существующие узлы

Для каждого действия подключите соответствующие узлы из AnaliziFinance.json:

- **add_transaction** → узлы добавления дохода/расхода
- **edit_transaction** → узлы редактирования (v2.2.0)
- **delete_transaction** → узлы мягкого удаления (v2.2.0)
- **restore_transaction** → узлы восстановления (v2.2.0)
- **get_stats** → узлы статистики
- **get_history** → узлы истории

#### Шаг 6: Отправка ответа

Добавьте узел **Telegram** "Send Response to Mini App":

```javascript
// Для успешных операций
{
  "chatId": "={{ $json.chatId }}",
  "text": "✅ {{ $json.successMessage }}",
  "reply_markup": {
    "inline_keyboard": [[
      {
        "text": "📱 Открыть приложение",
        "web_app": {
          "url": "https://ВАШ_USERNAME.github.io/AIAccounter/"
        }
      }
    ]]
  }
}
```

**Примеры сообщений:**

| Действие | Сообщение |
|----------|-----------|
| add_transaction | ✅ Транзакция добавлена!\n\nСумма: 1000 KGS\nКатегория: Продукты питания |
| edit_transaction | ✅ Транзакция #15 изменена!\n\nПоле: category\nНовое значение: Тестовая категория |
| delete_transaction | ✅ Транзакция #15 удалена!\n\nВы можете восстановить её из истории. |
| restore_transaction | ✅ Транзакция #15 восстановлена! |

---

### 4.1 Пример: Обработка add_transaction

```javascript
// После Switch "Route by Action" → Output "add_transaction"

// Узел Function "Prepare Transaction Data"
const data = $json.data;
return {
  json: {
    type: data.type, // 'income' | 'expense'
    amount: parseFloat(data.amount),
    currency: data.currency || 'KGS',
    category: data.category,
    description: data.description || '',
    date: data.date,
    time: data.time || '00:00',
    userId: $json.userId,
    username: $json.username
  }
};

// Узел PostgreSQL "Insert Transaction"
const table = $json.type === 'income' ? 'income' : 'expenses';
const query = `
  INSERT INTO ${table} 
  (amount, currency, category, description, date, time, telegram_user_id, username, created_at)
  VALUES 
  ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  RETURNING id, amount, currency, category
`;

const params = [
  $json.amount,
  $json.currency,
  $json.category,
  $json.description,
  $json.date,
  $json.time,
  $json.userId,
  $json.username
];

// Узел Telegram "Send Confirmation"
✅ Транзакция добавлена!

Сумма: {{ $json.amount }} {{ $json.currency }}
Категория: {{ $json.category }}
ID: #{{ $json.id }}
```

---

### 4.2 Пример: Обработка edit_transaction (v2.2.0)

```javascript
// После Switch "Route by Action" → Output "edit_transaction"

// Узел Function "Prepare Edit Data"
const data = $json.data;
return {
  json: {
    transactionId: data.transaction_id,
    transactionType: data.transaction_type, // 'income' | 'expense'
    field: data.field.toLowerCase(),
    newValue: data.new_value,
    userId: $json.userId
  }
};

// Узел PostgreSQL "Get Old Value"
const table = $json.transactionType === 'income' ? 'income' : 'expenses';
SELECT ${$json.field} AS old_value 
FROM ${table} 
WHERE id = $1 AND telegram_user_id = $2 AND deleted_at IS NULL

// Узел PostgreSQL "Update Transaction"
const table = $json.transactionType === 'income' ? 'income' : 'expenses';
UPDATE ${table} 
SET ${$json.field} = $1, updated_at = NOW() 
WHERE id = $2 AND telegram_user_id = $3 AND deleted_at IS NULL
RETURNING *

// Узел PostgreSQL "Log to transaction_history"
INSERT INTO transaction_history 
(transaction_id, transaction_type, action, field_changed, old_value, new_value, changed_by, changed_at)
VALUES 
($1, $2, 'EDIT', $3, $4, $5, $6, NOW())

// Узел Telegram "Send Confirmation"
✅ Транзакция #{{ $json.transactionId }} изменена!

Поле: {{ $json.field }}
Было: {{ $json.oldValue }}
Стало: {{ $json.newValue }}
```

### 5. Тестирование

#### Шаг 1: Откройте Mini App в Telegram

1. Найдите вашего бота в Telegram
2. Нажмите на **Menu Button** (💼 Открыть приложение)
3. Или отправьте `/start` и нажмите кнопку Mini App

#### Шаг 2: Проверьте добавление транзакции

1. Вкладка **Добавить**
2. Тип: **Расход**
3. Сумма: **1000**
4. Валюта: **KGS**
5. Категория: **Продукты питания**
6. Описание: **Тест Mini App v2.2.0**
7. Нажмите **Добавить транзакцию**

**Ожидаемый результат:**
- ✅ Уведомление "Транзакция 1000 с отправлена!"
- ✅ Форма очистилась
- ✅ Бот отправил подтверждение в чат

#### Шаг 3: Проверьте статистику

1. Вкладка **Статистика**
2. Нажмите 🔄

**Ожидаемый результат:**
- Доход за месяц отображается
- Расходы за месяц отображаются
- Прибыль рассчитана корректно
- Количество транзакций верное

#### Шаг 4: Проверьте историю

1. Вкладка **История**
2. Фильтр: **Все**

**Ожидаемый результат:**
- Список всех транзакций
- У каждой есть кнопки действий

#### Шаг 5: Проверьте v2.2.0 функции

**Тест 1: Редактирование**
1. Нажмите **✏️ Изменить** на транзакции
2. Введите поле: `category`
3. Введите значение: `Тестовая категория`
4. ✅ Бот должен подтвердить изменение
5. ✅ История должна обновиться

**Тест 2: Удаление**
1. Нажмите **🗑️ Удалить**
2. Подтвердите удаление
3. ✅ Транзакция станет полосатой
4. ✅ Появится метка "Удалено"
5. ✅ Вместо Edit/Delete появится кнопка Restore

**Тест 3: Восстановление**
1. Найдите удалённую транзакцию
2. Нажмите **🔄 Восстановить**
3. ✅ Транзакция вернётся к нормальному виду
4. ✅ Метка "Удалено" исчезнет

**Тест 4: История изменений**
1. Нажмите **📜 История** на транзакции
2. ✅ Откроется alert с журналом изменений
3. ✅ Показаны все правки (field, old → new value, дата)

#### Шаг 6: Проверьте голосовой ввод

1. Вкладка **Добавить**
2. Нажмите кнопку **🎤**
3. Произнесите описание
4. ✅ Текст должен появиться в поле "Описание"

**Примечание:** Голосовой ввод работает не во всех браузерах

### 6. Отладка

#### Включение консоли разработчика

**Telegram Desktop (Windows/Mac/Linux):**
1. Нажмите `Ctrl+Shift+I` (Windows) или `Cmd+Option+I` (Mac)
2. Откроется DevTools
3. Перейдите на вкладку Console

**Telegram Web:**
1. Нажмите `F12`
2. Откроется DevTools браузера

**Telegram Mobile (Android/iOS):**
1. Добавьте Eruda для отладки:
   ```html
   <!-- В index.html перед </body> -->
   <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
   <script>eruda.init();</script>
   ```
2. Откройте Mini App
3. В правом нижнем углу появится иконка консоли

#### Проверка подключения

```javascript
// Откройте Console и выполните:
console.log('Telegram WebApp:', window.Telegram.WebApp);
console.log('User ID:', window.Telegram.WebApp.initDataUnsafe.user?.id);
console.log('Config:', config); // Из miniapp-config.js
```

#### Частые проблемы

**Проблема 1: Mini App не открывается**

Симптомы:
- При нажатии на Menu Button ничего не происходит
- Или открывается пустая страница

Решение:
1. Проверьте URL в @BotFather - должен быть HTTPS
2. Откройте URL в браузере - должна открыться страница
3. Проверьте консоль на ошибки загрузки CSS/JS:
   ```
   Failed to load resource: style.css
   Failed to load resource: app.js
   ```
4. Убедитесь, что все 3 файла в одной папке на хостинге

**Проблема 2: CSS не применяется**

Симптомы:
- Страница без стилей, чёрный текст на белом фоне
- Layout сломан

Решение:
1. Проверьте путь к CSS в `index.html`:
   ```html
   <link rel="stylesheet" href="style.css">
   ```
2. Убедитесь, что `style.css` находится в той же папке
3. Проверьте Network tab в DevTools - файл должен загрузиться со статусом 200

**Проблема 3: JavaScript не работает**

Симптомы:
- Кнопки не реагируют
- Форма не отправляется
- Нет переключения вкладок

Решение:
1. Откройте Console в DevTools
2. Проверьте ошибки JavaScript
3. Убедитесь, что `app.js` загружается:
   ```html
   <script src="app.js"></script>
   ```
4. Проверьте инициализацию Telegram WebApp:
   ```javascript
   const tg = window.Telegram.WebApp;
   if (!tg) {
     console.error('Telegram WebApp API not available');
   }
   ```

**Проблема 4: Данные не отправляются боту**

Симптомы:
- При нажатии "Добавить транзакцию" ничего не происходит
- Бот не отвечает
- В консоли нет ошибок

Решение:
1. Убедитесь, что Mini App открыт **внутри Telegram**, а не в обычном браузере
   ```javascript
   // В обычном браузере window.Telegram.WebApp будет undefined
   if (!window.Telegram?.WebApp) {
     alert('Откройте приложение через Telegram Bot!');
   }
   ```

2. Проверьте n8n workflow - должен быть активен

3. Проверьте Telegram Bot Trigger в n8n:
   ```json
   {
     "updates": ["message", "callback_query", "web_app_data"]
   }
   ```

4. Проверьте логи n8n на ошибки (Settings → Log Streaming)

**Проблема 5: Статистика не загружается**

Симптомы:
- Вкладка "Статистика" пустая
- Показывает "0 с" везде

Решение:
1. Проверьте, что n8n обрабатывает действие `get_stats`
2. Проверьте SQL запрос в PostgreSQL узле:
   ```sql
   SELECT 
     COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
     COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expenses,
     COUNT(*) as count
   FROM (
     SELECT amount, 'income' as type FROM income WHERE deleted_at IS NULL
     UNION ALL
     SELECT amount, 'expense' as type FROM expenses WHERE deleted_at IS NULL
   ) t
   WHERE EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
   ```

3. Убедитесь, что ответ возвращается в формате:
   ```json
   {
     "income": 50000,
     "expenses": 30000,
     "profit": 20000,
     "count": 15,
     "currency": "KGS"
   }
   ```

4. Проверьте функцию `updateStats()` в `app.js`

**Проблема 6: v2.2.0 функции не работают (Edit/Delete/Restore)**

Симптомы:
- Кнопки Edit/Delete/Restore есть, но не работают
- Или кнопок вообще нет

Решение:
1. Проверьте, что `style.css` содержит классы:
   ```css
   .history-actions { ... }
   .action-btn-edit { ... }
   .action-btn-delete { ... }
   .action-btn-restore { ... }
   .history-item.deleted { ... }
   ```

2. Проверьте, что `app.js` содержит функции:
   ```javascript
   function editTransaction(id, type) { ... }
   function deleteTransaction(id, type) { ... }
   function restoreTransaction(id, type) { ... }
   ```

3. Проверьте, что AnaliziFinance.json обновлён до v2.2.0 и обрабатывает:
   - `edit_transaction`
   - `delete_transaction`
   - `restore_transaction`
   - `get_transaction_history`

4. Проверьте, что таблицы имеют колонку `deleted_at`:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name IN ('income', 'expenses') 
   AND column_name = 'deleted_at';
   ```

**Проблема 7: "Транзакция удалена" но не отображается полосатой**

Симптомы:
- Бот подтверждает удаление
- Но транзакция выглядит как обычная

Решение:
1. Обновите историю - нажмите фильтр или обновите страницу
2. Проверьте функцию `createHistoryItem()` в `app.js`:
   ```javascript
   const isDeleted = item.deleted_at !== null;
   historyItem.className = `history-item ${item.type}${isDeleted ? ' deleted' : ''}`;
   ```

3. Проверьте CSS класс `.history-item.deleted`:
   ```css
   .history-item.deleted {
     background: repeating-linear-gradient(
       45deg,
       rgba(255, 59, 48, 0.1),
       rgba(255, 59, 48, 0.1) 10px,
       rgba(255, 59, 48, 0.05) 10px,
       rgba(255, 59, 48, 0.05) 20px
     );
     opacity: 0.7;
   }
   ```

#### Полезные команды для отладки

```javascript
// Проверка состояния приложения
console.log('Current Tab:', document.querySelector('.tab-content.active')?.id);
console.log('Selected Category:', selectedCategory);
console.log('Selected Currency:', selectedCurrency);

// Проверка Telegram WebApp
console.log('WebApp Version:', tg.version);
console.log('Platform:', tg.platform);
console.log('Color Scheme:', tg.colorScheme);
console.log('Is Expanded:', tg.isExpanded);

// Тестовая отправка данных
sendToBot('test', { message: 'Hello from Mini App!' });

// Проверка истории транзакций
console.log('History:', document.querySelectorAll('.history-item').length);
```

## 📋 Функции Mini App v2.2.0

### ✅ Реализовано

**Основные функции:**
- ✅ Добавление доходов/расходов
- ✅ Мультивалютность (KGS, USD, EUR, RUB)
- ✅ Выбор категории (адаптировано для Кыргызстана)
- ✅ Голосовой ввод описания (Web Speech API)
- ✅ Дата и время транзакции
- ✅ Адаптивный дизайн для mobile/desktop
- ✅ Тёмная/светлая тема (автоматически из Telegram)

**Статистика:**
- ✅ Доход за месяц по валюте
- ✅ Расходы за месяц по валюте
- ✅ Прибыль (доход - расходы)
- ✅ Количество транзакций
- ✅ Обновление статистики по кнопке

**История транзакций:**
- ✅ Просмотр всех транзакций
- ✅ Фильтрация по типу (Все/Доходы/Расходы)
- ✅ Фильтрация по периоду (Сегодня/Неделя/Месяц/Год)
- ✅ Отображение суммы, категории, описания, даты
- ✅ Визуальное различие доходов (зелёный) и расходов (красный)

**v2.2.0 Transaction Management:**
- ✅ **Редактирование транзакций** - изменение любого поля
- ✅ **Мягкое удаление** - транзакция помечается, но не удаляется из БД
- ✅ **Восстановление** - отмена удаления одной кнопкой
- ✅ **История изменений** - журнал всех правок транзакции
- ✅ **Визуальное отображение** - удалённые транзакции с полосатым фоном
- ✅ **Кнопки действий** - Edit/Delete/Restore/History под каждой транзакцией

**Отчёты:**
- ✅ Генерация PDF отчёта
- ✅ Генерация Excel отчёта
- ✅ Выбор периода для отчёта

**Безопасность:**
- ✅ Режим 'bot' - все данные через Telegram Bot
- ✅ Нет прямого доступа к БД из браузера
- ✅ User ID берётся из Telegram (защищено от подделки)

### 🔄 В разработке

- ⏳ Графики и диаграммы (Chart.js)
- ⏳ Бюджеты и лимиты по категориям
- ⏳ Push-уведомления о превышении бюджета
- ⏳ Планирование платежей (recurring transactions)
- ⏳ Экспорт в 1C (для Кыргызстана)
- ⏳ Оффлайн режим (Service Worker)
- ⏳ Синхронизация между устройствами
- ⏳ Мультиязычность (русский/кыргызский/английский)
- ⏳ Темы оформления (кастомизация цветов)
- ⏳ Виджеты для главного экрана Telegram

## 🎨 Кастомизация

### Изменение цветовой схемы

Откройте `style.css`:

```css
/* Главный градиент */
body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* Ваш градиент */
}

/* Цвет акцента */
.btn-primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    /* Ваш градиент */
}

/* Цвета доходов/расходов */
.history-item.income {
    border-left: 4px solid #34c759; /* Зелёный для доходов */
}

.history-item.expense {
    border-left: 4px solid #ff3b30; /* Красный для расходов */
}
```

### Добавление новых категорий

Откройте `app.js`:

```javascript
const categories = {
    income: [
        'Зарплата',
        'Продажи товаров',
        // ... существующие
        'Ваша новая категория' // Добавьте сюда
    ],
    expense: [
        'Продукты питания',
        'Транспорт',
        // ... существующие
        'Ваша новая категория' // Добавьте сюда
    ]
};
```

**Лучший способ:** Загружайте категории из БД через n8n!

### Изменение валют

Откройте `app.js`:

```javascript
const currencies = {
    'KGS': { symbol: 'с', name: 'Сом' },
    'USD': { symbol: '$', name: 'Доллар' },
    'EUR': { symbol: '€', name: 'Евро' },
    'RUB': { symbol: '₽', name: 'Рубль' },
    'KZT': { symbol: '₸', name: 'Тенге' }, // Добавьте свою валюту
    'CNY': { symbol: '¥', name: 'Юань' }
};
```

Обновите `index.html`:

```html
<select id="currency" required>
    <option value="KGS">🇰🇬 Сом (KGS)</option>
    <option value="USD">🇺🇸 Доллар (USD)</option>
    <option value="EUR">🇪🇺 Евро (EUR)</option>
    <option value="RUB">🇷🇺 Рубль (RUB)</option>
    <option value="KZT">🇰🇿 Тенге (KZT)</option> <!-- Добавьте -->
    <option value="CNY">🇨🇳 Юань (CNY)</option>
</select>
```

### Изменение логотипа и названия

Откройте `index.html`:

```html
<div class="header">
    <h1>💼 AI Accounter</h1> <!-- Измените здесь -->
    <p class="version">v2.2.0 - Transaction Management</p>
</div>
```

### Добавление своего стиля кнопкам

Откройте `style.css`:

```css
/* Пример: Неоновые кнопки */
.btn-primary {
    background: #000;
    color: #0ff;
    border: 2px solid #0ff;
    box-shadow: 0 0 10px #0ff, 0 0 20px #0ff, 0 0 30px #0ff;
    transition: all 0.3s;
}

.btn-primary:hover {
    box-shadow: 0 0 20px #0ff, 0 0 40px #0ff, 0 0 60px #0ff;
}

/* Пример: Материал дизайн */
.btn-primary {
    background: #6200ea;
    box-shadow: 0 4px 6px rgba(98, 0, 234, 0.3);
    transition: all 0.2s;
}

.btn-primary:active {
    transform: scale(0.95);
    box-shadow: 0 2px 4px rgba(98, 0, 234, 0.3);
}
```

## 🔐 Безопасность

### Для режима 'bot':
- Все данные проходят через Telegram (защищено)
- User ID автоматически берётся из Telegram

### Для режима 'supabase':
- Используйте RLS (Row Level Security)
- Не храните service_role ключ в клиенте
- Используйте только anon key
- Проверяйте telegram_user_id на сервере

## 📊 Аналитика

### Google Analytics (опционально)

Добавьте в `<head>`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🆘 Поддержка

- 📖 [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- 💬 [Telegram Mini Apps Chat](https://t.me/WebAppsChat)
- 🐛 [GitHub Issues](https://github.com/your-repo/issues)

## 📝 Примечания

1. Mini App работает только в Telegram (Web, Desktop, Mobile)
2. Требуется HTTPS для production
3. Некоторые API (Camera, GPS) могут быть недоступны
4. Голосовой ввод работает не во всех браузерах

---

**🎉 Готово!** Ваш Mini App теперь доступен в Telegram!

Откройте бота → Menu → AI Accounter
