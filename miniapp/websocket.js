// ============================================================================
// WebSocket Manager AIAccounter Mini App
// ============================================================================

const wsDebug = {
    log: (...args) => window.IS_LOCALHOST && console.log('[WS]', ...args),
    warn: (...args) => window.IS_LOCALHOST && console.warn('[WS]', ...args),
    error: (...args) => console.error('[WS]', ...args)
};

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
     * Connect to WebSocket
     */
    async connect(token) {
        if (this.isConnecting || this.isConnected()) {
            wsDebug.log('?? WebSocket: Already connecting or connected');
            return;
        }
        
        this.isConnecting = true;
        
        try {
            const wsUrl = API_BASE.replace('http', 'ws') + '/api/v1/ws';
            const urlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`;
            
            wsDebug.log('?? WebSocket: Connecting...');
            this.ws = new WebSocket(urlWithToken);
            
            this.ws.onopen = () => {
                wsDebug.log('? WebSocket: Connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.startPingInterval();
                this.emit('connected');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    wsDebug.log('?? WebSocket message:', message);
                    this.handleMessage(message);
                } catch (e) {
                    console.error('? WebSocket: Failed to parse message', e);
                }
            };
            
            this.ws.onclose = (event) => {
                wsDebug.log('? WebSocket: Disconnected', event.code, event.reason);
                this.isConnecting = false;
                this.stopPingInterval();
                this.emit('disconnected');
                
                //  
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    wsDebug.log(`?? WebSocket: Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    setTimeout(() => this.reconnect(token), this.reconnectDelay);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('? WebSocket error:', error);
                this.emit('error', error);
            };
            
        } catch (error) {
            console.error('? WebSocket: Connection failed', error);
            this.isConnecting = false;
        }
    }
    
    /**
     * 
     */
    async reconnect(token) {
        this.disconnect();
        await this.connect(token);
    }
    
    /**
     * 
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
     *   
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
    
    /**
     *  
     */
    send(data) {
        if (!this.isConnected()) {
            wsDebug.warn('?? WebSocket: Not connected, cannot send message');
            return false;
        }
        
        try {
            this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('? WebSocket: Failed to send message', e);
            return false;
        }
    }
    
    /**
     * Ping   
     */
    startPingInterval() {
        this.stopPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send('ping');
            }
        }, 30000); //  30 
    }
    
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    /**
     * Обработка сообщений от сервера
     */
    handleMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'connection':
                wsDebug.log('✅ WebSocket: Connection confirmed', data);
                break;
            
            case 'pong':
                console.debug('🏓 WebSocket: Pong received');
                break;
            
            case 'transaction_created':
                wsDebug.log('💰 WebSocket: Transaction created', data);
                this.emit('transaction_created', data);
                this.refreshDashboard();
                
                // Показываем геймификацию если есть
                if (data.gamification && typeof showGamificationNotificationEnhanced === 'function') {
                    showGamificationNotificationEnhanced(data.gamification);
                }
                break;
            
            case 'transaction_deleted':
                wsDebug.log('🗑️ WebSocket: Transaction deleted', data);
                this.emit('transaction_deleted', data);
                this.refreshDashboard();
                break;
            
            case 'budget_alert':
                wsDebug.log('⚠️ WebSocket: Budget alert', data);
                this.emit('budget_alert', data);
                this.showBudgetAlert(data);
                break;
            
            default:
                wsDebug.log('❓ WebSocket: Unknown message type', type, data);
        }
    }
    
    /**
     *      
     */
    refreshDashboard() {
        //  
        cache.clearMatching('stats');
        cache.clearMatching('top_categories');
        cache.clearMatching('overview');
        
        //   
        if (state.currentScreen === 'home') {
            loadDashboard();
        } else if (state.currentScreen === 'analytics') {
            loadAnalytics();
        } else if (state.currentScreen === 'history') {
            loadHistory();
        }
    }
    
    /**
     *    
     */
    showBudgetAlert(data) {
        showNotification(`?? : ${data.message}`, 'warning');
    }
    
    /**
     *   
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     *   
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
     *  
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(`? WebSocket: Error in event listener for ${event}`, e);
            }
        });
    }
}

//  
const wsManager = new WebSocketManager();

//   
if (typeof window !== 'undefined') {
    window.wsManager = wsManager;
}

wsDebug.log('? WebSocket Manager initialized');

