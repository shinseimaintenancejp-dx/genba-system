# TỔNG QUAN HỆ THỐNG VÀ KIẾN TRÚC DỰ ÁN (GENBA KANRI SYSTEM)

Tài liệu này tổng hợp lại toàn bộ thông tin về kiến trúc, công nghệ và cấu trúc của Hệ thống Quản lý Genba (現場管理システム) thuộc công ty vệ sinh Shinsei.

## 1. Giới thiệu Dự án
- **Mục tiêu:** Nền tảng web tập trung giúp số hóa toàn bộ quy trình vận hành và quản lý dữ liệu cho hơn 359 công trình (genba).
- **Vai trò:** Thay thế hệ thống hàng trăm file Excel phân tán, kết nối liền mạch thông tin về genba, khách hàng, đối tác, nhân sự, hợp đồng, hóa đơn, tài liệu vận hành và quản lý chìa khóa.

## 2. Công nghệ sử dụng (Tech Stack)

Hệ thống được thiết kế theo hướng Cloud-Agnostic, phân tách rõ ràng (Decoupled Architecture) và tối ưu hóa hiệu suất với các công nghệ hiện đại nhất:

| Lớp (Layer) | Công nghệ / Công cụ (Technology/Tools) |
|-------------|----------------------------------------|
| **Frontend** | Next.js 15 (App Router), TypeScript, shadcn/ui, TanStack Query v5, TailwindCSS |
| **Backend** | FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 Async |
| **Database** | PostgreSQL 16 (Tích hợp RLS, pgcrypto, pg_bigm) |
| **Cache** | Redis 7 |
| **Storage** | S3-Compatible (Cloudflare R2 / Wasabi) — *Không bị phụ thuộc vào AWS/GCP (Cloud-agnostic)* |
| **Bảo mật & Xác thực**| JWT (httpOnly cookies), bcrypt, RBAC (6 Roles phân quyền) |
| **Triển khai (Deployment)**| Docker Compose, Nginx reverse proxy, Linux VPS |
| **CI/CD** | GitHub Actions → GHCR → SSH deploy |

## 3. Kiến trúc Hệ thống (System Architecture)

### 3.1. Frontend Architecture (Next.js 15)
- **App Router:** Định tuyến ứng dụng phân tách logic theo từng thư mục (Page, Layout, Loading, Error).
- **State Management:** Sử dụng **TanStack Query v5** để fetching, caching và đồng bộ state bất đồng bộ từ server.
- **UI/UX:** Giao diện 100% tiếng Nhật, xây dựng trên các reusable components từ `shadcn/ui` và `TailwindCSS`. Quy định chặt chẽ về màu sắc, kích thước touch target, loading skeleton.
- **Bảo mật Client:** Không lưu trữ token trong localStorage, sử dụng `httpOnly cookies` để chống tấn công XSS.

### 3.2. Backend Architecture (FastAPI)
- **Modular Design:** Kiến trúc Backend được chia theo các modules nghiệp vụ độc lập (`auth`, `genba`, `customer`, `invoice`, v.v.). Mỗi module chứa trọn vẹn `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`.
- **Async I/O:** Tận dụng 100% Async/Await của Python (FastAPI + Async SQLAlchemy) nhằm đạt hiệu suất cao nhất với các tác vụ I/O.
- **Validation:** Sử dụng Pydantic v2 để xác thực kiểu dữ liệu nghiêm ngặt ngay từ đầu vào.

### 3.3. Database & Security
- **Row-Level Security (RLS):** Phân quyền truy cập dữ liệu trực tiếp ở tầng Database (PostgreSQL). Đảm bảo mỗi user chỉ có thể đọc/ghi dữ liệu genba thuộc quyền quản lý của mình.
- **Mã hóa dữ liệu:** Sử dụng `pgcrypto` để mã hóa các dữ liệu cực kỳ nhạy cảm.
- **Quản lý phân quyền (RBAC):** Hệ thống có 6 vai trò (roles) với các mức độ quyền hạn khác nhau.

## 4. Cấu trúc Thư mục Chính (Project Structure)

```text
genba-system/
├── .agent/                 # Cấu hình AI Agent (Rules về coding conventions, UI/UX, Skills)
├── backend/                # Mã nguồn API Server (FastAPI)
│   ├── app/                # Core logic, modules nghiệp vụ (auth, genba...), migrations
│   ├── tests/              # Pytest cho Backend
│   └── Dockerfile          # Cấu hình container Backend
├── frontend/               # Mã nguồn Web Client (Next.js 15)
│   ├── app/                # App router (dashboard, auth, my-genba...)
│   ├── components/         # UI components chia sẻ (shadcn/ui, layout, tables)
│   ├── hooks/              # Custom hooks & TanStack Query hooks
│   ├── lib/                # API clients, utils
│   ├── types/              # Type definitions (TypeScript)
│   ├── i18n/               # File ngôn ngữ (tiếng Nhật - ja.json)
│   └── Dockerfile          # Cấu hình container Frontend
├── docs/                   # Tài liệu thiết kế hệ thống, phân tích nghiệp vụ
├── nginx/                  # Cấu hình Reverse Proxy Nginx
└── docker-compose.yml      # Tệp cấu hình chạy toàn bộ hệ thống bằng Docker
```

## 5. Quy trình Phát triển (Development Workflow)
- **Review-Driven Development:** Mọi code mới đều phải được lập kế hoạch trước (Plan), báo cáo các file bị thay đổi.
- **Tiêu chuẩn Code:** TypeScript Strict cho Frontend; Type Hints đầy đủ cho Backend Python.
- **Ngôn ngữ:** Comment/Code (Tiếng Anh), Giao diện UI/Thông báo lỗi (Tiếng Nhật - 日本語).
