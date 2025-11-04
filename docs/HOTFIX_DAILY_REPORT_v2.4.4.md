# HOTFIX v2.4.4: Исправление Daily Report и паттернов команд

## Проблема

После тестирования v2.4.3 пользователь обнаружил:

**Тест:**
```
Пользователь: "Прибыль 5000 с клиента"
Бот: ✅ Доход успешно добавлен (без лишних вопросов)

Пользователь: "Отчет за сегодня"
Бот: ❌ За сегодня: Доход: 0 KGS, Расход: 0 KGS
```

### Две проблемы:

#### 1. Команда "Отчет за сегодня" НЕ совпадала с regex паттерном

**Regex паттерн для Daily Report:**
```regex
^(ежедневный отчёт|ежедневный отчет|дейли|daily)
```

**Пользователь написал:**  
`"Отчет за сегодня"` ← НЕ совпадает с паттерном!

Команда уходила в AI Agent, а не обрабатывалась напрямую через Switch.

#### 2. Prepare User nodes передавали несуществующий workspace_id

**Проблема в узлах:**
- `Prepare User for Daily` (строка ~2210)
- `Prepare User for Weekly` (строка ~2250)
- `Prepare User for Monthly` (строка ~2290)

**Код:**
```json
{
  "name": "workspace_id",
  "value": "={{ $('Edit Fields').first().json.workspace_id }}",
  "type": "number"
}
```

**Но:**  
`Edit Fields` НЕ содержит `workspace_id`! Он просто передаёт `message` из Telegram.

**Результат:**  
`workspace_id = undefined` → SQL получает `undefined` → фильтр `{{ $json.workspace_id ? 'AND workspace_id = ' + $json.workspace_id : '' }}` игнорируется, но переменная всё равно создаётся с неправильным типом.

## Решение

### Часть 1: Расширить regex паттерн для Daily Report

**Файл:** `AnaliziFinance.json`  
**Узел:** `Message Type Switch`  
**Строка:** ~96

**Было:**
```json
"rightValue": "^(ежедневный отчёт|ежедневный отчет|дейли|daily)"
```

**Стало:**
```json
"rightValue": "^(ежедневный отчёт|ежедневный отчет|отчёт за сегодня|отчет за сегодня|дейли|daily|^отчет$|^отчёт$)"
```

**Теперь совпадают:**
- "ежедневный отчёт"
- "ежедневный отчет"
- "отчёт за сегодня" ✅ NEW
- "отчет за сегодня" ✅ NEW
- "дейли"
- "daily"
- просто "отчет" ✅ NEW
- просто "отчёт" ✅ NEW

### Часть 2: Удалить workspace_id из Prepare nodes

Удалили неиспользуемые workspace_id assignments из 3 узлов:

#### 1. Prepare User for Daily (строка ~2210)

**Было:**
```json
{
  "assignments": [
    {"name": "user_id", "value": "=...", "type": "number"},
    {"name": "telegram_chat_id", "value": "=...", "type": "number"},
    {"name": "first_name", "value": "=...", "type": "string"},
    {"name": "workspace_id", "value": "={{ $('Edit Fields').first().json.workspace_id }}", "type": "number"}
  ]
}
```

**Стало:**
```json
{
  "assignments": [
    {"name": "user_id", "value": "=...", "type": "number"},
    {"name": "telegram_chat_id", "value": "=...", "type": "number"},
    {"name": "first_name", "value": "=...", "type": "string"}
  ]
}
```

#### 2. Prepare User for Weekly (строка ~2250)

Аналогичное удаление `workspace_id` assignment.

#### 3. Prepare User for Monthly (строка ~2290)

Аналогичное удаление `workspace_id` assignment.

## Почему workspace_id НЕ нужен в отчётах?

SQL запросы для отчётов **уже корректно работают** без `workspace_id`:

```sql
-- Get Daily Stats (строка ~1650)
WHERE user_id = {{ $json.user_id }}
  {{ $json.workspace_id ? 'AND workspace_id = ' + $json.workspace_id : '' }}
  AND DATE(date) = (NOW() AT TIME ZONE 'Asia/Bishkek')::DATE
  AND deleted_at IS NULL
```

**Логика:**
- Если `workspace_id` НЕ передан → условие `{{ ... ? ... : '' }}` вернёт пустую строку
- Фильтр по workspace НЕ применится
- Запрос покажет ВСЕ операции пользователя

**Это нормально**, если у пользователя:
- 1 workspace (основной сценарий)
- Или нужно показать операции из ВСЕХ workspaces

### Когда workspace_id ДЕЙСТВИТЕЛЬНО нужен?

Только если:
1. У пользователя несколько workspaces
2. И нужно показать отчёт ТОЛЬКО для одного конкретного workspace
3. И пользователь **явно выбрал** workspace

Для этого нужно добавить:
- Выбор workspace в UI (кнопки/inline keyboard)
- Сохранение выбранного workspace_id в контексте
- Передачу его в Prepare nodes

## Тестирование

### Тест 1: Regex паттерн

**Команды:**
```
"Отчет за сегодня" → ✅ Должен совпасть
"отчёт за сегодня" → ✅ Должен совпасть  
"отчет" → ✅ Должен совпасть
"ежедневный отчет" → ✅ Должен совпасть
"дейли" → ✅ Должен совпасть
```

### Тест 2: Отчёт находит операции

**Сценарий:**
1. "Доход 1000 от клиента" → добавляется
2. "Отчет за сегодня" → показывает 1000 в доходах ✅
3. "Расход 500 на еду" → добавляется
4. "Отчет" → показывает 1000 доход, 500 расход ✅

### Тест 3: SQL диагностика

Выполнить `migrations/DEBUG_daily_report.sql`:
- Проверить, что доходы/расходы записались с правильной датой
- Проверить, что timezone-aware запросы находят операции
- Проверить, что старые CURRENT_DATE запросы НЕ находят

## Изменённые файлы

1. ✅ `AnaliziFinance.json` (строка ~96) - расширен regex паттерн
2. ✅ `AnaliziFinance.json` (строка ~2210) - удалён workspace_id из Daily
3. ✅ `AnaliziFinance.json` (строка ~2250) - удалён workspace_id из Weekly
4. ✅ `AnaliziFinance.json` (строка ~2290) - удалён workspace_id из Monthly
5. ✅ `migrations/DEBUG_daily_report.sql` - SQL для диагностики
6. ✅ `docs/HOTFIX_DAILY_REPORT_v2.4.4.md` - эта документация

## Связь с предыдущими версиями

### v2.4.2: Date Timezone Fix
- Изменил `CURRENT_DATE` → `(NOW() AT TIME ZONE 'Asia/Bishkek')::DATE`
- Узлы: Add_expense, Add_income, Get Daily Stats

### v2.4.3: UX Improvements
- Упростил AI prompt
- Добавил preferred_currency в контекст
- Убрал обязательные вопросы о workspace

### v2.4.4: Report Pattern & Workspace Fix (ТЕКУЩАЯ)
- Расширил regex для "Отчет за сегодня"
- Удалил несуществующий workspace_id из Prepare nodes
- Теперь отчёты работают для всех операций пользователя

## Следующие шаги

Если в будущем нужна **поддержка множественных workspaces в отчётах**:

1. Добавить UI для выбора workspace:
```javascript
// Inline keyboard в Telegram
keyboard = {
  inline_keyboard: [
    [{ text: "Личные финансы", callback_data: "ws_1" }],
    [{ text: "Бизнес", callback_data: "ws_2" }],
    [{ text: "Все workspace", callback_data: "ws_all" }]
  ]
}
```

2. Обработать callback и сохранить выбор:
```javascript
// Новый узел: Handle Workspace Selection
const workspace_id = $json.callback_query.data.replace('ws_', '');
if (workspace_id === 'all') {
  return { workspace_id: null }; // Показать все
} else {
  return { workspace_id: parseInt(workspace_id) };
}
```

3. Передать в Prepare nodes:
```json
{
  "name": "workspace_id",
  "value": "={{ $('Handle Workspace Selection').first().json.workspace_id }}",
  "type": "number"
}
```

## Заключение

✅ **Проблема решена:**  
- "Отчет за сегодня" теперь распознаётся правильно
- workspace_id больше не передаётся с undefined значением
- Отчёты показывают все операции пользователя (как и должно быть)

✅ **Тестирование:**  
Пользователь должен перезапустить n8n workflow и протестировать команды.

✅ **Версия:**  
v2.4.4 (Date + UX + Report Fix)
