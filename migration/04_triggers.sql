-- =============================================
-- AIAccounter Migration: Triggers
-- Target: Frankfurt (eu-central-1)
-- Зависит от: 03_functions.sql
-- =============================================

-- 1. Триггер для автоматического расчёта обратного курса валют
CREATE TRIGGER trg_auto_reverse_rate 
    AFTER INSERT OR UPDATE ON public.exchange_rates 
    FOR EACH ROW 
    WHEN (((new.from_currency)::text <> (new.to_currency)::text) 
      AND ((new.source)::text !~~ '%_REVERSE'::text)) 
    EXECUTE FUNCTION calculate_reverse_rate();

-- 2. Триггер для очистки эмбеддингов при soft delete расходов
CREATE TRIGGER cleanup_expenses_embeddings 
    AFTER UPDATE ON public.expenses 
    FOR EACH ROW 
    WHEN (((new.deleted_at IS NOT NULL) AND (old.deleted_at IS NULL))) 
    EXECUTE FUNCTION cleanup_embeddings_on_delete();

-- 3. Триггер геймификации при добавлении расхода
CREATE TRIGGER gamification_on_expense 
    AFTER INSERT ON public.expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION process_gamification_on_transaction();

-- 4. Триггер обновления updated_at для расходов
CREATE TRIGGER update_expenses_updated_at 
    BEFORE UPDATE ON public.expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Триггер обновления активности пользователя при добавлении расхода
CREATE TRIGGER update_user_activity_expenses 
    AFTER INSERT ON public.expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_activity();

-- 6. Триггер для очистки эмбеддингов при soft delete доходов
CREATE TRIGGER cleanup_income_embeddings 
    AFTER UPDATE ON public.income 
    FOR EACH ROW 
    WHEN (((new.deleted_at IS NOT NULL) AND (old.deleted_at IS NULL))) 
    EXECUTE FUNCTION cleanup_embeddings_on_delete();

-- 7. Триггер геймификации при добавлении дохода
CREATE TRIGGER gamification_on_income 
    AFTER INSERT ON public.income 
    FOR EACH ROW 
    EXECUTE FUNCTION process_gamification_on_transaction();

-- 8. Триггер обновления updated_at для доходов
CREATE TRIGGER update_income_updated_at 
    BEFORE UPDATE ON public.income 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Триггер обновления активности пользователя при добавлении дохода
CREATE TRIGGER update_user_activity_income 
    AFTER INSERT ON public.income 
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_activity();

SELECT 'Triggers created successfully' as status;
