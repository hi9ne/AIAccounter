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

# CORS middleware - разрешаем все origins для разработки
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://localhost:5500",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5500",
    "https://aiaccounter.pages.dev",
    "*"  # Временно разрешаем все для отладки
]

logger.info(f"🔧 Configured ALLOWED_ORIGINS: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
