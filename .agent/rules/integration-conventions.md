# Integration Conventions — Genba Management System

> **Chỉ dẫn phản hồi (Vietnamese):** File này quy định cách Frontend (Next.js) và Backend (FastAPI) giao tiếp với nhau: đồng bộ kiểu dữ liệu, xử lý múi giờ JST, định dạng ngày tháng, và quy trình sinh TypeScript types từ OpenAPI. Agent phải đảm bảo tính nhất quán 100% giữa hai tầng khi viết code.

---

## 1. API Communication Contract

### 1.1. Base URL

All API calls from Frontend MUST go through the `/api/v1` prefix:

```
Production:  https://genba.shinsei.co.jp/api/v1/
Development: http://localhost:8000/api/v1/
```

### 1.2. Response Envelope (MANDATORY)

Backend MUST wrap all responses in a consistent envelope:

```json
// Single object
{
  "data": { "id": "uuid", "property_name": "BRAVI 新大阪" }
}

// Paginated list
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total_items": 150, "total_pages": 8 }
}

// Error
{
  "error": { "code": "VALIDATION_ERROR", "message": "入力データに誤りがあります", "details": [...] }
}
```

Frontend `apiClient` interceptor MUST unwrap the `data` field automatically so hooks receive clean typed objects.

## 2. Type Synchronization (OpenAPI → TypeScript)

### 2.1. Type Generation Pipeline

FastAPI automatically generates an OpenAPI JSON schema at `/api/v1/openapi.json`. Use `openapi-typescript` to generate TypeScript types from this schema:

```bash
# Generate types from running backend
npx openapi-typescript http://localhost:8000/api/v1/openapi.json -o frontend/types/api.generated.ts
```

### 2.2. npm Script

```json
// frontend/package.json
{
  "scripts": {
    "generate-types": "openapi-typescript http://localhost:8000/api/v1/openapi.json -o types/api.generated.ts",
    "dev": "next dev",
    "build": "npm run generate-types && next build"
  }
}
```

### 2.3. Rules for Generated Types

1. **NEVER manually edit** `types/api.generated.ts` — it is auto-generated.
2. Create manual type extensions in `types/` directory alongside generated types.
3. Re-run `npm run generate-types` after every Backend schema change.
4. Generated types are committed to git for CI/CD builds that don't have backend access.

### 2.4. Using Generated Types

```tsx
import type { components } from "@/types/api.generated";

// Alias for convenience
type Genba = components["schemas"]["GenbaResponse"];
type GenbaCreate = components["schemas"]["GenbaCreate"];
type PaginatedGenba = components["schemas"]["PaginatedResponse_GenbaResponse_"];
```

## 3. Timezone Handling (JST / UTC)

### 3.1. Core Principle

| Layer | Timezone | Reason |
|-------|----------|--------|
| **Database** (PostgreSQL) | **UTC** | Industry standard, no DST ambiguity |
| **Backend** (FastAPI) | **UTC** | All `datetime` fields stored/processed in UTC |
| **API Transport** (JSON) | **ISO 8601 UTC** | `2026-07-01T06:00:00Z` (Z suffix) |
| **Frontend** (Next.js) | **JST (UTC+9)** | Display only. Convert on render |

### 3.2. Backend — Always UTC

```python
from datetime import datetime, timezone

# ✅ CORRECT: Always use UTC
now = datetime.now(timezone.utc)

# ❌ WRONG: Naive datetime or local time
now = datetime.now()
now = datetime.now(ZoneInfo("Asia/Tokyo"))
```

### 3.3. Frontend — Display in JST

Use `date-fns` with `date-fns-tz` for all date formatting:

```tsx
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ja } from "date-fns/locale";

const JST = "Asia/Tokyo";

/**
 * Format a UTC ISO string to Japanese-localized display.
 * Always call this for user-facing dates.
 */
export const formatDateJST = (utcString: string, pattern: string = "yyyy年MM月dd日"): string => {
  const zonedDate = toZonedTime(new Date(utcString), JST);
  return format(zonedDate, pattern, { locale: ja });
};

export const formatDateTimeJST = (utcString: string): string => {
  return formatDateJST(utcString, "yyyy年MM月dd日 HH:mm");
};

// Usage in component:
// <span>{formatDateJST(genba.created_at)}</span>
// Output: "2026年07月01日"
```

### 3.4. Date-only Fields

For fields that represent a calendar date without time (e.g., `management_start_date`, `holiday_date`):

```python
# Backend: Use `date` type, not `datetime`
from datetime import date

class GenbaCreate(BaseSchema):
    management_start_date: date | None = None  # "2026-07-01"
```

```tsx
// Frontend: Parse as-is, no timezone conversion needed
const startDate = format(new Date(genba.management_start_date + "T00:00:00"), "yyyy年MM月dd日", { locale: ja });
```

## 4. Date Format Standards

### 4.1. API Transport Formats

| Type | Format | Example |
|------|--------|---------|
| `datetime` | ISO 8601 UTC | `2026-07-01T06:00:00Z` |
| `date` | ISO 8601 | `2026-07-01` |
| `time` | 24h | `16:00:00` |

### 4.2. Display Formats (Japanese)

| Context | Pattern | Example |
|---------|---------|---------|
| Full date | `yyyy年MM月dd日` | `2026年07月01日` |
| Date + time | `yyyy年MM月dd日 HH:mm` | `2026年07月01日 15:00` |
| Short date | `MM/dd` | `07/01` |
| Month | `yyyy年MM月` | `2026年07月` |
| Day of week | `E曜日` | `月曜日` |
| Billing period | `yyyy年MM月分` | `2026年07月分` |

## 5. Number & Currency Formatting

### 5.1. Japanese Yen (¥)

```tsx
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0, // Yen has no decimals
  }).format(amount);
};

// Usage: formatCurrency(150000) → "¥150,000"
```

### 5.2. Tax Calculation

Japan consumption tax is 10%. Backend handles tax calculation:

```python
# Backend
tax_amount = amount * Decimal("0.10")
total_with_tax = amount + tax_amount

# API response includes both
{
  "amount": 150000,
  "tax_amount": 15000,
  "total": 165000
}
```

## 6. File Upload Integration

### 6.1. Presigned URL Flow

```
Frontend                    Backend                     S3 Storage
   │                           │                           │
   ├─ POST /storage/presigned-url ─►                       │
   │  {file_name, content_type,│                           │
   │   file_size, purpose,     │                           │
   │   entity_id}              │                           │
   │                           ├─ Validate permissions ──► │
   │                           ├─ Generate file key         │
   │                           ├─ Create presigned PUT URL  │
   │  ◄── {upload_url, file_key, expires_in} ──┤           │
   │                           │                           │
   ├─ PUT binary directly ──────────────────────────────► │
   │  ◄── 200 OK ──────────────────────────────────────── │
   │                           │                           │
   ├─ POST /genba/{id}/photos ─►                           │
   │  {file_key, caption}      │                           │
   │                           ├─ Verify file exists        │
   │                           ├─ Save metadata to DB       │
   │  ◄── 201 {photo_id} ─────┤                           │
```

### 6.2. Environment Variables for Storage

```env
# Cloud-agnostic: works with Cloudflare R2, Wasabi, or any S3-compatible provider
STORAGE_ENDPOINT=https://xxxxxxxx.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=your_access_key
STORAGE_SECRET_KEY=your_secret_key
STORAGE_BUCKET_NAME=genba-management
STORAGE_REGION=apac
```

## 7. CORS Configuration

```python
# Backend main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",        # Dev
        "https://genba.shinsei.co.jp",  # Production
    ],
    allow_credentials=True,  # Required for httpOnly cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)
```
