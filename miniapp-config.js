// Конфигурация для Telegram Mini App v2.4.0
// Настройте эти параметры для корректной работы мини-приложения

const MINIAPP_CONFIG = {
    // Режим работы
    mode: 'n8n', // 'n8n' - прямые API вызовы через n8n webhooks
    
    // n8n webhooks для API запросов
    n8nWebhooks: {
        miniapp: 'https://hi9neee.app.n8n.cloud/webhook/miniapp',
        workspace: 'https://hi9neee.app.n8n.cloud/webhook/workspace-api',
        analytics: 'https://hi9neee.app.n8n.cloud/webhook/analytics-api',
        reports: 'https://hi9neee.app.n8n.cloud/webhook/reports-api'
    },
    
    // Настройки валют
    defaultCurrency: 'KGS',
    
    // Telegram Bot (для уведомлений)
    botUsername: '@aiaccounter_bot',
    
    // Временная зона
    timezone: 'Asia/Bishkek',
    
    // Язык интерфейса
    language: 'ru',
    
    // Supabase настройки (если используется прямое подключение)
    supabase: {
        url: 'https://ggcmoikpztvbatstcnai.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY21vaWtwenR2YmF0c3RjbmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjU5NDksImV4cCI6MjA3NzE0MTk0OX0.xte2Z2m3uJNQZeSAzdasa8mgComZDpJb00k_1dE3EU4',
        enabled: false // Отключено, используем n8n
    }
};

// Делаем конфигурацию доступной глобально для приложения
window.MiniAppConfig = MINIAPP_CONFIG;

// Экспорт для использования в Node.js (если нужно)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MINIAPP_CONFIG;
}
