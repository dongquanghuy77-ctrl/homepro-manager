# UI COMPONENT STANDARD

Tài liệu này quy định chuẩn (Standard) cho các component UI dùng chung (Shared Components) của hệ thống HomePro để đảm bảo tính nhất quán (Consistency). Mọi màn hình mới phải tái sử dụng các component này, không tự ý viết lại (reinvent the wheel).

## 1. CẤU TRÚC TRANG (PAGE STRUCTURE)
Mọi trang nghiệp vụ phải dùng `PageHeader` làm tiêu đề:
```tsx
<PageHeader 
  title="Quản lý nhân viên" 
  breadcrumbs={[{ label: 'Nhân sự', href: '/hr' }, { label: 'Nhân viên' }]}
  actions={<Button onClick={openModal}>Thêm mới</Button>}
/>
```

## 2. BỘ LỌC VÀ TÌM KIẾM (FILTER & ACTION BAR)
- **FilterBar**: Thành phần đặt ngay dưới `PageHeader`, chứa các ô tìm kiếm (Search), DatePicker (Lọc ngày), Select (Lọc trạng thái).
- **Nguyên tắc state**: State của Filter nên được đồng bộ lên URL Query Parameters (ví dụ: `?search=abc&status=ACTIVE`) để người dùng có thể copy/share link hoặc refresh không mất state.

## 3. DANH SÁCH & BẢNG (DATA TABLE)
- Sử dụng thẻ `table` chuẩn HTML hoặc Component Table của hệ thống (nếu dùng thư viện).
- Bắt buộc phải có:
  - Header cố định (Sticky Header) nếu bảng dài.
  - Phân trang (Pagination).
  - Component hiển thị khi không có dữ liệu (Empty State).
- Các cột hành động (Actions) như Sửa, Xóa phải nằm ở cột cuối cùng bên phải, dạng Dropdown Menu (`MoreHorizontal` icon) để tiết kiệm không gian.

## 4. FORM VÀ NHẬP LIỆU (FORMS)
- **Grid Layout**: Các trường dữ liệu (Fields) trên form phải căn chỉnh trên hệ thống Grid (1 cột trên Mobile, 2-3 cột trên Desktop).
- **Validation**: Bắt buộc kiểm tra dữ liệu phía Client (vd: dùng Zod + React Hook Form) trước khi gửi API.
- **Trạng thái**: Khi đang gửi dữ liệu, nút Submit phải có Loading spinner và bị vô hiệu hóa (disabled).

## 5. MODAL (POPUPS/DIALOGS)
- Chỉ dùng Modal cho các thao tác phụ (Tạo nhanh, Xác nhận xóa).
- Nếu Form quá dài, phức tạp (nhiều tab, nhiều bước), phải dùng một Trang riêng (Page) hoặc màn hình trượt (Drawer / Slide-over).

## 6. TRẠNG THÁI CHỜ (LOADING) & LỖI (ERROR)
- **Loading State**: Sử dụng Skeleton loaders thay vì Spinner toàn màn hình (Full-screen spinner) để mang lại trải nghiệm mượt mà hơn.
- **Error State**: Nếu fetch dữ liệu thất bại, hiển thị Component `ErrorState` với nút "Thử lại" (Retry).
- **Empty State**: Nếu danh sách trống, hiển thị Component `EmptyState` với hình minh họa nhỏ, dòng thông báo (vd: "Chưa có đơn xin nghỉ phép nào") và nút hành động (vd: "Tạo đơn mới").

## 7. QUẢN LÝ PHẢN HỒI (NOTIFICATIONS & TOASTS)
- Mọi thao tác Create/Update/Delete thành công hoặc thất bại phải kích hoạt Toast notification (Góc trên hoặc dưới bên phải).
- Cấu trúc Toast: Tiêu đề (Bắt buộc), Mô tả chi tiết (Tùy chọn). Đóng tự động sau 3-5 giây.
