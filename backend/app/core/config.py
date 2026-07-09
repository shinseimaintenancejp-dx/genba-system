"""
Genba Management System — Pydantic Settings Configuration.

All configuration values MUST come from environment variables.
No hardcoded secrets or credentials allowed (SEC§1.5, BE§10).
"""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # -------------------------------------------------------------------------
    # Application
    # -------------------------------------------------------------------------
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # Feature flag: comma-separated module names, or "all" to enable everything.
    # Example: "genba" | "genba,customers" | "all"
    ENABLED_MODULES: str = "all"

    # -------------------------------------------------------------------------
    # Database (PostgreSQL 16)

    # -------------------------------------------------------------------------
    DATABASE_URL: str

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Ensure the database URL uses asyncpg driver."""
        if not v.startswith("postgresql+asyncpg://"):
            raise ValueError(
                "DATABASE_URL must use 'postgresql+asyncpg://' driver for async support"
            )
        return v

    # -------------------------------------------------------------------------
    # Redis 7
    # -------------------------------------------------------------------------
    REDIS_URL: str = "redis://redis:6379/0"

    # -------------------------------------------------------------------------
    # JWT Authentication (SEC§1)
    # -------------------------------------------------------------------------
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Ensure secret key has minimum length."""
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    # -------------------------------------------------------------------------
    # S3-Compatible Object Storage (INFRA§4 — cloud-agnostic)
    # -------------------------------------------------------------------------
    STORAGE_ENDPOINT: str = ""
    STORAGE_ACCESS_KEY: str = ""
    STORAGE_SECRET_KEY: str = ""
    STORAGE_BUCKET_NAME: str = "genba-management"
    STORAGE_REGION: str = "apac"

    # -------------------------------------------------------------------------
    # Data Encryption — pgcrypto AES-256 (SEC§4)
    # NEVER log this value
    # -------------------------------------------------------------------------
    ENCRYPTION_KEY: str

    @field_validator("ENCRYPTION_KEY")
    @classmethod
    def validate_encryption_key(cls, v: str) -> str:
        """Ensure encryption key has minimum secure length."""
        if len(v) < 32:
            raise ValueError("ENCRYPTION_KEY must be at least 32 characters long")
        return v

    # -------------------------------------------------------------------------
    # Derived Properties
    # -------------------------------------------------------------------------
    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated ALLOWED_ORIGINS into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance (singleton pattern)."""
    return Settings()


# Global settings instance — import from here throughout the app
settings = get_settings()
