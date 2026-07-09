"""
Genba Management System — Alembic Migration Environment.

Configures async Alembic with:
- SQLAlchemy 2.0 async engine (asyncpg driver)
- Auto-import of all ORM models for autogenerate support
- Database URL from Pydantic settings
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Import the shared Base and all models so Alembic can detect schema changes.
# All models must be imported here for autogenerate to work correctly.
from app.core.database import Base
from app.core.config import settings

# Import all models — add new model imports here as Sprints are completed
# Sprint 2: auth models
from app.modules.auth.models import UserModel  # noqa: F401
from app.core.audit import AuditLogModel  # noqa: F401
# Sprint 3: genba + customer
# from app.modules.genba.models import GenbaModel
# from app.modules.customer.models import CustomerModel
# ...

# =============================================================================
# Alembic Config
# =============================================================================
config = context.config

# Override sqlalchemy.url from environment (never use alembic.ini value)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Configure logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for --autogenerate support
target_metadata = Base.metadata


# =============================================================================
# Migration Helpers
# =============================================================================
def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This configures the context with just a URL, without creating an engine.
    Useful for generating migration SQL without connecting to a database.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Execute migrations using the provided synchronous connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,          # Detect column type changes
        compare_server_default=True, # Detect server default changes
        include_schemas=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Run migrations in 'online' mode using an async engine.

    Creates a new async engine from config, then runs migrations
    via a synchronous connection wrapper (required by Alembic).
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # No pooling for migration runs
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online migration mode."""
    asyncio.run(run_async_migrations())


# =============================================================================
# Entry Point
# =============================================================================
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
