# UI ARCHITECTURE

## 1. MỤC TIÊU
HomePro Manager UI phải là một ERP Framework linh hoạt, tách biệt hoàn toàn giữa cấu trúc điều hướng (Navigation) và nghiệp vụ (Business Logic). Không được hardcode bất kì link menu nào.

## 2. NAVIGATION CONFIG-DRIVEN
Tất cả hệ thống phân cấp Menu, Workspace được định nghĩa duy nhất tại `src/config/navigation.ts`.
- **Sidebar**: Là một "Dumb Component", nó chỉ đọc config và render UI. Không chứa logic kiểm tra quyền hạn phức tạp (Quyền hạn được filter trước khi truyền vào).
- **Workspace Switcher**: ERP có quá nhiều module, do đó UI được gom nhóm thành các Workspace: "Nhân sự", "Điều hành", "Dự án", "Tài chính", v.v. Việc chuyển Workspace thay đổi toàn bộ Sidebar.

## 3. APPSHELL VÀ LAYOUTS
Hệ thống sử dụng Next.js App Router (Layouts).
- `src/components/layout/LayoutWrapper.tsx`: Là Root Layout bọc toàn bộ app. Chịu trách nhiệm kiểm tra URL hiện tại để quyết định có render AppShell (TopBar + Sidebar) hay không.
- Những trang không có AppShell (Clean UI): `/login`, `/attendance-gate`, `/nhan-vien` (Worker Portal).

## 4. RESPONSIVE & MOBILE-FIRST CHO WORKER
Các màn hình dành cho WORKER (Công nhân/Thợ) như `/nhan-vien` phải được thiết kế Mobile-First. Giao diện chạm, nút to, không dùng Table phức tạp mà dùng Card list.

## 5. UI COMPONENT STANDARDS
- Không dùng Tailwind bừa bãi inline cho những component dùng chung. Phải tách thành class trong `index.css` (VD: `.btn-primary`, `.form-input`).
- Form phải có Validation.
- Table phải hỗ trợ Print (Media Print CSS) cho các báo cáo, tự động ẩn Sidebar/Topbar khi in.
- Không dùng Alert/Confirm mặc định của trình duyệt. Sử dụng Modal/Dialog thống nhất.
