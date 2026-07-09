# Project Structure

This file provides a structured view of the **Genba Kanri System** codebase.

## Directory Tree

```text
genba-system/
├── .agent/
│   ├── rules/
│   │   ├── backend-conventions.md
│   │   ├── devops-testing-conventions.md
│   │   ├── frontend-conventions.md
│   │   ├── infrastructure.md
│   │   ├── integration-conventions.md
│   │   ├── security-conventions.md
│   │   └── ui-ux-genba-spec.md
│   └── skills/
│       ├── .antigravity-install-manifest.json
│       ├── agenttrace-session-audit/
│       ├── api-endpoint-builder/
│       ├── brooks-lint/
│       ├── bug-hunter/
│       ├── codebase-audit-pre-push/
│       ├── docs/
│       ├── global-chat-agent-discovery/
│       ├── hono/
│       ├── jq/
│       ├── logic-lens/
│       ├── performance-optimizer/
│       ├── python-pptx-generator/
│       ├── rayden-code/
│       ├── skill-check/
│       ├── squirrel/
│       ├── technical-change-tracker/
│       ├── tmux/
│       └── unship/
├── .env.example
├── .gitignore
├── GEMINI.md
├── PROJECT_STRUCTURE.md
├── backend/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── app/
│   │   ├── core/
│   │   │   ├── approval.py
│   │   │   ├── audit.py
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── dependencies.py
│   │   │   ├── exceptions.py
│   │   │   ├── pagination.py
│   │   │   ├── permissions.py
│   │   │   ├── redis.py
│   │   │   ├── security.py
│   │   │   └── storage.py
│   │   ├── main.py
│   │   ├── migrations/
│   │   │   ├── env.py
│   │   │   ├── script.py.mako
│   │   │   └── versions/
│   │   │       ├── 01_create_users_and_audit.py
│   │   │       ├── 02_create_customers_and_genba.py
│   │   │       ├── 05_create_manuals_part1.py
│   │   │       ├── 06_create_manuals_part2.py
│   │   │       ├── 07_setup_pgcrypto_and_keys.py
│   │   │       ├── 08_create_finance_and_approvals.py
│   │   │       └── 09_add_pg_bigm_search.py
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── contract/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── customer/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── genba/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── invoice/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auto_generator.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── key_management/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── manual/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── partner/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── photo/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── quotation/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── schedule/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   ├── staff/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── models.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── router.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── service.py
│   │   │   └── worker/
│   │   │       ├── __init__.py
│   │   │       ├── models.py
│   │   │       ├── repository.py
│   │   │       ├── router.py
│   │   │       ├── schemas.py
│   │   │       └── service.py
│   │   └── scripts/
│   │       ├── __init__.py
│   │       ├── create_admin.py
│   │       ├── import_seed_data.py
│   │       └── inspect_excel.py
│   ├── init-db.sql
│   ├── master_data.xlsx
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_auth/
│       │   ├── __init__.py
│       │   ├── test_login.py
│       │   └── test_refresh.py
│       ├── test_contract/
│       │   ├── __init__.py
│       │   └── test_crud.py
│       ├── test_customer/
│       │   ├── __init__.py
│       │   └── test_crud.py
│       ├── test_genba/
│       │   ├── __init__.py
│       │   ├── test_crud.py
│       │   └── test_rls.py
│       ├── test_keys/
│       │   ├── __init__.py
│       │   ├── test_audit.py
│       │   └── test_encryption.py
│       ├── test_manual/
│       │   └── test_crud.py
│       ├── test_partner/
│       │   ├── __init__.py
│       │   └── test_crud.py
│       ├── test_schedule/
│       │   └── test_crud.py
│       ├── test_staff/
│       │   ├── __init__.py
│       │   └── test_crud.py
│       ├── test_storage/
│       │   ├── __init__.py
│       │   └── test_presigned_url.py
│       └── test_worker/
│           ├── __init__.py
│           └── test_crud.py
├── docker-compose.yml
├── docs/
│   ├── architecture_design_part1.md
│   ├── architecture_design_part2.md
│   ├── business_analysis_part1.md
│   ├── business_analysis_part2.md
│   └── business_analysis_part3.md
├── frontend/
│   ├── Dockerfile
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── approvals/
│   │   │   │   └── page.tsx
│   │   │   ├── contracts/
│   │   │   │   └── page.tsx
│   │   │   ├── customers/
│   │   │   │   └── page.tsx
│   │   │   ├── genba/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── basic/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── contracts/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── daily/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── entry-exit/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── equipment/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── keys/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── memos/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── periodic/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── photos/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── schedules/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── standards/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── workers/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── partners/
│   │   │   │   └── page.tsx
│   │   │   ├── quotations/
│   │   │   │   └── page.tsx
│   │   │   └── staff/
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── my-genba/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── partner/
│   │       ├── genba/
│   │       │   ├── [id]/
│   │       │   │   └── page.tsx
│   │       │   └── page.tsx
│   │       └── layout.tsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── ApprovalBadge.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── RichTextEditor.tsx
│   │   ├── finance/
│   │   │   ├── InvoiceTable.tsx
│   │   │   └── QuotationTable.tsx
│   │   ├── forms/
│   │   │   └── ContractForm.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── RoleGuard.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── providers/
│   │   │   └── QueryProvider.tsx
│   │   └── ui/
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── skeleton.tsx
│   │       └── table.tsx
│   ├── components.json
│   ├── hooks/
│   │   ├── queryKeys.ts
│   │   ├── useAuth.ts
│   │   ├── useContracts.ts
│   │   ├── useCustomers.ts
│   │   ├── useGenba.ts
│   │   ├── useKeys.ts
│   │   ├── useManuals.ts
│   │   ├── usePartners.ts
│   │   ├── usePhotos.ts
│   │   ├── useSchedules.ts
│   │   ├── useStaff.ts
│   │   └── useWorkers.ts
│   ├── i18n/
│   │   └── ja.json
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── markdown.ts
│   │   └── utils.ts
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── types/
│       ├── api.generated.ts
│       ├── contract.ts
│       ├── customer.ts
│       ├── finance.ts
│       ├── genba.ts
│       └── partner.ts
├── implementation_plan.md
└── nginx/
    ├── nginx.conf
    └── ssl/
        └── .gitkeep
```

## Main Component Overview

- **`.agent/`**: Configuration files and guidelines for the AI assistant.
  - **`rules/`**: Architectural and coding guidelines (backend conventions, frontend conventions, UI/UX specifications, etc.).
  - **`skills/`**: Reusable community capability bundles (e.g., API endpoint builder, bug hunter, audit tools).
- **`backend/`**: FastAPI application containing logic, DB migrations (Alembic), test suites, schemas, and API endpoints.
  - **`app/`**: Core FastAPI code.
    - **`core/`**: Core configs, security, DB connections, dynamic modules.
    - **`modules/`**: Feature-specific modules (Auth, Genba, Customer, Partner, etc.).
    - **`migrations/`**: Alembic version controls.
- **`frontend/`**: Next.js 15 application using TypeScript, TailwindCSS, components (shadcn/ui), dynamic schemas, and pages under App Router.
  - **`app/`**: Pages and routing layout.
  - **`components/`**: Standard / reusable UI elements.
  - **`hooks/`**: Custom TanStack Query & React Hooks.
  - **`lib/`**: Helpers, API client configurations.
  - **`types/`**: TypeScript type definitions.
- **`nginx/`**: Reverse proxy settings.
- **`docker-compose.yml`**: Deployment configuration for running containers.
