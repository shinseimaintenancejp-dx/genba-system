# DevOps & Testing Conventions — Genba Management System

> **Chỉ dẫn phản hồi (Vietnamese):** File này quy định chuẩn viết test (Pytest cho Backend, Vitest cho Frontend), tối ưu Dockerfile multi-stage, và quy trình CI/CD qua GitHub Actions. Agent phải tuân thủ khi viết test hoặc sửa đổi cấu hình Docker/CI.

---

## 1. Backend Testing (Pytest)

### 1.1. Configuration

```ini
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
filterwarnings = ["ignore::DeprecationWarning"]
env = [
    "DATABASE_URL=postgresql+asyncpg://test_user:test_pass@localhost:5432/genba_test",
    "REDIS_URL=redis://localhost:6379/1",
    "SECRET_KEY=test-secret-key-not-for-production",
    "ENCRYPTION_KEY=test-encryption-key-32-bytes-long",
]
```

### 1.2. Test Structure

```
tests/
├── conftest.py              # Shared fixtures (db session, test client, auth helpers)
├── test_auth/
│   ├── test_login.py
│   ├── test_refresh.py
│   └── test_permissions.py
├── test_genba/
│   ├── test_crud.py
│   ├── test_rls.py          # RLS policy verification
│   └── test_search.py
├── test_contracts/
│   └── test_crud.py
├── test_invoice/
│   ├── test_auto_generation.py
│   └── test_approval.py
├── test_keys/
│   ├── test_encryption.py   # pgcrypto encrypt/decrypt
│   └── test_audit.py        # Sensitive access logging
└── test_storage/
    └── test_presigned_url.py
```

### 1.3. Shared Fixtures

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.main import app
from app.core.database import Base

@pytest.fixture
async def db_session():
    """Create a fresh database session for each test."""
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSession(engine) as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def client():
    """Async test client for FastAPI."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """Get authenticated headers for INTERNAL_STAFF role."""
    response = await client.post("/api/v1/auth/login", json={
        "username": "test_staff",
        "password": "test_password",
    })
    token = response.cookies.get("access_token")
    return {"Cookie": f"access_token={token}"}

@pytest.fixture
async def admin_headers(client: AsyncClient) -> dict:
    """Get authenticated headers for ADMIN role."""
    response = await client.post("/api/v1/auth/login", json={
        "username": "test_admin",
        "password": "test_password",
    })
    token = response.cookies.get("access_token")
    return {"Cookie": f"access_token={token}"}
```

### 1.4. Test Patterns

#### CRUD Test Pattern

```python
# tests/test_genba/test_crud.py
import pytest
from httpx import AsyncClient

class TestGenbaCreate:
    async def test_create_genba_success(self, client: AsyncClient, auth_headers: dict):
        response = await client.post(
            "/api/v1/genba",
            json={
                "property_name": "テスト物件",
                "address": "大阪市淀川区",
                "customer_id": "valid-uuid-here",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["property_name"] == "テスト物件"
        assert data["status"] == "ACTIVE"

    async def test_create_genba_unauthorized(self, client: AsyncClient):
        response = await client.post("/api/v1/genba", json={})
        assert response.status_code == 401

    async def test_create_genba_missing_required_field(self, client: AsyncClient, auth_headers: dict):
        response = await client.post(
            "/api/v1/genba",
            json={"address": "大阪市"},  # Missing property_name
            headers=auth_headers,
        )
        assert response.status_code == 422
```

#### RLS Verification Test Pattern

```python
# tests/test_genba/test_rls.py
class TestGenbaRLS:
    async def test_partner_sees_only_contracted_genba(
        self, client: AsyncClient, partner_headers: dict
    ):
        """Partner should only see genba with active ORDERING contracts."""
        response = await client.get("/api/v1/genba", headers=partner_headers)
        assert response.status_code == 200
        genba_list = response.json()["data"]
        # Verify each genba has an active contract with this partner
        for genba in genba_list:
            assert genba["has_active_contract"] is True

    async def test_worker_sees_only_assigned_genba(
        self, client: AsyncClient, worker_headers: dict
    ):
        """Worker should only see genba they are assigned to."""
        response = await client.get("/api/v1/genba", headers=worker_headers)
        assert response.status_code == 200
        genba_list = response.json()["data"]
        assert len(genba_list) > 0  # At least one assigned genba in test data
```

#### Encryption Test Pattern

```python
# tests/test_keys/test_encryption.py
class TestKeyEncryption:
    async def test_key_stored_encrypted_in_db(self, db_session, auth_headers, client):
        """Verify key_code is stored as encrypted bytes, not plaintext."""
        # Create key via API
        response = await client.post(
            "/api/v1/genba/{id}/keys",
            json={"key_number": 1, "key_type": "CYLINDER", "key_code": "ABC123"},
            headers=auth_headers,
        )
        key_id = response.json()["data"]["id"]

        # Direct DB query — should see encrypted bytes, not "ABC123"
        result = await db_session.execute(
            text("SELECT key_code_encrypted FROM key_infos WHERE id = :id"),
            {"id": key_id},
        )
        encrypted = result.scalar_one()
        assert encrypted is not None
        assert isinstance(encrypted, bytes)
        assert b"ABC123" not in encrypted  # Plaintext must NOT appear
```

### 1.5. Test Coverage Target

| Module | Minimum Coverage |
|--------|:----------------:|
| `auth` | 95% |
| `core/security` | 95% |
| `core/approval` | 90% |
| `invoice/auto_generator` | 90% |
| `key_management` | 90% |
| All other modules | 80% |

Run coverage: `pytest --cov=app --cov-report=html`

## 2. Frontend Testing

### 2.1. Vitest (Unit Tests)

```tsx
// __tests__/hooks/useGenba.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGenbaList } from "@/hooks/useGenba";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useGenbaList", () => {
  it("should return paginated genba list", async () => {
    const { result } = renderHook(() => useGenbaList({ page: 1, limit: 20 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.meta.total_items).toBeGreaterThan(0);
  });
});
```

### 2.2. Playwright (E2E Tests) — Optional for MVP

```tsx
// e2e/login.spec.ts
import { test, expect } from "@playwright/test";

test("should login and redirect to genba list", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "kubo");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/genba");
  await expect(page.locator("h1")).toContainText("現場一覧");
});
```

## 3. Multi-Stage Dockerfile

### 3.1. Backend Dockerfile

```dockerfile
# backend/Dockerfile
# Stage 1: Base
FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Stage 2: Dependencies
FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 3: Development
FROM deps AS dev
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage 4: Production
FROM deps AS prod
COPY . .
RUN adduser --disabled-password --no-create-home appuser
USER appuser
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 3.2. Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

## 4. CI/CD Pipeline (GitHub Actions)

### 4.1. Workflow Triggers

| Branch | Action |
|--------|--------|
| `main` | Build + Test + Deploy to Production |
| `develop` | Build + Test only |
| Pull Request | Lint + Test only |

### 4.2. Pipeline Stages

```
Lint (Ruff + ESLint) → Unit Tests (Pytest + Vitest) → Build Docker → Push to GHCR → SSH Deploy → Alembic Migrate
```

### 4.3. Deployment Target

Deploy via SSH to VPS running Docker Compose. Maintenance window: **00:00–05:00 JST**.

## 5. Code Quality Tools

### 5.1. Backend

| Tool | Purpose | Config File |
|------|---------|-------------|
| **Ruff** | Linting + formatting (replaces flake8/black/isort) | `pyproject.toml` |
| **mypy** | Static type checking | `pyproject.toml` |
| **pytest** | Testing | `pyproject.toml` |

### 5.2. Frontend

| Tool | Purpose | Config File |
|------|---------|-------------|
| **ESLint** | Linting | `.eslintrc.json` |
| **Prettier** | Formatting | `.prettierrc` |
| **TypeScript** | Type checking | `tsconfig.json` |
| **Vitest** | Unit testing | `vitest.config.ts` |
