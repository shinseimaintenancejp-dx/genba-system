# Frontend Conventions — Genba Management System

> **Chỉ dẫn phản hồi (Vietnamese):** Khi áp dụng file này, Agent phải tuân thủ mọi quy chuẩn dưới đây khi viết bất kỳ mã Frontend nào. Mọi phản hồi liên quan đến code Frontend phải bằng tiếng Việt, nhưng code comments và variable names phải bằng tiếng Anh. Giao diện người dùng (UI labels, messages, placeholders) phải hoàn toàn bằng tiếng Nhật (日本語).

---

## 1. Framework & Runtime

| Item | Standard |
|------|----------|
| Framework | **Next.js 15.x** with App Router (NOT Pages Router) |
| Language | **TypeScript 5.x** — strict mode enabled |
| Package Manager | **npm** (lockfile committed) |
| Node Version | **20 LTS** |

## 2. Project Structure (App Router)

```
frontend/
├── app/
│   ├── (auth)/                   # Auth group layout (no sidebar)
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Main group layout (sidebar + header)
│   │   ├── layout.tsx
│   │   ├── genba/
│   │   │   ├── page.tsx          # 現場一覧
│   │   │   ├── new/page.tsx      # 新規登録
│   │   │   └── [id]/
│   │   │       ├── layout.tsx    # Tab navigation
│   │   │       ├── basic/page.tsx
│   │   │       ├── keys/page.tsx
│   │   │       └── ...
│   │   ├── customers/
│   │   ├── partners/
│   │   ├── contracts/
│   │   ├── invoices/
│   │   ├── approvals/
│   │   └── settings/
│   ├── partner/                  # Partner-scoped layout
│   ├── my-genba/                 # Worker mobile-first layout
│   ├── globals.css
│   └── layout.tsx                # Root layout (providers, fonts)
├── components/
│   ├── ui/                       # shadcn/ui primitives (auto-generated)
│   ├── layout/                   # Sidebar, Header, RoleGuard
│   ├── genba/                    # Feature-specific components
│   ├── common/                   # DataTable, FileUpload, ApprovalBadge
│   └── forms/                    # Reusable form components
├── hooks/                        # Custom hooks (TanStack Query wrappers)
├── lib/                          # api.ts, auth.ts, utils.ts
├── types/                        # Generated + custom TypeScript types
└── i18n/
    └── ja.json                   # 日本語 translations (single locale)
```

## 3. Coding Style

### 3.1. Arrow Functions & Named Exports (MANDATORY)

```tsx
// ✅ CORRECT: Arrow function + named export
export const GenbaListPage = () => {
  return <div>...</div>;
};

// ❌ WRONG: Default export with function declaration
export default function GenbaListPage() {
  return <div>...</div>;
}
```

**Exception:** `page.tsx` and `layout.tsx` files MUST use `export default` because Next.js App Router requires it. Use arrow function assignment:

```tsx
// ✅ page.tsx — default export with arrow function
const GenbaListPage = () => {
  return <div>...</div>;
};

export default GenbaListPage;
```

### 3.2. Component File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Page components | `page.tsx` | `app/(dashboard)/genba/page.tsx` |
| Layout components | `layout.tsx` | `app/(dashboard)/layout.tsx` |
| Reusable components | PascalCase | `components/genba/GenbaTable.tsx` |
| Hooks | camelCase with `use` prefix | `hooks/useGenba.ts` |
| Utilities | camelCase | `lib/utils.ts` |
| Types | PascalCase | `types/genba.ts` |

### 3.3. Import Order (enforced by ESLint)

```tsx
// 1. React / Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { useQuery } from "@tanstack/react-query";

// 3. Internal components
import { DataTable } from "@/components/common/DataTable";

// 4. Internal hooks / utilities
import { useGenbaList } from "@/hooks/useGenba";
import { formatDateJST } from "@/lib/utils";

// 5. Types
import type { Genba } from "@/types/genba";
```

## 4. TanStack Query v5 Patterns

### 4.1. Query Key Factory (MANDATORY)

All query keys MUST be defined in a centralized factory to prevent key collisions and enable targeted invalidation:

```tsx
// hooks/queryKeys.ts
export const queryKeys = {
  genba: {
    all: ["genba"] as const,
    lists: () => [...queryKeys.genba.all, "list"] as const,
    list: (filters: GenbaFilters) =>
      [...queryKeys.genba.lists(), filters] as const,
    details: () => [...queryKeys.genba.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.genba.details(), id] as const,
  },
  customers: {
    all: ["customers"] as const,
    lists: () => [...queryKeys.customers.all, "list"] as const,
    list: (filters: CustomerFilters) =>
      [...queryKeys.customers.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.customers.all, "detail", id] as const,
  },
  // ... same pattern for all modules
} as const;
```

### 4.2. Custom Hook Pattern

Every API interaction MUST be wrapped in a custom hook. Components MUST NOT call `useQuery` / `useMutation` directly:

```tsx
// hooks/useGenba.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/api";
import type { Genba, GenbaCreate, GenbaFilters, PaginatedResponse } from "@/types/genba";

export const useGenbaList = (filters: GenbaFilters) => {
  return useQuery({
    queryKey: queryKeys.genba.list(filters),
    queryFn: () => apiClient.get<PaginatedResponse<Genba>>("/genba", { params: filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGenbaDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.genba.detail(id),
    queryFn: () => apiClient.get<Genba>(`/genba/${id}`),
    enabled: !!id,
  });
};

export const useCreateGenba = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenbaCreate) => apiClient.post<Genba>("/genba", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.lists() });
    },
  });
};
```

### 4.3. Anti-Pattern: Async Waterfall Prevention

```tsx
// ❌ WRONG: Sequential awaits cause waterfall
const genba = await fetchGenba(id);
const contracts = await fetchContracts(genba.id);
const schedules = await fetchSchedules(genba.id);

// ✅ CORRECT: Parallel queries with useQueries
import { useQueries } from "@tanstack/react-query";

const results = useQueries({
  queries: [
    { queryKey: queryKeys.genba.detail(id), queryFn: () => apiClient.get(`/genba/${id}`) },
    { queryKey: ["contracts", id], queryFn: () => apiClient.get(`/genba/${id}/contracts`) },
    { queryKey: ["schedules", id], queryFn: () => apiClient.get(`/genba/${id}/schedules`) },
  ],
});
```

## 5. shadcn/ui & Japanese Market Design

### 5.1. Typography

- **Primary font:** `Noto Sans JP` (Google Fonts) — covers all Japanese characters
- **Monospace font:** `JetBrains Mono` — for code, IDs, timestamps
- **Base font size:** 16px (increased for better readability)
- **Font Smoothing:** Must use `subpixel-antialiasing` (`-webkit-font-smoothing: subpixel-antialiased`) on Safari/macOS instead of Tailwind's default `antialiased`. This prevents Japanese text from rendering too thin.

### 5.2. Color Palette

Use shadcn/ui CSS variables with a custom dark-mode-first theme appropriate for business/enterprise SaaS:

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --primary: 221 83% 53%;      /* Blue — trust/corporate */
    --primary-foreground: 210 40% 98%;
    --destructive: 0 84% 60%;
    --muted: 210 40% 96%;
    --border: 214 32% 91%;
    --radius: 0.5rem;
  }
}
```

### 5.3. Responsive Breakpoints

| Breakpoint | Target | Usage |
|-----------|--------|-------|
| `sm` (640px) | Mobile phone | Worker `/my-genba` view |
| `md` (768px) | Tablet portrait | Partner portal |
| `lg` (1024px) | Tablet landscape / small laptop | Sidebar collapses |
| `xl` (1280px+) | Desktop | Full dashboard |

### 5.4. All UI Text in Japanese

```tsx
// ❌ WRONG
<Button>Save</Button>
<label>Property Name</label>

// ✅ CORRECT
<Button>保存</Button>
<label>物件名</label>
```

Use the `i18n/ja.json` file for all user-facing strings. Never hardcode English UI text.

## 6. Form Handling

Use `react-hook-form` + `zod` for all forms:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const genbaSchema = z.object({
  property_name: z.string().min(1, "物件名は必須です"),
  address: z.string().min(1, "住所は必須です"),
  customer_id: z.string().uuid("取引先を選択してください"),
  external_customer_code: z.string().optional(), // MCD — optional
});

type GenbaFormData = z.infer<typeof genbaSchema>;
```

## 7. Error Handling & Loading States

Every data-fetching component MUST handle 3 states:

```tsx
const { data, isLoading, isError, error } = useGenbaList(filters);

if (isLoading) return <TableSkeleton rows={10} />;
if (isError) return <ErrorAlert message={error.message} />;
return <GenbaTable data={data} />;
```

## 8. API Client Configuration

```tsx
// lib/api.ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Send httpOnly cookies
});

// Response interceptor: auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      try {
        await axios.post("/api/v1/auth/refresh", {}, { withCredentials: true });
        return apiClient(error.config); // Retry original request
      } catch {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
```
