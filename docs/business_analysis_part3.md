# PHÂN TÍCH NGHIỆP VỤ TOÀN DIỆN - HỆ THỐNG QUẢN LÝ GENBA (Phần 3 — Cuối)

**Phiên bản:** 1.0  
**Ngày tạo:** 2026-06-09  
**Trạng thái:** Draft — Chờ review  

---

## MỤC LỤC (Phần 3)

12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Permission Matrix](#13-permission-matrix)
14. [Data Dictionary](#14-data-dictionary)
15. [Business Rules](#15-business-rules)
16. [Risks & Assumptions](#16-risks--assumptions)
17. [Open Questions](#17-open-questions)
18. [MVP Recommendation](#18-mvp-recommendation)
19. [Đánh giá độ đầy đủ](#19-đánh-giá-độ-đầy-đủ)

---

## 12. Non-Functional Requirements

### 12.1. Performance

| NFR ID | Description | Target |
|--------|-------------|--------|
| NFR-P01 | Thời gian tải trang danh sách Genba (≤100 bản ghi) | ≤ 2 giây |
| NFR-P02 | Thời gian tải trang chi tiết Genba (bao gồm manual, ảnh) | ≤ 3 giây |
| NFR-P03 | Thời gian tìm kiếm/lọc Genba | ≤ 1 giây |
| NFR-P04 | Thời gian upload ảnh (≤ 10MB) | ≤ 5 giây |
| NFR-P05 | Hệ thống phải hỗ trợ tối thiểu 50 người dùng đồng thời | Concurrent users ≥ 50 |

> [!NOTE]
> **Assumption:** Quy mô ban đầu ~10,000 MAU (Monthly Active Users) theo SRS. Tuy nhiên dựa trên dữ liệu thực tế (6 Internal Staff + ~359 Worker + 21 KH + 32 ĐT), số lượng user thực tế trong năm đầu có thể chỉ khoảng 100–500. Cần xác nhận lại con số 10,000 MAU.

---

### 12.2. Security

| NFR ID | Description | Priority |
|--------|-------------|----------|
| NFR-S01 | Mọi kết nối phải sử dụng HTTPS (TLS 1.2+) | P0 |
| NFR-S02 | Password phải được hash bằng thuật toán bcrypt/scrypt/argon2 (không lưu plaintext) | P0 |
| NFR-S03 | Thông tin chìa khóa, mã cửa, mã keybanker phải được mã hóa tại rest (AES-256 hoặc tương đương) | P0 |
| NFR-S04 | Session phải có timeout tự động (Assumption: 30 phút không hoạt động) | P1 |
| NFR-S05 | API phải xác thực token (JWT hoặc tương đương) cho mọi request | P0 |
| NFR-S06 | Mọi truy cập vào thông tin chìa khóa phải được ghi audit log (ai xem, lúc nào) | P0 |
| NFR-S07 | Hệ thống phải chống tấn công CSRF, XSS, SQL Injection | P0 |
| NFR-S08 | Phân quyền phải được enforce ở tầng backend (không chỉ ẩn UI) | P0 |
| NFR-S09 | Upload file phải validate file type, kích thước, quét malware cơ bản | P1 |

---

### 12.3. Scalability

| NFR ID | Description |
|--------|-------------|
| NFR-SC01 | Hệ thống phải hỗ trợ tối thiểu 1,000 genba mà không giảm hiệu năng (hiện tại: 359) |
| NFR-SC02 | Hệ thống phải hỗ trợ tối thiểu 100 khách hàng và 100 đối tác |
| NFR-SC03 | Dung lượng lưu trữ ảnh phải đáp ứng tối thiểu 50GB (ước tính: 359 genba × ~20 ảnh × ~500KB = ~3.6GB hiện tại, dự phòng tăng trưởng) |

---

### 12.4. Availability

| NFR ID | Description | Target |
|--------|-------------|--------|
| NFR-A01 | Uptime tối thiểu | 99.5% (tương đương ~44 giờ downtime/năm) |
| NFR-A02 | Thời gian bảo trì dự kiến | Ngoài giờ làm việc (22:00–6:00 JST) |
| NFR-A03 | Hệ thống phải hoạt động liên tục trong giờ hành chính Nhật Bản (7:00–20:00 JST) | 100% trong khung giờ này |

> [!NOTE]
> **Assumption:** Nhân viên hiện trường thường bắt đầu ca sớm (6:00–7:00) nên hệ thống cần available từ 6:00 JST.

---

### 12.5. Backup & Recovery

| NFR ID | Description |
|--------|-------------|
| NFR-B01 | Database phải được backup tự động hàng ngày |
| NFR-B02 | Backup phải được lưu trữ tối thiểu 30 ngày |
| NFR-B03 | File ảnh/tài liệu phải được backup ít nhất hàng tuần |
| NFR-B04 | RPO (Recovery Point Objective): ≤ 24 giờ |
| NFR-B05 | RTO (Recovery Time Objective): ≤ 4 giờ |

---

### 12.6. Audit Log

| NFR ID | Description |
|--------|-------------|
| NFR-AL01 | Mọi thao tác tạo/sửa/xóa dữ liệu phải được ghi nhận: user, thời gian, hành động, giá trị cũ/mới |
| NFR-AL02 | Mọi truy cập vào thông tin nhạy cảm (chìa khóa, mã cửa) phải được ghi nhận |
| NFR-AL03 | Audit log phải được lưu trữ tối thiểu 1 năm |
| NFR-AL04 | Admin phải có khả năng tra cứu audit log theo user, thời gian, loại hành động |

---

### 12.7. Monitoring

| NFR ID | Description |
|--------|-------------|
| NFR-M01 | Hệ thống phải có health check endpoint |
| NFR-M02 | Hệ thống phải ghi log lỗi (error logging) với mức độ chi tiết đủ để debug |
| NFR-M03 | Cảnh báo khi hệ thống lỗi (downtime, error rate cao, disk sắp đầy) |

---

### 12.8. Maintainability

| NFR ID | Description |
|--------|-------------|
| NFR-MT01 | Mã nguồn phải tuân thủ coding standards và có documentation |
| NFR-MT02 | Hệ thống phải có môi trường staging để test trước khi deploy production |
| NFR-MT03 | Database migration phải được quản lý bằng migration tool (có khả năng rollback) |

---

### 12.9. Usability

| NFR ID | Description |
|--------|-------------|
| NFR-U01 | Giao diện phải hỗ trợ tiếng Nhật (日本語) làm ngôn ngữ chính |
| NFR-U02 | Giao diện phải responsive — hoạt động trên desktop (chính) và mobile browser (phụ) |
| NFR-U03 | Nhân viên hiện trường phải có thể tra cứu manual trên smartphone (responsive mobile) |
| NFR-U04 | Form nhập liệu phải đặt validation message bằng tiếng Nhật, rõ ràng |
| NFR-U05 | Danh sách phải hỗ trợ phân trang, sắp xếp theo cột |
| NFR-U06 | Hệ thống phải load được trên mạng 4G/LTE (bandwith ~10Mbps) trong ≤ 5 giây |

---

### 12.10. Integration

| NFR ID | Description | Phase |
|--------|-------------|-------|
| NFR-I01 | MVP KHÔNG yêu cầu tích hợp với hệ thống bên ngoài | MVP |
| NFR-I02 | (Future) Hỗ trợ export dữ liệu ra Excel/CSV để tương thích với quy trình hiện tại | Future |
| NFR-I03 | (Future) API để tích hợp với hệ thống chấm công (勤怠アプリ/LINE) | Future |
| NFR-I04 | (Future) Tích hợp email notification | Future |

---

## 13. Permission Matrix

### 13.1. Ma trận phân quyền theo Module

Ký hiệu: ✅ = Có quyền | ❌ = Không có quyền | 🔒 = Có quyền nhưng giới hạn scope (chỉ dữ liệu liên quan)

#### Genba Management (M-02)

| Thao tác | Admin | Internal Staff | Genba Worker | Customer | Partner |
|----------|-------|---------------|-------------|----------|---------|
| View (danh sách) | ✅ Tất cả | ✅ Tất cả | 🔒 Chỉ genba được phân công | 🔒 Chỉ genba của mình | 🔒 Chỉ genba có HĐ giao |
| View (chi tiết — đầy đủ) | ✅ | ✅ | ❌ | ❌ | ❌ |
| View (chi tiết — giới hạn) | — | — | 🔒 Không thấy tài chính | 🔒 Không thấy chìa khóa, tài chính nội bộ | 🔒 Chỉ thấy manual liên quan HĐ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete (soft) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Customer Management (M-03)

| Thao tác | Admin | Internal Staff | Genba Worker | Customer | Partner |
|----------|-------|---------------|-------------|----------|---------|
| View | ✅ | ✅ | ❌ | 🔒 Chỉ công ty mình | ❌ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Partner Management (M-04)

| Thao tác | Admin | Internal Staff | Genba Worker | Customer | Partner |
|----------|-------|---------------|-------------|----------|---------|
| View | ✅ | ✅ | ❌ | ❌ | 🔒 Chỉ công ty mình |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Contract Management (M-06)

| Thao tác | Admin | Internal Staff | Genba Worker | Customer | Partner |
|----------|-------|---------------|-------------|----------|---------|
| View | ✅ | ✅ | ❌ | 🔒 Chỉ HĐ nhận liên quan | 🔒 Chỉ HĐ giao liên quan |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | 🔒 HĐ của mình | ❌ |

#### Quotation Management (M-07)

| Thao tác | Admin | Internal Staff | Genba Worker | Customer | Partner |
|----------|-------|---------------|-------------|----------|---------|
| View | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Invoice Management (M-08)

| Thao tác | Admin | Internal Staff | Genba Worker | Customer | Partner |
|----------|-------|---------------|-------------|----------|---------|
| View | ✅ | ✅ | ❌ | 🔒 Chỉ HĐ gửi cho mình | 🔒 Chỉ HĐ nhận từ mình |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | 🔒 | ❌ |

#### Work Instruction & Manual (M-09)

| Thao tác | Admin | Internal Staff | Genba Worker | Customer | Partner |
|----------|-------|---------------|-------------|----------|---------|
| View | ✅ | ✅ | 🔒 Genba được phân công | ❌ | 🔒 Chỉ manual liên quan HĐ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Key Management (M-10)

| Thao tác | Admin | Internal Staff | Genba Worker | Customer | Partner |
|----------|-------|---------------|-------------|----------|---------|
| View | ✅ | ✅ | 🔒 Genba được phân công | ❌ | ❌ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export | ✅ | ❌ | ❌ | ❌ | ❌ |

#### Document & Photo (M-12)

| Thao tác | Admin | Internal Staff | Genba Worker | Customer | Partner |
|----------|-------|---------------|-------------|----------|---------|
| View | ✅ | ✅ | 🔒 Genba được phân công | ❌ | 🔒 Genba có HĐ |
| Upload | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export | ✅ | ✅ | ❌ | ❌ | ❌ |

#### User & Permission Management (M-01)

| Thao tác | Admin | Internal Staff | Genba Worker | Customer | Partner |
|----------|-------|---------------|-------------|----------|---------|
| Quản lý tài khoản | ✅ | ❌ | ❌ | ❌ | ❌ |
| Phân quyền genba | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem audit log | ✅ | ❌ | ❌ | ❌ | ❌ |
| Đổi mật khẩu bản thân | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 14. Data Dictionary

### 14.1. Genba (現場)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| genba_id | Mã định danh duy nhất | ✅ | Auto-generated | ❌ |
| property_name | Tên công trình (物件名) | ✅ | Text (200) | ❌ |
| address | Địa chỉ (住所) | ✅ | Text (500) | ❌ |
| transportation | Phương tiện giao thông (交通機関) | ❌ | Text (500) | ❌ |
| phone_number | Số điện thoại | ❌ | Text (20) | ❌ |
| service_type | Loại dịch vụ (日常清掃, 管理員, 定期清掃...) | ✅ | Enum/Text | ❌ |
| priority | Mức ưu tiên (A, 代行無...) | ❌ | Text (20) | ❌ |
| status | Trạng thái (Active / Terminated) | ✅ | Enum | ❌ |
| mcd_code | Mã MCD | ❌ | Text (20) | ❌ |
| site_confirmed | Cờ xác nhận hiện trường (現場確認) | ❌ | Boolean | ❌ |
| manual_created | Cờ tạo manual (マニュアル作成) | ❌ | Boolean | ❌ |
| special_notes | Ghi chú đặc biệt | ❌ | Text (2000) | ❌ |
| customer_id | FK → Customer | ✅ | FK | ❌ |
| staff_id | FK → Internal Staff (担当) | ✅ | FK | ❌ |
| created_at | Ngày tạo | ✅ | Datetime | ❌ |
| updated_at | Ngày cập nhật (作成更新日) | ✅ | Datetime | ❌ |

---

### 14.2. Customer (取引先)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| customer_id | Mã định danh | ✅ | Auto-generated | ❌ |
| full_name | Tên công ty đầy đủ | ✅ | Text (200) | ❌ |
| short_name | Tên rút gọn/chi nhánh | ✅ | Text (100) | ❌ |
| phone | SĐT | ❌ | Text (20) | ❌ |
| email | Email | ❌ | Text (100) | ❌ |
| address | Địa chỉ | ❌ | Text (500) | ❌ |
| notes | Ghi chú | ❌ | Text (1000) | ❌ |

---

### 14.3. Customer Contact (取引先担当者)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| contact_id | Mã định danh | ✅ | Auto-generated | ❌ |
| customer_id | FK → Customer | ✅ | FK | ❌ |
| full_name | Họ tên (VD: 樋口, 高木) | ✅ | Text (100) | ❌ |
| phone | SĐT | ❌ | Text (20) | ✅ |
| email | Email | ❌ | Text (100) | ✅ |
| notes | Ghi chú | ❌ | Text (1000) | ❌ |

---

### 14.4. Partner Company (協力会社)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| partner_id | Mã định danh | ✅ | Auto-generated | ❌ |
| company_name | Tên công ty (VD: BePro, マルクリーン) | ✅ | Text (200) | ❌ |
| phone | SĐT | ❌ | Text (20) | ❌ |
| email | Email | ❌ | Text (100) | ❌ |
| address | Địa chỉ | ❌ | Text (500) | ❌ |
| notes | Ghi chú | ❌ | Text (1000) | ❌ |

---

### 14.5. Internal Staff (社内担当者)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| staff_id | Mã định danh | ✅ | Auto-generated | ❌ |
| full_name | Họ tên (VD: 久保, 山中) | ✅ | Text (100) | ❌ |
| phone | SĐT | ❌ | Text (20) | ✅ |
| email | Email | ❌ | Text (100) | ✅ |
| user_id | FK → User (tài khoản đăng nhập) | ❌ | FK | ❌ |

---

### 14.6. Genba Worker (現場員)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| worker_id | Mã định danh | ✅ | Auto-generated | ❌ |
| full_name | Họ tên (VD: 安彦, 武田) | ✅ | Text (100) | ❌ |
| phone | SĐT | ❌ | Text (20) | ✅ |
| email | Email | ❌ | Text (100) | ✅ |
| birth_date | Ngày sinh | ❌ | Date | ✅ |
| notes | Ghi chú | ❌ | Text (1000) | ❌ |
| genba_id | FK → Genba | ✅ | FK | ❌ |

---

### 14.7. Contract (契約)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| contract_id | Mã định danh | ✅ | Auto-generated | ❌ |
| contract_code | Mã hợp đồng (nghiệp vụ) | ❌ | Text (50) | ❌ |
| contract_type | Loại: Receiving (受注) / Ordering (発注) | ✅ | Enum | ❌ |
| service_type | Loại dịch vụ (日常清掃, 定期清掃, 管理員...) | ✅ | Enum/Text | ❌ |
| amount | Số tiền (御請求額) | ✅ | Decimal | ✅ |
| hourly_rate | Đơn giá giờ (時間単価) | ❌ | Decimal | ✅ |
| start_date | Ngày bắt đầu (契約開始) | ✅ | Date | ❌ |
| end_date | Ngày kết thúc / Thời hạn | ❌ | Date | ❌ |
| invoice_required | Có phát hành HĐ (請求書発行有無) | ❌ | Boolean | ❌ |
| mcd_code | Mã MCD | ❌ | Text (20) | ❌ |
| status | Trạng thái (Active / Expired / Cancelled) | ✅ | Enum | ❌ |
| genba_id | FK → Genba | ✅ | FK | ❌ |
| customer_id | FK → Customer (nếu 受注) | Conditional | FK | ❌ |
| partner_id | FK → Partner (nếu 発注) | Conditional | FK | ❌ |

---

### 14.8. Quotation (見積書)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| quotation_id | Mã định danh | ✅ | Auto-generated | ❌ |
| title | Tên công việc | ✅ | Text (200) | ❌ |
| issue_date | Ngày lập báo giá | ✅ | Date | ❌ |
| total_amount | Tổng tiền | ✅ | Decimal | ✅ |
| work_cycle | Chu kỳ công việc (VD: "月～金、祝日は休み") | ❌ | Text (500) | ❌ |
| work_hours | Thời gian (VD: "16:00～18:00, 2.0h × 1名") | ❌ | Text (200) | ❌ |
| description | Nội dung chi tiết / Điều kiện | ❌ | Text (2000) | ❌ |
| special_conditions | Điều kiện đặc biệt | ❌ | Text (1000) | ❌ |
| status | Trạng thái (Draft / Sent / Accepted / Rejected) | ✅ | Enum | ❌ |
| genba_id | FK → Genba | ✅ | FK | ❌ |
| customer_id | FK → Customer | ✅ | FK | ❌ |

---

### 14.9. Quotation Item (見積明細)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| item_id | Mã định danh | ✅ | Auto-generated | ❌ |
| quotation_id | FK → Quotation | ✅ | FK | ❌ |
| item_name | Tên hạng mục (VD: "日常清掃作業費") | ✅ | Text (200) | ❌ |
| quantity | Số lượng | ✅ | Decimal | ❌ |
| unit | Đơn vị (日, 月, 回...) | ✅ | Text (20) | ❌ |
| unit_price | Đơn giá | ✅ | Decimal | ✅ |
| subtotal | Thành tiền | ✅ | Decimal | ✅ |
| remarks | Ghi chú | ❌ | Text (500) | ❌ |

---

### 14.10. Invoice (請求書)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| invoice_id | Mã định danh | ✅ | Auto-generated | ❌ |
| invoice_type | Loại: Outgoing (gửi KH) / Incoming (nhận từ ĐT) | ✅ | Enum | ❌ |
| issue_date | Ngày lập / Ngày nhận | ✅ | Date | ❌ |
| amount | Số tiền | ✅ | Decimal | ✅ |
| billing_period | Kỳ thanh toán (tháng/năm) | ❌ | Text (20) | ❌ |
| status | Trạng thái (Draft / Issued / Paid) | ✅ | Enum | ❌ |
| notes | Ghi chú | ❌ | Text (1000) | ❌ |
| attachment_url | File hóa đơn gốc (cho HĐ nhận) | ❌ | URL/Path | ❌ |
| contract_id | FK → Contract | ✅ | FK | ❌ |

---

### 14.11. Work Schedule (勤務スケジュール)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| schedule_id | Mã định danh | ✅ | Auto-generated | ❌ |
| genba_id | FK → Genba | ✅ | FK | ❌ |
| shift_label | Nhãn ca (基本, ca 2, ca 3) | ❌ | Text (50) | ❌ |
| work_days | Ngày làm việc (VD: "月火水木金") | ✅ | Text (50) | ❌ |
| start_time | Giờ bắt đầu | ✅ | Time | ❌ |
| end_time | Giờ kết thúc | ✅ | Time | ❌ |
| break_minutes | Thời gian nghỉ (phút) | ❌ | Integer | ❌ |
| times_per_week | Số lần/tuần (〇回/週) | ❌ | Integer | ❌ |
| hours_per_day | Số giờ/ngày (〇時間/日) | ❌ | Decimal | ❌ |
| holiday_rule | Quy định ngày lễ (休み/前移動/後移動) | ❌ | Enum | ❌ |
| obon_work | Làm Obon (有/無) | ❌ | Boolean | ❌ |
| new_year_work | Làm Tết (有/無) | ❌ | Boolean | ❌ |

---

### 14.12. Key Info (鍵情報)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| key_id | Mã định danh | ✅ | Auto-generated | ❌ |
| genba_id | FK → Genba | ✅ | FK | ❌ |
| key_number | Số thứ tự (NO.) | ✅ | Integer | ❌ |
| key_type | Hình dạng (シリンダー / カード) | ✅ | Enum | ❌ |
| key_code | Mã số chìa khóa (VD: "WEST") | ❌ | Text (100) | ✅ **Mã hóa** |
| usage_location | Nơi sử dụng | ❌ | Text (500) | ❌ |
| storage_location | Nơi bảo quản (清掃員/会社/現場) | ✅ | Enum | ❌ |
| keybanker_code | Mã keybanker (VD: "3911") | ❌ | Text (50) | ✅ **Mã hóa** |
| keybanker_location | Vị trí keybanker | ❌ | Text (500) | ❌ |
| keybanker_instructions | Hướng dẫn sử dụng keybanker | ❌ | Text (1000) | ❌ |
| status | Trạng thái (Active / Returned) | ✅ | Enum | ❌ |

---

### 14.13. Entry Exit Instruction (入退館手順)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| instruction_id | Mã định danh | ✅ | Auto-generated | ❌ |
| genba_id | FK → Genba | ✅ | FK | ❌ |
| entry_method | Hướng dẫn vào (入館方法) — rich text | ❌ | Text (5000) | ❌ |
| exit_method | Hướng dẫn ra (退館方法) — rich text | ❌ | Text (5000) | ❌ |
| safety_notes | Lưu ý an toàn | ❌ | Text (2000) | ❌ |
| updated_at | Ngày cập nhật (作成更新日) | ✅ | Datetime | ❌ |

---

### 14.14. Daily Cleaning Task (日常清掃タスク)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| task_id | Mã định danh | ✅ | Auto-generated | ❌ |
| genba_id | FK → Genba | ✅ | FK | ❌ |
| start_time | Thời gian bắt đầu (VD: 10:00) | ✅ | Time | ❌ |
| floor | Tầng/Vị trí (VD: "1階", "10階～2階") | ❌ | Text (50) | ❌ |
| area_name | Khu vực (VD: "ごみ庫", "エントランス") | ✅ | Text (200) | ❌ |
| work_content | Nội dung công việc (VD: "掃き拭き") | ✅ | Text (2000) | ❌ |
| special_notes | Ghi chú đặc biệt | ❌ | Text (1000) | ❌ |
| sort_order | Thứ tự sắp xếp | ❌ | Integer | ❌ |

---

### 14.15. Periodic Cleaning Plan (定期清掃計画)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| plan_id | Mã định danh | ✅ | Auto-generated | ❌ |
| genba_id | FK → Genba | ✅ | FK | ❌ |
| work_team | Nhóm tác nghiệp (VD: "自社") | ❌ | Text (100) | ❌ |
| work_content | Nội dung (VD: "床面洗浄") | ✅ | Text (200) | ❌ |
| month_apr ~ month_mar | Đánh dấu tháng thực hiện (12 trường boolean) | ❌ | Boolean × 12 | ❌ |
| special_notes | Ghi chú đặc biệt | ❌ | Text (1000) | ❌ |

---

### 14.16. Periodic Cleaning Detail (定期清掃詳細)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| detail_id | Mã định danh | ✅ | Auto-generated | ❌ |
| plan_id | FK → Periodic Cleaning Plan | ✅ | FK | ❌ |
| location | Vị trí (VD: "1階") | ✅ | Text (100) | ❌ |
| floor_material | Chất liệu sàn (VD: "Pタイル", "長尺シート") | ❌ | Text (100) | ❌ |
| area_name | Khu vực (VD: "エントランス", "廊下") | ✅ | Text (200) | ❌ |
| work_content | Nội dung (VD: "床面洗浄作業") | ✅ | Text (1000) | ❌ |
| special_notes | Ghi chú | ❌ | Text (1000) | ❌ |

---

### 14.17. Memo (その他メモ)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| memo_id | Mã định danh | ✅ | Auto-generated | ❌ |
| genba_id | FK → Genba | ✅ | FK | ❌ |
| memo_date | Ngày giờ | ✅ | Datetime | ❌ |
| content | Nội dung | ✅ | Text (5000) | ❌ |

---

### 14.18. Photo (現場写真)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| photo_id | Mã định danh | ✅ | Auto-generated | ❌ |
| genba_id | FK → Genba | ✅ | FK | ❌ |
| category | Phân loại (外観, 玄関, エントランス, 廊下...) | ❌ | Text (100) | ❌ |
| caption | Mô tả/caption | ❌ | Text (500) | ❌ |
| file_url | Đường dẫn file | ✅ | URL/Path | ❌ |
| file_size | Dung lượng (bytes) | ✅ | Integer | ❌ |
| uploaded_at | Ngày upload | ✅ | Datetime | ❌ |

---

### 14.19. User (ユーザー)

| Field | Description | Required | Type | Sensitive |
|-------|-------------|----------|------|-----------|
| user_id | Mã định danh | ✅ | Auto-generated | ❌ |
| username | Tên đăng nhập | ✅ | Text (50) | ❌ |
| password_hash | Hash mật khẩu | ✅ | Text (256) | ✅ **Không bao giờ hiển thị** |
| role | Vai trò (Admin/InternalStaff/Worker/Customer/Partner) | ✅ | Enum | ❌ |
| display_name | Tên hiển thị | ✅ | Text (100) | ❌ |
| is_active | Trạng thái tài khoản | ✅ | Boolean | ❌ |
| locked_until | Thời gian khóa tạm | ❌ | Datetime | ❌ |
| failed_login_count | Số lần đăng nhập thất bại | ❌ | Integer | ❌ |
| last_login | Lần đăng nhập cuối | ❌ | Datetime | ❌ |
| related_entity_id | FK → Staff/Worker/Customer/Partner tùy role | ❌ | FK | ❌ |

---

## 15. Business Rules

### 15.1. Genba Rules

| Rule ID | Quy tắc |
|---------|---------|
| BR-001 | Một Genba phải thuộc chính xác một Customer (取引先) |
| BR-002 | Một Genba phải được phân công cho chính xác một Internal Staff (担当) |
| BR-003 | Một Genba có thể có nhiều Hợp đồng (nhiều loại dịch vụ hoặc nhiều kỳ) |
| BR-004 | Một Genba có thể có nhiều Genba Worker |
| BR-005 | Một Genba có thể có nhiều Partner Company (thông qua Hợp đồng giao) |
| BR-006 | Genba khi chuyển sang trạng thái "Kết thúc" (終了) phải giữ nguyên dữ liệu lịch sử, không được xóa |
| BR-007 | Genba đã kết thúc không hiển thị trên danh sách chính, chỉ hiển thị trong phần "終了現場" |

### 15.2. Customer Rules

| Rule ID | Quy tắc |
|---------|---------|
| BR-008 | Một Customer có thể có nhiều Customer Contact |
| BR-009 | Một Customer có thể giao nhiều Genba cho Shinsei |
| BR-010 | Customer không thể bị xóa nếu còn Genba đang hoạt động liên kết |

### 15.3. Contract Rules

| Rule ID | Quy tắc |
|---------|---------|
| BR-011 | Hợp đồng nhận (受注) phải liên kết với đúng 1 Genba và đúng 1 Customer |
| BR-012 | Hợp đồng giao (発注) phải liên kết với đúng 1 Genba và đúng 1 Partner Company |
| BR-013 | Ngày kết thúc hợp đồng phải ≥ ngày bắt đầu |
| BR-014 | Hợp đồng hết hạn tự động chuyển trạng thái "Expired" khi qua ngày kết thúc (Assumption) |
| BR-015 | Mã hợp đồng (nếu nhập) phải duy nhất trong toàn hệ thống |

### 15.4. Invoice Rules

| Rule ID | Quy tắc |
|---------|---------|
| BR-016 | Hóa đơn gửi (Outgoing) phải tham chiếu tới một Hợp đồng nhận (受注) |
| BR-017 | Hóa đơn nhận (Incoming) phải tham chiếu tới một Hợp đồng giao (発注) |
| BR-018 | Chỉ được tạo hóa đơn gửi khi hợp đồng có cờ "請求書発行有無" = 有 (hoặc có xác nhận ngoại lệ) |
| BR-019 | Số tiền hóa đơn mặc định lấy từ hợp đồng, nhưng có thể điều chỉnh |

### 15.5. Quotation Rules

| Rule ID | Quy tắc |
|---------|---------|
| BR-020 | Báo giá phải liên kết với đúng 1 Genba và đúng 1 Customer |
| BR-021 | Báo giá đã "Chấp nhận" có thể được dùng để tạo Hợp đồng |
| BR-022 | Báo giá đã "Từ chối" không thể chuyển ngược lại thành "Chấp nhận" (phải tạo báo giá mới) |

### 15.6. Permission Rules

| Rule ID | Quy tắc |
|---------|---------|
| BR-023 | Partner Company chỉ được xem Genba mà có Hợp đồng giao (発注) đang hiệu lực với mình |
| BR-024 | Genba Worker chỉ được xem Genba mà mình được phân công |
| BR-025 | Customer chỉ được xem Genba mà mình là chủ sở hữu (thông qua liên kết Customer ↔ Genba) |

### 15.7. Key Management Rules

| Rule ID | Quy tắc |
|---------|---------|
| BR-026 | Thông tin mã chìa khóa (key_code) và mã keybanker (keybanker_code) phải được mã hóa khi lưu trữ |
| BR-027 | Mọi truy cập xem thông tin chìa khóa phải được ghi audit log |
| BR-028 | Customer và Partner KHÔNG được xem thông tin chìa khóa |

---

## 16. Risks & Assumptions

### 16.1. Assumptions

| ID | Assumption | Impact nếu sai |
|----|-----------|-----------------|
| A-01 | Công ty Shinsei chỉ hoạt động tại khu vực Kansai (Nhật Bản), không có chi nhánh quốc tế | Cần hỗ trợ đa ngôn ngữ, đa timezone |
| A-02 | Ngôn ngữ giao diện chính là tiếng Nhật; không cần đa ngôn ngữ trong MVP | Cần i18n framework từ đầu |
| A-03 | Số lượng người dùng đồng thời thực tế trong năm đầu: 50–100 (không phải 10,000 MAU như SRS ghi) | Cần hạ tầng lớn hơn ngay từ đầu |
| A-04 | Tài khoản người dùng được Admin tạo sẵn; không có self-registration | Cần thêm flow đăng ký |
| A-05 | Một genba chỉ thuộc 1 Customer tại một thời điểm | Cần hỗ trợ chuyển đổi Customer cho genba |
| A-06 | Hệ thống không tích hợp thanh toán; chỉ ghi nhận thông tin hóa đơn | Cần tích hợp payment gateway |
| A-07 | Genba Worker có thể làm việc tại nhiều genba (VD: nhân viên đi nhiều genba/ngày) | Thay đổi data model Worker ↔ Genba |
| A-08 | File Excel hiện tại sẽ được import thủ công vào hệ thống (không cần auto migration) | Cần tool import tự động |
| A-09 | Hợp đồng tự động chuyển "Expired" khi qua ngày kết thúc | Cần logic gia hạn tự động |
| A-10 | Giới hạn upload ảnh: tối đa 10MB/file, 50MB/genba | Cần điều chỉnh nếu ảnh chất lượng cao |

---

### 16.2. Business Risks

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| BR-R01 | **Kháng cự thay đổi**: Nhân viên quen Excel, không muốn chuyển sang hệ thống mới | Cao | Cao | Training kỹ; song hành 2 hệ thống trong giai đoạn chuyển tiếp; UX tốt |
| BR-R02 | **Dữ liệu migration**: 359 genba + manual cần import vào hệ thống mới — dễ sai sót | Cao | Trung bình | Viết script import từ Excel; verify bằng sample trước khi import toàn bộ |
| BR-R03 | **Thiếu dữ liệu**: Nhiều genba trên master data không có manual (thư mục trống) | Trung bình | Thấp | Cho phép genba tồn tại mà không cần đầy đủ manual; cờ "マニュアル作成" |
| BR-R04 | **Phụ thuộc nhân sự chính**: 6 Internal Staff quản lý toàn bộ — 1 người nghỉ ảnh hưởng lớn | Trung bình | Trung bình | Hệ thống cho phép reassign genba dễ dàng |
| BR-R05 | **Thay đổi yêu cầu liên tục**: Nghiệp vụ phức tạp, có thể phát sinh yêu cầu mới trong quá trình phát triển | Cao | Trung bình | Agile development; MVP → iterate; feedback sớm |

### 16.3. Technical Risks

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| TR-01 | **Bảo mật chìa khóa**: Mã cửa, mã keybanker bị rò rỉ → nguy hiểm vật lý cho tòa nhà | Thấp | **Rất cao** | Mã hóa AES-256; audit log chặt chẽ; phân quyền nghiêm ngặt |
| TR-02 | **File upload lớn**: Ảnh hiện trường có thể nặng, ảnh hưởng performance | Trung bình | Thấp | Resize ảnh khi upload; CDN cho static files; lazy loading |
| TR-03 | **Rich text editor**: Manual có nội dung phức tạp (bảng, bullet, emoji) — cần editor mạnh | Trung bình | Trung bình | Chọn rich text editor phù hợp; hỗ trợ markdown hoặc WYSIWYG |
| TR-04 | **Mất dữ liệu khi migration**: Import sai từ Excel do format không chuẩn | Trung bình | Cao | Viết unit test cho script import; validate output trước khi deploy |
| TR-05 | **Concurrent editing**: 2 Staff sửa cùng 1 genba → conflict | Thấp | Trung bình | Optimistic locking; hiển thị cảnh báo khi 2 người mở cùng 1 bản ghi |
| TR-06 | **Responsive mobile**: Manual vệ sinh có bảng phức tạp — khó hiển thị trên mobile | Trung bình | Trung bình | Thiết kế mobile-first cho các trang Worker thường xem; scroll ngang cho bảng |
| TR-07 | **Quản lý nhiều đối tác cho 1 genba**: Data model cần many-to-many qua bảng trung gian | Thấp | Thấp | Thiết kế quan hệ N-N từ đầu thông qua Contract |

---

## 17. Open Questions

### 🔴 Critical (Cần trả lời trước khi bắt đầu thiết kế)

| # | Câu hỏi | Ảnh hưởng |
|---|---------|-----------|
| OQ-01 | **Con số 10,000 MAU trong SRS có chính xác không?** Dữ liệu thực tế cho thấy chỉ ~100–500 user. Con số này ảnh hưởng lớn đến kiến trúc và chi phí hạ tầng. | Architecture, Infrastructure cost |
| OQ-02 | **Khách hàng (Customer) có thực sự cần truy cập hệ thống không?** Hay chỉ cần Internal Staff + Worker + Partner? Nếu Customer không cần truy cập → đơn giản hóa phân quyền đáng kể. | Auth module, Scope |
| OQ-03 | **"Vệ sinh định kỳ" và "Vệ sinh hàng ngày" có nằm dưới cùng 1 genba hay là 2 genba riêng?** Trên master data, có trường hợp 1 tòa nhà có nhiều dòng cho nhiều loại dịch vụ — mỗi dòng là 1 genba riêng hay cùng 1 genba? | Data model Genba, Contract |
| OQ-04 | **Mã MCD là gì? Nghiệp vụ nào sử dụng?** Xuất hiện trên master data nhưng không rõ ý nghĩa. | Data Dictionary |

### 🟠 High (Cần trả lời trước khi kết thúc thiết kế)

| # | Câu hỏi | Ảnh hưởng |
|---|---------|-----------|
| OQ-05 | **"実習生" (thực tập sinh) trên master data có phải là loại Worker đặc biệt không?** Có cần phân loại Worker (chính thức/thực tập) trong hệ thống? | Worker entity |
| OQ-06 | **Partner có phạm vi xem manual cụ thể nào?** VD: Nếu HĐ giao là "定期清掃", Partner chỉ xem 定期マニュアル hay xem cả 入退館 và 現場写真? | Permission matrix |
| OQ-07 | **Có cần workflow duyệt (approval) cho báo giá, hợp đồng, hóa đơn không?** VD: Staff tạo → Manager duyệt → Gửi. | Business process, Module complexity |
| OQ-08 | **Cột "優先順位" (Priority) trên master data có giá trị "A" và "代行無" — ý nghĩa cụ thể?** | Enum values, Business logic |
| OQ-09 | **Có cần chức năng export dữ liệu ra Excel/PDF trong MVP không?** Để nhân viên quen với Excel có thể in/export khi cần. | Feature scope |
| OQ-10 | **Hóa đơn có cần tạo từ template PDF/print-ready không?** Hay chỉ cần ghi nhận thông tin? Hiện tại invoice được tạo riêng ngoài hệ thống. | Invoice module complexity |

### 🟡 Medium (Nên trả lời trước khi phát triển)

| # | Câu hỏi | Ảnh hưởng |
|---|---------|-----------|
| OQ-11 | **Worker có thể làm việc tại nhiều genba không?** Hay 1 Worker chỉ thuộc 1 genba? Master data cho thấy cùng tên Worker xuất hiện ở nhiều genba. | Data model Worker ↔ Genba (1-N vs N-N) |
| OQ-12 | **Lịch trình vệ sinh hàng ngày có thay đổi theo ngày trong tuần không?** VD: Thứ 2 làm khác Thứ 5? Hay lịch cố định mọi ngày? | Daily Cleaning Task model |
| OQ-13 | **Có cần quản lý danh sách dụng cụ vệ sinh cho mỗi genba không?** Manual 岡三証券 có liệt kê chi tiết dụng cụ cần chuẩn bị. | Feature scope, Data model |
| OQ-14 | **Memo/Ghi chú (その他メモ) có cần hỗ trợ đính kèm ảnh không?** Hay chỉ text thuần? | Document model |
| OQ-15 | **Có cần lịch sử giá (price history) cho hợp đồng không?** Khi gia hạn với giá mới, có cần giữ lịch sử giá cũ? | Contract model |
| OQ-16 | **Bảng tiêu chuẩn công việc (清掃作業基準表) có cần số hóa không?** Hiện là file Excel riêng, nội dung phức tạp (ma trận tần suất × vị trí × loại công việc). Hay chỉ attach file? | Feature scope |

### 🟢 Low (Có thể quyết định trong quá trình phát triển)

| # | Câu hỏi | Ảnh hưởng |
|---|---------|-----------|
| OQ-17 | **Timezone**: Hệ thống chỉ cần hỗ trợ JST hay cần đa timezone? | Date/time handling |
| OQ-18 | **Giao diện có cần dark mode không?** | UI design |
| OQ-19 | **Ngôn ngữ giao diện có cần hỗ trợ tiếng Việt (cho quản lý/dev) bên cạnh tiếng Nhật?** | i18n framework |
| OQ-20 | **Notification**: Khi có genba mới hoặc manual cập nhật, có cần gửi email/push notification cho Worker? | Future feature scope |

---

## 18. MVP Recommendation

### 18.1. Nên làm ngay (MVP — Version 1)

| Priority | Tính năng | Lý do |
|----------|-----------|-------|
| ⭐⭐⭐ | **Quản lý Genba** (CRUD + chi tiết + trạng thái) | Entity trung tâm; thay thế trực tiếp cho master data Excel |
| ⭐⭐⭐ | **Manual vận hành** (入退館 + 日常 + 定期 + memo) | Giá trị cốt lõi — thay thế 359 file Excel manual |
| ⭐⭐⭐ | **Quản lý Chìa khóa** (với mã hóa) | Bảo mật — rủi ro lớn nhất hiện tại là chìa khóa nằm trong Excel không mã hóa |
| ⭐⭐⭐ | **Authentication + Phân quyền cơ bản** | Nền tảng bắt buộc |
| ⭐⭐⭐ | **Quản lý Khách hàng + Contact** | Liên kết trực tiếp với Genba |
| ⭐⭐ | **Quản lý Hợp đồng** (2 chiều) | Quản lý tài chính — thay thế các cột trên master data |
| ⭐⭐ | **Quản lý Đối tác** | Cần cho hợp đồng giao & phân quyền |
| ⭐⭐ | **Quản lý Nhân viên** (Staff + Worker) | Cần cho phân công genba |
| ⭐⭐ | **Upload ảnh hiện trường** | Thay thế sheet 現場写真 |
| ⭐⭐ | **Tìm kiếm/Lọc** | Giá trị rõ rệt so với tìm kiếm trong Excel |
| ⭐ | **Quản lý Báo giá** | Nghiệp vụ hỗ trợ — CRUD cơ bản |
| ⭐ | **Quản lý Hóa đơn** | Nghiệp vụ hỗ trợ — ghi nhận cơ bản |

### 18.2. Nên hoãn (Version 2)

| Tính năng | Lý do hoãn |
|-----------|------------|
| **Dashboard & Báo cáo** | Cần dữ liệu tích lũy từ MVP; không blocking cho vận hành |
| **Quản lý công việc định kỳ (定期作業一覧表)** | Nghiệp vụ phức tạp, cần lịch trình & phối hợp đối tác — tách thành module riêng |
| **Export Excel/PDF** | Tiện ích; nhưng MVP có thể dùng browser print/screenshot |
| **Notification & Email** | Giá trị gia tăng; không bắt buộc cho MVP |
| **P&L per genba** | Cần tích hợp dữ liệu lương, giao thông — phức tạp |
| **Auto migration từ Excel** | Nên import thủ công (có kiểm tra) cho ~359 genba; không cần tool riêng |
| **Bảng tiêu chuẩn công việc (基準表)** | Attach file PDF/Excel là đủ cho MVP |

### 18.3. Không nên làm ở Version 1

| Tính năng | Lý do |
|-----------|-------|
| **Mobile native app** | Web responsive đủ cho nhân viên hiện trường tra cứu; native app tốn kém, không cần thiết ngay |
| **Tích hợp hệ thống chấm công** | Phụ thuộc hệ thống bên ngoài (LINE, 勤怠アプリ); cần API documentation từ bên kia |
| **Quản lý Inspection (インスペクション)** | Template phức tạp (4.5MB Excel); cần phân tích sâu hơn |
| **Quản lý nhân sự / Hợp đồng lao động** | Out of scope — thuộc hệ thống HR |
| **Tính lương / Bảng lương** | Out of scope — thuộc hệ thống kế toán |
| **Workflow duyệt (approval)** | Thêm complexity; với 6 Internal Staff, quy trình duyệt có thể thực hiện ngoài hệ thống |
| **AI/OCR tự động đọc manual Excel** | Nice-to-have nhưng phức tạp; import thủ công hiệu quả hơn ở quy mô 359 genba |

---

## 19. Đánh giá độ đầy đủ

### Điểm đánh giá: **68 / 100**

| Hạng mục | Điểm | Điểm tối đa | Ghi chú |
|----------|------|-------------|---------|
| Executive Summary | 9 | 10 | Đầy đủ, dựa trên dữ liệu thực |
| Business Problem | 9 | 10 | Phân tích sâu từ dữ liệu Excel thực tế |
| Scope Definition | 8 | 10 | Rõ ràng; một số feature boundary cần xác nhận |
| Stakeholder Analysis | 7 | 10 | Thiếu xác nhận từ stakeholder thực tế |
| Actor List | 8 | 10 | Đầy đủ, phân biệt rõ |
| Domain Model | 8 | 10 | 16 domain đã xác định; quan hệ cần xác nhận |
| Module Breakdown | 8 | 10 | 19 module, có dependency map |
| Business Process | 7 | 10 | 12 quy trình chính; thiếu quy trình edge case |
| Use Case List | 7 | 10 | 47 UCs; có thể thiếu một số UC phụ |
| Detailed Use Cases | 7 | 10 | 8 UC chi tiết; cần thêm cho UC quan trọng khác |
| Functional Requirements | 7 | 10 | 62 FRs; cần bổ sung khi có câu trả lời OQs |
| Non-Functional Requirements | 8 | 10 | 10 hạng mục đầy đủ |
| Permission Matrix | 8 | 10 | Chi tiết 9 module × 5 role |
| Data Dictionary | 7 | 10 | 19 entity; field detail cần xác nhận |
| Business Rules | 7 | 10 | 28 rules; có thể thiếu rules nghiệp vụ ẩn |
| Risks & Assumptions | 7 | 10 | 10 assumptions + 12 risks |
| Open Questions | 8 | 10 | 20 câu hỏi phân theo priority |
| MVP Recommendation | 8 | 10 | Rõ ràng, có lý do |

### Thông tin còn thiếu cần làm rõ TRƯỚC KHI chuyển sang Architecture Design

> [!CAUTION]
> **Các mục dưới đây PHẢI được xác nhận trước khi bắt đầu thiết kế kiến trúc:**

#### 🔴 Phải có

1. **Xác nhận quy mô user thực tế** (OQ-01) — ảnh hưởng đến sizing hạ tầng
2. **Xác nhận Customer có cần truy cập hệ thống không** (OQ-02) — ảnh hưởng đến số role và phân quyền
3. **Xác nhận định nghĩa Genba** (OQ-03) — 1 tòa nhà = 1 genba hay 1 dịch vụ = 1 genba?
4. **Giải thích mã MCD** (OQ-04) — field trên master data chưa rõ
5. **Interview trực tiếp với 1–2 Internal Staff** — xác nhận workflow thực tế, edge case

#### 🟠 Nên có

6. **Phạm vi xem của Partner** (OQ-06) — thiết kế permission chi tiết
7. **Có cần approval workflow không** (OQ-07) — complexity của module
8. **Export Excel/PDF có trong MVP không** (OQ-09) — ảnh hưởng đến kỳ vọng user
9. **Worker ↔ Genba là 1-N hay N-N** (OQ-11) — data model
10. **Xác nhận danh sách enum values** — 優先順位, service_type, v.v.

---

> [!IMPORTANT]
> **Kết luận:** Tài liệu phân tích nghiệp vụ này đã bao phủ 18 mục theo yêu cầu, dựa trên phân tích thực tế từ:
> - File SRS gốc ([srs.md](file:///Users/shinseintt/data/projects/kaisha/genba_kanri/srs.md))
> - Master data Excel (359 genba, 21 KH, 32 ĐT)
> - Template manual (6 sheets)
> - 2 manual thực tế (BRAVI新大阪, 岡三証券)
> - File báo giá và bảng tiêu chuẩn công việc
> - Sơ đồ nghiệp vụ hiện tại (hình ảnh)
>
> **20 Open Questions** cần được trả lời — đặc biệt 4 câu Critical — trước khi chuyển sang giai đoạn Architecture Design.
