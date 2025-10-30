// Конфигурация для Telegram Mini App
// Скопируйте этот файл в miniapp-config.js и заполните своими данными

const MINIAPP_CONFIG = {
    // Supabase настройки
    supabase: {
        url: 'postgresql://postgres.ggcmoikpztvbatstcnai:AIAccounter_2025@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY21vaWtwenR2YmF0c3RjbmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjU5NDksImV4cCI6MjA3NzE0MTk0OX0.xte2Z2m3uJNQZeSAzdasa8mgComZDpJb00k_1dE3EU4',
        enabled: true // Установите true после настройки
    },
    
    // Настройки валют
    defaultCurrency: 'KGS',
    
    // Telegram Bot (для fallback режима)
    botUsername: '@aiaccounter_bot',
    
    // Временная зона
    timezone: 'Asia/Bishkek',
    
    // Язык интерфейса
    language: 'ru',
    
    // Режим работы
    mode: 'supabase', // 'bot' или 'supabase'
    
    // Webhook для n8n (опционально)
    n8nWebhook: 'https://your-n8n-instance.com/webhook/miniapp'
};

// Экспорт для использования в приложении
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MINIAPP_CONFIG;
}
