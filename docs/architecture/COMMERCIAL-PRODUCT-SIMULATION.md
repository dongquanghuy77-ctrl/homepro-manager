# PHASE 7 — COMMERCIAL PRODUCT SIMULATION

## 1. MỤC TIÊU
Đánh giá mức độ sẵn sàng của mã nguồn khi đóng gói HomePro Manager thành một hệ thống phần mềm thương mại (SaaS hoặc On-premise đa khách hàng). 

## 2. MULTI-TENANT ARCHITECTURE (KIẾN TRÚC ĐA KHÁCH HÀNG)
Để biến HomePro thành SaaS, kiến trúc hiện tại ĐANG KHÔNG HỖ TRỢ.
Toàn bộ mã nguồn và Database được thiết kế cho mô hình Single-Tenant (Dùng cho 1 công ty duy nhất). Không có `tenant_id` trong các bảng.

### Rủi ro nếu ép chạy Multi-Tenant trên Schema hiện hành:
- Nếu chia sẻ Database: Sẽ bị Data Leak (Company A nhìn thấy Data Company B).
- Nếu triển khai mỗi Company 1 Database (Database-per-tenant): Mô hình này có thể chạy ngay với Codebase hiện tại, nhưng chi phí hạ tầng và DevOps rất cao.

### Đề xuất Multi-Tenant (Bắt buộc nếu làm SaaS thực thụ)
- Phải nhúng `tenant_id` (hoặc `company_id`) vào TẤT CẢ CÁC BẢNG (users, projects, materials, ...).
- Áp dụng Row-Level Security (RLS) trên PostgreSQL để DB tự động filter `tenant_id` theo phiên kết nối, tránh việc DEV vô tình quên gõ `where(eq(users.tenantId, currentTenant))` dẫn tới rò rỉ dữ liệu chéo.

## 3. PRODUCTIZATION (ĐÓNG GÓI SẢN PHẨM)
Khi là sản phẩm thương mại, HomePro Manager không thể có cấu trúc cứng. Phải tổ chức lại thành:

### 3.1 CORE MODULE (Bắt buộc)
Identity, RBAC (với Tenant), Tổ chức phòng ban, Document Center, Audit Logs, Settings.

### 3.2 INDUSTRY & OPTIONAL MODULES (Feature Flags)
Một khách hàng chỉ mua HR & Payroll, không mua Module Sản Xuất (Production/BOM).
- **Rủi ro hiện tại**: Cấu trúc DB đang liên kết chặt qua FK (Ví dụ: `production_bom_lines` trỏ về `projects` và `materials`). Bảng `monthly_payroll` tính tổng dữ liệu OT. Nếu tắt Module Sản xuất, các query JOIN có thể bị vỡ hoặc báo lỗi. 
- **Giải pháp**: Xây dựng **Plugin Architecture** hoặc sử dụng cấu trúc Loose-Coupling (Domain-Driven Design). Thay vì JOIN trực tiếp giữa Payroll và Production, dùng API/Service Interfaces để giao tiếp. Các Module optional chỉ được mount khi có cấu hình (Feature Flags).

## 4. OPEN-SOURCE ARCHITECTURE BENCHMARK
Tham chiếu Odoo / ERPNext:
- **Khả năng mở rộng**: Họ dùng hệ thống Module/App riêng biệt. HomePro đang dùng Monolithic App Router của Next.js.
- **Để trở thành Commercial Product**: HomePro nên chuyển sang mô hình Monorepo (Turborepo), tách Core ra một Package riêng, các Module nghiệp vụ (HR, Production) thành các Package riêng biệt. Khi deploy cho khách A, chỉ build App với các Package họ đã mua.

## 5. KẾT LUẬN
Kiến trúc hiện tại là xuất sắc cho một doanh nghiệp (In-house ERP / Single-Tenant). Nhưng hoàn toàn **CHƯA SẴN SÀNG** cho mô hình SaaS Multi-tenant chung Database. 
Để chuyển đổi, phải làm lại toàn bộ Database Migration để thêm `tenant_id` và áp dụng RLS. Đánh giá: **RED (Đòi hỏi tái cấu trúc core schema nếu muốn làm SaaS)**.
