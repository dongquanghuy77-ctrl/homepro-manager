# TÀI LIỆU THIẾT KẾ HỆ THỐNG (SDD) - MODULE ĐĂNG KÝ (REGISTER)

## 1. PHÂN TÍCH HỆ THỐNG (SYSTEM THINKING)
**Mục tiêu:** Cho phép nhân viên/công nhân mới tự đăng ký tài khoản tại màn hình Kiosk của xưởng (Trạm Làm Việc) và nhận thưởng 50 XP khởi đầu.
**Dữ liệu đầu vào (Dựa trên UI):**
- Họ và tên
- Email
- Username (hoặc Số điện thoại)
- Mật khẩu & Xác nhận mật khẩu
- Checkbox: Tôi đồng ý với Điều khoản sử dụng.

**Luồng hoạt động chuẩn (Happy Path):**
1. Người dùng nhập đầy đủ thông tin hợp lệ.
2. Hệ thống kiểm tra trùng lặp (Email/Username đã tồn tại chưa) bằng thư viện `zod` và truy vấn DB.
3. Mã hóa mật khẩu bằng `bcryptjs`.
4. Lưu vào bảng `users` (hoặc `pwr_station_users`).
5. Ghi nhận `50 XP` vào bảng điểm Gamification.
6. Tự động đăng nhập (`next-auth` Credentials) và chuyển vào Dashboard.

## 2. TƯ DUY NGƯỢC & TÌM LỖ HỔNG (REVERSE THINKING & LOOPHOLE ANALYSIS)

Trong bối cảnh Xưởng Sản Xuất, quy trình đăng ký mở (Open Registration) ẩn chứa những rủi ro cực lớn:

### Lỗ hổng #1: Rác Database & Phá hoại nội bộ (Fake Accounts / Spam)
- **Kịch bản:** Bất kỳ ai có đường link Vercel của anh đều có thể vào tạo tài khoản. Một nhân viên cũ hoặc đối thủ có thể viết script tạo 10.000 tài khoản ảo tên là "Huy Xấu Trai", làm rác toàn bộ bảng xếp hạng và Database hệ thống.
- **Cách bịt lỗ hổng:** **Bắt buộc phải có "Mã Kích Hoạt Xưởng" (Invite Code).** Trên form phải thêm 1 ô điền Mã Xưởng (Ví dụ: `XUONGHP2026`). Chỉ những ai có mã do Quản đốc cấp mới được phép bấm Tạo Tài Khoản.

### Lỗ hổng #2: Lỗi định danh Công Nhân (The Email Paradox)
- **Kịch bản:** Trên form có ô `Email`. Nhưng thực tế, 70% thợ mộc/công nhân xưởng không có Email, không nhớ Email, hoặc dùng chung 1 Email đăng ký hộ. Nếu ép buộc (require) Email ➔ Thợ không đăng ký được. Nếu không ép buộc ➔ Hệ thống NextAuth bị lỗi vì nó mặc định dùng Email làm định danh.
- **Cách bịt lỗ hổng:** Cho phép đăng ký bằng **Số Điện Thoại** làm ID chính yếu. Nếu họ không nhập Email, hệ thống tự động sinh ra một email ảo dạng `sdt@homepro.local` để đánh lừa NextAuth, đảm bảo luồng code không bị gãy mà thợ vẫn thao tác trơn tru.

### Lỗ hổng #3: Lỗ hổng Bơm XP (Gamification Exploit)
- **Kịch bản:** Khẩu hiệu "Nhận ngay 50 XP khởi đầu". Một công nhân có thể tạo 10 tài khoản ảo, sau đó dùng tính năng "Tặng quà/Chuyển XP" (nếu có sau này) để dồn XP cho nick chính nhằm leo Rank nhận thưởng cuối tháng.
- **Cách bịt lỗ hổng:** Trạng thái tài khoản mới tạo là `PENDING_APPROVAL`. 50 XP chỉ là "XP Ảo" (Shadow XP). XP này chỉ chính thức được cộng vào bảng xếp hạng SAU KHI Tổ trưởng/Quản đốc duyệt tài khoản đó là nhân viên thật.

### Lỗ hổng #4: Xung đột tài khoản Văn Phòng và Xưởng (Data Segregation)
- **Kịch bản:** Ứng dụng HomePro hiện đang có hệ thống Nhân Viên Văn Phòng (kế toán, thiết kế). Nếu thợ xưởng đăng ký ở Kiosk, họ lọt vào bảng `users` chung, vô tình được cấp quyền truy cập vào các module Kế Toán, Hợp Đồng.
- **Cách bịt lỗ hổng:** Tài khoản đăng ký từ Kiosk Trạm Làm Việc phải bị ép cứng (hardcode) Role là `STATION_WORKER`. Mọi route khác ngoài `/pwr/station/` đều sẽ chặn (HTTP 403 Forbidden) đối với Role này.

## 3. KẾ HOẠCH TRIỂN KHAI (IMPLEMENTATION PLAN)
- **Giai đoạn 1:** Bổ sung ô nhập "Mã Xưởng" vào UI `StationAuthUI.tsx`.
- **Giai đoạn 2:** Viết API `POST /api/pwr/auth/register` xử lý Zod validation, kiểm tra Mã Xưởng, tự động sinh Email ảo (nếu cần), băm mật khẩu.
- **Giai đoạn 3:** Ghi Database (Drizzle ORM) với Role `STATION_WORKER` và tạo bản ghi Gamification 50 XP (trạng thái Pending).
- **Giai đoạn 4:** Tự động gọi `signIn('credentials')` để đưa người dùng vào hệ thống.
