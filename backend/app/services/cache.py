"""
Redis Cache Service
Используется только в production (через REDIS_URL)
"""
import json
import logging
from typing import Optional, Any
from redis import asyncio as aioredis
from ..config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis cache service для production"""
    
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
        self._enabled = False
        
    async def connect(self):
        """Подключение к Redis (только если REDIS_URL указан)"""
        if not hasattr(settings, 'REDIS_URL') or not settings.REDIS_URL:
            logger.info("⚠️ Redis not configured (REDIS_URL not set) - cache disabled")
            self._enabled = False
            return
        
        try:
            self.redis = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                health_check_interval=30
            )
            # Проверка соединения
            await self.redis.ping()
            self._enabled = True
            logger.info("✅ Redis connected successfully")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e} - cache disabled")
            self._enabled = False
            self.redis = None
    
    async def disconnect(self):
        """Отключение от Redis"""
        if self.redis:
            await self.redis.close()
            logger.info("Redis disconnected")
    
    @property
    def enabled(self) -> bool:
        """Проверка доступности кэша"""
        return self._enabled and self.redis is not None
    
    async def get(self, key: str) -> Optional[Any]:
        """Получить значение из кэша"""
        if not self.enabled:
            return None
        
        try:
            value = await self.redis.get(key)
            if value:
                logger.debug(f"💾 Cache HIT: {key}")
                return json.loads(value)
            logger.debug(f"❌ Cache MISS: {key}")
            return None
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        """
        Сохранить значение в кэш
        
        Args:
            key: ключ
            value: значение (будет сериализовано в JSON)
            ttl: время жизни в секундах (по умолчанию 5 минут)
        """
        if not self.enabled:
            return
        
        try:
            serialized = json.dumps(value, default=str)
            await self.redis.setex(key, ttl, serialized)
            logger.debug(f"💾 Cache SET: {key} (TTL: {ttl}s)")
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
    
    async def delete(self, key: str):
        """Удалить ключ из кэша"""
        if not self.enabled:
            return
        
        try:
            await self.redis.delete(key)
            logger.debug(f"🗑️ Cache DELETE: {key}")
        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
    
    async def delete_pattern(self, pattern: str):
        """Удалить все ключи по паттерну"""
        if not self.enabled:
            return
        
        try:
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
                logger.debug(f"🗑️ Cache DELETE pattern: {pattern} ({len(keys)} keys)")
        except Exception as e:
            logger.error(f"Redis DELETE pattern error for {pattern}: {e}")
    
    async def exists(self, key: str) -> bool:
        """Проверить существование ключа"""
        if not self.enabled:
            return False
        
        try:
            return await self.redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis EXISTS error for key {key}: {e}")
            return False
    
    async def ttl(self, key: str) -> int:
        """Получить TTL ключа в секундах"""
        if not self.enabled:
            return -2
        
        try:
            return await self.redis.ttl(key)
        except Exception as e:
            logger.error(f"Redis TTL error for key {key}: {e}")
            return -2
    
    def make_key(self, *parts) -> str:
        """Создать ключ из частей"""
        return ":".join(str(p) for p in parts)


# Глобальный экземпляр
cache_service = CacheService()
