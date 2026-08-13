# PHASE 6 — SCALE SIMULATION

## 1. MỤC TIÊU
Đánh giá mức độ chịu tải và khả năng mở rộng kiến trúc khi quy mô công ty phát triển từ (10 users, 10 projects) lên (100 users, 100 projects, đa chi nhánh, đa kho).

## 2. ĐÁNH GIÁ KIẾN TRÚC HIỆN TẠI KHI SCALE

### 2.1 Multi-branch / Multi-department (Tổ chức / Chi nhánh)
- **Kiến trúc hiện tại**: Có bảng `departments` hỗ trợ quan hệ cha con (`parentId`), nhưng không có khái niệm `Branch` (Chi nhánh) rõ ràng hoặc `CompanyCode`. Toàn bộ dữ liệu đang nằm chung 1 rổ.
- **Rủi ro**: Khi có 2 Xưởng (Xưởng Gỗ Hà Nội, Xưởng Gỗ HCM), việc dùng chung danh mục vật tư, quỹ lương, mã nhân viên sẽ bị xung đột. Bảng `departments` hiện tại không đủ sức chứa ranh giới pháp lý hoặc vật lý độc lập (Organization Boundary). => **Cần bổ sung Entity `branches` hoặc `companies` (Nội bộ) trước khi Scale.**

### 2.2 Multi-warehouse (Nhiều kho)
- **Kiến trúc hiện tại**: Tồn kho (`stock_qty`) bị khóa cứng vào bảng danh mục `materials`.
- **Rủi ro (CRITICAL)**: Khi có 2 Xưởng, không thể biết kho nào còn bao nhiêu mét ván MDF. 
- **Bắt buộc**: Phải tách `inventory_balances (warehouse_id, material_id, qty)` trước khi công ty mở xưởng thứ 2.

### 2.3 Database Performance (Hiệu năng CSDL)
- Với 100 users và 100 dự án hoạt động liên tục:
  - Bảng `work_logs`, `material_tracking_logs`, `attendance` sẽ phình to rất nhanh (ví dụ: 100 users x 2 lượt chấm công x 30 ngày = 6.000 dòng/tháng).
  - Cấu trúc index hiện tại (chủ yếu là Primary Keys và FKs) sẽ chậm dần với các câu query như "Tính lương cả tháng" hoặc "Tổng KPI Dashboard".
- **Kiến trúc cần bổ sung**:
  - **Connection Pooling**: PgBouncer để chống tràn connection.
  - **Caching Layer**: Redis (Upstash) để lưu session, RBAC profile, và Dashboard KPIs.
  - **Database Partitioning**: Bắt buộc partition các bảng Log (`hr_audit_logs`, `material_tracking_logs`, `attendance`) theo tháng hoặc năm.

### 2.4 File Storage (Lưu trữ Document)
- Bảng `documents` đã sẵn sàng, nhưng hệ thống upload file trực tiếp thông qua Next.js server sẽ gây quá tải băng thông khi Scale.
- **Yêu cầu**: Phải chuyển sang AWS S3 hoặc MinIO thông qua cơ chế Presigned-URL (Client upload thẳng lên S3, chỉ truyền URL về Backend).

## 3. KẾT LUẬN SCALE
Hệ thống hiện tại chạy tốt dưới 30 Users. Để Scale lên 100+ Users đa chi nhánh, **KHÔNG ĐƯỢC PHÉP** chạy trên cấu trúc hiện tại mà chưa hoàn tất Phase 2 (Tách Master Data kho/nhà cung cấp) và Caching. Đánh giá: **YELLOW (Cần refactor một số cấu trúc dữ liệu trước khi scale).**
