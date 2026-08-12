# ADMIN USERS REVIEW

Trong quá trình thanh tra dữ liệu Production, chúng tôi phát hiện 3 user đang mang Role `ADMIN` (có toàn quyền hệ thống, bao gồm cả các mutation nhạy cảm như tính lương, duyệt nghỉ phép).

## 1. `admin` (ID: 1)
- **Tên / Chức vụ**: Quản trị viên / Quản trị hệ thống
- **Current Role**: `ADMIN`
- **Reason**: Tài khoản root mặc định để quản lý toàn bộ hệ thống.
- **Risk**: Không có rủi ro (đúng thiết kế).
- **Recommended Role**: `ADMIN`

## 2. `huy.dong` (ID: 6)
- **Tên / Chức vụ**: Đồng Quang Huy / Giám đốc điều hành
- **Current Role**: `ADMIN`
- **Reason**: CEO cần toàn quyền điều hành hệ thống.
- **Risk**: Rủi ro thấp (người dùng cấp cao nhất).
- **Recommended Role**: `ADMIN`

## 3. `viewer` (ID: 5)
- **Tên / Chức vụ**: Ban Giám Đốc (Xem) / Ban Giám Đốc
- **Current Role**: `ADMIN`
- **Reason**: Được gán `ADMIN` để có thể vượt qua các chốt chặn xem báo cáo/nhân sự toàn công ty.
- **Risk**: **RẤT CAO**. Tài khoản này mang tên "viewer" (có nghĩa là chỉ xem), nhưng với role `ADMIN`, tài khoản này CÓ QUYỀN chốt lương, duyệt đơn phép, thay đổi dữ liệu nhân sự, và thao tác trên mọi Endpoint mutations (`POST`, `PUT`, `DELETE`). Nếu tài khoản này được giao cho thư ký hoặc trợ lý để "xem", sẽ gây hậu quả khôn lường về toàn vẹn dữ liệu.
- **Recommended Role**: Yêu cầu Architect thiết kế thêm 1 Master Role mới (ví dụ: `DIRECTOR_READONLY` hoặc `AUDITOR`) với bộ quyền giới hạn `.read.all`, hoặc tước role `ADMIN` và gán tạm thời `STAFF`. Chờ Architect quyết định.
