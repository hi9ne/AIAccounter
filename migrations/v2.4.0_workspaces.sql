-- ============================================================
-- AIAccounter v2.4.0 Migration: Workspaces & Multi-tenancy
-- Date: 2025-10-31
-- Description: Добавление поддержки рабочих пространств (workspaces)
--              для командной работы и multi-tenancy
-- ============================================================

-- ============================================================
-- 1. WORKSPACES - Рабочие пространства
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'KGS',
    owner_id BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE workspaces IS 'Рабочие пространства для командной работы';
COMMENT ON COLUMN workspaces.owner_id IS 'Telegram user_id создателя workspace';
COMMENT ON COLUMN workspaces.settings IS 'Дополнительные настройки (лимиты, уведомления и т.д.)';

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_active ON workspaces(is_active) WHERE is_active = true;

-- ============================================================
-- 2. WORKSPACE_MEMBERS - Участники workspace
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace_members (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP,
    UNIQUE(workspace_id, user_id)
);

COMMENT ON TABLE workspace_members IS 'Участники рабочих пространств с ролями';
COMMENT ON COLUMN workspace_members.role IS 'Роль: owner, admin, editor, viewer';
COMMENT ON COLUMN workspace_members.user_id IS 'Telegram user_id участника';

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(workspace_id, role);

-- ============================================================
-- 3. WORKSPACE_INVITES - Приглашения в workspace
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace_invites (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invite_code VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    created_by BIGINT NOT NULL,
    expires_at TIMESTAMP,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE workspace_invites IS 'Пригласительные ссылки для добавления участников';
COMMENT ON COLUMN workspace_invites.invite_code IS 'Уникальный код приглашения (для ссылки)';
COMMENT ON COLUMN workspace_invites.created_by IS 'Telegram user_id создателя приглашения';

CREATE INDEX idx_workspace_invites_code ON workspace_invites(invite_code);
CREATE INDEX idx_workspace_invites_workspace ON workspace_invites(workspace_id);
CREATE INDEX idx_workspace_invites_active ON workspace_invites(is_active) WHERE is_active = true;

-- ============================================================
-- 4. INVITE_USES - История использования приглашений
-- ============================================================
CREATE TABLE IF NOT EXISTS invite_uses (
    id SERIAL PRIMARY KEY,
    invite_id INTEGER NOT NULL REFERENCES workspace_invites(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

COMMENT ON TABLE invite_uses IS 'История активации пригласительных ссылок';

CREATE INDEX idx_invite_uses_invite ON invite_uses(invite_id);
CREATE INDEX idx_invite_uses_user ON invite_uses(user_id);

-- ============================================================
-- 5. AUDIT_LOGS - Журнал действий пользователей
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_logs IS 'Журнал всех действий в workspace для audit trail';
COMMENT ON COLUMN audit_logs.action_type IS 'Тип действия: create, update, delete, invite, etc.';
COMMENT ON COLUMN audit_logs.entity_type IS 'Тип сущности: transaction, budget, member, etc.';
COMMENT ON COLUMN audit_logs.changes IS 'JSON с детализацией изменений (old_value, new_value)';

CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- 6. USER_PREFERENCES - Пользовательские настройки
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'ru',
    timezone VARCHAR(50) DEFAULT 'Asia/Bishkek',
    default_workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    notification_settings JSONB DEFAULT '{"email": false, "telegram": true, "push": true}',
    ui_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_preferences IS 'Персональные настройки пользователей';
COMMENT ON COLUMN user_preferences.user_id IS 'Telegram user_id';
COMMENT ON COLUMN user_preferences.default_workspace_id IS 'Workspace по умолчанию при входе';

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- ============================================================
-- 7. Добавить workspace_id в существующие таблицы
-- ============================================================

-- 7.1 Income
ALTER TABLE income 
    ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_income_workspace ON income(workspace_id);

-- 7.2 Expenses
ALTER TABLE expenses 
    ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expenses_workspace ON expenses(workspace_id);

-- 7.3 Budgets
ALTER TABLE budgets 
    ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_budgets_workspace ON budgets(workspace_id);

-- 7.4 Recurring Payments
ALTER TABLE recurring_payments 
    ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_recurring_payments_workspace ON recurring_payments(workspace_id);

-- 7.5 Notifications
ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications(workspace_id);

-- ============================================================
-- 8. Функции для работы с Workspaces
-- ============================================================

-- 8.1 Создать workspace с автоматическим добавлением owner
CREATE OR REPLACE FUNCTION create_workspace_with_owner(
    p_name VARCHAR,
    p_owner_id BIGINT,
    p_description TEXT DEFAULT NULL,
    p_currency VARCHAR DEFAULT 'KGS'
) RETURNS INTEGER AS $$
DECLARE
    v_workspace_id INTEGER;
BEGIN
    -- Создаем workspace
    INSERT INTO workspaces (name, owner_id, description, currency)
    VALUES (p_name, p_owner_id, p_description, p_currency)
    RETURNING id INTO v_workspace_id;
    
    -- Автоматически добавляем owner как участника
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, p_owner_id, 'owner');
    
    -- Логируем действие
    INSERT INTO audit_logs (workspace_id, user_id, action_type, entity_type, entity_id)
    VALUES (v_workspace_id, p_owner_id, 'create', 'workspace', v_workspace_id);
    
    RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_workspace_with_owner IS 'Создать workspace и автоматически добавить owner';

-- 8.2 Проверить права доступа пользователя
CREATE OR REPLACE FUNCTION check_workspace_permission(
    p_workspace_id INTEGER,
    p_user_id BIGINT,
    p_required_permission VARCHAR -- 'read', 'write', 'admin', 'owner'
) RETURNS BOOLEAN AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    -- Получаем роль пользователя
    SELECT role INTO v_role
    FROM workspace_members
    WHERE workspace_id = p_workspace_id 
      AND user_id = p_user_id 
      AND is_active = true;
    
    -- Если пользователь не найден
    IF v_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Проверяем права в зависимости от роли
    CASE p_required_permission
        WHEN 'read' THEN
            RETURN v_role IN ('owner', 'admin', 'editor', 'viewer');
        WHEN 'write' THEN
            RETURN v_role IN ('owner', 'admin', 'editor');
        WHEN 'admin' THEN
            RETURN v_role IN ('owner', 'admin');
        WHEN 'owner' THEN
            RETURN v_role = 'owner';
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_workspace_permission IS 'Проверить права доступа пользователя в workspace';

-- 8.3 Получить все workspaces пользователя
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
        w.id,
        w.name,
        w.description,
        wm.role,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id AND is_active = true),
        (w.owner_id = p_user_id)
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = p_user_id 
      AND wm.is_active = true
      AND w.is_active = true
    ORDER BY wm.joined_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_workspaces IS 'Получить список всех workspaces пользователя';

-- 8.4 Активировать приглашение
CREATE OR REPLACE FUNCTION accept_workspace_invite(
    p_invite_code VARCHAR,
    p_user_id BIGINT
) RETURNS JSON AS $$
DECLARE
    v_invite RECORD;
    v_result JSON;
BEGIN
    -- Получаем информацию о приглашении
    SELECT * INTO v_invite
    FROM workspace_invites
    WHERE invite_code = p_invite_code
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND used_count < max_uses;
    
    -- Проверяем, существует ли приглашение
    IF v_invite.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid or expired invite code'
        );
    END IF;
    
    -- Проверяем, не является ли пользователь уже участником
    IF EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = v_invite.workspace_id 
          AND user_id = p_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User already a member of this workspace'
        );
    END IF;
    
    -- Добавляем пользователя в workspace
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_invite.workspace_id, p_user_id, v_invite.role);
    
    -- Обновляем счетчик использований
    UPDATE workspace_invites
    SET used_count = used_count + 1
    WHERE id = v_invite.id;
    
    -- Записываем использование приглашения
    INSERT INTO invite_uses (invite_id, user_id)
    VALUES (v_invite.id, p_user_id);
    
    -- Логируем действие
    INSERT INTO audit_logs (workspace_id, user_id, action_type, entity_type, entity_id)
    VALUES (v_invite.workspace_id, p_user_id, 'join', 'workspace', v_invite.workspace_id);
    
    -- Возвращаем результат
    RETURN json_build_object(
        'success', true,
        'workspace_id', v_invite.workspace_id,
        'role', v_invite.role
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION accept_workspace_invite IS 'Принять приглашение в workspace';

-- 8.5 Удалить участника из workspace
CREATE OR REPLACE FUNCTION remove_workspace_member(
    p_workspace_id INTEGER,
    p_member_id BIGINT,
    p_removed_by BIGINT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Проверяем права удаляющего (должен быть owner или admin)
    IF NOT check_workspace_permission(p_workspace_id, p_removed_by, 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    -- Нельзя удалить owner
    IF EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = p_member_id
          AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Cannot remove workspace owner';
    END IF;
    
    -- Деактивируем участника
    UPDATE workspace_members
    SET is_active = false
    WHERE workspace_id = p_workspace_id
      AND user_id = p_member_id;
    
    -- Логируем действие
    INSERT INTO audit_logs (workspace_id, user_id, action_type, entity_type, entity_id, changes)
    VALUES (
        p_workspace_id, 
        p_removed_by, 
        'remove_member', 
        'workspace_member', 
        NULL,
        json_build_object('removed_user_id', p_member_id)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION remove_workspace_member IS 'Удалить участника из workspace (только admin/owner)';

-- ============================================================
-- 9. Триггеры для автоматического обновления
-- ============================================================

-- 9.1 Обновлять updated_at при изменении workspace
CREATE OR REPLACE FUNCTION update_workspace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workspace_timestamp
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_timestamp();

-- 9.2 Обновлять last_activity_at участника
CREATE OR REPLACE FUNCTION update_member_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE workspace_members
    SET last_activity_at = CURRENT_TIMESTAMP
    WHERE workspace_id = NEW.workspace_id
      AND user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на audit_logs для обновления активности
CREATE TRIGGER trigger_update_member_activity
    AFTER INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_member_activity();

-- ============================================================
-- 10. Миграция существующих данных
-- ============================================================

-- Создать личный workspace для каждого существующего пользователя
DO $$
DECLARE
    v_user RECORD;
    v_workspace_id INTEGER;
BEGIN
    FOR v_user IN (
        SELECT DISTINCT user_id 
        FROM income
        UNION
        SELECT DISTINCT user_id 
        FROM expenses
    ) LOOP
        -- Создаем личный workspace
        v_workspace_id := create_workspace_with_owner(
            'Личный бюджет',
            v_user.user_id,
            'Автоматически созданный личный workspace',
            'KGS'
        );
        
        -- Привязываем все транзакции к этому workspace
        UPDATE income 
        SET workspace_id = v_workspace_id 
        WHERE user_id = v_user.user_id 
          AND workspace_id IS NULL;
        
        UPDATE expenses 
        SET workspace_id = v_workspace_id 
        WHERE user_id = v_user.user_id 
          AND workspace_id IS NULL;
        
        UPDATE budgets 
        SET workspace_id = v_workspace_id 
        WHERE user_id = v_user.user_id 
          AND workspace_id IS NULL;
        
        UPDATE recurring_payments 
        SET workspace_id = v_workspace_id 
        WHERE user_id = v_user.user_id 
          AND workspace_id IS NULL;
        
        UPDATE notifications 
        SET workspace_id = v_workspace_id 
        WHERE user_id = v_user.user_id 
          AND workspace_id IS NULL;
        
        -- Создаем настройки пользователя
        INSERT INTO user_preferences (user_id, default_workspace_id)
        VALUES (v_user.user_id, v_workspace_id)
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END $$;

-- ============================================================
-- 11. Представления для удобного доступа
-- ============================================================

-- 11.1 Детальная информация о workspaces
CREATE OR REPLACE VIEW v_workspace_details AS
SELECT 
    w.id,
    w.name,
    w.description,
    w.currency,
    w.owner_id,
    w.is_active,
    w.created_at,
    COUNT(DISTINCT wm.user_id) as member_count,
    COUNT(DISTINCT CASE WHEN wm.role = 'admin' THEN wm.user_id END) as admin_count,
    COUNT(DISTINCT CASE WHEN wm.role = 'editor' THEN wm.user_id END) as editor_count,
    COUNT(DISTINCT CASE WHEN wm.role = 'viewer' THEN wm.user_id END) as viewer_count,
    COALESCE(SUM(CASE WHEN i.date >= date_trunc('month', CURRENT_DATE) THEN i.amount ELSE 0 END), 0) as income_this_month,
    COALESCE(SUM(CASE WHEN e.date >= date_trunc('month', CURRENT_DATE) THEN e.amount ELSE 0 END), 0) as expenses_this_month
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.is_active = true
LEFT JOIN income i ON w.id = i.workspace_id
LEFT JOIN expenses e ON w.id = e.workspace_id
GROUP BY w.id;

COMMENT ON VIEW v_workspace_details IS 'Детальная информация о workspaces с статистикой';

-- 11.2 История активности workspace
CREATE OR REPLACE VIEW v_workspace_activity AS
SELECT 
    al.id,
    al.workspace_id,
    w.name as workspace_name,
    al.user_id,
    al.action_type,
    al.entity_type,
    al.entity_id,
    al.changes,
    al.created_at,
    wm.role as user_role
FROM audit_logs al
JOIN workspaces w ON al.workspace_id = w.id
LEFT JOIN workspace_members wm ON al.workspace_id = wm.workspace_id AND al.user_id = wm.user_id
ORDER BY al.created_at DESC;

COMMENT ON VIEW v_workspace_activity IS 'Лента активности в workspaces';

-- ============================================================
-- Migration Complete! 🎉
-- ============================================================

-- Проверка успешности миграции
SELECT 
    'Workspaces Migration v2.4.0 completed successfully!' as status,
    COUNT(*) as total_workspaces
FROM workspaces;
