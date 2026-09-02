# TÀI LIỆU THIẾT KẾ HỆ THỐNG (SDD) - KIẾN TRÚC DỮ LIỆU ĐỘNG GAMIFICATION
**Mã tài liệu:** `SDD-UI-GAMIFICATION-DYNAMIC-DATA`
**Tác giả:** Antigravity & Systems Architect Red Team
**Trạng thái:** Chờ phê duyệt (Pending Approval)

---

## 1. MỤC TIÊU NGHIỆP VỤ (BUSINESS CONTEXT)
*   **Vấn đề:** Giao diện Soft-Authenticated (Remember Me) đang hiển thị dữ liệu tĩnh (Level 12 fake) và thiếu cơ chế cập nhật ảnh đại diện (Avatar).
*   **Yêu cầu:** Giao diện (Thanh XP, Khối Lục giác) phải phản ánh chính xác dữ liệu thực tế (Real-time) của người dùng từ Database.

## 2. PHÂN TÍCH LỖ HỔNG & RỦI RO (TƯ DUY NGƯỢC)

### 2.1. Rủi ro của Cơ chế Cập nhật Avatar tại Kiosk
*   **Tư duy ngược:** Cho phép công nhân đổi ảnh đại diện ngay trên chiếc iPad dùng chung tại xưởng là một rủi ro cực lớn.
*   **Lỗ hổng:** 
    1.  **Vận hành:** iPad Kiosk thường bị khóa (MDM), không cho phép duyệt file hay bật camera tự do.
    2.  **Bảo mật & Văn hóa:** Nguy cơ công nhân dùng iPad xưởng chụp ảnh phản cảm, đùa giỡn, hoặc đổi ảnh mạo danh người khác. Hệ thống không có ai trực tiếp kiểm duyệt ngay lúc đó.

### 2.2. Rủi ro của Trạng thái Level/XP "Lưu Tạm" (LocalStorage)
*   **Tư duy ngược:** Nếu ta lưu Level/XP vào bộ nhớ đệm (LocalStorage) của iPad để load cho nhanh, dữ liệu sẽ ngay lập tức bị "ôi thiu" (stale). Vì XP của thợ có thể được cộng ngầm bởi hệ thống QA hoặc máy chấm công khi họ đang không đứng ở máy Kiosk.
*   **Lỗ hổng:** Nếu gọi API để lấy Level mới nhất mà không cần nhập PIN, hệ thống bị lộ dữ liệu (Data Scraping). Bất kỳ ai cũng có thể dùng API này để cào trộm thông tin điểm số của toàn bộ nhà máy.

## 3. THIẾT KẾ KIẾN TRÚC TỐI ƯU (CHUẨN OPEN-SOURCE)

### 3.1. Kiến Trúc Quản Lý Avatar (Controlled Identity)
*   **Chặn Upload tại Xưởng:** Vô hiệu hóa tính năng bấm vào Khối Lục Giác để tải ảnh trên màn hình Kiosk. Việc cập nhật ảnh chỉ được thực hiện qua Cổng nhân viên (Employee Portal) trên điện thoại cá nhân hoặc do Phòng HR cài đặt.
*   **Cơ chế Fallback (Chữ cái đầu):** Hệ thống mặc định tạo Avatar tĩnh dựa trên tên (Ví dụ: `ĐQ` cho Đồng Quang Huy). Màu nền của Khối Lục Giác được tạo ngẫu nhiên nhưng cố định (Deterministic Color) dựa trên ID của nhân viên đó.

### 3.2. Kiến Trúc Hydrate Dữ Liệu Live (Device-Trust API)
Để Level và XP luôn là con số thực (Fresh Data) trước khi người dùng nhập PIN mà vẫn bảo mật:
*   **Thiết lập Niềm tin Thiết bị (Device Token):** Thay vì tin tưởng người dùng (vì chưa có mã PIN), Server sẽ cấp một "Chứng minh thư" (Secure HttpOnly Cookie) cho chính chiếc iPad đó.
*   **Context API (API Bối cảnh):** Khi màn hình Remember Me hiện ra, iPad sẽ gửi Device Token + ID Công nhân lên Server. Server kiểm tra: *"À, đây đúng là Kiosk Trạm Số 1, được phép xem điểm"* và trả về một gói tin siêu nhỏ, cực kỳ an toàn gồm: `[Tên, AvatarURL, Level Hiện Tại, % XP]`.
*   **Reactive UI:** Ngay khi nhận được gói tin, thanh Level và Khối Lục Giác sẽ tự động "chạy" (hydrate) đúng với thực tế (Ví dụ: Level 1, 0/100 XP) trước khi công nhân gõ mã PIN.

## 4. HÀNH ĐỘNG TIẾP THEO (NEXT STEPS)
*Yêu cầu Chủ hệ thống (Owner) phê duyệt phương án.*
- [ ] Chấp thuận khóa tính năng Upload Avatar trên iPad xưởng (Chỉ cho phép Fallback chữ cái / HR cập nhật).
- [ ] Chấp thuận kiến trúc Device-Trust API để lấy dữ liệu Level/XP thực tế.
