# HOMEPRO RBAC ARCHITECTURE

Tài liệu này xác định kiến trúc Role-Based Access Control kết hợp với Context-based Authorization của hệ thống.

## 1. MÔ HÌNH DỮ LIỆU CỐT LÕI (CORE MODEL)
- **Roles:** Các vai trò tĩnh của User (ADMIN, HR, MANAGER, SUPERVISOR, WORKER, VIEWER).
- **Permissions:** Các đặc quyền cụ thể (VD: `PAYROLL_CALCULATE`, `LEAVE_APPROVE`).
- **Context (Ngữ cảnh):** Quyền được giới hạn trong một phạm vi (Scope).
  - Scope `SELF`: Chỉ dữ liệu của chính mình.
  - Scope `DEPARTMENT`: Dữ liệu của phòng ban mình quản lý.
  - Scope `COMPANY`: Dữ liệu toàn hệ thống.

## 2. MANAGER & DEPARTMENTS (`manager_departments`)
Đây là trái tim của RBAC cấp trung.
Một `MANAGER` không mặc định thấy tất cả mọi thứ. Họ phải được gán vào `manager_departments`:
- `department_id`: Quản lý phòng nào.
- `management_level`: Cấp độ quản lý (1: Tổ trưởng, 2: Trưởng phòng, 3: Ban Giám đốc).
- `can_view`, `can_approve`, `can_manage`: Cờ kiểm soát chi tiết.

## 3. DELEGATION (ỦY QUYỀN TẠM THỜI)
Giải quyết bài toán: Trưởng phòng nghỉ phép, cần ủy quyền cho Tổ phó duyệt đơn.
- Bảng `delegations` ghi nhận `delegatorId` (Người ủy quyền) và `delegateId` (Người nhận).
- `scope`: Chỉ ủy quyền duyệt đơn (APPROVE_LEAVE), không ủy quyền xem lương.
- Nguyên tắc cứng: Người nhận ủy quyền (Delegate) KHÔNG được phép ủy quyền tiếp cho người thứ 3.

## 4. QUY TẮC BẢO MẬT GIAO DIỆN (API & UI SECURITY)
- **UI (Frontend):** Ẩn các nút bấm, menu nếu User không có quyền. (Chỉ mang tính chất UX).
- **API (Backend):** 
  - Mọi API thay đổi dữ liệu (POST/PUT/PATCH/DELETE) phải kiểm tra quyền (`requireAuth`).
  - Mọi API truy vấn dữ liệu (GET) phải áp dụng Row-Level Security ở tầng ứng dụng (Lọc Query bằng `where` clause). Không bao giờ trả về dữ liệu vượt quyền hạn.
