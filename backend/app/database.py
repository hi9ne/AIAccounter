from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from .config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=10,          # Пул из 10 соединений
    max_overflow=20,       # До 30 соединений в пике
    pool_pre_ping=True,    # Проверка соединений перед использованием
    pool_recycle=3600,     # Обновление соединений каждый час
    connect_args={
        "server_settings": {
            "jit": "off"   # Отключаем JIT для лучшей совместимости
        },
        "statement_cache_size": 0  # Полностью отключаем prepared statements для pgbouncer
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
