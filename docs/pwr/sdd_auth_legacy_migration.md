# TÀI LIỆU THIẾT KẾ HỆ THỐNG (SDD) - XỬ LÝ SỰ CỐ BẢO MẬT & ĐỒNG BỘ DỮ LIỆU
**Mã sự cố:** `INC-AUTH-PLAINTEXT-401`
**Tác giả:** Antigravity (Tổng hợp từ Red Team Agent)
**Trạng thái:** Chờ phê duyệt (Pending Approval)

---

## 1. PHÂN TÍCH HIỆN TRẠNG (SYMPTOMS & ROOT CAUSE)
*   **Triệu chứng:** Người dùng `huy.dong` (hoặc các tài khoản cũ) báo cáo lỗi `Lỗi: InvalidPassword (Mã: 401)` khi đăng nhập dù nhập đúng mật khẩu (`123456`).
*   **Nguyên nhân gốc rễ (Root Cause):** Khảo sát Database cho thấy tài khoản `huy.dong` được tạo từ trước (Tháng 08/2026) đang bị lưu mật khẩu dưới dạng văn bản gốc (Plain-text: `"123456"`). Trong khi đó, API Đăng nhập hiện tại (NextAuth) đã được nâng cấp chuẩn bảo mật, chỉ chấp nhận so sánh mật khẩu đã băm (Bcrypt Hash). Sự lệch pha này khiến thuật toán mã hóa từ chối chuỗi plain-text.

## 2. PHÂN TÍCH LỖ HỔNG (TƯ DUY NGƯỢC & PHẢN BIỆN)
*Theo báo cáo độc lập từ Red Team Agent.*

*   **Tư duy ngược (Reverse Thinking):** Việc NextAuth từ chối đăng nhập **không phải là lỗi**, mà là cơ chế phòng vệ chính xác (Fail-Safe). Lỗ hổng thực sự nằm ở quy trình (hoặc script) đã tạo ra tài khoản `huy.dong` mà bỏ qua khâu băm mật khẩu, cho thấy hệ thống thiếu sự kiểm soát toàn vẹn dữ liệu (Data Integrity) ở cấp độ Database.
*   **Tư duy phản biện (Critical Thinking):** Không được phép "uốn nắn" API cốt lõi để bao che cho dữ liệu lỗi. Việc cho phép API tự động nhận diện và nâng cấp mật khẩu plain-text khi người dùng đăng nhập sẽ tạo ra 3 lỗ hổng chí mạng:
    1.  **Timing Attacks:** Kẻ gian đo lường độ trễ API để phân biệt tài khoản cũ (phản hồi nhanh) và mới (phản hồi chậm), từ đó rà quét mục tiêu.
    2.  **Downgrade Attack:** Nguy cơ bị kẻ tấn công đánh lừa API quay về phương thức so sánh plain-text.
    3.  **Liability (Trách nhiệm pháp lý):** Những người dùng cũ không bao giờ đăng nhập lại sẽ vĩnh viễn bị lưu mật khẩu plain-text, vi phạm nghiêm trọng quy chuẩn an toàn lưu trữ.

## 3. GIẢI PHÁP ĐỀ XUẤT (THEO CHUẨN OPEN-SOURCE ENTERPRISE)
Dựa trên triết lý *KISS (Keep It Simple, Stupid)* và *Secure by Design*: **Tuyệt đối KHÔNG sửa code của API Đăng nhập hiện tại. Giải quyết triệt để tại tầng Dữ liệu.**

### Giải Pháp Lựa Chọn: Data Migration & Database Constraint
1.  **Chạy Data Migration (Thanh lọc dữ liệu một lần):**
    *   Viết một script chạy một lần duy nhất (One-off script) quét toàn bộ bảng `users`.
    *   Nhận diện các tài khoản có chuỗi mật khẩu không bắt đầu bằng `$2` (dấu hiệu của Bcrypt).
    *   Thực hiện băm (Bcrypt) toàn bộ các mật khẩu này và ghi đè lại vào Database.
2.  **Thiết lập rào chắn dữ liệu (Defense in Depth):**
    *   Thiết lập `CHECK CONSTRAINT` trên PostgreSQL: Từ chối hoàn toàn mọi lệnh `INSERT/UPDATE` nếu trường `password` không đúng định dạng hash.
3.  **Kiểm tra chéo:**
    *   Rà soát lại toàn bộ các công cụ Admin, Seeding Scripts cũ xem công cụ nào đã tạo ra dữ liệu lỗi để vá lỗ hổng luồng dữ liệu.

## 4. HÀNH ĐỘNG TIẾP THEO (NEXT STEPS)
*Yêu cầu sự phê duyệt từ Chủ hệ thống (Owner) để thực hiện bước khắc phục.*
[ ] Chạy Script Migration để đồng bộ toàn bộ password cũ sang chuẩn Bcrypt.
[ ] (Tùy chọn) Bổ sung DB Constraint để chặn dữ liệu plain-text trong tương lai.
