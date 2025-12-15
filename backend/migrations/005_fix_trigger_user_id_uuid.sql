-- Migration: Fix trigger functions expecting UUID user_id
-- Purpose: expenses/income inserts fail because trigger functions treat BIGINT user_id as UUID
-- Date: 2025-12-15

-- 1) Gamification trigger is duplicated by application-level GamificationService.
--    Keep trigger installed but make function a no-op to avoid runtime errors and double-counting XP.
CREATE OR REPLACE FUNCTION public.process_gamification_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN NEW;
END;
$function$;

-- 2) User activity trigger should update users.last_activity using the correct PK column.
CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.users
    SET last_activity = NOW()
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$function$;
