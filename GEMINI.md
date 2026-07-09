# GEMINI.md — Bản đồ Tư duy Tổng thể cho Agent

> **Dự án:** Hệ thống Quản lý Genba (現場管理システム) — Công ty Shinsei  
> **Ngày khởi tạo:** 2026-06-10  
> **Hạn bàn giao:** 2026-07-31  
> **Phiên bản:** 1.0

---

## 1. TỔNG QUAN DỰ ÁN

Hệ thống Quản lý Genba là nền tảng web tập trung giúp công ty vệ sinh Shinsei số hóa toàn bộ quy trình vận hành và quản lý dữ liệu cho hơn 359 công trình (genba). Hệ thống thay thế hàng trăm file Excel phân tán, kết nối liền mạch thông tin genba, khách hàng, đối tác, nhân sự, hợp đồng, hóa đơn, tài liệu hướng dẫn vận hành và quản lý chìa khóa.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript + shadcn/ui + TanStack Query v5 |
| Backend | FastAPI (Python 3.11+) + Pydantic v2 + SQLAlchemy 2.0 Async |
| Database | PostgreSQL 16 (RLS + pgcrypto + pg_bigm) |
| Cache | Redis 7 |
| Storage | S3-Compatible (Cloudflare R2 / Wasabi) — Cloud-agnostic |
| Auth | JWT (httpOnly cookies) + bcrypt + RBAC 6 roles |
| Deployment | Docker Compose + Nginx reverse proxy on Linux VPS |
| CI/CD | GitHub Actions → GHCR → SSH deploy |

### Cấu trúc Dự án

```
genba_kanri/                          # Workspace root
├── .agent/                           # Agent configuration (rules + skills)
│   ├── rules/                        # Always-on conventions
│   └── skills/                       # Community skill bundles
├── genba-system/                     # ← SOURCE CODE (tách biệt với tài liệu)
│   ├── backend/                      # FastAPI application
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── core/                 # Shared kernel
│   │   │   ├── modules/             # Feature modules (auth, genba, customer, ...)
│   │   │   ├── migrations/          # Alembic
│   │   │   └── scripts/             # Seed data, import
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── pyproject.toml
│   ├── frontend/                     # Next.js 15 application
│   │   ├── app/                      # App Router pages
│   │   ├── components/               # UI components
│   │   ├── hooks/                    # TanStack Query hooks
│   │   ├── lib/                      # API client, utilities
│   │   ├── types/                    # TypeScript types (generated + manual)
│   │   ├── i18n/                     # Japanese translations
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── nginx/                        # Reverse proxy config
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── .env.example
├── srs.md                            # Existing document — DO NOT MODIFY
├── ◎現場一覧表◎マスターデータ.xlsx    # Existing data — DO NOT MODIFY
├── 現場管理マニュアル/                # Existing manuals — DO NOT MODIFY
├── 現場管理一覧表◎イメージ2026.4.16.png  # Existing image — DO NOT MODIFY
└── GEMINI.md                         # This file (Agent navigation map)
```

> **IMPORTANT:** Source code lives in `genba-system/` subdirectory. The workspace root contains existing business documents (SRS, Excel data, manual folders) that MUST NOT be modified or deleted.

---

## 2. AGENT RULES (ALWAYS-ON CONVENTIONS)

The following rules files are loaded automatically and MUST be followed at all times when writing any code for this project:

| Rule File | Scope |
|-----------|-------|
| [frontend-conventions.md](.agent/rules/frontend-conventions.md) | Next.js 15 App Router, TypeScript, shadcn/ui, TanStack Query v5, Japanese UI |
| [ui-ux-genba-spec.md](.agent/rules/ui-ux-genba-spec.md) | UI/UX technical specifications, touch targets, button colors/states, mobile/desktop grids, loading/empty states |
| [backend-conventions.md](.agent/rules/backend-conventions.md) | FastAPI async, Pydantic v2, SQLAlchemy 2.0, Alembic migrations |
| [integration-conventions.md](.agent/rules/integration-conventions.md) | OpenAPI → TypeScript type generation, JST/UTC timezone, date-fns, currency |
| [security-conventions.md](.agent/rules/security-conventions.md) | JWT auth, RBAC 6 roles, RLS policies, pgcrypto encryption |
| [infrastructure.md](.agent/rules/infrastructure.md) | Docker Compose, PostgreSQL, Redis, S3-Compatible Storage, Nginx |
| [devops-testing-conventions.md](.agent/rules/devops-testing-conventions.md) | Pytest, Vitest, multi-stage Dockerfile, GitHub Actions CI/CD |

---

## 3. AGENT SKILLS (COMMUNITY BUNDLES)

Skills are reference knowledge bundles loaded from `.agent/skills/`. They provide best-practice playbooks for specific technologies. The agent should consult relevant skills when working on related tasks.

| Skill Area | Location |
|-----------|----------|
| Community Skills | [.agent/skills/](.agent/skills/) |

---

## 4. ARCHITECTURE DOCUMENTS (READ-ONLY REFERENCE)

These documents define the system's architecture and MUST be consulted before any implementation:

| Document | Path | Content |
|----------|------|---------|
| Architecture Part 1 | Brain artifact `architecture_design_part1.md` | Tech stack, High-level architecture, Database schema (25+ tables DDL), Core API endpoints |
| Architecture Part 2 | Brain artifact `architecture_design_part2.md` | Sequence diagrams, RBAC + RLS, pgcrypto encryption, Invoice auto-generation, Approval workflow, File upload, Frontend architecture |
| API Contracts | Brain artifact `api_contracts.md` | Request/Response schemas, CI/CD pipeline |
| Implementation Plan | [implementation_plan.md](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/implementation_plan.md) | Lộ trình 10 Sprint kèm timeline chi tiết |

---

## 5. DEVELOPMENT MODE: REVIEW-DRIVEN DEVELOPMENT

> **CRITICAL:** The agent MUST follow the "Review-Driven Development" workflow at all times.

### 5.1. Workflow Rules

1. **PLAN FIRST**: Before creating or modifying ANY source code file, the agent MUST:
   - Announce: `"BẮT ĐẦU SPRINT [X]: [Tên Sprint]"`
   - List all files to be created/modified
   - **For UI files/components**: Explicitly cross-check components in the plan against the specifications in [ui-ux-genba-spec.md](.agent/rules/ui-ux-genba-spec.md) (verifying touch sizing, exact HEX states, and loading skeleton design).
   - Wait for user confirmation

2. **ONE SPRINT AT A TIME**: The agent MUST NOT write code for multiple Sprints simultaneously. Each Sprint is a self-contained unit of work.

3. **PRODUCTION-READY CODE**: All output MUST be:
   - Complete (no pseudocode, no `// ... rest of code`, no `pass` placeholders)
   - Fully typed (TypeScript strict, Python type hints)
   - Error-handled (try/catch, try/except with meaningful error messages in Japanese)
   - Logged (structured logging, never log sensitive data)

4. **PAUSE & REPORT**: After completing a Sprint, the agent MUST stop and ask:
   - `"Tôi đã hoàn thành Sprint [X]. Hãy kiểm tra và gõ 'TIẾP TỤC' để tôi tự động chuyển sang Sprint tiếp theo."`

### 5.2. Sprint Execution Protocol

```
┌─────────────────────────────────────────────┐
│ SPRINT EXECUTION CYCLE                      │
│                                             │
│  1. 📋 ANNOUNCE Sprint scope & file list    │
│  2. ⏳ WAIT for user approval               │
│  3. 🔨 EXECUTE code (DB → Backend → FE)     │
│  4. ✅ REPORT completion                    │
│  5. 🛑 PAUSE — wait for "TIẾP TỤC"         │
│                                             │
│  ↻ Repeat for next Sprint                   │
└─────────────────────────────────────────────┘
```

### 5.3. Code Quality Gates

Before reporting Sprint completion, the agent MUST verify:

- [ ] All new files follow the naming conventions in Rules
- [ ] All database changes have Alembic migration files
- [ ] All API endpoints have Pydantic request/response schemas
- [ ] All UI implementations (screens, dialogs, buttons) strictly comply with [ui-ux-genba-spec.md](.agent/rules/ui-ux-genba-spec.md)
- [ ] All UI text is in Japanese (日本語)
- [ ] No hardcoded credentials or secrets
- [ ] Error messages returned to users are in Japanese
- [ ] RLS context is set for every database operation

---

## 6. KEY CONSTRAINTS

1. **Language:** Code comments → English. UI text → Japanese (日本語). Agent responses → Vietnamese (Tiếng Việt).
2. **Cloud-Agnostic:** No AWS/GCP/Azure lock-in. Everything runs on Docker Compose + S3-Compatible storage.
3. **Source Code Location:** All project source code MUST be created inside `genba-system/` subdirectory.
4. **Existing Files:** Files in workspace root (srs.md, Excel, manual folders) are READ-ONLY reference. NEVER modify or delete them.
5. **Deadline:** 2026-07-31. Timeline is mapped across 10 Sprints.
