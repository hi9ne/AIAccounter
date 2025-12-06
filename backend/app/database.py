from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import AsyncAdaptedQueuePool
from .config import settings

# Используем connection pool для лучшей производительности
# Pool size = 5 соединений, max overflow = 10 дополнительных
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    poolclass=AsyncAdaptedQueuePool,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,  # Переподключаться каждые 30 минут
    pool_pre_ping=True,  # Проверять соединение перед использованием
    connect_args={
        "server_settings": {
            "jit": "off"
        },
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "command_timeout": "60"  # Таймаут запроса 60 сек
    }
)

# Создаём фабрику сессий
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base класс для моделей
Base = declarative_base()


# Dependency для получения сессии БД
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
