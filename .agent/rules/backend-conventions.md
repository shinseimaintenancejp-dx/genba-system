# Backend Conventions — Genba Management System

> **Chỉ dẫn phản hồi (Vietnamese):** Khi áp dụng file này, Agent phải tuân thủ mọi quy chuẩn dưới đây khi viết bất kỳ mã Backend nào (FastAPI, SQLAlchemy, Alembic). Mọi phản hồi liên quan đến code Backend phải bằng tiếng Việt, nhưng code comments, docstrings và variable names phải bằng tiếng Anh. API error messages trả về cho người dùng phải bằng tiếng Nhật (日本語).

---

## 1. Framework & Runtime

| Item | Standard |
|------|----------|
| Framework | **FastAPI 0.115+** — async native |
| Language | **Python 3.11+** — full type hints required |
| ORM | **SQLAlchemy 2.0** async session |
| Migrations | **Alembic** — autogenerate + manual review |
| Validation | **Pydantic v2** — strict mode for request/response |
| Task Scheduling | **APScheduler** (AsyncIOScheduler) |
| Package Management | **pip** + `requirements.txt` (pinned versions) |

## 2. Project Structure (Modular Monolith / Clean Architecture)

```
backend/
├── app/
│   ├── main.py                    # FastAPI app entry, lifespan events
│   ├── core/                      # Shared Kernel
│   │   ├── config.py              # Pydantic Settings (env-based)
│   │   ├── security.py            # JWT encode/decode, bcrypt, token rotation
│   │   ├── database.py            # Async engine, session factory, RLS context
│   │   ├── dependencies.py        # FastAPI Depends() — DI container
│   │   ├── permissions.py         # Role/Permission enums, ROLE_PERMISSIONS map
│   │   ├── pagination.py          # Shared pagination schema & utility
│   │   ├── storage.py             # S3-Compatible client (boto3, presigned URLs)
│   │   ├── audit.py               # Audit log service
│   │   ├── approval.py            # Approval workflow engine (state machine)
│   │   └── exceptions.py          # Custom HTTP exceptions (Japanese messages)
│   │
│   ├── modules/                   # Feature modules — each self-contained
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── router.py          # API routes (endpoints)
│   │   │   ├── schemas.py         # Pydantic request/response models
│   │   │   ├── service.py         # Business logic
│   │   │   ├── repository.py      # Database queries (SQLAlchemy)
│   │   │   └── models.py          # SQLAlchemy ORM models
│   │   ├── genba/                 # Same 5-file structure
│   │   ├── customer/
│   │   ├── partner/
│   │   ├── staff/
│   │   ├── worker/
│   │   ├── contract/
│   │   ├── quotation/
│   │   ├── invoice/
│   │   ├── manual/
│   │   ├── key_management/
│   │   └── schedule/
│   │
│   ├── migrations/                # Alembic
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │
│   └── scripts/                   # Utility scripts (seed data, import)
│
├── tests/
│   ├── conftest.py                # Shared fixtures
│   ├── test_auth/
│   ├── test_genba/
│   └── ...
│
├── alembic.ini
├── pyproject.toml
├── requirements.txt
└── Dockerfile
```

## 3. Module Internal Architecture (5-File Pattern)

Every module MUST contain exactly these 5 files. No cross-module imports at repository/model level:

| File | Responsibility | May Import From |
|------|---------------|-----------------|
| `router.py` | HTTP endpoints, input/output validation | `service.py`, `schemas.py`, `core/dependencies.py` |
| `schemas.py` | Pydantic v2 request/response DTOs | stdlib, pydantic only |
| `service.py` | Business logic, orchestration | `repository.py`, `core/*` |
| `repository.py` | Database operations (SQLAlchemy queries) | `models.py`, `core/database.py` |
| `models.py` | SQLAlchemy 2.0 ORM model definitions | `sqlalchemy` only |

### Cross-Module Communication

Modules communicate ONLY through service-level imports. Never import another module's repository or model directly:

```python
# ✅ CORRECT: Import service
from app.modules.customer.service import CustomerService

# ❌ WRONG: Import another module's repository
from app.modules.customer.repository import CustomerRepository
```

## 4. Coding Style

### 4.1. Async Everything (MANDATORY)

ALL endpoint handlers, service methods, and repository methods MUST be `async`:

```python
# ✅ CORRECT
@router.get("/genba")
async def list_genba(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[GenbaResponse]:
    return await genba_service.list(db, current_user)

# ❌ WRONG: Synchronous handler
@router.get("/genba")
def list_genba():
    return genba_service.list()
```

### 4.2. Type Hints (MANDATORY — 100% Coverage)

```python
# ✅ CORRECT: Full type hints including return type
async def get_by_id(self, session: AsyncSession, genba_id: UUID) -> Genba | None:
    result = await session.execute(
        select(GenbaModel).where(GenbaModel.id == genba_id)
    )
    return result.scalar_one_or_none()

# ❌ WRONG: Missing type hints
async def get_by_id(self, session, genba_id):
    ...
```

### 4.3. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | snake_case | `genba_service.py` |
| Classes | PascalCase | `GenbaService` |
| Functions | snake_case | `create_genba` |
| Constants | UPPER_SNAKE | `MAX_FILE_SIZE` |
| Pydantic models | PascalCase + suffix | `GenbaCreate`, `GenbaResponse`, `GenbaUpdate` |
| SQLAlchemy models | PascalCase + `Model` suffix | `GenbaModel` |
| Database tables | snake_case, plural | `genba`, `contracts`, `daily_cleaning_tasks` |

## 5. Pydantic v2 Schemas

### 5.1. Base Schema Pattern

```python
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID

class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    model_config = ConfigDict(
        from_attributes=True,      # ORM mode
        str_strip_whitespace=True,  # Auto-strip whitespace
        strict=True,                # Strict type coercion
    )

class GenbaCreate(BaseSchema):
    property_name: str
    address: str
    customer_id: UUID
    external_customer_code: str | None = None  # MCD — optional
    transportation: str | None = None
    management_start_date: date | None = None
    confirm_duplicate: bool = False

class GenbaResponse(BaseSchema):
    id: UUID
    property_name: str
    address: str
    status: str
    customer_id: UUID
    created_at: datetime
    updated_at: datetime

class GenbaUpdate(BaseSchema):
    property_name: str | None = None
    address: str | None = None
    transportation: str | None = None
    external_customer_code: str | None = None
```

### 5.2. Pagination Schema (Shared)

```python
# core/pagination.py
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class PaginationMeta(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int

class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    meta: PaginationMeta
```

### 5.3. Error Response Schema

```python
# core/exceptions.py
from fastapi import HTTPException

class AppException(HTTPException):
    """Base application exception with Japanese error messages."""
    def __init__(self, status_code: int, code: str, message: str, details: list | None = None):
        super().__init__(
            status_code=status_code,
            detail={"error": {"code": code, "message": message, "details": details or []}},
        )

class ValidationError(AppException):
    def __init__(self, field: str, issue: str):
        super().__init__(400, "VALIDATION_ERROR", "入力データに誤りがあります", [{"field": field, "issue": issue}])

class ForbiddenError(AppException):
    def __init__(self):
        super().__init__(403, "FORBIDDEN", "この操作を行う権限がありません")

class NotFoundError(AppException):
    def __init__(self, entity: str = "リソース"):
        super().__init__(404, "NOT_FOUND", f"{entity}が見つかりません")
```

## 6. SQLAlchemy 2.0 Async Patterns

### 6.1. Model Definition

```python
from sqlalchemy import String, Boolean, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime
import uuid

class Base(DeclarativeBase):
    pass

class GenbaModel(Base):
    __tablename__ = "genba"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("NOW()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("NOW()"), onupdate=datetime.utcnow)

    # Relationships (lazy="selectin" for async-safe eager loading)
    customer: Mapped["CustomerModel"] = relationship(lazy="selectin")
    staff_assignments: Mapped[list["GenbaStaffAssignmentModel"]] = relationship(back_populates="genba", lazy="selectin")
```

### 6.2. Repository Pattern

```python
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

class GenbaRepository:
    async def get_by_id(self, session: AsyncSession, genba_id: UUID) -> GenbaModel | None:
        result = await session.execute(
            select(GenbaModel).where(GenbaModel.id == genba_id)
        )
        return result.scalar_one_or_none()

    async def list_paginated(
        self, session: AsyncSession, page: int = 1, limit: int = 20
    ) -> tuple[list[GenbaModel], int]:
        # Count query
        count_result = await session.execute(select(func.count(GenbaModel.id)))
        total = count_result.scalar_one()

        # Data query
        offset = (page - 1) * limit
        result = await session.execute(
            select(GenbaModel)
            .order_by(GenbaModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        items = list(result.scalars().all())
        return items, total
```

## 7. Alembic Migration Rules

1. **NEVER use `--autogenerate` alone.** Always review the generated migration file before committing.
2. **One migration per Sprint feature set.** Name format: `{sprint_number}_{description}.py`
3. **Always include `downgrade()`.** Every migration MUST be reversible.
4. **RLS policies belong in migrations**, not in application code.
5. **Seed data belongs in scripts**, not in migrations.

```python
# Example migration naming:
# 01_create_users_and_audit.py
# 02_create_customers_and_genba.py
# 03_create_staff_and_workers.py
```

## 8. Router Registration

All module routers MUST be registered in `main.py` with a consistent prefix pattern:

```python
# main.py
from app.modules.auth.router import router as auth_router
from app.modules.genba.router import router as genba_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(genba_router, prefix="/api/v1/genba", tags=["Genba Management"])
```

## 9. Logging

Use Python's `logging` module with structured JSON output in production:

```python
import logging

logger = logging.getLogger(__name__)

# In service methods:
logger.info("Genba created", extra={"genba_id": str(genba.id), "user_id": str(user.id)})
logger.warning("Duplicate genba name detected", extra={"name": data.property_name})
logger.error("Failed to create genba", exc_info=True)
```

**CRITICAL:** Never log sensitive data (passwords, key codes, tokens, encryption keys).

## 10. Environment Variables

All configuration MUST come from environment variables via Pydantic Settings:

```python
# core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # JWT
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # S3-Compatible Storage
    STORAGE_ENDPOINT: str
    STORAGE_ACCESS_KEY: str
    STORAGE_SECRET_KEY: str
    STORAGE_BUCKET_NAME: str = "genba-management"
    STORAGE_REGION: str = "apac"
    
    # Encryption
    ENCRYPTION_KEY: str  # 32-byte key for pgcrypto
    
    model_config = ConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
```
