"""Shared configuration for Python microservices"""

import os
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Base settings for all Python microservices"""

    # Service
    service_name: str = os.getenv("SERVICE_NAME", "unknown")
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    port: int = int(os.getenv("PORT", "8000"))
    host: str = os.getenv("HOST", "0.0.0.0")

    # Database
    database_url: str = os.getenv(
        "DATABASE_URL", "postgresql://educonnect:changeme@localhost:5432/educonnect"
    )

    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_password: Optional[str] = os.getenv("REDIS_PASSWORD")

    # Model cache
    model_cache_dir: str = os.getenv("MODEL_CACHE_DIR", "./models")

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
