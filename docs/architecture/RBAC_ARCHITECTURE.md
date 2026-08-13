# RBAC ARCHITECTURE (Role-Based Access Control)

## 1. NGUYÊN TẮC LÕI (Zero Trust)
Hệ thống mặc định từ chối mọi quyền truy cập (Deny All). User phải được cấp quyền (Permissions) một cách rõ ràng mới có thể thực hiện hành động.
Việc kiểm tra quyền hạn (Authorization Check) phải được thực hiện ở 4 lớp:
1. **Sidebar/UI Component (Visibility)**: Ẩn/Hiện nút bấm, menu.
2. **Client Route (Navigation)**: Next.js middleware / HOC chặn không cho vào trang.
3. **API Endpoint (Server Action)**: Kiểm tra `session.user.role` và Scope ngay đầu API route.
4. **Database Query (Data Scope)**: Tự động filter dữ liệu (ví dụ Manager chỉ SELECT được nhân viên trong phòng ban của họ).

## 2. KIẾN TRÚC ROLE & PERMISSION

Không cấp quyền cứng vào Role (Ví dụ: Không fix cứng `ADMIN` thì làm được mọi thứ).
Mọi quyền hạn phải được định nghĩa bằng Mã Quyền (Permission Code), và cấp qua Role:

| Role | Giải thích (Description) |
|---|---|
| **ADMIN** | Quản trị viên hệ thống (Sở hữu mọi Permission Scope). |
| **HR** | Cán bộ nhân sự. Xem toàn bộ module HR, KHÔNG thấy dữ liệu Project/Production. |
| **MANAGER** | Trưởng phòng/Quản đốc. Thấy Project được gán và duyệt đơn cho nhân viên thuộc phòng. |
| **SUPERVISOR** | Tổ phó/Trưởng nhóm. Được ủy quyền duyệt đơn tạm thời từ MANAGER. |
| **WORKER** | Công nhân viên (Chỉ thấy dữ liệu cá nhân, Mobile portal). |
| **VIEWER** | Người xem (Chỉ read-only, dành cho Auditor hoặc Giám đốc chỉ xem báo cáo). |

## 3. CÁC LOẠI HÀNH ĐỘNG (Actions)
Permissions phải chi tiết theo từng Action:
- `VIEW` (Xem danh sách, chi tiết)
- `CREATE` (Tạo mới)
- `EDIT` (Chỉnh sửa)
- `DELETE` (Xóa/Vô hiệu hóa)
- `SUBMIT` (Gửi duyệt)
- `APPROVE` (Duyệt/Chốt)
- `REJECT` (Từ chối)
- `EXPORT` (Xuất PDF/Excel)

## 4. PHẠM VI DỮ LIỆU (Data Scope)
Dữ liệu được bảo vệ chặt chẽ theo Scope:
- **SELF**: Chỉ dữ liệu của chính user (Ví dụ Worker xem bảng lương cá nhân).
- **DEPARTMENT**: Dữ liệu thuộc phòng ban user quản lý (Theo bảng `manager_departments`).
- **COMPANY / ALL**: Xem toàn bộ dữ liệu công ty (Dành cho HR, Admin).

## 5. ỦY QUYỀN (DELEGATION)
Cơ chế cốt lõi để duy trì hoạt động liên tục:
- Manager có thể tạo Record trong bảng `delegations`, cấp 1 phần quyền của mình (Ví dụ `APPROVE_LEAVE`) cho một `SUPERVISOR` trong khoảng thời gian nhất định `[startAt, endAt]`.
- Hệ thống tự động thu hồi quyền khi hết hạn.
- Delegate KHÔNG ĐƯỢC PHÉP re-delegate (ủy quyền lại cho người thứ 3).
