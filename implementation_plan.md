# Kế hoạch Thực thi — Hệ thống Quản lý Genba (Shinsei)

Bản kế hoạch này mô tả quy trình phát triển hệ thống quản lý tập trung cho hơn 359 công trình (genba) của Công ty Shinsei. Dự án tuân thủ cơ chế "Tự vận hành cuốn chiếu" (Self-Paced Sprint Execution) chia làm 10 Sprint với hạn bàn giao **31/07/2026**.

> [!IMPORTANT]
> **Agent Compliance:** Toàn bộ code sinh ra trong mọi Sprint PHẢI tuân thủ 100% các quy chuẩn đã thiết lập tại `genba-system/.agent/rules/` và tham khảo các kỹ năng tại `genba-system/.agent/skills/`. Xem chi tiết tại [GEMINI.md](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/GEMINI.md).

---

## Workspace Layout

```
genba_kanri/                                    # Workspace root
├── srs.md                                      # 📄 READ-ONLY
├── ◎現場一覧表◎マスターデータ.xlsx              # 📊 READ-ONLY
├── 現場管理マニュアル/                          # 📁 READ-ONLY
├── 現場管理一覧表◎イメージ2026.4.16.png        # 🖼️ READ-ONLY
│
└── genba-system/                               # 🆕 PROJECT ROOT
    ├── GEMINI.md                               # Agent navigation map
    ├── .agent/
    │   ├── rules/                              # 6 convention files (always-on)
    │   └── skills/                             # 17 community skill bundles
    ├── backend/                                # FastAPI (Modular Monolith)
    ├── frontend/                               # Next.js 15 (App Router)
    ├── nginx/                                  # Reverse proxy config
    ├── docker-compose.yml
    ├── docker-compose.prod.yml
    └── .env.example
```

---

## Agent Rules Reference Map

Mỗi Sprint sẽ ghi rõ bộ rules bắt buộc phải tuân thủ. Agent PHẢI đọc và áp dụng các rules này trước khi viết bất kỳ dòng code nào.

| Rule File | Viết tắt | Áp dụng cho |
|-----------|:--------:|:------------|
| [frontend-conventions.md](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/.agent/rules/frontend-conventions.md) | **FE** | Next.js 15, TypeScript, shadcn/ui, TanStack Query v5, Japanese UI |
| [ui-ux-genba-spec.md](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/.agent/rules/ui-ux-genba-spec.md) | **UI** | Touch targets (44px), button HEX states, mobile/desktop grid, loading skeleton, empty states, button colors |
| [backend-conventions.md](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/.agent/rules/backend-conventions.md) | **BE** | FastAPI async, Pydantic v2, SQLAlchemy 2.0, Alembic, module 5-file pattern |
| [integration-conventions.md](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/.agent/rules/integration-conventions.md) | **INT** | OpenAPI type sync, JST/UTC timezone, date-fns, ¥ currency format |
| [security-conventions.md](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/.agent/rules/security-conventions.md) | **SEC** | JWT httpOnly, RBAC 6 roles, RLS policies, pgcrypto AES-256 |
| [infrastructure.md](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/.agent/rules/infrastructure.md) | **INFRA** | Docker Compose, PostgreSQL 16, Redis 7, S3-Compatible, Nginx |
| [devops-testing-conventions.md](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/.agent/rules/devops-testing-conventions.md) | **TEST** | Pytest async, Vitest, multi-stage Dockerfile, CI/CD |

---

## Proposed Changes

Hệ thống được thiết kế hoàn toàn mới (Greenfield) trong thư mục con `genba-system/` bên trong workspace, tách biệt hoàn toàn với các tài liệu nghiệp vụ hiện có. Dưới đây là phân rã chi tiết 10 Sprints:

---

### [Sprint 1] Project Setup & Base Architecture (10/06 - 15/06)

**📐 Rules bắt buộc:** `BE` `FE` `UI` `INFRA` `TEST`

**📚 Skills tham khảo:** `@api-endpoint-builder`, `@performance-optimizer`

#### Danh sách file tạo mới

| Loại | Đường dẫn (gốc `genba-system/`) |
|------|----------------------------------|
| [NEW] | [docker-compose.yml](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/docker-compose.yml) |
| [NEW] | [.env.example](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/.env.example) |
| [NEW] | [.gitignore](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/.gitignore) |
| [NEW] | [backend/Dockerfile](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/backend/Dockerfile) |
| [NEW] | [backend/requirements.txt](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/backend/requirements.txt) |
| [NEW] | [backend/pyproject.toml](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/backend/pyproject.toml) |
| [NEW] | [backend/alembic.ini](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/backend/alembic.ini) |
| [NEW] | [backend/app/main.py](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/backend/app/main.py) |
| [NEW] | [backend/app/core/config.py](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/backend/app/core/config.py) |
| [NEW] | [backend/app/core/database.py](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/backend/app/core/database.py) |
| [NEW] | [backend/app/core/exceptions.py](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/backend/app/core/exceptions.py) |
| [NEW] | [backend/app/core/pagination.py](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/backend/app/core/pagination.py) |
| [NEW] | [backend/app/migrations/env.py](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/backend/app/migrations/env.py) |
| [NEW] | [frontend/Dockerfile](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/frontend/Dockerfile) |
| [NEW] | [frontend/package.json](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/frontend/package.json) |
| [NEW] | [frontend/app/layout.tsx](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/frontend/app/layout.tsx) |
| [NEW] | [frontend/app/globals.css](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/frontend/app/globals.css) |
| [NEW] | [frontend/lib/api.ts](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/frontend/lib/api.ts) |
| [NEW] | [frontend/hooks/queryKeys.ts](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/frontend/hooks/queryKeys.ts) |
| [NEW] | [frontend/i18n/ja.json](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/frontend/i18n/ja.json) |
| [NEW] | [nginx/nginx.conf](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/genba-system/nginx/nginx.conf) |

#### Nội dung công việc

1. **Docker Compose** (`INFRA`): Cấu hình 5 services (`db`, `redis`, `api`, `web`, `nginx`) với healthcheck. Tuân thủ cấu hình cloud-agnostic, biến môi trường chuẩn S3.
2. **Backend FastAPI** (`BE`): Khởi tạo app với cấu trúc Modular Monolith (thư mục `core/` + `modules/`). Cài đặt `Pydantic Settings` cho env vars. Multi-stage `Dockerfile` theo quy chuẩn `TEST`.
3. **Alembic** (`BE`): Cấu hình `alembic.ini` + `env.py` hỗ trợ async engine.
4. **Frontend Next.js 15** (`FE`): Khởi tạo App Router + TypeScript strict. Cài shadcn/ui, cấu hình font `Noto Sans JP`. Tạo `apiClient` (axios) với interceptor auto-refresh theo `FE§8`. Thiết lập `queryKeys` factory theo `FE§4.1`.
5. **Nginx** (`INFRA`): Cấu hình reverse proxy với security headers, rate limiting zones theo `INFRA§5`.

#### ✅ Quality Gates (Sprint 1)

- [ ] `docker-compose up` khởi động thành công 5 containers, healthcheck pass
- [ ] `FastAPI /docs` trả về Swagger UI tại `http://localhost:8000/docs`
- [ ] `Next.js` render trang trắng thành công tại `http://localhost:3000`
- [ ] Dockerfile backend tuân thủ multi-stage pattern (`TEST§3.1`)
- [ ] Dockerfile frontend tuân thủ standalone output (`TEST§3.2`)
- [ ] Toàn bộ config đọc từ `.env`, KHÔNG hardcode giá trị nào

---

### [Sprint 2] Authentication & DB Foundation (16/06 - 20/06)

**📐 Rules bắt buộc:** `BE` `FE` `UI` `SEC` `INT` `TEST`

**📚 Skills tham khảo:** `@bug-hunter`, `@api-endpoint-builder`

#### Danh sách file tạo mới

| Loại | Đường dẫn (gốc `genba-system/`) |
|------|----------------------------------|
| [NEW] | backend/app/core/security.py |
| [NEW] | backend/app/core/dependencies.py |
| [NEW] | backend/app/core/permissions.py |
| [NEW] | backend/app/core/redis.py |
| [NEW] | backend/app/modules/auth/__init__.py |
| [NEW] | backend/app/modules/auth/models.py |
| [NEW] | backend/app/modules/auth/schemas.py |
| [NEW] | backend/app/modules/auth/repository.py |
| [NEW] | backend/app/modules/auth/service.py |
| [NEW] | backend/app/modules/auth/router.py |
| [NEW] | backend/app/core/audit.py |
| [NEW] | backend/app/migrations/versions/01_create_users_and_audit.py |
| [NEW] | backend/init-db.sql |
| [NEW] | frontend/app/(auth)/layout.tsx |
| [NEW] | frontend/app/(auth)/login/page.tsx |
| [NEW] | frontend/lib/auth.ts |
| [NEW] | frontend/hooks/useAuth.ts |
| [NEW] | tests/conftest.py |
| [NEW] | tests/test_auth/test_login.py |
| [NEW] | tests/test_auth/test_refresh.py |

#### Nội dung công việc

1. **Migration** (`BE`): Tạo bảng `users` (6 roles) và `audit_logs`. File migration đặt tên `01_create_users_and_audit.py` theo quy tắc `BE§7`.
2. **Auth Module** (`BE` + `SEC`): Tuân thủ 5-file pattern (`BE§3`). JWT access/refresh tokens lưu trong httpOnly cookies (`SEC§1.4`). Refresh Token Rotation qua Redis (`SEC§1.3`). Bcrypt cost factor 12. Account lockout 5 lần sai → khóa 15 phút.
3. **RBAC** (`SEC`): Định nghĩa `Role` enum, `Permission` enum và mapping `ROLE_PERMISSIONS` theo `SEC§2.2`.
4. **RLS Middleware** (`SEC`): Viết `get_db_session_with_rls()` sử dụng `SET LOCAL` để truyền `app.user_role` + `app.related_entity_id` vào PostgreSQL session theo `SEC§3.2`.
5. **Audit Service** (`BE`): Ghi log mọi hành động CREATE/UPDATE/DELETE/VIEW. Cột `is_sensitive=TRUE` cho truy cập chìa khóa.
6. **Login UI** (`FE`): Arrow function + default export cho page.tsx (`FE§3.1`). Form validation bằng `react-hook-form` + `zod` (`FE§6`). Error messages tiếng Nhật. Quản lý auth state qua `useAuth` hook.
7. **Tests** (`TEST`): Shared fixtures (`TEST§1.3`). Test login success/fail/lockout, test refresh rotation, test unauthorized access.

#### ✅ Quality Gates (Sprint 2)

- [ ] Login thành công → cookies `access_token` + `refresh_token` được set (httpOnly, Secure)
- [ ] Sai mật khẩu 5 lần → account bị khóa, trả về HTTP 423 message tiếng Nhật
- [ ] Refresh token cũ bị xóa khỏi Redis sau khi rotation
- [ ] Role/Permission mapping khớp 100% với bảng `SEC§2.2`
- [ ] `pytest tests/test_auth/ -v` → PASS toàn bộ
- [ ] Pydantic schemas có `model_config = ConfigDict(from_attributes=True, strict=True)` (`BE§5.1`)
- [ ] Mọi handler là `async def` (`BE§4.1`)

---

### [Sprint 3] Customer & Genba Core (21/06 - 26/06)

**📐 Rules bắt buộc:** `BE` `FE` `UI` `SEC` `INT`

**📚 Skills tham khảo:** `@api-endpoint-builder`, `@performance-optimizer`

#### Danh sách file tạo mới

| Loại | Đường dẫn (gốc `genba-system/`) |
|------|----------------------------------|
| [NEW] | backend/app/modules/customer/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/modules/genba/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/migrations/versions/02_create_customers_and_genba.py |
| [NEW] | frontend/app/(dashboard)/layout.tsx |
| [NEW] | frontend/components/layout/Sidebar.tsx |
| [NEW] | frontend/components/layout/Header.tsx |
| [NEW] | frontend/components/layout/RoleGuard.tsx |
| [NEW] | frontend/components/common/DataTable.tsx |
| [NEW] | frontend/app/(dashboard)/genba/page.tsx |
| [NEW] | frontend/app/(dashboard)/genba/new/page.tsx |
| [NEW] | frontend/app/(dashboard)/genba/[id]/layout.tsx |
| [NEW] | frontend/app/(dashboard)/genba/[id]/basic/page.tsx |
| [NEW] | frontend/app/(dashboard)/customers/page.tsx |
| [NEW] | frontend/hooks/useGenba.ts |
| [NEW] | frontend/hooks/useCustomers.ts |
| [NEW] | frontend/types/genba.ts |
| [NEW] | frontend/types/customer.ts |

#### Nội dung công việc

1. **Migration** (`BE`): DDL cho `customers`, `customer_contacts`, `customer_contact_genba`, `genba`. Index trên `customer_id`, `status`.
2. **RLS Policies** (`SEC`): Áp dụng 3 policies trên `genba` table (Staff xem toàn bộ, Worker chỉ assigned, Partner chỉ contracted) theo `SEC§3.3`. Dùng `FORCE ROW LEVEL SECURITY`.
3. **API CRUD** (`BE`): Tuân thủ 5-file pattern. Response bọc envelope `{"data": ...}` (`INT§1.2`). Pagination dùng `PaginatedResponse` (`BE§5.2`). Error responses theo `AppException` Japanese messages (`BE§5.3`). `external_customer_code` là optional.
4. **Dashboard Layout** (`FE`): Sidebar + Header + RoleGuard. Sidebar menu items chỉ hiển thị theo role. Tab navigation layout cho genba detail. Font `Noto Sans JP` 14px (`FE§5.1`).
5. **DataTable** (`FE`): Reusable component với sort/filter/pagination. Dùng `useGenbaList` hook wrapper TanStack Query (`FE§4.2`). Chống async waterfall bằng `useQueries` khi load song song (`FE§4.3`).
6. **Timestamps** (`INT`): Lưu UTC trong DB, hiển thị JST trên UI bằng `formatDateJST()` (`INT§3.3`).

#### ✅ Quality Gates (Sprint 3)

- [ ] RLS: Partner login → `GET /genba` chỉ trả về genba có hợp đồng active
- [ ] RLS: Worker login → `GET /genba` chỉ trả về genba được assigned
- [ ] Trang danh sách Genba hiển thị đúng với phân trang, toàn bộ text tiếng Nhật
- [ ] `queryKeys.genba.*` factory đã thiết lập (`FE§4.1`)
- [ ] Import order đúng chuẩn `FE§3.3`
- [ ] Tất cả date hiển thị theo format `yyyy年MM月dd日` (`INT§4.2`)

---

### [Sprint 4] Staff, Worker & Assignment (27/06 - 01/07)

**📐 Rules bắt buộc:** `BE` `FE` `UI` `SEC`

#### Danh sách file tạo mới

| Loại | Đường dẫn (gốc `genba-system/`) |
|------|----------------------------------|
| [NEW] | backend/app/modules/staff/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/modules/worker/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/migrations/versions/03_create_staff_and_workers.py |
| [NEW] | frontend/app/(dashboard)/genba/[id]/workers/page.tsx |
| [NEW] | frontend/app/(dashboard)/staff/page.tsx |
| [NEW] | frontend/hooks/useStaff.ts |
| [NEW] | frontend/hooks/useWorkers.ts |

#### Nội dung công việc

1. **Migration** (`BE`): Tạo bảng `staff`, `workers`, `genba_staff_assignments` (MAIN/SUB role_type), `genba_workers` (N:N + `is_active`).
2. **API** (`BE`): CRUD Staff + Workers. Endpoints gán/hủy gán nhân sự vào Genba. SQLAlchemy relationships dùng `lazy="selectin"` cho async-safe loading (`BE§6.1`).
3. **UI** (`FE`): Tab "従業員" trong Genba detail. Danh sách staff đã gán (phân biệt MAIN/SUB bằng badge). Dropdown chọn và gán người mới. Hook `useStaff` + `useWorkers` theo pattern `FE§4.2`.

#### ✅ Quality Gates (Sprint 4)

- [ ] Gán 1 MAIN staff + nhiều SUB staff cho 1 genba → hiển thị đúng phân loại
- [ ] Worker assigned vào genba → login Worker đó → `GET /genba` trả về genba này
- [ ] Toàn bộ API response bọc envelope `{"data": ...}` (`INT§1.2`)
- [ ] Mutation hooks invalidate queries đúng key (`FE§4.2`)

---

### [Sprint 5] Partner & Contract Management (02/07 - 06/07)

**📐 Rules bắt buộc:** `BE` `FE` `UI` `SEC` `INT`

#### Danh sách file tạo mới

| Loại | Đường dẫn (gốc `genba-system/`) |
|------|----------------------------------|
| [NEW] | backend/app/modules/partner/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/modules/contract/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/migrations/versions/04_create_partners_and_contracts.py |
| [NEW] | frontend/app/(dashboard)/partners/page.tsx |
| [NEW] | frontend/app/(dashboard)/genba/[id]/contracts/page.tsx |
| [NEW] | frontend/app/(dashboard)/contracts/page.tsx |
| [NEW] | frontend/components/forms/ContractForm.tsx |
| [NEW] | frontend/hooks/useContracts.ts |
| [NEW] | frontend/hooks/usePartners.ts |

#### Nội dung công việc

1. **Migration** (`BE`): Bảng `partner_companies`, `contracts` với CHECK constraint cho `contract_type` (RECEIVING/ORDERING) và `chk_contract_party`.
2. **Contract Logic** (`BE`): Mã hợp đồng kép — `internal_code` auto-generate, `external_code` nhập tay. Trường `service_area` hỗ trợ nhiều HĐ cùng loại dịch vụ.
3. **RLS** (`SEC`): Partner chỉ thấy HĐ ORDERING thuộc về mình (`SEC§3.3`).
4. **Contract Form** (`FE`): Form 2 chiều (tab RECEIVING/ORDERING). Validation bằng zod (`FE§6`). Giá tiền format ¥ (`INT§5.1`). Tax 10% auto-calculate (`INT§5.2`).

#### ✅ Quality Gates (Sprint 5)

- [ ] Tạo HĐ RECEIVING → `customer_id` required, `partner_id` null
- [ ] Tạo HĐ ORDERING → `partner_id` required, `customer_id` null
- [ ] Partner login → chỉ thấy HĐ ORDERING của mình, không thấy HĐ RECEIVING
- [ ] Số tiền hiển thị `¥150,000` (không có decimal)
- [ ] `formatCurrency()` dùng `Intl.NumberFormat("ja-JP")` (`INT§5.1`)

---

### [Sprint 6] Manuals Part 1 — Entry/Exit, Daily, Memo (07/07 - 11/07)

**📐 Rules bắt buộc:** `BE` `FE` `UI` `SEC` `INT`

#### Danh sách file tạo mới

| Loại | Đường dẫn (gốc `genba-system/`) |
|------|----------------------------------|
| [NEW] | backend/app/modules/manual/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/migrations/versions/05_create_manuals_part1.py |
| [NEW] | frontend/app/(dashboard)/genba/[id]/entry-exit/page.tsx |
| [NEW] | frontend/app/(dashboard)/genba/[id]/daily/page.tsx |
| [NEW] | frontend/app/(dashboard)/genba/[id]/memos/page.tsx |
| [NEW] | frontend/components/common/RichTextEditor.tsx |

#### Nội dung công việc

1. **Migration** (`BE`): Bảng `entry_exit_instructions` (1:1), `daily_cleaning_tasks` (day_of_week, floor, area), `memos`, `memo_attachments`.
2. **API** (`BE`): CRUD cho Entry/Exit (upsert vì 1:1), Daily Tasks (CRUD + sort_order), Memos (CRUD + pagination). Tuân thủ 5-file pattern.
3. **UI** (`FE`): Tab "入退館" (rich text view/edit), "日常マニュアル" (bảng lưới theo tầng/khu vực + day_of_week filter), "メモ" (danh sách + form tạo mới). Rich text editor component tái sử dụng.
4. **Permissions** (`SEC`): Partner chỉ xem 入退館 (read-only). Worker xem toàn bộ manual assigned.

#### ✅ Quality Gates (Sprint 6)

- [ ] Entry/Exit instruction lưu rich text, hiển thị đúng format
- [ ] Daily tasks lọc đúng theo ngày trong tuần (月/火/水...)
- [ ] Partner chỉ xem được, KHÔNG edit được manual
- [ ] Tất cả labels UI bằng tiếng Nhật (入退館, 日常, メモ...)

---

### [Sprint 7] Manuals Part 2 & Operations (12/07 - 16/07)

**📐 Rules bắt buộc:** `BE` `FE` `UI` `INT`

#### Danh sách file tạo mới

| Loại | Đường dẫn (gốc `genba-system/`) |
|------|----------------------------------|
| [NEW] | backend/app/modules/schedule/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/migrations/versions/06_create_manuals_part2.py |
| [NEW] | frontend/app/(dashboard)/genba/[id]/periodic/page.tsx |
| [NEW] | frontend/app/(dashboard)/genba/[id]/schedules/page.tsx |
| [NEW] | frontend/app/(dashboard)/genba/[id]/equipment/page.tsx |
| [NEW] | frontend/app/(dashboard)/genba/[id]/standards/page.tsx |

#### Nội dung công việc

1. **Migration** (`BE`): Bảng `periodic_cleaning_plans`, `periodic_cleaning_details`, `work_schedules`, `genba_custom_holidays`, `genba_equipment`, `cleaning_work_standards`.
2. **Schedule Logic** (`BE`): Ca làm theo ngày trong tuần. Xử lý `holiday_shift_rule` (OFF / SHIFT_BEFORE / SHIFT_AFTER / WORK). Đội định kỳ: `work_team_type` (SELF/PARTNER) với FK optional.
3. **UI** (`FE`): 4 tabs mới: "定期マニュアル", "勤務スケジュール", "清掃用具", "作業基準表". Hiển thị ngày giờ JST (`INT§3.3`). Danh sách dụng cụ và bảng tiêu chuẩn dạng grid.

#### ✅ Quality Gates (Sprint 7)

- [ ] Schedule hiển thị đúng ca theo từng ngày tuần (月～金)
- [ ] Holiday shift rule hoạt động: ngày nghỉ → dồn sang ngày tiếp theo
- [ ] Custom holidays per genba hoạt động độc lập
- [ ] Periodic plans phân biệt SELF vs PARTNER team type

---

### [Sprint 8] Security (pgcrypto) & S3 Storage (17/07 - 21/07)

**📐 Rules bắt buộc:** `BE` `FE` `UI` `SEC` `INFRA` `INT` `TEST`

**📚 Skills tham khảo:** `@bug-hunter`, `@codebase-audit-pre-push`

#### Danh sách file tạo mới

| Loại | Đường dẫn (gốc `genba-system/`) |
|------|----------------------------------|
| [NEW] | backend/app/modules/key_management/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/core/storage.py |
| [NEW] | backend/app/migrations/versions/07_setup_pgcrypto_and_keys.py |
| [NEW] | frontend/app/(dashboard)/genba/[id]/keys/page.tsx |
| [NEW] | frontend/app/(dashboard)/genba/[id]/photos/page.tsx |
| [NEW] | frontend/components/common/FileUpload.tsx |
| [NEW] | tests/test_keys/test_encryption.py |
| [NEW] | tests/test_keys/test_audit.py |
| [NEW] | tests/test_storage/test_presigned_url.py |

#### Nội dung công việc

1. **pgcrypto** (`SEC`): Kích hoạt extension. Tạo `encrypt_sensitive()` + `decrypt_sensitive()` functions dùng AES-256-CBC (`SEC§4`). Key từ env `ENCRYPTION_KEY`, truyền qua `SET LOCAL app.encryption_key`.
2. **Key Management** (`BE` + `SEC`): Bảng `key_infos` với BYTEA encrypted columns. KHÔNG BAO GIỜ log plaintext key (`SEC§4.2`). Audit mọi VIEW với `is_sensitive=TRUE`.
3. **RLS Keys** (`SEC`): Staff/Admin → xem toàn bộ. Worker → chỉ genba assigned. Partner/Customer → KHÔNG có policy = KHÔNG truy cập (`SEC§3.3`).
4. **S3 Storage** (`INFRA`): `StorageService` dùng `boto3` với env vars cloud-agnostic (`INFRA§4.4`). Presigned PUT URL 10 phút, GET URL 1 giờ. Partner chỉ upload `WORK_REPORT`.
5. **File Upload UI** (`FE`): Component `FileUpload` kéo thả. Tab "鍵管理" với nút "表示" (reveal) → decrypt on-click. Tab "写真" với gallery view + upload.
6. **Tests** (`TEST`): Verify encrypted data in DB không chứa plaintext (`TEST§1.4`). Verify audit log ghi nhận. Verify presigned URL generation.

#### ✅ Quality Gates (Sprint 8)

- [ ] `SELECT key_code_encrypted FROM key_infos` → trả về BYTEA, KHÔNG thấy plaintext
- [ ] Worker xem key → audit_logs ghi `is_sensitive=TRUE`
- [ ] Container logs KHÔNG chứa mã khóa plaintext
- [ ] Partner chỉ upload được `photo_type=WORK_REPORT`, không thể upload loại khác
- [ ] Presigned URL hết hạn sau 10 phút
- [ ] `pytest tests/test_keys/ -v` → PASS toàn bộ

---

### [Sprint 9] Approval Workflow & Invoice Auto-Generation (22/07 - 26/07)

**📐 Rules bắt buộc:** `BE` `FE` `UI` `SEC` `INT` `TEST`

**📚 Skills tham khảo:** `@logic-lens`, `@api-endpoint-builder`

#### Danh sách file tạo mới

| Loại | Đường dẫn (gốc `genba-system/`) |
|------|----------------------------------|
| [NEW] | backend/app/modules/quotation/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/modules/invoice/{__init__, models, schemas, repository, service, router}.py |
| [NEW] | backend/app/modules/invoice/auto_generator.py |
| [NEW] | backend/app/core/approval.py |
| [NEW] | backend/app/migrations/versions/08_create_finance_and_approvals.py |
| [NEW] | frontend/app/(dashboard)/quotations/page.tsx |
| [NEW] | frontend/app/(dashboard)/invoices/page.tsx |
| [NEW] | frontend/app/(dashboard)/invoices/[id]/page.tsx |
| [NEW] | frontend/app/(dashboard)/approvals/page.tsx |
| [NEW] | frontend/components/common/ApprovalBadge.tsx |
| [NEW] | tests/test_invoice/test_auto_generation.py |
| [NEW] | tests/test_invoice/test_approval.py |

#### Nội dung công việc

1. **Migration** (`BE`): Bảng `quotations`, `quotation_items`, `invoices`, `approval_requests`. UNIQUE constraint `(contract_id, year, month, type)` trên invoices.
2. **Approval Engine** (`BE`): `ApprovalService` state machine chung cho 3 entity types. Chỉ ADMIN/SENIOR_STAFF có quyền duyệt (`SEC§2.2`). Reject bắt buộc nhập lý do bằng tiếng Nhật.
3. **Invoice Auto-Gen** (`BE`): `InvoiceAutoGenerator` chạy APScheduler cron ngày 1 mỗi tháng 06:00 JST. Logic: RECEIVING contract → OUTGOING invoice, ORDERING contract → INCOMING invoice. Status `AUTO_GENERATED`. Tax 10% (`INT§5.2`).
4. **UI** (`FE`): Approval Dashboard (badge trạng thái, nút duyệt/từ chối). Invoice list + detail (hiển thị ¥ format, kỳ thanh toán `yyyy年MM月分`). `formatCurrency()` theo `INT§5.1`.
5. **Tests** (`TEST`): Auto-generation tạo đúng số invoice cho N contracts. Không tạo trùng kỳ. Approval state transitions đúng.

#### ✅ Quality Gates (Sprint 9)

- [ ] Cron dry-run: `POST /invoices/auto-generate {year: 2026, month: 7}` → tạo đúng invoices
- [ ] Gọi lại lần 2 → `skipped` count > 0, `created` = 0 (UNIQUE protection)
- [ ] Approval: INTERNAL_STAFF submit → SENIOR_STAFF duyệt → status chuyển đúng
- [ ] Reject bắt buộc comment, trả lỗi nếu comment rỗng
- [ ] `pytest tests/test_invoice/ -v` → PASS toàn bộ

---

### [Sprint 10] Portals, Mobile View, Seed Data & Polish (27/07 - 31/07)

**📐 Rules bắt buộc:** `BE` `FE` `UI` `SEC` `INT` `INFRA` `TEST`

**📚 Skills tham khảo:** `@performance-optimizer`, `@codebase-audit-pre-push`, `@squirrel`

#### Danh sách file tạo mới

| Loại | Đường dẫn (gốc `genba-system/`) |
|------|----------------------------------|
| [NEW] | frontend/app/partner/layout.tsx |
| [NEW] | frontend/app/partner/genba/page.tsx |
| [NEW] | frontend/app/partner/genba/[id]/page.tsx |
| [NEW] | frontend/app/my-genba/layout.tsx |
| [NEW] | frontend/app/my-genba/page.tsx |
| [NEW] | frontend/app/my-genba/[id]/page.tsx |
| [NEW] | backend/app/scripts/import_seed_data.py |
| [NEW] | backend/app/scripts/create_admin.py |
| [NEW] | .github/workflows/deploy.yml |

#### Nội dung công việc

1. **Partner Portal** (`FE` + `SEC`): Layout riêng, sidebar đơn giản. Chỉ hiển thị tabs cho phép: 基本, 入退館, 定期, 写真. Upload ảnh chỉ `WORK_REPORT`. Tab navigation theo `TABS_BY_ROLE.PARTNER` (arch part 2).
2. **Worker Mobile View** (`FE`): Route `/my-genba`. Card layout mobile-first (breakpoint `sm` 640px theo `FE§5.3`). Nút copy địa chỉ, chạm để xem mã keybanker (decrypt → auto-hide sau 30s).
3. **Full-text Search** (`BE`): Kích hoạt `pg_bigm` extension. Tìm kiếm tiếng Nhật trên `property_name`, `address`.
4. **Seed Data** (`BE`): Script `import_seed_data.py` parse `◎現場一覧表◎マスターデータ.xlsx` (openpyxl). Script `create_admin.py` tạo tài khoản mẫu.
5. **CI/CD** (`TEST` + `INFRA`): GitHub Actions workflow theo `TEST§4`. Lint → Test → Build Docker → Push GHCR → SSH deploy.
6. **Polish**: Sửa lỗi, tối ưu hiệu năng, responsive check toàn bộ breakpoints.

#### ✅ Quality Gates (Sprint 10)

- [ ] Partner login → redirect `/partner/genba`, chỉ thấy genba có HĐ active
- [ ] Worker login trên mobile → `/my-genba` responsive, card layout, key reveal hoạt động
- [ ] Search "新大阪" → trả về kết quả chính xác
- [ ] `import_seed_data.py` import thành công từ Excel gốc
- [ ] `npm run build` (Frontend) → PASS, không TypeScript error
- [ ] `pytest -v` (toàn bộ Backend) → PASS, coverage > 85% cho modules critical
- [ ] GitHub Actions workflow chạy thành công trên push to main

---

## Verification Plan

### Automated Tests

```bash
# Backend (trong genba-system/backend/)
pytest -v --cov=app --cov-report=html

# Frontend (trong genba-system/frontend/)
npm run lint
npm run build
```

**Coverage targets** theo `TEST§1.5`:
| Module | Target |
|--------|:------:|
| auth, core/security | ≥95% |
| core/approval, invoice/auto_generator | ≥90% |
| key_management | ≥90% |
| Các modules khác | ≥80% |

### Manual Verification

1. **RLS End-to-End** (`SEC§3`): Login 4 roles → xác minh mỗi role chỉ thấy đúng data scope
2. **Encryption Audit** (`SEC§4`): `psql` → `SELECT key_code_encrypted` → verify BYTEA; container logs → verify no plaintext
3. **Invoice Cron** (`INT`): Gọi `POST /invoices/auto-generate` → verify đúng số lượng + amount + tax 10%
4. **Mobile UX**: Mở `/my-genba` trên iPhone Safari/Chrome → verify responsive + key reveal
