from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from .config import settings

# Используем NullPool и отключаем prepared statements для Supabase Transaction Mode (port 5432)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    poolclass=NullPool,
    connect_args={
        "server_settings": {
            "jit": "off"
        },
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "command_timeout": "60"
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
