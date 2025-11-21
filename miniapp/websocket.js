// ============================================================================
// WebSocket Manager для AIAccounter Mini App
// Real-time updates для транзакций
// ============================================================================

class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.pingInterval = null;
        this.isConnecting = false;
        this.listeners = new Map();
    }
    
    /**
     * Подключиться к WebSocket
     */
    async connect(token) {
        if (this.isConnecting || this.isConnected()) {
            console.log('⚠️ WebSocket: Already connecting or connected');
            return;
        }
        
        this.isConnecting = true;
        
        try {
            const wsUrl = API_BASE.replace('http', 'ws') + '/api/v1/ws';
            const urlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`;
            
            console.log('🔌 WebSocket: Connecting...');
            this.ws = new WebSocket(urlWithToken);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket: Connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.startPingInterval();
                this.emit('connected');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('📨 WebSocket message:', message);
                    this.handleMessage(message);
                } catch (e) {
                    console.error('❌ WebSocket: Failed to parse message', e);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('❌ WebSocket: Disconnected', event.code, event.reason);
                this.isConnecting = false;
                this.stopPingInterval();
                this.emit('disconnected');
                
                // Попытка переподключения
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 WebSocket: Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    setTimeout(() => this.reconnect(token), this.reconnectDelay);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.emit('error', error);
            };
            
        } catch (error) {
            console.error('❌ WebSocket: Connection failed', error);
            this.isConnecting = false;
        }
    }
    
    /**
     * Переподключиться
     */
    async reconnect(token) {
        this.disconnect();
        await this.connect(token);
    }
    
    /**
     * Отключиться
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.stopPingInterval();
        this.isConnecting = false;
    }
    
    /**
     * Проверить состояние соединения
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
    
    /**
     * Отправить сообщение
     */
    send(data) {
        if (!this.isConnected()) {
            console.warn('⚠️ WebSocket: Not connected, cannot send message');
            return false;
        }
        
        try {
            this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('❌ WebSocket: Failed to send message', e);
            return false;
        }
    }
    
    /**
     * Ping для поддержания соединения
     */
    startPingInterval() {
        this.stopPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send('ping');
            }
        }, 30000); // Каждые 30 секунд
    }
    
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    /**
     * Обработать сообщение от сервера
     */
    handleMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'connection':
                console.log('✅ WebSocket: Connection confirmed', data);
                break;
            
            case 'pong':
                console.debug('🏓 WebSocket: Pong received');
                break;
            
            case 'transaction_created':
                console.log('💰 WebSocket: Transaction created', data);
                this.emit('transaction_created', data);
                this.refreshDashboard();
                break;
            
            case 'transaction_deleted':
                console.log('🗑️ WebSocket: Transaction deleted', data);
                this.emit('transaction_deleted', data);
                this.refreshDashboard();
                break;
            
            case 'budget_alert':
                console.log('⚠️ WebSocket: Budget alert', data);
                this.emit('budget_alert', data);
                this.showBudgetAlert(data);
                break;
            
            default:
                console.log('📨 WebSocket: Unknown message type', type, data);
        }
    }
    
    /**
     * Обновить дашборд при получении новых данных
     */
    refreshDashboard() {
        // Очистить кэш
        cache.clearMatching('stats');
        cache.clearMatching('top_categories');
        cache.clearMatching('overview');
        
        // Перезагрузить текущий экран
        if (state.currentScreen === 'home') {
            loadDashboard();
        } else if (state.currentScreen === 'analytics') {
            loadAnalytics();
        } else if (state.currentScreen === 'history') {
            loadHistory();
        }
    }
    
    /**
     * Показать уведомление о бюджете
     */
    showBudgetAlert(data) {
        showNotification(`⚠️ Бюджет: ${data.message}`, 'warning');
    }
    
    /**
     * Подписаться на событие
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Отписаться от события
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
    
    /**
     * Вызвать событие
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(`❌ WebSocket: Error in event listener for ${event}`, e);
            }
        });
    }
}

// Глобальный экземпляр
const wsManager = new WebSocketManager();

// Экспорт для использования
if (typeof window !== 'undefined') {
    window.wsManager = wsManager;
}

console.log('✅ WebSocket Manager initialized');
