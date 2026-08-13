# MODULE CONTRACT: HR ATTENDANCE

## 1. THÔNG TIN CHUNG (MODULE IDENTITY)
- **1.1. Module ID:** `HR-ATT`
- **1.2. Module Name:** Attendance (Chấm công)
- **1.3. Business Owner:** HR Department
- **1.4. Technical Owner:** Core Team

## 2. PHẠM VI (SCOPE & BOUNDARY)
- **2.1. Purpose:** Ghi nhận giờ làm việc thực tế của nhân viên thông qua nhiều nguồn (App, Thiết bị phần cứng, Điều chỉnh thủ công) để làm cơ sở tính lương.
- **2.2. Scope:**
  - Check-in / Check-out đa kênh.
  - Tracking GPS khi check-in qua Web/App.
  - Xử lý Offline Sync.
  - Quản lý trạng thái Đi trễ, Về sớm.
  - Phê duyệt bảng công hàng ngày (Manager -> HR).
- **2.3. Out of Scope:**
  - Không tính toán thành tiền lương (Thuộc về Module Payroll).
  - Không quản lý logic nghỉ phép (Thuộc về Module Leave).

## 3. DỮ LIỆU & KIẾN TRÚC (DATA & ARCHITECTURE)
- **3.1. Master Data sử dụng:** `users` (Employee), `leave_requests` (Reference để biết ngày đó có nghỉ phép không).
- **3.2. Source of Truth:** Giờ công thực tế hàng ngày của một nhân viên.
- **3.3. Database Tables / Models:** `attendance`

## 4. GIAO DIỆN HỆ THỐNG (SYSTEM INTERFACES)
- **4.1. API Endpoints:** 
  - `POST /api/hr/attendance/clock` (Thực hiện chấm công)
  - `GET /api/hr/attendance/daily` (Lấy báo cáo công trong ngày)
- **4.2. Input:** Employee ID, Timestamp, Location (GPS Lat/Lng), Device Source.
- **4.3. Output:** Attendance Record với tính toán số giờ (Total Hours, Late Minutes).

## 5. SỰ PHỤ THUỘC (DEPENDENCIES)
- **8.1. Dependencies (Upstream):** Không có.
- **8.2. Dependents (Downstream):** Module `Payroll` (Phụ thuộc bắt buộc vào `Attendance` để tính `gross_earnings`).

## 6. KIỂM THỬ & CHẤT LƯỢNG
- **Tình trạng hiện tại:** Đã PASS UAT (P0.14).
- **Level:** 5 (Production-ready).
