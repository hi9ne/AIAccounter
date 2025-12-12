// ===== SUBSCRIPTION & ADMIN =====

console.log('🔧 ADMIN.JS LOADED');

// checkSubscription и recheckSubscription определены в app.js

// Admin Panel Functions
async function loadAdminStats() {
    try {
        const stats = await api.get('/admin/stats');
        document.getElementById('admin-total-users').textContent = stats.total_users;
        document.getElementById('admin-active-subs').textContent = stats.active_subscriptions;
    } catch (e) {
        console.error('Failed to load admin stats', e);
    }
}

async function loadAdminUsers() {
    const search = document.getElementById('admin-user-search').value;
    const list = document.getElementById('admin-users-list');
    
    try {
        const users = await api.get('/admin/users', { search });
        
        if (users.length === 0) {
            list.innerHTML = '<div class="empty-state small">Пользователи не найдены</div>';
            return;
        }
        
        list.innerHTML = users.map(user => {
            const expiry = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
            const isExpired = !expiry || expiry < new Date();
            const statusClass = isExpired ? 'expired' : 'active';
            const statusText = isExpired ? 'Истекла' : `До ${formatDate(expiry)}`;
            
            return `
                <div class="admin-user-card">
                    <div class="admin-user-info">
                        <div class="admin-user-name">
                            ${user.first_name || ''} ${user.last_name || ''} 
                            <span style="color:var(--text-secondary);font-size:12px">@${user.username || 'no_username'}</span>
                        </div>
                        <div class="admin-user-status">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            ${user.is_admin ? '<span class="status-badge active">ADMIN</span>' : ''}
                        </div>
                    </div>
                    <div class="admin-user-actions">
                        <button class="admin-action-btn extend" onclick="extendUserSubscription(${user.user_id})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (e) {
        list.innerHTML = '<div class="error-state">Ошибка загрузки</div>';
    }
}

async function extendUserSubscription(userId) {
    if (!confirm('Продлить подписку на 30 дней?')) return;
    
    try {
        await api.post(`/admin/users/${userId}/subscription`, { days: 30 });
        showSuccess('Подписка продлена');
        loadAdminUsers();
        loadAdminStats();
    } catch (e) {
        showError('Ошибка продления');
    }
}

// Показываем/скрываем пункт меню админки в разделе "Еще"
function showAdminMenuIfNeeded() {
    console.log('🔧 showAdminMenuIfNeeded called, state.isAdmin:', state.isAdmin);
    const menuItem = document.getElementById('admin-panel-menu-item');
    console.log('🔧 Menu item found:', menuItem);
    if (menuItem) {
        menuItem.style.display = state.isAdmin ? 'flex' : 'none';
        console.log('🔧 Menu item display set to:', menuItem.style.display);
    }
}

// Добавляем кнопку админки в профиль если юзер админ (DEPRECATED - теперь в разделе "Еще")
function renderAdminButton() {
    if (!state.isAdmin) return;
    
    const container = document.querySelector('.profile-menu');
    if (container && !document.getElementById('admin-panel-btn')) {
        const btn = document.createElement('div');
        btn.className = 'menu-item';
        btn.id = 'admin-panel-btn';
        btn.onclick = () => {
            switchScreen('admin');
            loadAdminStats();
            loadAdminUsers();
        };
        btn.innerHTML = `
            <div class="menu-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--accent);">
                <i class="fas fa-shield-alt"></i>
            </div>
            <div class="menu-text">Админ панель</div>
            <i class="fas fa-chevron-right"></i>
        `;
        
        // Вставляем первым
        container.insertBefore(btn, container.firstChild);
    }
}
