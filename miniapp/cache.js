/**
 * Frontend Cache with TTL (Time To Live)
 * Оптимизация для уменьшения повторных запросов к API
 */

class FrontendCache {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map();
        this.hits = 0;
        this.misses = 0;
    }
    
    /**
     * Сохранить значение в кеш
     * @param {string} key - Ключ
     * @param {any} value - Значение
     * @param {number} ttlSeconds - TTL в секундах (default: 5 минут)
     */
    set(key, value, ttlSeconds = 300) {
        this.cache.set(key, value);
        this.ttl.set(key, Date.now() + ttlSeconds * 1000);
        console.log(`📦 Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    }
    
    /**
     * Получить значение из кеша
     * @param {string} key - Ключ
     * @returns {any|null} - Значение или null если истек TTL
     */
    get(key) {
        const expiry = this.ttl.get(key);
        
        // Проверка истечения TTL
        if (!expiry || Date.now() > expiry) {
            this.cache.delete(key);
            this.ttl.delete(key);
            this.misses++;
            console.log(`❌ Cache MISS: ${key}`);
            return null;
        }
        
        this.hits++;
        const value = this.cache.get(key);
        console.log(`✅ Cache HIT: ${key}`);
        return value;
    }
    
    /**
     * Проверить наличие ключа
     */
    has(key) {
        return this.get(key) !== null;
    }
    
    /**
     * Удалить по ключу
     */
    delete(key) {
        this.cache.delete(key);
        this.ttl.delete(key);
        console.log(`🗑️ Cache DELETE: ${key}`);
    }
    
    /**
     * Очистить все ключи содержащие pattern
     * @param {string} pattern - Паттерн для поиска
     */
    clear(pattern) {
        let cleared = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.delete(key);
                cleared++;
            }
        }
        console.log(`🗑️ Cache CLEAR: ${cleared} keys matching "${pattern}"`);
    }
    
    /**
     * Очистить весь кеш
     */
    clearAll() {
        const size = this.cache.size;
        this.cache.clear();
        this.ttl.clear();
        console.log(`🗑️ Cache CLEAR ALL: ${size} keys removed`);
    }
    
    /**
     * Получить статистику кеша
     */
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : 0;
        
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: hitRate + '%'
        };
    }
    
    /**
     * Показать статистику в консоли
     */
    logStats() {
        const stats = this.getStats();
        console.log(`📊 Cache Stats:`, stats);
    }
}

// Глобальный инстанс кеша
const frontendCache = new FrontendCache();

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FrontendCache, frontendCache };
}
