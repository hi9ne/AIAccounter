-- Migration: Make cleanup_embeddings_on_delete safe when embeddings table is absent
-- Purpose: expenses/income soft-delete fails if transaction_embeddings table doesn't exist
-- Date: 2025-12-15

CREATE OR REPLACE FUNCTION public.cleanup_embeddings_on_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only attempt cleanup when a row is soft-deleted
    IF NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at) THEN
        IF to_regclass('public.transaction_embeddings') IS NOT NULL THEN
            DELETE FROM public.transaction_embeddings
            WHERE transaction_id = NEW.id
              AND transaction_type = TG_TABLE_NAME;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;
