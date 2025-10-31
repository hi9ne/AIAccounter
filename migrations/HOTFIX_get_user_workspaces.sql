-- ============================================================
-- HOTFIX: Fix get_user_workspaces ambiguous column reference
-- ============================================================

DROP FUNCTION IF EXISTS get_user_workspaces(BIGINT);

CREATE OR REPLACE FUNCTION get_user_workspaces(p_user_id BIGINT)
RETURNS TABLE (
    workspace_id INTEGER,
    workspace_name VARCHAR,
    workspace_description TEXT,
    user_role VARCHAR,
    member_count BIGINT,
    is_owner BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id AS workspace_id,
        w.name AS workspace_name,
        w.description AS workspace_description,
        wm.role AS user_role,
        (SELECT COUNT(*) FROM workspace_members wm2 WHERE wm2.workspace_id = w.id AND wm2.is_active = true) AS member_count,
        (w.owner_id = p_user_id) AS is_owner
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = p_user_id 
      AND wm.is_active = true
      AND w.is_active = true
    ORDER BY wm.joined_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_workspaces IS 'Получить список всех workspaces пользователя';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ get_user_workspaces() fixed!';
END $$;
