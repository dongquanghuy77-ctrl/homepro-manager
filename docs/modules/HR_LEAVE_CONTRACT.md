# MODULE CONTRACT: HR LEAVE

## 1. THÔNG TIN CHUNG (MODULE IDENTITY)
- **1.1. Module ID:** `HR-LEAVE`
- **1.2. Module Name:** Leave Requests (Nghỉ phép)
- **1.3. Business Owner:** HR Department
- **1.4. Technical Owner:** Core Team

## 2. PHẠM VI (SCOPE & BOUNDARY)
- **2.1. Purpose:** Quản lý quy trình xin nghỉ phép, các loại phép và quỹ phép tồn của nhân viên.
- **2.2. Scope:**
  - Định nghĩa loại phép (Leave Types).
  - Quản lý quỹ phép năm (Leave Balances).
  - Quy trình duyệt đơn phép n-cấp động (Manager -> HR).
  - Cập nhật tự động quỹ phép khi duyệt đơn.
- **2.3. Out of Scope:**
  - Tính tiền lương trừ vào phép (Payroll).

## 3. DỮ LIỆU & KIẾN TRÚC (DATA & ARCHITECTURE)
- **3.1. Master Data sử dụng:** `users`, `leave_types`
- **3.2. Source of Truth:** `leave_requests` (Nguồn xác định nhân viên vắng mặt hợp lệ), `leave_balances` (Quỹ phép).
- **3.3. Database Tables / Models:** `leave_requests`, `leave_types`, `leave_balances`, `leave_approvals`

## 4. QUY TRÌNH (BUSINESS LOGIC)
- **Trạng thái:** PENDING -> PENDING_HR -> APPROVED -> CANCELLED
- **Liên kết chấm công:** Khi đơn được duyệt, module này không sửa bảng `attendance`. Thay vào đó, bảng `attendance` có một cột `leave_request_id`. Engine chấm công sẽ đối chiếu ngày vắng mặt với `leave_requests`.

## 5. KIỂM THỬ & CHẤT LƯỢNG
- **Tình trạng hiện tại:** Đã PASS UAT (P0.18).
- **Level:** 5 (Production-ready).
