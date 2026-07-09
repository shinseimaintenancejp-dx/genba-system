# Security Conventions — Genba Management System

> **Chỉ dẫn phản hồi (Vietnamese):** File này quy định toàn bộ chiến lược bảo mật: JWT stateless, Refresh Token Rotation, phân quyền RBAC 6 vai trò, Row-Level Security (RLS) ở tầng PostgreSQL, và mã hoá dữ liệu nhạy cảm bằng pgcrypto. Agent phải tuân thủ 100% khi viết bất kỳ logic xác thực, phân quyền hoặc truy cập dữ liệu nào.

---

## 1. Authentication — Stateless JWT

### 1.1. Token Architecture

| Token | Storage | Lifetime | Purpose |
|-------|---------|----------|---------|
| **Access Token** | httpOnly Secure Cookie | 15 minutes | API authorization |
| **Refresh Token** | httpOnly Secure Cookie + Redis | 7 days | Silent token renewal |

### 1.2. JWT Claims (Access Token Payload)

```json
{
  "sub": "user-uuid",
  "role": "INTERNAL_STAFF",
  "related_entity_id": "staff-uuid",
  "iat": 1719820800,
  "exp": 1719821700
}
```

### 1.3. Token Flow

```
1. Login → Backend returns access_token + refresh_token as httpOnly Secure cookies
2. Every API request → Browser auto-sends cookies → Backend validates access_token
3. Access token expired (401) → Frontend interceptor calls /auth/refresh
4. Refresh endpoint → Validate refresh_token in Redis → Issue NEW access + refresh tokens
5. Old refresh_token is DELETED from Redis (Rotation)
6. If refresh_token also expired → Redirect to /login
```

### 1.4. Cookie Configuration (MANDATORY)

```python
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,       # JavaScript cannot read
    secure=True,         # HTTPS only (set False for localhost dev)
    samesite="lax",      # CSRF protection
    max_age=900,         # 15 minutes
    path="/",
)

response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    httponly=True,
    secure=True,
    samesite="lax",
    max_age=604800,      # 7 days
    path="/api/v1/auth",  # Only sent to auth endpoints
)
```

### 1.5. Security Rules

- **NEVER** return tokens in JSON response body. Always use httpOnly cookies.
- **NEVER** store tokens in localStorage or sessionStorage.
- **ALWAYS** rotate refresh tokens on every renewal (invalidate the old one).
- **Account lockout:** After 5 failed login attempts, lock account for 15 minutes.
- **Bcrypt:** Use bcrypt with cost factor 12 for password hashing.

## 2. Authorization — RBAC (Role-Based Access Control)

### 2.1. Role Hierarchy

```
ADMIN (システム管理者)
  └── Full access to everything
  
SENIOR_STAFF (管理職)
  └── View all, approve quotations/contracts/invoices, view financials
  
INTERNAL_STAFF (社内担当者)
  └── CRUD genba, customers, contracts, manuals, keys, photos
  
GENBA_WORKER (現場員)
  └── View assigned genba only: keys (decrypted), manuals, schedules, photos
  
PARTNER (協力会社)
  └── View contracted genba only: entry/exit, periodic manual, photos; upload work reports
  
CUSTOMER (取引先) — Future
  └── Placeholder role, no MVP access
```

### 2.2. Permission Matrix

| Resource | ADMIN | SENIOR_STAFF | INTERNAL_STAFF | GENBA_WORKER | PARTNER |
|----------|:-----:|:------------:|:--------------:|:------------:|:-------:|
| Genba (all) | ✅ R/W | ✅ R | ✅ R/W | — | — |
| Genba (assigned) | — | — | — | ✅ R | — |
| Genba (contracted) | — | — | — | — | ✅ R |
| Customer | ✅ R/W | ✅ R | ✅ R/W | — | — |
| Contract | ✅ R/W | ✅ R | ✅ R/W | — | ✅ R (own) |
| Key Info (decrypt) | ✅ | — | ✅ | ✅ (assigned) | ❌ |
| Manual (all) | ✅ R/W | ✅ R | ✅ R/W | ✅ R (assigned) | ✅ R (partial) |
| Photo upload | ✅ | — | ✅ | — | ✅ (WORK_REPORT only) |
| Photo view | ✅ | ✅ | ✅ | ✅ (assigned) | ✅ (contracted) |
| Financial (invoice/quotation) | ✅ R/W | ✅ R + Approve | ✅ R/W | ❌ | ❌ |
| Approval | ✅ | ✅ | Submit only | ❌ | ❌ |
| User management | ✅ | ❌ | ❌ | ❌ | ❌ |

### 2.3. Permission Decorator (Application Layer)

```python
from functools import wraps
from fastapi import Depends, HTTPException

def require_permissions(*permissions: Permission):
    """Check permissions at API level (Layer 2)."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            user_perms = ROLE_PERMISSIONS.get(current_user.role, set())
            if not set(permissions).issubset(user_perms):
                raise HTTPException(status_code=403, detail="この操作を行う権限がありません")
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator
```

## 3. Row-Level Security (RLS) — Database Layer

### 3.1. Architecture: 3-Layer Defense

```
Layer 1: API Gateway (Nginx + FastAPI Middleware)
  → Rate limiting, CORS, JWT validation, basic role check

Layer 2: Application Service
  → Permission decorator, business logic validation, data scope filtering

Layer 3: PostgreSQL RLS
  → Row-level filtering at database level — CANNOT be bypassed from app code
```

### 3.2. RLS Context Injection

Every database request MUST set RLS context variables before executing queries:

```python
async def get_db_session_with_rls(user: User):
    async with async_session_factory() as session:
        await session.execute(text(f"SET LOCAL app.user_role = '{user.role}'"))
        
        entity_id = _resolve_entity_id(user)
        if entity_id:
            await session.execute(text(f"SET LOCAL app.related_entity_id = '{entity_id}'"))
        
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### 3.3. RLS Policy Rules

| Table | Staff/Admin | Worker | Partner |
|-------|:-----------:|:------:|:-------:|
| `genba` | See ALL | See ASSIGNED only | See CONTRACTED only |
| `contracts` | See ALL | ❌ | See OWN ORDERING only |
| `key_infos` | See ALL | See ASSIGNED genba | ❌ (no policy = no access) |
| `photos` | See ALL | See ASSIGNED genba | See CONTRACTED genba; INSERT WORK_REPORT only |
| `invoices` | See ALL | ❌ | ❌ |

### 3.4. Critical Rules

- **ALWAYS** use `SET LOCAL` (not `SET`) — ensures variables are transaction-scoped.
- **ALWAYS** use `FORCE ROW LEVEL SECURITY` — applies RLS even to table owners.
- **NEVER** disable RLS for convenience, even in tests. Use a bypass superuser role only for migrations.

## 4. Data Encryption — pgcrypto

### 4.1. Encrypted Fields

| Table | Field | Algorithm | When to Decrypt |
|-------|-------|-----------|-----------------|
| `key_infos` | `key_code_encrypted` | AES-256-CBC (pgp_sym_encrypt) | Only when Staff/Worker views key tab |
| `key_infos` | `keybanker_code_encrypted` | AES-256-CBC (pgp_sym_encrypt) | Only when Staff/Worker views key tab |

### 4.2. Encryption Key Management

- Stored in environment variable `ENCRYPTION_KEY` (32-byte random string).
- Passed to PostgreSQL via `SET LOCAL app.encryption_key` per transaction.
- **NEVER** hardcode in source code, migrations, or Docker configs.
- **NEVER** log decrypted values. Audit log records WHO viewed, not WHAT they saw.

### 4.3. Audit Trail for Sensitive Access

```python
# When decrypting keys, ALWAYS log:
await audit_service.log(
    user_id=user.id,
    action="VIEW",
    entity_type="key_info",
    entity_id=genba_id,
    is_sensitive=True,  # Flagged for security review
    # new_value intentionally omitted — never log decrypted content
)
```

## 5. Input Validation & Sanitization

### 5.1. Backend (Pydantic)

- All string inputs: auto-strip whitespace (`str_strip_whitespace=True`).
- SQL injection: prevented by SQLAlchemy parameterized queries (NEVER use f-strings in SQL).
- File upload: validate MIME type + file extension + max size BEFORE generating presigned URL.

### 5.2. Frontend (Zod)

- All form inputs validated by Zod schemas before submission.
- File inputs: validate type and size client-side before requesting presigned URL.

## 6. Security Headers (Nginx)

```nginx
# Required security headers
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```
