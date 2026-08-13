# UI MIGRATION PLAN

Tài liệu này trình bày kế hoạch di chuyển (Migration) từ UI hiện tại sang kiến trúc Workspace-based ERP mới.

## 1. MỤC TIÊU MIGRATION
- Chuyển Navigation tĩnh từ `Sidebar.tsx` sang mô hình cấu hình (Config-driven).
- Không phá vỡ bất kỳ route nào đang hoạt động.
- Áp dụng TopNavbar để chứa bộ chuyển đổi Workspace (Workspace Switcher).

## 2. CÁC BƯỚC THỰC HIỆN

### Bước 1: Tạo cấu hình Navigation (`src/config/navigation.ts`)
- Định nghĩa mảng JSON chứa các Workspaces (ví dụ: `hr`, `production`, `inventory`...).
- Mỗi Workspace chứa các Modules (ví dụ: Workspace `hr` có module `employees`, `attendance`, `leave`...).
- Mỗi Module có thuộc tính: `id`, `label`, `href`, `icon`, `roles`, `permissions`.

### Bước 2: Tái cấu trúc Layout (`src/components/layout/AppLayout.tsx` hoặc tương tự)
- Tạo `TopNavbar` chứa Logo, Workspace Switcher, và User Menu.
- Chỉnh sửa `Sidebar` để chỉ render menu của Workspace hiện hành đang chọn. State của Workspace hiện hành có thể được tính dựa trên đường dẫn hiện tại (URL Pathname) hoặc lưu trong Context/LocalStorage.

### Bước 3: Di chuyển Components và Files (Tái cấu trúc thư mục)
*Lưu ý: Chỉ thực hiện nếu cần thiết, ưu tiên giữ nguyên route để tránh gãy link, thay vào đó tạo các route nhóm vào thư mục.*
Ví dụ:
- Chuyển `src/app/vat-tu` sang `src/app/inventory/materials`
- Chuyển `src/app/chi-phi` sang `src/app/finance/costs`
- Chuyển `src/app/khach-hang` sang `src/app/customers` (Dự án CRM)

*(Tạm thời ở phiên bản này, nếu user yêu cầu "Không được gãy link P0.14 P0.18", ta vẫn giữ các route HR hiện tại: `/attendance`, `/leave`, `/payroll` nhưng trong kiến trúc tương lai chúng sẽ dời về `/hr/attendance`, `/hr/leave`...)*

### Bước 4: Refactor UI Các Trang Hiện Có
- Kiểm tra lại các trang `page.tsx` để đảm bảo đang sử dụng chuẩn `PageHeader` và `FilterBar`.
- Kiểm tra hiển thị RBAC (Role-based access control) tại Server thay vì ẩn/hiện element thô sơ trên client.

## 5. THỬ NGHIỆM (TESTING)
- Xác nhận các chức năng chính vẫn hoạt động bình thường (Smoke Test).
- Xác nhận Regression cho Attendance P0.14 và Leave P0.18.
- Chạy TSC `--noEmit` và `npm run build` để đảm bảo không lỗi kiểu.
