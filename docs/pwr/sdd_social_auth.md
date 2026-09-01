# TÀI LIỆU THIẾT KẾ HỆ THỐNG (SDD) - MODULE ĐĂNG NHẬP MẠNG XÃ HỘI (SOCIAL AUTH)

## 1. PHÂN TÍCH HỆ THỐNG (SYSTEM THINKING)
**Mục tiêu:** Kích hoạt 4 nút (Google, Facebook, Apple, Microsoft) để công nhân/quản lý xưởng có thể đăng nhập 1 chạm.
**Giải pháp Mã Nguồn Mở (Open Source):** Sử dụng thư viện `NextAuth.js` (Auth.js). Đây là chuẩn công nghiệp mã nguồn mở cho Next.js, tự động hóa toàn bộ quy trình OAuth2, mã hóa JWT, và bảo mật Session.

**Luồng hoạt động (Workflow):**
1. Người dùng bấm nút (VD: Google).
2. `NextAuth` chuyển hướng sang trang đăng nhập của Google.
3. Google trả về thông tin (Email, Name, Avatar).
4. Hệ thống kiểm tra trong database `pwr_station_users`.
   - B4.a: Nếu email đã tồn tại ➔ Đăng nhập thành công, cấp Session.
   - B4.b: Nếu email chưa tồn tại ➔ Yêu cầu nhập "Mã Xưởng" (XUONGHP2026) để liên kết tài khoản mới.

## 2. TƯ DUY NGƯỢC & TÌM LỖ HỔNG (REVERSE THINKING & LOOPHOLE ANALYSIS)

Sử dụng tư duy phản biện để tìm cách "phá" hệ thống này trong bối cảnh Xưởng Sản Xuất:

### Lỗ hổng #1: Rác Dữ Liệu (Database Pollution)
- **Kịch bản:** Ai đó có link Vercel của dự án, bấm đăng nhập bằng Google cá nhân của họ. Họ lập tức tạo ra 1 tài khoản rác trong hệ thống của xưởng.
- **Cách bịt lỗ hổng:** Tách biệt luồng Social. Khi có tài khoản Social mới, hệ thống đưa vào trạng thái `PENDING`. Tài khoản này KHÔNG ĐƯỢC VÀO TRẠM cho đến khi nhập đúng `Mã Xác Thực Xưởng` (Invite Code) hoặc Quản đốc (Huy) duyệt.

### Lỗ hổng #2: Tài khoản dùng chung máy tính bảng (Shared Devices)
- **Kịch bản:** Trạm Khoan Cam dùng 1 cái iPad chung. Công nhân A bấm login Google, Safari lưu phiên đăng nhập Google của A. Lát sau công nhân B tới ca, bấm login Google, hệ thống tự động đăng nhập vào tài khoản của A mà không hỏi mật khẩu. B thao tác lỗi, A chịu trách nhiệm.
- **Cách bịt lỗ hổng:** Ép tham số `prompt: "select_account"` vào cấu hình NextAuth. Mỗi lần bấm nút Google/Microsoft, trình duyệt BẮT BUỘC phải hỏi lại "Bạn muốn dùng tài khoản nào?" chứ không tự động đăng nhập.

### Lỗ hổng #3: Rào cản kỹ thuật của Apple & Facebook
- **Kịch bản:** Nút Apple Login yêu cầu tài khoản Apple Developer (99$/năm) và cấu hình chứng chỉ rất phức tạp. Nút Facebook yêu cầu phải tạo App trên Meta Developer, nộp giấy phép kinh doanh để duyệt Quyền truy cập Email (App Review).
- **Cách bịt lỗ hổng:** Cần sự xác nhận của anh Huy về việc: Liệu anh có sẵn sàng tạo tài khoản Developer cho Apple/Facebook không? Nếu không, 2 nút này chỉ mang tính biểu tượng (UI giả lập) hoặc phải ẩn đi khi lên môi trường thật (Production).

### Lỗ hổng #4: Xung đột tài khoản (Account Collision)
- **Kịch bản:** Công nhân X đã có tài khoản bằng số điện thoại (tạo thủ công). Giờ X bấm đăng nhập bằng Facebook, hệ thống không biết X là ai và tạo ra 1 tài khoản mới tinh (Level 1, 0 XP). X kêu ca mất dữ liệu.
- **Cách bịt lỗ hổng:** Phải xây dựng tính năng "Liên kết tài khoản" (Account Linking) trong tab Hồ Sơ. Người dùng đăng nhập bằng SĐT trước, sau đó bấm liên kết với Google/Facebook để đồng bộ.

## 3. KẾ HOẠCH TRIỂN KHAI (IMPLEMENTATION PLAN)
- **Giai đoạn 1:** Cấu hình NextAuth.js với 4 Providers (Google, FB, Apple, MS).
- **Giai đoạn 2:** Viết API bắt callback để đối chiếu email với bảng `pwr_station_users`.
- **Giai đoạn 3:** Xây dựng màn hình "Liên kết / Nhập mã xưởng" cho tài khoản mới.
- **Giai đoạn 4:** Gắn sự kiện `onClick={() => signIn('google')}` vào 4 nút Bát giác.
