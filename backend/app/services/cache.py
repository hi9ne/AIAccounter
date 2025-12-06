"""
Cache Service with in-memory fallback
Redis используется в production, in-memory локально
"""
import json
import logging
import time
from typing import Optional, Any, Dict
from ..config import settings

logger = logging.getLogger(__name__)


class InMemoryCache:
    """Простой in-memory кэш с TTL"""
    
    def __init__(self):
        self._cache: Dict[str, tuple] = {}  # key -> (value, expires_at)
    
    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            value, expires_at = self._cache[key]
            if time.time() < expires_at:
                return value
            del self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: int = 300):
        self._cache[key] = (value, time.time() + ttl)
    
    def delete(self, key: str):
        self._cache.pop(key, None)
    
    def delete_pattern(self, pattern: str):
        """Удалить ключи по паттерну (простая реализация с *)"""
        prefix = pattern.rstrip('*')
        keys_to_delete = [k for k in self._cache.keys() if k.startswith(prefix)]
        for k in keys_to_delete:
            del self._cache[k]
    
    def clear(self):
        self._cache.clear()
    
    def cleanup(self):
        """Удалить истёкшие ключи"""
        now = time.time()
        expired = [k for k, (_, exp) in self._cache.items() if now >= exp]
        for k in expired:
            del self._cache[k]


class CacheService:
    """Cache service с Redis для production и in-memory fallback"""
    
    def __init__(self):
        self.redis = None
        self._enabled = False
        self._memory = InMemoryCache()
        self._use_memory = True  # Всегда используем memory как fallback
        
    async def connect(self):
        """Подключение к Redis (только если REDIS_URL указан)"""
        redis_url = getattr(settings, 'REDIS_URL', None)
        
        if not redis_url:
            logger.info("⚡ Using in-memory cache (Redis not configured)")
            self._enabled = True
            self._use_memory = True
            return
        
        try:
            from redis import asyncio as aioredis
            self.redis = await aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                health_check_interval=30
            )
            await self.redis.ping()
            self._enabled = True
            self._use_memory = False
            logger.info("✅ Redis connected successfully")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e} - using in-memory cache")
            self._enabled = True
            self._use_memory = True
            self.redis = None
    
    async def disconnect(self):
        """Отключение от Redis"""
        if self.redis:
            await self.redis.close()
            logger.info("Redis disconnected")
    
    @property
    def enabled(self) -> bool:
        return self._enabled
    
    @property
    def backend(self) -> str:
        return "memory" if self._use_memory else "redis"
    
    async def get(self, key: str) -> Optional[Any]:
        """Получить значение из кэша"""
        if not self._enabled:
            return None
        
        try:
            if self._use_memory:
                value = self._memory.get(key)
                if value is not None:
                    logger.debug(f"💾 Memory Cache HIT: {key}")
                return value
            
            value = await self.redis.get(key)
            if value:
                logger.debug(f"💾 Redis Cache HIT: {key}")
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache GET error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        """Сохранить значение в кэш"""
        if not self._enabled:
            return
        
        try:
            if self._use_memory:
                self._memory.set(key, value, ttl)
                logger.debug(f"💾 Memory Cache SET: {key} (TTL: {ttl}s)")
                return
            
            serialized = json.dumps(value, default=str)
            await self.redis.setex(key, ttl, serialized)
            logger.debug(f"💾 Redis Cache SET: {key} (TTL: {ttl}s)")
        except Exception as e:
            logger.error(f"Cache SET error for key {key}: {e}")
    
    async def delete(self, key: str):
        """Удалить ключ из кэша"""
        if not self._enabled:
            return
        
        try:
            if self._use_memory:
                self._memory.delete(key)
            else:
                await self.redis.delete(key)
            logger.debug(f"🗑️ Cache DELETE: {key}")
        except Exception as e:
            logger.error(f"Cache DELETE error for key {key}: {e}")
    
    async def delete_pattern(self, pattern: str):
        """Удалить все ключи по паттерну"""
        if not self._enabled:
            return
        
        try:
            if self._use_memory:
                self._memory.delete_pattern(pattern)
            else:
                keys = await self.redis.keys(pattern)
                if keys:
                    await self.redis.delete(*keys)
            logger.debug(f"🗑️ Cache DELETE pattern: {pattern}")
        except Exception as e:
            logger.error(f"Cache DELETE pattern error for {pattern}: {e}")
    
    async def exists(self, key: str) -> bool:
        """Проверить существование ключа"""
        if not self._enabled:
            return False
        
        try:
            if self._use_memory:
                return self._memory.get(key) is not None
            return await self.redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Cache EXISTS error for key {key}: {e}")
            return False
    
    def make_key(self, *parts) -> str:
        """Создать ключ из частей"""
        return ":".join(str(p) for p in parts)


# Глобальный экземпляр
cache_service = CacheService()
