"""
Genba Management System — Pytest Shared Fixtures.

Provides shared test infrastructure for all test modules:
- Database session with test database
- Async HTTP test client
- Authentication headers for different roles
"""

import asyncio
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db_session_with_rls, get_db_bypass_rls
from app.core.security import hash_password
from app.main import app
from app.modules.auth.models import UserModel
from app.core.audit import AuditLogModel

# Test database URL (set via pytest.ini_options in pyproject.toml)
TEST_DATABASE_URL = settings.DATABASE_URL


# =============================================================================
# Event Loop
# =============================================================================
@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# =============================================================================
# Database Setup (per test — clean state)
# =============================================================================
from sqlalchemy import text

@pytest_asyncio.fixture
async def db_engine():
    """Create a test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Import all models to register them with Base.metadata
        # Add more model imports here as Sprints progress
        await conn.run_sync(Base.metadata.create_all)
        
        # Create a non-superuser role for testing RLS policies
        await conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'genba_test_role') THEN
                    EXECUTE 'DROP OWNED BY genba_test_role';
                    EXECUTE 'DROP ROLE genba_test_role';
                END IF;
            END
            $$;
        """))
        await conn.execute(text("CREATE ROLE genba_test_role WITH LOGIN PASSWORD 'test_pass'"))
        await conn.execute(text("GRANT ALL PRIVILEGES ON SCHEMA public TO genba_test_role"))
        await conn.execute(text("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO genba_test_role"))
        await conn.execute(text("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO genba_test_role"))
        await conn.execute(text("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO genba_test_role"))
        
        # Enable RLS on tables and setup policies for testing isolation
        await conn.execute(text("ALTER TABLE genba ENABLE ROW LEVEL SECURITY"))
        await conn.execute(text("ALTER TABLE genba FORCE ROW LEVEL SECURITY"))
        await conn.execute(text("DROP POLICY IF EXISTS staff_genba ON genba"))
        await conn.execute(text("""
            CREATE POLICY staff_genba ON genba
            FOR ALL
            USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
        """))
        await conn.execute(text("DROP POLICY IF EXISTS partner_genba ON genba"))
        await conn.execute(text("""
            CREATE POLICY partner_genba ON genba
            FOR SELECT
            USING (
                current_setting('app.user_role', TRUE) = 'PARTNER'
                AND id IN (
                    SELECT c.genba_id FROM contracts c
                    WHERE c.partner_id::text = current_setting('app.related_entity_id', TRUE)
                      AND c.status = 'ACTIVE'
                )
            )
        """))
        await conn.execute(text("DROP POLICY IF EXISTS worker_genba ON genba"))
        await conn.execute(text("""
            CREATE POLICY worker_genba ON genba
            FOR SELECT
            USING (
                current_setting('app.user_role', TRUE) = 'GENBA_WORKER'
                AND id IN (
                    SELECT gw.genba_id FROM genba_workers gw
                    WHERE gw.worker_id::text = current_setting('app.related_entity_id', TRUE)
                      AND gw.is_active = TRUE
                )
            )
        """))

        await conn.execute(text("ALTER TABLE contracts ENABLE ROW LEVEL SECURITY"))
        await conn.execute(text("ALTER TABLE contracts FORCE ROW LEVEL SECURITY"))
        await conn.execute(text("DROP POLICY IF EXISTS staff_contracts ON contracts"))
        await conn.execute(text("""
            CREATE POLICY staff_contracts ON contracts
            FOR ALL
            USING (current_setting('app.user_role', TRUE) IN ('ADMIN', 'SENIOR_STAFF', 'INTERNAL_STAFF'))
        """))
        await conn.execute(text("DROP POLICY IF EXISTS partner_contracts ON contracts"))
        await conn.execute(text("""
            CREATE POLICY partner_contracts ON contracts
            FOR SELECT
            USING (
                current_setting('app.user_role', TRUE) = 'PARTNER'
                AND contract_type = 'ORDERING'
                AND partner_id::text = current_setting('app.related_entity_id', TRUE)
            )
        """))

    yield engine

    async with engine.begin() as conn:
        await conn.execute(text("DROP POLICY IF EXISTS partner_genba ON genba"))
        await conn.execute(text("DROP POLICY IF EXISTS worker_genba ON genba"))
        await conn.execute(text("DROP POLICY IF EXISTS staff_genba ON genba"))
        await conn.execute(text("DROP POLICY IF EXISTS partner_contracts ON contracts"))
        await conn.execute(text("DROP POLICY IF EXISTS staff_contracts ON contracts"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'genba_test_role') THEN
                    EXECUTE 'DROP OWNED BY genba_test_role';
                    EXECUTE 'DROP ROLE genba_test_role';
                END IF;
            END
            $$;
        """))

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Create a fresh database session for each test.

    Uses a nested transaction (savepoint) to roll back after each test,
    ensuring tests are isolated without recreating the schema.
    """
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session
        await session.rollback()


# =============================================================================
# HTTP Test Client
# =============================================================================
@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client for FastAPI application."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# =============================================================================
# Test User Factories
# =============================================================================
async def _create_test_user(
    session: AsyncSession,
    username: str,
    role: str,
    password: str = "TestPassword@2026",
) -> UserModel:
    """Helper to create a test user in the database."""
    user = UserModel(
        id=uuid.uuid4(),
        username=username,
        full_name=f"テスト {username}",
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin_user(db_session: AsyncSession) -> UserModel:
    """Create a test ADMIN user."""
    return await _create_test_user(db_session, "test_admin", "ADMIN")


@pytest_asyncio.fixture
async def test_staff_user(db_session: AsyncSession) -> UserModel:
    """Create a test INTERNAL_STAFF user."""
    return await _create_test_user(db_session, "test_staff", "INTERNAL_STAFF")


@pytest_asyncio.fixture
async def test_worker_user(db_session: AsyncSession) -> UserModel:
    """Create a test GENBA_WORKER user."""
    return await _create_test_user(db_session, "test_worker", "GENBA_WORKER")


@pytest_asyncio.fixture
async def test_partner_user(db_session: AsyncSession) -> UserModel:
    """Create a test PARTNER user."""
    return await _create_test_user(db_session, "test_partner", "PARTNER")


# =============================================================================
# Authenticated Headers (TEST§1.3)
# =============================================================================
@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient, test_admin_user: UserModel) -> dict:
    """Get authenticated headers for ADMIN role."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "test_admin", "password": "TestPassword@2026"},
    )
    assert response.status_code == 200
    access_token = response.cookies.get("access_token")
    assert access_token, "No access_token cookie set on login"
    return {"Cookie": f"access_token={access_token}"}


@pytest_asyncio.fixture
async def staff_headers(client: AsyncClient, test_staff_user: UserModel) -> dict:
    """Get authenticated headers for INTERNAL_STAFF role."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "test_staff", "password": "TestPassword@2026"},
    )
    assert response.status_code == 200
    access_token = response.cookies.get("access_token")
    assert access_token
    return {"Cookie": f"access_token={access_token}"}


@pytest_asyncio.fixture
async def worker_headers(client: AsyncClient, test_worker_user: UserModel) -> dict:
    """Get authenticated headers for GENBA_WORKER role."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "test_worker", "password": "TestPassword@2026"},
    )
    assert response.status_code == 200
    access_token = response.cookies.get("access_token")
    assert access_token
    return {"Cookie": f"access_token={access_token}"}


@pytest_asyncio.fixture
async def partner_headers(client: AsyncClient, test_partner_user: UserModel) -> dict:
    """Get authenticated headers for PARTNER role."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "test_partner", "password": "TestPassword@2026"},
    )
    assert response.status_code == 200
    access_token = response.cookies.get("access_token")
    assert access_token
    return {"Cookie": f"access_token={access_token}"}


@pytest_asyncio.fixture(autouse=True)
async def flush_redis(monkeypatch) -> None:
    """Flush Redis database before each test to ensure cache isolation. Mocked for tests."""
    from unittest.mock import AsyncMock
    # Create a mock Redis client
    mock_redis = AsyncMock()
    
    # Patch the get_redis function in app.core.redis to return our mock
    import app.core.redis
    monkeypatch.setattr(app.core.redis, "get_redis", AsyncMock(return_value=mock_redis))
    
    # Also patch the global redis_client if it exists
    if hasattr(app.core.redis, "redis_client"):
        monkeypatch.setattr(app.core.redis, "redis_client", mock_redis)
    
    # We don't actually need to flush the mock
    pass
