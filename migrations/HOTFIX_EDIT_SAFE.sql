-- HOTFIX: Безопасное редактирование транзакций без ошибок типов
-- Проблема: PostgreSQL пытается конвертировать значения в NUMERIC даже в ELSE ветках CASE
-- Решение: Создать отдельную функцию для безопасного обновления

CREATE OR REPLACE FUNCTION safe_update_transaction(
  p_user_id INTEGER,
  p_transaction_type VARCHAR(10),  -- 'expense' или 'income'
  p_transaction_id VARCHAR(20),     -- ID или 'last'
  p_field VARCHAR(20),              -- 'amount', 'category', 'description', 'date', 'currency'
  p_new_value TEXT                  -- Новое значение как текст
)
RETURNS JSON AS $$
DECLARE
  v_tid INTEGER;
  v_old_record JSON;
  v_new_record JSON;
  v_history_id INTEGER;
  v_old_value TEXT;
BEGIN
  -- Найти ID транзакции
  IF LOWER(p_transaction_id) = 'last' THEN
    v_tid := get_last_transaction(p_user_id, p_transaction_type);
  ELSE
    v_tid := p_transaction_id::INTEGER;
  END IF;

  -- Получить старую запись
  IF p_transaction_type = 'expense' THEN
    SELECT row_to_json(e.*), (row_to_json(e.*)->>p_field) 
    INTO v_old_record, v_old_value
    FROM expenses e 
    WHERE e.id = v_tid AND e.deleted_at IS NULL;
  ELSE
    SELECT row_to_json(i.*), (row_to_json(i.*)->>p_field)
    INTO v_old_record, v_old_value
    FROM income i
    WHERE i.id = v_tid AND i.deleted_at IS NULL;
  END IF;

  -- Проверить что запись найдена
  IF v_old_record IS NULL THEN
    RETURN json_build_object('error', 'Transaction not found', 'status', 'not_found');
  END IF;

  -- Обновить нужное поле
  IF p_transaction_type = 'expense' THEN
    CASE LOWER(p_field)
      WHEN 'amount' THEN
        UPDATE expenses SET amount = p_new_value::NUMERIC 
        WHERE id = v_tid RETURNING row_to_json(expenses.*) INTO v_new_record;
      WHEN 'category' THEN
        UPDATE expenses SET category = p_new_value 
        WHERE id = v_tid RETURNING row_to_json(expenses.*) INTO v_new_record;
      WHEN 'description' THEN
        UPDATE expenses SET description = p_new_value 
        WHERE id = v_tid RETURNING row_to_json(expenses.*) INTO v_new_record;
      WHEN 'date' THEN
        UPDATE expenses SET date = TO_TIMESTAMP(p_new_value, 'DD.MM.YYYY')::DATE 
        WHERE id = v_tid RETURNING row_to_json(expenses.*) INTO v_new_record;
      WHEN 'currency' THEN
        UPDATE expenses SET currency = UPPER(p_new_value) 
        WHERE id = v_tid RETURNING row_to_json(expenses.*) INTO v_new_record;
      ELSE
        RETURN json_build_object('error', 'Invalid field', 'status', 'invalid_field');
    END CASE;
  ELSE
    CASE LOWER(p_field)
      WHEN 'amount' THEN
        UPDATE income SET amount = p_new_value::NUMERIC 
        WHERE id = v_tid RETURNING row_to_json(income.*) INTO v_new_record;
      WHEN 'category' THEN
        UPDATE income SET category = p_new_value 
        WHERE id = v_tid RETURNING row_to_json(income.*) INTO v_new_record;
      WHEN 'description' THEN
        UPDATE income SET description = p_new_value 
        WHERE id = v_tid RETURNING row_to_json(income.*) INTO v_new_record;
      WHEN 'date' THEN
        UPDATE income SET date = TO_TIMESTAMP(p_new_value, 'DD.MM.YYYY')::DATE 
        WHERE id = v_tid RETURNING row_to_json(income.*) INTO v_new_record;
      WHEN 'currency' THEN
        UPDATE income SET currency = UPPER(p_new_value) 
        WHERE id = v_tid RETURNING row_to_json(income.*) INTO v_new_record;
      ELSE
        RETURN json_build_object('error', 'Invalid field', 'status', 'invalid_field');
    END CASE;
  END IF;

  -- Залогировать изменение
  v_history_id := log_transaction_change(
    p_transaction_type,
    v_tid,
    'updated',
    LOWER(p_field),
    v_old_value,
    p_new_value,
    p_user_id
  );

  -- Вернуть результат
  RETURN json_build_object(
    'updated_transaction', v_new_record,
    'history_id', v_history_id,
    'status', 'updated'
  );
END;
$$ LANGUAGE plpgsql;

-- Тест функции
SELECT safe_update_transaction(1109421300, 'expense', 'last', 'category', 'тестовая категория');
