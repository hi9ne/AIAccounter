from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "AIAccounter API"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5500"
    ]
    
    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    
    # APITemplate.io (для генерации PDF отчётов)
    APITEMPLATE_API_KEY: str = ""
    WEEKLY_TEMPLATE_ID: str = ""
    MONTHLY_TEMPLATE_ID: str = ""
    PERIOD_TEMPLATE_ID: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
