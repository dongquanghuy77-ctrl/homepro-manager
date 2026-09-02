# TÀI LIỆU THIẾT KẾ HỆ THỐNG (SDD) - KIẾN TRÚC ĐỒNG BỘ DỮ LIỆU ĐỘNG UI
**Mã tài liệu:** `SDD-UI-DYNAMIC-HYDRATION-FIX`
**Tác giả:** Antigravity & Data Flow Architect Red Team
**Trạng thái:** Chờ phê duyệt (Pending Approval)

---

## 1. MỤC TIÊU NGHIỆP VỤ (BUSINESS CONTEXT)
*   **Vấn đề:** Màn hình "Chọn Tổ Đội" sau khi đăng nhập thành công hiển thị sai thông tin: Lời chào gọi bằng Số điện thoại thay vì Tên thật, và Avatar bị gán cứng chữ `ĐQ` (Đồng Quang Huy) bất kể ai đăng nhập.
*   **Yêu cầu:** Hệ thống phải hiển thị chính xác Danh tính (Tên thật) và tính toán Avatar chữ cái dựa trên tên thật của người dùng hiện tại, tuân thủ nguyên tắc Dynamic Data Hydration đã đề ra.

## 2. PHÂN TÍCH LỖ HỔNG KIẾN TRÚC (TƯ DUY PHẢN BIỆN)

### 2.1. Vi phạm "Nguồn sự thật duy nhất" (Single Source of Truth)
*   **Nguyên nhân gốc rễ:** Lập trình viên đã phạm một "Anti-pattern" (Mẫu thiết kế lỗi) kinh điển: Sử dụng lại trạng thái tạm thời của Form (biến `phone` người dùng vừa gõ) để bơm thẳng vào giao diện Lời chào.
*   **Đánh giá:** Thay vì kiên nhẫn đợi Backend trả về thông tin hồ sơ (Profile) của nhân sự, Frontend đã vội vàng lấy dữ liệu thô đẩy lên UI. Điều này phá vỡ hoàn toàn nguyên tắc "Dữ liệu phải đi từ Database ra".

### 2.2. Hardcode Avatar (Gắn cứng mã lệnh)
*   **Nguyên nhân gốc rễ:** Để qua mặt yêu cầu "Hiển thị chữ cái đầu", lập trình viên đã viết một lệnh điều kiện thô thiển: *Nếu SĐT là của Admin thì hiện `AD`, nếu không thì hiện `ĐQ`*.
*   **Đánh giá:** Đây là một thủ thuật lừa dối thị giác (Mockup logic). Hệ thống thiếu đi một hàm thuần túy (Pure Function) để bóc tách tự động tên người dùng thực tế thành các chữ cái viết tắt.

## 3. THIẾT KẾ KIẾN TRÚC TỐI ƯU (CHUẨN OPEN-SOURCE)
Hệ thống sẽ được đập bỏ đoạn logic chắp vá và cấu trúc lại theo **Luồng dữ liệu một chiều (Unidirectional Data Flow)**:

1.  **Bước 1: Xác thực (AuthN):** Người dùng nhập SĐT và Password.
2.  **Bước 2: Hydrate Dữ liệu (Profile Fetch):** Giao diện KHÔNG tự chuyển sang trạng thái "WELCOME" ngay. Nó phải thông qua `NextAuth Session Provider` hoặc gọi một API Context (vd: `/api/users/me`) để kéo về một Object hoàn chỉnh: `{ id: 105, name: "Huỳnh Thanh Vinh", role: "WORKER" }`.
3.  **Bước 3: Ràng buộc Dữ liệu (Data Binding):** 
    *   UI Lời chào sẽ được subscribe (đăng ký) thẳng vào biến `Session.name`.
    *   UI Avatar sẽ được bọc qua một hàm: `generateInitials(Session.name)`. Ví dụ: Đưa vào "Huỳnh Thanh Vinh" -> Hàm tự động trích xuất chữ cái "HV" hoặc "HTV".
4.  **Bước 4: Kiểm soát trạng thái:** Nếu chưa lấy được thông tin từ Server, giao diện sẽ hiển thị Loading thay vì hiện bừa Số điện thoại.

## 4. HÀNH ĐỘNG TIẾP THEO (NEXT STEPS)
*Yêu cầu Chủ hệ thống (Owner) phê duyệt phương án.*
- [ ] Xóa bỏ việc sử dụng local state (`phone`) trên giao diện Welcome.
- [ ] Tích hợp `useSession` của NextAuth (hoặc API Context) để kéo chính xác `name` của người dùng từ Database và tính toán Avatar động.
