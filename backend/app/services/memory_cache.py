"""
In-Memory Cache Service
Быстрый fallback кэш когда Redis недоступен
Thread-safe с автоматической очисткой устаревших записей
"""
import time
import asyncio
from typing import Optional, Any, Dict
from collections import OrderedDict
import logging

logger = logging.getLogger(__name__)


class MemoryCache:
    """In-memory кэш с TTL и LRU eviction"""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = asyncio.Lock()
        self._hits = 0
        self._misses = 0
    
    async def get(self, key: str) -> Optional[Any]:
        """Получить значение из кэша"""
        async with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None
            
            item = self._cache[key]
            if time.time() > item['expires']:
                del self._cache[key]
                self._misses += 1
                return None
            
            # LRU: перемещаем в конец
            self._cache.move_to_end(key)
            self._hits += 1
            return item['value']
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Сохранить значение в кэш"""
        if ttl is None:
            ttl = self._default_ttl
        
        async with self._lock:
            # Очищаем устаревшие записи при каждой записи
            self._cleanup_expired()
            
            # LRU eviction если превышен размер
            while len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)
            
            self._cache[key] = {
                'value': value,
                'expires': time.time() + ttl
            }
    
    async def delete(self, key: str) -> bool:
        """Удалить ключ из кэша"""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Удалить все ключи по префиксу"""
        async with self._lock:
            # Простое сопоставление по префиксу (pattern без *)
            prefix = pattern.rstrip('*')
            keys_to_delete = [k for k in self._cache.keys() if k.startswith(prefix)]
            for key in keys_to_delete:
                del self._cache[key]
            return len(keys_to_delete)
    
    async def clear(self) -> None:
        """Очистить весь кэш"""
        async with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0
    
    def _cleanup_expired(self) -> None:
        """Удалить устаревшие записи (вызывается под lock)"""
        now = time.time()
        expired_keys = [k for k, v in self._cache.items() if now > v['expires']]
        for key in expired_keys:
            del self._cache[key]
    
    @property
    def stats(self) -> Dict[str, Any]:
        """Статистика кэша"""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        return {
            'size': len(self._cache),
            'max_size': self._max_size,
            'hits': self._hits,
            'misses': self._misses,
            'hit_rate': f"{hit_rate:.1f}%"
        }


class HybridCache:
    """
    Гибридный кэш: Redis + Memory fallback
    Использует Redis если доступен, иначе in-memory
    """
    
    def __init__(self, redis_cache=None, memory_cache: Optional[MemoryCache] = None):
        self._redis = redis_cache
        self._memory = memory_cache or MemoryCache()
    
    def set_redis(self, redis_cache):
        """Установить Redis кэш"""
        self._redis = redis_cache
    
    @property
    def redis_enabled(self) -> bool:
        """Проверка доступности Redis"""
        return self._redis is not None and self._redis.enabled
    
    async def get(self, key: str) -> Optional[Any]:
        """Получить значение (сначала Redis, потом Memory)"""
        # Сначала пробуем Redis
        if self.redis_enabled:
            try:
                value = await self._redis.get(key)
                if value is not None:
                    return value
            except Exception as e:
                logger.warning(f"Redis get error: {e}")
        
        # Fallback на memory
        return await self._memory.get(key)
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """Сохранить значение (в оба кэша)"""
        # Пишем в Redis если доступен
        if self.redis_enabled:
            try:
                await self._redis.set(key, value, ttl)
            except Exception as e:
                logger.warning(f"Redis set error: {e}")
        
        # Всегда пишем в memory для быстрого доступа
        await self._memory.set(key, value, ttl)
    
    async def delete(self, key: str) -> None:
        """Удалить из обоих кэшей"""
        if self.redis_enabled:
            try:
                await self._redis.delete(key)
            except Exception:
                pass
        await self._memory.delete(key)
    
    async def delete_pattern(self, pattern: str) -> None:
        """Удалить по паттерну из обоих кэшей"""
        if self.redis_enabled:
            try:
                await self._redis.delete_pattern(pattern)
            except Exception:
                pass
        await self._memory.delete_pattern(pattern)
    
    def make_key(self, *parts) -> str:
        """Создать ключ из частей"""
        return ":".join(str(p) for p in parts)
    
    @property
    def stats(self) -> Dict[str, Any]:
        """Статистика кэша"""
        return {
            'redis_enabled': self.redis_enabled,
            'memory': self._memory.stats
        }


# Глобальные экземпляры
memory_cache = MemoryCache(max_size=2000, default_ttl=300)
hybrid_cache = HybridCache(memory_cache=memory_cache)
