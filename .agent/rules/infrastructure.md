# Infrastructure Conventions — Genba Management System

> **Chỉ dẫn phản hồi (Vietnamese):** File này quy định cấu hình hạ tầng: Docker Compose, PostgreSQL, Redis, S3-Compatible Storage (Cloudflare R2/Wasabi), và Nginx reverse proxy. Agent phải đảm bảo tính cloud-agnostic — hệ thống KHÔNG được phụ thuộc vào bất kỳ dịch vụ đặc quyền nào của một nhà cung cấp đám mây cụ thể.

---

## 1. Container Architecture (Docker Compose)

### 1.1. Services Overview

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `db` | `postgres:16-alpine` | 5432 | Primary database |
| `redis` | `redis:7-alpine` | 6379 | Session cache, rate limiting |
| `api` | Custom (FastAPI) | 8000 | Backend API server |
| `web` | Custom (Next.js) | 3000 | Frontend SSR server |
| `nginx` | `nginx:1.25-alpine` | 80/443 | Reverse proxy, SSL termination |

### 1.2. Docker Compose Structure

```yaml
# docker-compose.yml (Development)
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: genba_management
      POSTGRES_USER: ${DB_USER:-genba_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-genba_user}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER:-genba_user}:${DB_PASSWORD}@db:5432/genba_management
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      STORAGE_ENDPOINT: ${STORAGE_ENDPOINT}
      STORAGE_ACCESS_KEY: ${STORAGE_ACCESS_KEY}
      STORAGE_SECRET_KEY: ${STORAGE_SECRET_KEY}
      STORAGE_BUCKET_NAME: ${STORAGE_BUCKET_NAME:-genba-management}
      STORAGE_REGION: ${STORAGE_REGION:-apac}
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app  # Hot reload in dev

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://api:8000/api/v1
    ports:
      - "3000:3000"
    depends_on:
      - api
    volumes:
      - ./frontend:/app  # Hot reload in dev
      - /app/node_modules
      - /app/.next

  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - web

volumes:
  postgres_data:
  redis_data:
```

### 1.3. Cloud-Agnostic Rule

> **CRITICAL:** The entire application stack (PostgreSQL, Redis, FastAPI, Next.js) MUST run independently via Docker Compose on any Linux (Ubuntu Server) VPS. No AWS-specific, GCP-specific, or Azure-specific services are allowed in the core application. Only the object storage layer uses an external S3-compatible service.

## 2. PostgreSQL 16 Configuration

### 2.1. Required Extensions

```sql
-- Must be created in init-db.sql or first migration
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- Key encryption (AES-256)
CREATE EXTENSION IF NOT EXISTS "pg_bigm";     -- Japanese full-text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation (fallback)
```

### 2.2. Connection Pooling

- Development: Direct connection via SQLAlchemy `AsyncEngine`
- Production: Use `pgbouncer` in front of PostgreSQL for connection pooling (pool_mode=transaction)

### 2.3. Backup Strategy

```bash
# Daily backup via cron (00:30 JST)
pg_dump -h localhost -U genba_user -Fc genba_management > /backups/genba_$(date +%Y%m%d).dump

# Retain 30 days, auto-delete older
find /backups -name "genba_*.dump" -mtime +30 -delete
```

## 3. Redis 7 Configuration

### 3.1. Key Namespacing

All Redis keys MUST use a namespace prefix to prevent collisions:

| Namespace | Pattern | TTL | Purpose |
|-----------|---------|-----|---------|
| `session:` | `session:{user_id}` | 7 days | Refresh token storage |
| `ratelimit:` | `ratelimit:{ip}:{endpoint}` | 1 minute | Rate limiting counters |
| `cache:genba:` | `cache:genba:list:{hash}` | 5 minutes | Genba list cache |
| `lock:` | `lock:invoice_gen:{year}_{month}` | 10 minutes | Distributed lock for cron jobs |

### 3.2. Rate Limiting Rules

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 5 requests | 15 minutes |
| `POST /auth/refresh` | 10 requests | 1 minute |
| `POST /storage/presigned-url` | 20 requests | 1 minute |
| All other endpoints | 100 requests | 1 minute |

### 3.3. Connection Pattern

```python
# core/redis.py
import redis.asyncio as aioredis

redis_client: aioredis.Redis | None = None

async def get_redis() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return redis_client
```

## 4. S3-Compatible Object Storage

### 4.1. Provider Selection

The system uses **S3-Compatible API** to ensure cloud-agnostic storage. Recommended providers:

| Provider | Data Center | Pricing | Notes |
|----------|-------------|---------|-------|
| **Cloudflare R2** | Tokyo | Free egress | Best for cost |
| **Wasabi** | Tokyo (ap-northeast-1) | $5.99/TB/mo, free egress | Best for large storage |

### 4.2. Bucket Configuration

Single bucket `genba-management` with path-based organization:

```
genba-management/
├── genba/{genba_id}/photos/site/         # Staff-uploaded site photos
├── genba/{genba_id}/photos/work_report/  # Partner-uploaded work reports
├── genba/{genba_id}/photos/thumbnails/   # Auto-generated thumbnails
├── genba/{genba_id}/documents/           # Attached documents
├── genba/{genba_id}/memos/               # Memo attachments
├── quotations/{quotation_id}/            # Quotation attachments
└── invoices/{invoice_id}/                # Invoice source files (INCOMING)
```

### 4.3. Presigned URL Configuration

| Operation | Expiry | Max Size |
|-----------|--------|----------|
| PUT (upload) | 10 minutes | 10 MB |
| GET (view) | 1 hour | — |

### 4.4. boto3 Client Configuration

```python
# Always use environment variables — NEVER hardcode credentials
self.client = boto3.client(
    "s3",
    endpoint_url=settings.STORAGE_ENDPOINT,
    aws_access_key_id=settings.STORAGE_ACCESS_KEY,
    aws_secret_access_key=settings.STORAGE_SECRET_KEY,
    region_name=settings.STORAGE_REGION,
    config=Config(signature_version="s3v4"),
)
```

## 5. Nginx Configuration

### 5.1. Reverse Proxy Setup

```nginx
# nginx/nginx.conf
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 15m;  # Slightly above 10MB file limit
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

    upstream api_backend {
        server api:8000;
    }

    upstream web_frontend {
        server web:3000;
    }

    server {
        listen 80;
        server_name genba.shinsei.co.jp;

        # Security headers
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API routes
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Auth routes (stricter rate limit)
        location /api/v1/auth/ {
            limit_req zone=auth_limit burst=3 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Frontend routes
        location / {
            proxy_pass http://web_frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

### 5.2. SSL (Production with Cloudflare)

In production, SSL termination is handled by Cloudflare Proxy (Full Strict mode). The Nginx server communicates with Cloudflare via origin certificate:

```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/origin.pem;
    ssl_certificate_key /etc/nginx/ssl/origin-key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    # ... rest of config
}
```

## 6. Environment Files

### 6.1. `.env.example` (committed to git)

```env
# Database
DB_USER=genba_user
DB_PASSWORD=change_me_in_production
DATABASE_URL=postgresql+asyncpg://genba_user:change_me@db:5432/genba_management

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
SECRET_KEY=change_me_generate_with_openssl_rand_hex_32
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# S3-Compatible Storage
STORAGE_ENDPOINT=https://your-account.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=your_access_key
STORAGE_SECRET_KEY=your_secret_key
STORAGE_BUCKET_NAME=genba-management
STORAGE_REGION=apac

# Encryption
ENCRYPTION_KEY=change_me_generate_with_openssl_rand_hex_32
```

### 6.2. `.env` (NEVER committed to git)

Add `.env` to `.gitignore`. Each environment (dev/staging/prod) has its own `.env` file.
