// ===== SUBSCRIPTION & ADMIN =====

console.log('🔧 ADMIN.JS LOADED');

// Global state for admin panel
let adminState = {
    currentFilter: 'all',
    allUsers: [],
    filteredUsers: []
};

// Helper function for money formatting
function formatMoney(amount, currency = 'KGS') {
    if (amount === null || amount === undefined) return '0';
    
    const symbols = {
        'KGS': 'с',
        'USD': '$',
        'EUR': '€',
        'RUB': '₽'
    };
    
    const formatted = new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.abs(amount));
    
    return `${formatted} ${symbols[currency] || currency}`;
}

// Admin Panel Functions
async function loadAdminStats() {
    try {
        const stats = await api.get('/admin/stats');
        
        // Safe defaults
        const totalUsers = stats.total_users || 0;
        const activeSubs = stats.active_subscriptions || 0;
        const newUsersWeek = stats.new_users_week || 0;
        const newUsersMonth = stats.new_users_month || 0;
        const conversionRate = stats.conversion_rate || 0;
        const monthlyRevenue = stats.monthly_revenue || 0;
        
        document.getElementById('admin-total-users').textContent = totalUsers;
        document.getElementById('admin-active-subs').textContent = activeSubs;
        
        // Revenue from backend (active_subs * 300 KGS, excluding admins)
        document.getElementById('admin-revenue').textContent = formatMoney(monthlyRevenue, 'KGS');
        
        // Growth (new users this week)
        const growthEl = document.getElementById('admin-growth');
        if (growthEl) {
            growthEl.textContent = '+' + newUsersWeek;
        }
        
        // Update trends
        const usersTrend = document.getElementById('admin-users-trend');
        if (usersTrend && totalUsers > 0) {
            const weekGrowth = Math.round((newUsersWeek / totalUsers) * 100);
            usersTrend.innerHTML = `<i class="fas fa-arrow-up"></i><span>+${weekGrowth}% за неделю</span>`;
        } else if (usersTrend) {
            usersTrend.innerHTML = `<i class="fas fa-minus"></i><span>Нет данных</span>`;
        }
        
        const subsTrend = document.getElementById('admin-subs-trend');
        if (subsTrend) {
            subsTrend.innerHTML = `<i class="fas fa-chart-line"></i><span>${conversionRate.toFixed(1)}% конверсия</span>`;
        }
        
        const revenueTrend = document.getElementById('admin-revenue-trend');
        if (revenueTrend) {
            // Potential revenue from new users this month (if all subscribed)
            const potentialRevenue = newUsersMonth * 300;
            revenueTrend.innerHTML = `<i class="fas fa-users"></i><span>+${newUsersMonth} новых за месяц</span>`;
        }
        
        const growthTrend = document.getElementById('admin-growth-trend');
        if (growthTrend) {
            growthTrend.innerHTML = `<i class="fas fa-calendar-week"></i><span>за неделю</span>`;
        }
        
        // Update user count badge
        const userCount = document.getElementById('admin-user-count');
        if (userCount) {
            userCount.textContent = `${totalUsers} ${getPluralForm(totalUsers, 'пользователь', 'пользователя', 'пользователей')}`;
        }
    } catch (e) {
        console.error('Failed to load admin stats', e);
        // Set defaults on error
        document.getElementById('admin-total-users').textContent = '0';
        document.getElementById('admin-active-subs').textContent = '0';
        document.getElementById('admin-revenue').textContent = '0 с';
        document.getElementById('admin-growth').textContent = '+0';
    }
}

async function loadAdminUsers() {
    const search = document.getElementById('admin-user-search').value;
    const list = document.getElementById('admin-users-list');
    
    try {
        const users = await api.get('/admin/users', { search });
        adminState.allUsers = users;
        
        // Apply current filter
        applyUserFilter();
        
    } catch (e) {
        list.innerHTML = '<div class="admin-empty-state"><i class="fas fa-exclamation-circle"></i><p>Ошибка загрузки пользователей</p></div>';
    }
}

function applyUserFilter() {
    const list = document.getElementById('admin-users-list');
    let users = adminState.allUsers;
    
    // Apply filter
    switch (adminState.currentFilter) {
        case 'active':
            users = users.filter(u => {
                const expiry = u.subscription_expires_at ? new Date(u.subscription_expires_at) : null;
                return expiry && expiry > new Date();
            });
            break;
        case 'expired':
            users = users.filter(u => {
                const expiry = u.subscription_expires_at ? new Date(u.subscription_expires_at) : null;
                return !expiry || expiry < new Date();
            });
            break;
        case 'admins':
            users = users.filter(u => u.is_admin);
            break;
    }
    
    adminState.filteredUsers = users;
    
    if (users.length === 0) {
        list.innerHTML = '<div class="admin-empty-state"><i class="fas fa-users-slash"></i><p>Пользователи не найдены</p></div>';
        return;
    }
    
    list.innerHTML = users.map(user => {
        const expiry = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
        const isExpired = !expiry || expiry < new Date();
        const statusClass = isExpired ? 'expired' : 'active';
        const statusText = isExpired ? 'Истекла' : formatDate(expiry);
        
        // Calculate days remaining
        const daysRemaining = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : 0;
        
        const createdDate = user.created_at || user.last_activity;
        
        return `
            <div class="admin-user-card" onclick="showUserStats(${user.user_id})">
                <div class="admin-user-header">
                    <div class="admin-user-info">
                        <div class="admin-user-name">${user.first_name || 'Безымянный'} ${user.last_name || ''}</div>
                        <div class="admin-user-username">@${user.username || 'no_username'} • ID: ${user.user_id}</div>
                    </div>
                    <div class="admin-user-badges">
                        ${user.is_admin ? '<span class="status-badge admin"><i class="fas fa-shield-alt"></i> ADMIN</span>' : ''}
                        <span class="status-badge ${statusClass}">
                            ${isExpired ? '<i class="fas fa-times-circle"></i>' : '<i class="fas fa-crown"></i>'} 
                            ${statusText}
                        </span>
                    </div>
                </div>
                
                <div class="admin-user-meta">
                    <div class="admin-meta-item">
                        <span class="admin-meta-label">Создан</span>
                        <span class="admin-meta-value">${createdDate ? formatDate(new Date(createdDate)) : 'Н/Д'}</span>
                    </div>
                    <div class="admin-meta-item">
                        <span class="admin-meta-label">${isExpired ? 'Истекла' : 'Осталось'}</span>
                        <span class="admin-meta-value">${isExpired ? 'Н/Д' : daysRemaining + ' дн.'}</span>
                    </div>
                    <div class="admin-meta-item">
                        <span class="admin-meta-label">Telegram ID</span>
                        <span class="admin-meta-value">${user.telegram_chat_id || 'Н/Д'}</span>
                    </div>
                </div>
                
                <div class="admin-user-actions" onclick="event.stopPropagation()">
                    <button class="admin-action-btn extend" onclick="extendUserSubscription(${user.user_id}, 30)">
                        <i class="fas fa-plus"></i> +30 дней
                    </button>
                    ${!isExpired ? `<button class="admin-action-btn revoke" onclick="revokeUserSubscription(${user.user_id})">
                        <i class="fas fa-ban"></i> Отозвать
                    </button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function filterAdminUsers(filter) {
    adminState.currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.admin-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    applyUserFilter();
}

async function extendUserSubscription(userId, days) {
    const daysText = days === 365 ? '1 год' : `${days} дней`;
    if (!confirm(`Продлить подписку на ${daysText}?`)) return;
    
    try {
        await api.post(`/admin/users/${userId}/subscription`, { days });
        showSuccess(`Подписка продлена на ${daysText}`);
        loadAdminUsers();
        loadAdminStats();
    } catch (e) {
        showError('Ошибка продления подписки');
    }
}

async function revokeUserSubscription(userId) {
    if (!confirm('Отозвать подписку у пользователя?')) return;
    
    try {
        // Set expiry to yesterday
        await api.post(`/admin/users/${userId}/subscription`, { days: -1 });
        showSuccess('Подписка отозвана');
        loadAdminUsers();
        loadAdminStats();
    } catch (e) {
        showError('Ошибка отзыва подписки');
    }
}

function getPluralForm(n, form1, form2, form5) {
    n = Math.abs(n) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return form5;
    if (n1 > 1 && n1 < 5) return form2;
    if (n1 === 1) return form1;
    return form5;
}

// Show user statistics modal
async function showUserStats(userId) {
    try {
        // Get user details
        const users = adminState.allUsers || [];
        const user = users.find(u => u.user_id === userId);
        
        if (!user) {
            showError('Пользователь не найден');
            return;
        }
        
        const expiry = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
        const isExpired = !expiry || expiry < new Date();
        const daysRemaining = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : 0;
        const createdDate = user.created_at || user.last_activity;
        
        const modalHtml = `
            <div class="modal-overlay active" onclick="this.remove()">
                <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2 style="margin: 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-user-circle" style="color: var(--accent);"></i>
                            ${user.first_name || 'Безымянный'} ${user.last_name || ''}
                        </h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body" style="padding: 20px;">
                        <!-- User Info -->
                        <div style="background: var(--bg-card); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                <div>
                                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">USERNAME</div>
                                    <div style="font-size: 14px; font-weight: 600;">@${user.username || 'no_username'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">USER ID</div>
                                    <div style="font-size: 14px; font-weight: 600; font-family: monospace;">${user.user_id}</div>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">TELEGRAM ID</div>
                                    <div style="font-size: 13px; font-weight: 600; font-family: monospace;">${user.telegram_chat_id || 'Н/Д'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">СТАТУС</div>
                                    <div>
                                        ${user.is_admin ? '<span class="status-badge admin"><i class="fas fa-shield-alt"></i> ADMIN</span>' : '<span class="status-badge">USER</span>'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Subscription Info -->
                        <div style="background: var(--bg-card); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                            <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">
                                <i class="fas fa-crown" style="color: var(--accent);"></i> Подписка
                            </div>
                            <div style="display: grid; gap: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: var(--text-secondary); font-size: 13px;">Статус:</span>
                                    <span class="status-badge ${isExpired ? 'expired' : 'active'}">
                                        ${isExpired ? '<i class="fas fa-times-circle"></i> Истекла' : '<i class="fas fa-check-circle"></i> Активна'}
                                    </span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: var(--text-secondary); font-size: 13px;">Истекает:</span>
                                    <span style="font-weight: 600; font-size: 13px;">${expiry ? formatDate(expiry) : 'Н/Д'}</span>
                                </div>
                                ${!isExpired ? `
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: var(--text-secondary); font-size: 13px;">Осталось:</span>
                                    <span style="font-weight: 600; font-size: 13px; color: var(--accent);">${daysRemaining} ${getPluralForm(daysRemaining, 'день', 'дня', 'дней')}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- User Details -->
                        <div style="background: var(--bg-card); padding: 16px; border-radius: 12px;">
                            <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">
                                <i class="fas fa-info-circle" style="color: var(--accent);"></i> Детали
                            </div>
                            <div style="display: grid; gap: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: var(--text-secondary); font-size: 13px;">Регистрация:</span>
                                    <span style="font-weight: 600; font-size: 13px;">${createdDate ? formatDate(new Date(createdDate)) : 'Н/Д'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: var(--text-secondary); font-size: 13px;">Язык:</span>
                                    <span style="font-weight: 600; font-size: 13px; text-transform: uppercase;">${user.language_code || 'RU'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: var(--text-secondary); font-size: 13px;">Валюта:</span>
                                    <span style="font-weight: 600; font-size: 13px;">${user.currency || 'KGS'}</span>
                                </div>
                                ${user.timezone ? `
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: var(--text-secondary); font-size: 13px;">Часовой пояс:</span>
                                    <span style="font-weight: 600; font-size: 13px;">${user.timezone}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Actions -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px;">
                            <button class="admin-action-btn extend" onclick="this.closest('.modal-overlay').remove(); extendUserSubscription(${user.user_id}, 30);" style="width: 100%;">
                                <i class="fas fa-plus"></i> +30 дней
                            </button>
                            ${!isExpired ? `
                            <button class="admin-action-btn revoke" onclick="this.closest('.modal-overlay').remove(); revokeUserSubscription(${user.user_id});" style="width: 100%;">
                                <i class="fas fa-ban"></i> Отозвать
                            </button>
                            ` : '<button class="admin-action-btn details" onclick="this.closest(\'.modal-overlay\').remove();" style="width: 100%;"><i class="fas fa-times"></i> Закрыть</button>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    } catch (e) {
        console.error('Failed to load user stats', e);
        showError('Ошибка загрузки статистики');
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
