from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api.v1 import router as api_v1_router
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создаём FastAPI приложение
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="AIAccounter - Финансовый учёт с AI",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware - разрешаем все Telegram origins
logger.info(f"🔧 Configured ALLOWED_ORIGINS: {settings.ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS if settings.ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Подключаем API роуты
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


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
