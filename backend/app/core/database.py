"""
Genba Management System — Database Engine & Session Factory.

Implements:
- SQLAlchemy 2.0 async engine with asyncpg
- RLS (Row-Level Security) context injection per transaction (SEC§3.2)
- Session factory with automatic RLS variable setting
"""

import logging
from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)


# =============================================================================
# SQLAlchemy Declarative Base
# All ORM models inherit from this class
# =============================================================================
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    pass


# =============================================================================
# Async Engine Configuration
# =============================================================================
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    # Connection pool settings
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,          # Validate connections before use
    pool_recycle=3600,           # Recycle connections after 1 hour
    echo=settings.DEBUG,         # Log SQL in debug mode only
    echo_pool=False,
    # asyncpg-specific options
    connect_args={
        "server_settings": {
            "jit": "off",        # Disable JIT for predictable query plans
            "application_name": "genba_management",
        }
    },
)


# =============================================================================
# Session Factory
# =============================================================================
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,    # Prevent lazy load errors after commit
    autoflush=False,
    autocommit=False,
)


# =============================================================================
# RLS Context Injection (SEC§3.2)
# Every database session MUST set RLS variables via SET LOCAL
# =============================================================================
async def set_rls_context(
    session: AsyncSession,
    user_id: str,
    user_role: str,
    related_entity_id: str | None = None,
    encryption_key: str | None = None,
) -> None:
    """
    Inject Row-Level Security context variables into the PostgreSQL session.

    These variables are transaction-scoped (SET LOCAL) so they cannot
    persist across transactions or be bypassed by application code.

    Args:
        session: Active async database session
        user_role: The user's role (e.g., 'ADMIN', 'GENBA_WORKER', 'PARTNER')
        related_entity_id: UUID of associated entity (staff/worker/partner ID)
        encryption_key: AES-256 encryption key for pgcrypto operations (SEC§4.2)
    """
    # Set the user role for RLS policies
    await session.execute(
        text("SELECT set_config('app.user_id', :user_id, true), set_config('app.user_role', :role, true)"),
        {"user_id": str(user_id), "role": str(user_role)},
    )
    logger.debug("RLS context set", extra={"user_id": user_id, "user_role": user_role})

    # Set related entity ID if provided (used by Worker/Partner RLS policies)
    if related_entity_id:
        await session.execute(
            text("SELECT set_config('app.related_entity_id', :entity_id, true)"),
            {"entity_id": str(related_entity_id)},
        )

    # Set encryption key for pgcrypto operations (SEC§4.2)
    # CRITICAL: This key is transaction-scoped and NEVER logged
    if encryption_key:
        await session.execute(
            text("SELECT set_config('app.encryption_key', :enc_key, true)"),
            {"enc_key": encryption_key},
        )


async def get_db_session_with_rls(
    user_id: str,
    user_role: str,
    related_entity_id: str | None = None,
    encryption_key: str | None = None,
) -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an async database session with RLS context pre-configured.

    This is the primary database session provider used via FastAPI Depends().
    The RLS context ensures PostgreSQL enforces row-level access control.

    Usage:
        async def endpoint(db: AsyncSession = Depends(get_db)):
            # RLS is already set — queries are automatically filtered
            genba_list = await genba_repo.list_all(db)

    Args:
        user_role: Current user's role for RLS policy enforcement
        related_entity_id: UUID of staff/worker/partner for scoped queries
        encryption_key: AES-256 key for pgcrypto (SEC§4.2, set per-transaction)
    """
    async with async_session_factory() as session:
        try:
            await set_rls_context(
                session, user_id, user_role, related_entity_id, encryption_key
            )
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db_bypass_rls() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield a database session WITHOUT RLS context.

    ONLY use this for:
    - System-level operations (migrations, seed scripts)
    - Admin superuser operations that intentionally bypass RLS

    NEVER use this for user-facing API endpoints.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# =============================================================================
# Database Lifecycle Utilities
# =============================================================================
async def create_all_tables(connection: AsyncConnection) -> None:
    """Create all tables from ORM models (for testing only)."""
    await connection.run_sync(Base.metadata.create_all)


async def drop_all_tables(connection: AsyncConnection) -> None:
    """Drop all tables from ORM models (for testing only)."""
    await connection.run_sync(Base.metadata.drop_all)


async def check_database_connection() -> bool:
    """
    Verify database connectivity.
    Used in the /health endpoint and startup lifespan event.

    Returns:
        True if connection is successful, False otherwise
    """
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        logger.exception("Database connection check failed")
        return False
