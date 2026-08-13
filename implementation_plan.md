# MASTER DASHBOARD IMPLEMENTATION PLAN

## Goal
Tái cấu trúc và thiết kế lại Dashboard chính của HomePro Manager thành một **Operational ERP Dashboard** đáp ứng tiêu chuẩn Enterprise (shadcn/ui, Tremor), có khả năng mở rộng cho toàn bộ hệ thống ERP trong tương lai mà không phải đập đi xây lại.

## Đánh giá rủi ro & Foundation
- **Bắt buộc giữ nguyên**: Các module đã freeze ở P0.14, P0.18 và P0.UI-ARCH (Auth, RBAC, Navigation config).
- Các API hiện tại (HR Dashboard, Projects) đang truy vấn trực tiếp DB, có nguy cơ N+1 hoặc chậm khi dữ liệu lớn.
- Khắc phục bằng cách tạo Data Aggregation Layer tại `/api/dashboard/overview` để fetch data theo Role.

## Proposed Changes

### 1. Data Aggregation Layer
#### [NEW] `src/app/api/dashboard/overview/route.ts`
- Tạo API chung trả về JSON payload theo đúng Role (ADMIN, MANAGER, HR, WORKER).
- Thực hiện parallel queries (Promise.all) cho các module:
  - `projects`, `tasks`
  - `attendance`, `leave_requests`
  - `qc_issues` (QC lỗi mở)
  - `hr_audit_logs` / `material_tracking_logs` (cho Recent Activity)
- Trả về payload bao gồm: `kpis`, `activities`, `actionItems`, `charts`.

### 2. UI Components (Reusable)
Tạo thư mục `src/components/dashboard/` với các component dùng chung:
#### [NEW] `src/components/dashboard/DashboardShell.tsx`
- Bọc toàn bộ layout của Dashboard, kiểm soát grid và responsive container.
#### [NEW] `src/components/dashboard/KpiCard.tsx`
- Component chuẩn hiển thị KPI (có icon, giá trị, status, link tới module).
#### [NEW] `src/components/dashboard/ActionCenter.tsx`
- Hiển thị danh sách "Việc cần xử lý" (Action Items) theo severity.
#### [NEW] `src/components/dashboard/ActivityFeed.tsx`
- Bảng tin (Feed) hiển thị các audit logs/activities gần nhất.
#### [NEW] `src/components/dashboard/ChartCard.tsx`
- Bọc biểu đồ (Recharts) với Header, Loading, Empty State.

### 3. Trang chủ Dashboard
#### [MODIFY] `src/app/page.tsx`
- Xóa bỏ logic query DB cũ. Thay vào đó gọi `/api/dashboard/overview`.
- Tái cấu trúc UI thành 5 tầng:
  1. Header (Có sẵn từ AppShell, thêm Breadcrumbs/Workspace switcher).
  2. KPI Command Center (Render `KpiCard` dynamic).
  3. Operation / HR Overview (Render Biểu đồ).
  4. Action Center (Việc cần làm).
  5. Recent Activity.
- Tùy biến UI hiển thị khác nhau dựa vào Role (RBAC).

### 4. Styles & CSS
#### [MODIFY] `src/app/globals.css` / `index.css`
- Thêm các utility class cho Dashboard: `.grid-dashboard`, `.card-premium`, `.badge-severity`.

## Verification Plan
1. Chạy `npx tsc --noEmit` và `npm run build` để đảm bảo code compile thành công.
2. Kiểm tra Role **ADMIN**: Thấy toàn bộ KPI, Action Center.
3. Kiểm tra Role **MANAGER**: Thấy Project tiến độ, Nhân sự trong phòng, Đơn xin nghỉ cần duyệt.
4. Kiểm tra Role **HR**: Thấy KPI nhân sự (Đi trễ, Đơn xin nghỉ).
5. Kiểm tra Role **WORKER**: Thấy KPI cá nhân.
6. Chạy các tập UAT Playwright (P0.14, P0.18) để bảo đảm không Regression.

## User Review Required
> [!IMPORTANT]
> Đây là thay đổi toàn diện cả Backend Aggregation và Frontend Component Architecture. Xin phê duyệt để tôi tiến hành thực thi toàn bộ code trong một luồng (Autonomous mode) cho đến khi Production PASS.
