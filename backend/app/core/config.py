"""
config.py - All settings (DB URL, JWT secret, company info)
"""
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    FRONTEND_URL: str = "http://localhost:3000"

    COMPANY_NAME: str = "Vodacom Technologies Pvt. Ltd."
    COMPANY_GSTIN: str = "07AAAAA0000A1Z5"
    COMPANY_STATE_CODE: str = "07"  # Delhi
    COMPANY_ADDRESS: str = ""
    COMPANY_PHONE: str = ""
    COMPANY_EMAIL: str = ""
    
    ADMIN_EMAIL: str = "admin@vodacom.com"
    ADMIN_PASSWORD: str = "admin123"

    SMTP_USERNAME: str = "dummy@example.com"
    SMTP_PASSWORD: str = "dummy"
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_FROM_EMAIL: str = "dummy@example.com"
    SMTP_FROM_NAME: str = "Vodacom Technologies"
    
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
