// Конфигурация для Telegram Mini App
// Скопируйте этот файл в miniapp-config.js и заполните своими данными

const MINIAPP_CONFIG = {
    // FastAPI Backend настройки
    api: {
        // Автоматическое определение окружения
        baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://127.0.0.1:8000/api/v1'
            : 'https://aiaccounterbackend-production.up.railway.app/api/v1',
        enabled: true
    },
    
    // Supabase настройки (опционально, если нужен прямой доступ)
    supabase: {
        url: 'postgresql://postgres.ggcmoikpztvbatstcnai:AIAccounter_2025@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY21vaWtwenR2YmF0c3RjbmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjU5NDksImV4cCI6MjA3NzE0MTk0OX0.xte2Z2m3uJNQZeSAzdasa8mgComZDpJb00k_1dE3EU4',
        enabled: false // Используем FastAPI вместо прямого доступа
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
    mode: 'api', // 'api' - FastAPI | 'n8n' - через n8n | 'bot' - через Telegram Bot
    
    // n8n webhook URLs (запасной вариант)
    n8nWebhooks: {
        analytics: 'https://hi9neee.app.n8n.cloud/webhook/analytics-api',
        reports: 'https://hi9neee.app.n8n.cloud/webhook/reports-api',
        miniapp: 'https://hi9neee.app.n8n.cloud/webhook/miniapp'
    }
};

// Экспорт для использования в приложении
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MINIAPP_CONFIG;
}

// Для браузера
if (typeof window !== 'undefined') {
    window.MiniAppConfig = MINIAPP_CONFIG;
}

