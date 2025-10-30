# 🔧 HOTFIX v2.2.0 - Исправление функции get_last_transaction

**Дата:** 30.10.2025  
**Причина:** SQL ошибки: "invalid input syntax for type integer: 'last'" и AI передавал "расход" вместо "expense"

## Проблемы
1. Функция `get_last_transaction()` возвращала `TABLE`, а в workflow ожидался `INTEGER`
2. AI Agent передавал русские значения "расход"/"доход" вместо "expense"/"income"
3. `Get_transaction_history` не поддерживал "last"

## Исправления

### 1. Миграция БД (ОБЯЗАТЕЛЬНО)
Пересоздать функцию, чтобы она возвращала INTEGER:

```sql
-- Удалить старую функцию
DROP FUNCTION IF EXISTS get_last_transaction(INTEGER, VARCHAR);

-- Создать исправленную версию
CREATE OR REPLACE FUNCTION get_last_transaction(
    p_user_id INTEGER,
    p_transaction_type VARCHAR(10) DEFAULT 'expense'
)
RETURNS INTEGER AS $$
DECLARE
    v_transaction_id INTEGER;
BEGIN
    IF p_transaction_type = 'expense' THEN
        SELECT e.id INTO v_transaction_id
        FROM expenses e
        WHERE e.telegram_user_id = p_user_id 
          AND e.deleted_at IS NULL
        ORDER BY e.date DESC, e.id DESC
        LIMIT 1;
    ELSIF p_transaction_type = 'income' THEN
        SELECT i.id INTO v_transaction_id
        FROM income i
        WHERE i.telegram_user_id = p_user_id 
          AND i.deleted_at IS NULL
        ORDER BY i.date DESC, i.id DESC
        LIMIT 1;
    ELSE
        RAISE EXCEPTION 'Invalid transaction_type: %', p_transaction_type;
    END IF;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_last_transaction IS 'Получает ID последней транзакции пользователя (неудалённой)';
```

### 2. Workflow (ОБЯЗАТЕЛЬНО)
Обновить `AnaliziFinance.json`:

**A. В nodes Edit_transaction и Delete_transaction:**
```sql
-- БЫЛО:
THEN (SELECT t.id FROM get_last_transaction(...) t LIMIT 1)

-- СТАЛО:
THEN get_last_transaction(...)
```

**B. В node Get_transaction_history:**
```sql
-- БЫЛО:
WHERE transaction_type = LOWER('...')
  AND transaction_id = CAST('...' AS INTEGER)

-- СТАЛО:
WITH found_transaction AS (
  SELECT CASE WHEN LOWER('...') = 'last' 
    THEN get_last_transaction(...)
    ELSE CAST('...' AS INTEGER) END as tid
)
...
WHERE transaction_type = LOWER('...')
  AND transaction_id = (SELECT tid FROM found_transaction)
```

**C. System Message - добавлен раздел v2.2.0:**
```
📝 РЕДАКТИРОВАНИЕ ТРАНЗАКЦИЙ:
ВАЖНО: transaction_type всегда 'expense' или 'income' (НЕ 'расход'/'доход')
...
```

**Файлы обновлены:**
- ✅ `migrations/add_transaction_management.sql`
- ✅ `AnaliziFinance.json` (3 nodes + System Message)

## Инструкция по применению

### Шаг 1: Обновить функцию в Supabase
1. Открыть Supabase SQL Editor
2. Скопировать SQL выше (секция "Миграция БД")
3. Выполнить

### Шаг 2: Импортировать обновлённый workflow
1. Открыть n8n
2. Удалить старый workflow "AnaliziFinance"
3. Импортировать обновлённый `AnaliziFinance.json`
4. Проверить credentials (Supabase)

### Шаг 3: Протестировать
```
1. "Добавь расход 500 сом на продукты"
2. "Измени последний расход на 750"  ← Должно работать!
3. "Удали последний расход"          ← Должно работать!
```

## Результат
✅ Команды с "last" теперь работают корректно  
✅ Функция возвращает INTEGER вместо TABLE  
✅ Get_transaction_history поддерживает "last"  
✅ AI Agent использует 'expense'/'income' вместо русских слов  
✅ SQL запросы выполняются без ошибок

## Время применения
- Обновление функции: 1 минута
- Импорт workflow: 2 минуты
- Тестирование: 2 минуты
- **Итого: 5 минут**
