from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api.v1 import router as api_v1_router
from .services.cache import cache_service
import logging
import os

# Настройка логирования - в продакшене только WARNING и выше
log_level = logging.WARNING if not settings.DEBUG else logging.INFO
logging.basicConfig(
    level=log_level,
    format='%(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Отключаем SQLAlchemy INFO логи в продакшене
if not settings.DEBUG:
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# Создаём FastAPI приложение
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="AIAccounter - Финансовый учёт с AI",
    docs_url="/docs",
    redoc_url="/redoc",
)

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://localhost:5500",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5500",
    "https://aiaccounter.pages.dev",
    "https://*.aiaccounter.pages.dev"  # Поддомены Cloudflare
]

logger.info(f"🔧 Configured ALLOWED_ORIGINS: {allowed_origins}")

# Функция для проверки origin
def check_origin(origin: str) -> bool:
    """Проверяет допустим ли origin"""
    if origin in allowed_origins:
        return True
    # Проверяем поддомены pages.dev
    if origin.endswith('.aiaccounter.pages.dev') or origin == 'https://aiaccounter.pages.dev':
        return True
    # Проверяем localhost
    if origin.startswith('http://localhost') or origin.startswith('http://127.0.0.1'):
        return True
    return False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
)

# Подключаем API роуты
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске"""
    logger.info("🚀 Starting AIAccounter API...")
    await cache_service.connect()


@app.on_event("shutdown")
async def shutdown_event():
    """Очистка при остановке"""
    logger.info("🛑 Shutting down AIAccounter API...")
    await cache_service.disconnect()


@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "AIAccounter API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Проверка здоровья приложения"""
    return {
        "status": "healthy",
        "service": "AIAccounter API"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
