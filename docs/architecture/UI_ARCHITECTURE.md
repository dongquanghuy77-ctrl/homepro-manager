# UI ARCHITECTURE

Tài liệu này quy định cấu trúc thiết kế giao diện (UI Architecture) cho toàn bộ dự án HomePro, chuyển đổi từ kiến trúc "phẳng" (tất cả trên một Sidebar) sang kiến trúc đa tầng (Workspace-based ERP).

## 1. MÔ HÌNH WORKSPACE (Domain-Driven Navigation)
- Không hiển thị toàn bộ 20-30 modules trên một thanh công cụ (Sidebar) duy nhất.
- Ứng dụng chia thành các **Workspace** (không gian làm việc). Mỗi Workspace tương ứng với một phòng ban hoặc một domain nghiệp vụ (Nhân sự, Sản xuất, Kho, Kế toán...).
- Khi người dùng chọn Workspace, Sidebar chỉ hiển thị các tính năng thuộc Workspace đó.

## 2. PHÂN TẦNG COMPONENTS (Component Hierarchy)

### Tầng 1: Shell Layer (Giao diện vỏ)
- `AppShell`: Container bọc toàn bộ ứng dụng sau khi đăng nhập.
- `TopNavbar`: Thanh điều hướng chính (Chứa Logo, Global Search, User Menu, và Bộ chuyển đổi Workspace - Workspace Switcher).
- `Sidebar`: Thanh điều hướng phụ, hiển thị cấu trúc Module của Workspace hiện tại. Lấy dữ liệu cấu hình từ File thay vì hardcode.

### Tầng 2: Page Layout Layer (Giao diện trang)
- `PageHeader`: Chứa Tiêu đề trang, Breadcrumb, và Global Actions (Tạo mới, Export).
- `PageContent`: Phần thân nội dung, hỗ trợ cuộn (scroll) độc lập với Shell.

### Tầng 3: View Layer (Cấu trúc hiển thị dữ liệu)
Mỗi module chuẩn sẽ áp dụng một trong các View Pattern sau:
- **List View (Data Table):** Hiển thị danh sách, có FilterBar (Tìm kiếm, Lọc), Pagination.
- **Detail View (Form/Read-only):** Hiển thị chi tiết một bản ghi, có Header riêng cho các thao tác (Duyệt, Sửa, Xóa).
- **Split View:** Màn hình chia đôi, trái là danh sách (List), phải là chi tiết (Detail) - thích hợp cho thao tác duyệt nhanh (ví dụ: Duyệt nghỉ phép).
- **Board View (Kanban):** Áp dụng cho Quản lý công việc (Tasks).

## 3. NGUYÊN TẮC TÁCH BIỆT (SEPARATION OF CONCERNS)
1. **Sidebar Không Chứa Logic:** Sidebar chỉ nhận một mảng `NavItem[]` từ một Config Provider. Không check RBAC, không gọi API lấy Role bên trong Sidebar.
2. **Navigation Config:** Cấu hình menu sẽ nằm trong `src/config/navigation.ts` hoặc tương tự. Provider sẽ đọc cấu hình này, đối chiếu với quyền (Permissions) của User từ Context/Session, rồi mới render ra Sidebar.
3. **UI Phản Ánh Quyền (Role-Reflective UI):** Nếu User không có quyền xem "Bảng lương", mục đó sẽ không xuất hiện trong Sidebar. (Bảo mật vẫn nằm ở phía Server API).

## 4. QUẢN LÝ TRẠNG THÁI (STATE MANAGEMENT)
- Không dùng Redux hay Context toàn cục cho Dữ liệu nghiệp vụ.
- Dùng `SWR` hoặc `React Query` cho Server State (fetching, caching).
- Context chỉ dùng cho: Session (User Info + Roles), Theme (Dark/Light), và Layout State (Sidebar open/closed).

## 5. UI COMPONENTS (NỀN TẢNG THIẾT KẾ)
- Tuân thủ Hệ thống Design Token chung.
- Ưu tiên sử dụng Radix UI primitives hoặc Shadcn UI (nếu có) để chuẩn hóa Accessibility (a11y).
- Không tự build lại các component phức tạp (như Data Table) nếu có thể dùng thư viện (vd: Tanstack Table).
