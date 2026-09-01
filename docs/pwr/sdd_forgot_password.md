# TÀI LIỆU THIẾT KẾ HỆ THỐNG (SDD) - MODULE QUÊN MẬT KHẨU (FORGOT PASSWORD)

## 1. PHÂN TÍCH HỆ THỐNG (SYSTEM THINKING)
**Mục tiêu:** Cho phép công nhân/quản lý xưởng khôi phục mật khẩu một cách an toàn mà không cần can thiệp thủ công từ IT.
**Giải pháp Mã Nguồn Mở (Open Source):**
- **Nodemailer / Resend:** Gửi mã OTP qua Email.
- **Upstash Redis + `@upstash/ratelimit`:** (Đã có sẵn trong dự án) dùng để lưu mã OTP tạm thời (TTL = 5 phút) và giới hạn số lần request để chống spam.
- **Bcryptjs:** Hash mật khẩu mới an toàn trước khi lưu vào PostgreSQL.

**Luồng hoạt động (Workflow):**
1. Người dùng bấm "Quên mật khẩu" ➔ Chuyển sang form nhập `Email` hoặc `Số điện thoại`.
2. Hệ thống tạo mã OTP 6 số (Lưu vào Redis với hạn 5 phút).
3. Gửi OTP qua Email/SMS.
4. Người dùng nhập OTP ➔ Xác thực với Redis.
5. Người dùng nhập Mật khẩu mới ➔ Mã hóa bằng Bcrypt và cập nhật Database.

## 2. TƯ DUY NGƯỢC & TÌM LỖ HỔNG (REVERSE THINKING & LOOPHOLE ANALYSIS)

Sử dụng tư duy phản biện để tìm cách "hack" hoặc làm sập hệ thống trong bối cảnh Xưởng Sản Xuất:

### Lỗ hổng #1: Brute-Force Mã OTP 6 Số (Tấn công dò mã)
- **Kịch bản:** Kẻ gian biết SĐT của Quản đốc, yêu cầu cấp OTP, sau đó dùng tool tự động điền các số từ `000000` đến `999999` để bẻ khóa. Vì mã chỉ có 6 số, tool chạy vài giây là ra.
- **Cách bịt lỗ hổng:** Sử dụng `@upstash/ratelimit`. Mỗi số điện thoại / IP chỉ được nhập sai OTP tối đa 5 lần. Quá 5 lần, khóa tính năng quên mật khẩu trong 30 phút.

### Lỗ hổng #2: Cạn kiệt ngân sách SMS / Bơm tin nhắn rác (SMS Pumping / DoS)
- **Kịch bản:** Đối thủ cạnh tranh viết script spam API `/forgot-password` với 100.000 số điện thoại khác nhau. Hệ thống gửi SMS liên tục, làm công ty tốn hàng chục triệu đồng tiền cước tin nhắn chỉ trong 1 đêm.
- **Cách bịt lỗ hổng:** Giới hạn theo IP (Rate Limit). Mỗi IP chỉ được yêu cầu gửi OTP 1 lần/phút. Đồng thời, API phải kiểm tra **số điện thoại có tồn tại trong Database không** rồi mới gửi. Nếu SĐT lạ ➔ Trả về lỗi ảo "Đã gửi" nhưng thực chất không gửi SMS để đánh lừa kẻ tấn công.

### Lỗ hổng #3: Thu hồi số điện thoại (Phone Recycling Account Takeover)
- **Kịch bản:** Công nhân A nghỉ việc. Nhà mạng thu hồi sim của A và bán cho người khác (B). B tải app về, bấm "Quên mật khẩu" bằng số điện thoại đó. B lấy được tài khoản của A, xem được toàn bộ lương thưởng, KPI và dữ liệu nội bộ xưởng.
- **Cách bịt lỗ hổng:** Quy trình 2 lớp (2-Factor Context). Khi bấm quên mật khẩu, ngoài Số điện thoại, bắt buộc phải điền đúng **Mã Nhân Viên** hoặc **Mã Xưởng**. Nếu không biết 1 trong 2, không cấp OTP.

### Lỗ hổng #4: Rào cản kỹ thuật của công nhân (Low Tech Literacy)
- **Kịch bản:** Công nhân lớn tuổi không biết check email, mạng lag không nhận được SMS. Họ bị kẹt ngoài hệ thống và không thể làm việc trong ca đó.
- **Cách bịt lỗ hổng:** Thiết kế một nút **"Cần Quản lý hỗ trợ"** ở dưới màn hình Quên mật khẩu. Nút này sẽ bắn một Notification (thông báo) về máy của anh Huy (Quản đốc), cho phép anh Huy cấp lại mật khẩu ngay lập tức bằng Quyền Admin.

## 3. KẾ HOẠCH TRIỂN KHAI (IMPLEMENTATION PLAN)
- **Giai đoạn 1:** Xây dựng Form UI (Nhập SĐT + Mã Xưởng ➔ Nhập OTP ➔ Nhập Mật khẩu mới).
- **Giai đoạn 2:** Viết API tạo OTP + Lưu Redis có TTL 5 phút.
- **Giai đoạn 3:** Viết API verify OTP và Reset Password với Bcrypt.
- **Giai đoạn 4:** Đẩy lên Vercel và Test chặn Spam (Rate Limit).
