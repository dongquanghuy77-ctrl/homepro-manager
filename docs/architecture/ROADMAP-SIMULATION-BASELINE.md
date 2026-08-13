# PHASE 0 — ROADMAP SIMULATION BASELINE

## 1. MỤC TIÊU
Xác định chính xác trạng thái hiện tại (Baseline) của hệ thống HomePro Manager tại thời điểm kết thúc P15 trước khi tiến hành chuỗi Simulation. Đánh giá dựa trên mã nguồn thực tế, schema DB, cấu trúc API và UI.

## 2. HIỆN TRẠNG KIẾN TRÚC TỔNG THỂ
Hệ thống đang hoạt động dưới dạng một ứng dụng Next.js full-stack (Next.js 14 App Router) kết hợp với Drizzle ORM và PostgreSQL.

### 2.1 Các Module Đã Có
- HR (Nhân sự, Chấm công, Nghỉ phép, Tăng ca)
- Payroll (Bảng lương, Phụ cấp, Khấu trừ, Thuế/BHXH, Khiếu nại)
- Project & Task (Dự án, Nhiệm vụ)
- BOQ & Procurement (Dự toán, Mua sắm)
- Inventory (Kho vật tư)
- Production (BOM, Quét mã QR tracking, Lệnh cắt/dán cạnh)
- QC (Quản lý lỗi, Xử lý)
- Costing & Accounting (Chi phí, Giá thành)
- Logistics
- Dashboard (Executive Control)
- Document Center (Hệ thống lưu trữ tập trung)

### 2.2 Cấu Trúc Database (Single Source of Truth)
Qua file `src/db/schema.ts`:
- **Master Data**: `users` (Employee), `departments`, `materials`, `projects`, `customers`. 
- **Ownership**: 
  - `users` là SSOT cho nhân sự.
  - `materials` là SSOT cho danh mục hàng hóa vật tư.
  - Các bảng nghiệp vụ (`attendance`, `boq_items`, `production_bom_lines`, v.v.) kết nối qua FK (Foreign Key).

### 2.3 Cấu Trúc API & Dịch Vụ (Service/Repository)
- API triển khai qua Route Handlers của Next.js App Router (`/api/*`).
- Kiến trúc Server-side: Các logic phức tạp được đưa vào Server Actions hoặc Service layer (`src/lib/.../services.ts`), tiêu biểu như `DashboardService` tổng hợp KPI.
- Hầu hết logic nghiệp vụ được kết nối trực tiếp với DB qua `drizzle-orm` trong các API hoặc Server Component.

### 2.4 Cấu Trúc RBAC (Phân Quyền)
- Quản lý qua `role_permissions` và bảng `manager_departments`.
- **Role levels**: ADMIN, HR, MANAGER, SUPERVISOR, WORKER, VIEWER.
- Hỗ trợ uỷ quyền (Delegation) qua bảng `delegations`.
- Phân quyền áp dụng cả ở API (Middlewares) và Database queries (`userConds` filter).

### 2.5 Workflow & State Machine
- Áp dụng các trạng thái rõ ràng. 
  - Ví dụ Payroll: `DRAFT` -> `PUBLISHED`
  - Leave Request: `PENDING` -> `PENDING_HR` -> `APPROVED`
  - BOQ/PO: `PENDING` -> `APPROVED` -> `RECEIVED`
- Chuyển đổi trạng thái hiện được hard-code trực tiếp trong các API endpoint.

### 2.6 Điểm Yếu Tiềm Ẩn (Sơ bộ)
- **Tightly Coupled**: Rất nhiều logic đang nằm trực tiếp trong Route Handlers, chưa có một lớp Service layer/Event bus thực sự tách biệt rõ ràng toàn hệ thống.
- **Synchronous Actions**: Hầu hết các luồng chạy đồng bộ (ví dụ: tạo PO -> trừ quỹ/thêm cảnh báo), có rủi ro timeout nếu data lớn.

## 3. KẾT LUẬN BASELINE
Hệ thống hiện tại có nền tảng CSDL khá vững chắc với SSOT rõ ràng, mô hình RBAC mạnh mẽ. Tuy nhiên, kiến trúc xử lý đang theo hướng monolithic-tightly-coupled trong Next.js, điều này sẽ tạo ra thách thức lớn khi Scale hoặc nâng cấp thành SaaS.
