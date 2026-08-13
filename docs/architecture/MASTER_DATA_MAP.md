# HOMEPRO MASTER DATA MAP

Tài liệu này quy hoạch các nguồn dữ liệu tham chiếu gốc (Master Data) của hệ thống. Tất cả các giao dịch nghiệp vụ (Transactions) phải sử dụng FK tham chiếu tới Master Data, không được tạo bản ghi tạm thời hoặc copy tên để lưu trữ.

## 1. USER & ORGANIZATION MASTER
- **USERS (`users`)**: 
  - Là Core Master Data định danh con người (Cả hệ thống chỉ dùng 1 bảng này cho Login, Nhân sự, Khách hàng nội bộ).
  - Quản lý định danh (ID, mã nhân viên, username).
- **DEPARTMENTS (`departments`)**:
  - Quản lý sơ đồ tổ chức, cây phòng ban.
  - Các module sử dụng: RBAC, Employee Profile.
- **POSITIONS (`positions`)**:
  - Danh mục chức danh, vị trí công việc.

## 2. PROJECT MASTER
- **PROJECTS (`projects`)**:
  - Định danh dự án (Mã dự án, Tên dự án, Ngân sách mục tiêu).
  - Các module sử dụng: BOQ, Tasks, QC, Costs, Material Tracking.
- **CUSTOMERS (`customers`)**:
  - Khách hàng ngoại bộ (B2B/B2C).

## 3. INVENTORY & PRODUCTION MASTER
- **MATERIALS (`materials`)**:
  - Từ điển Vật tư/Nguyên liệu (Mã vật tư, Tên, Đơn vị tính, Danh mục).
  - Các module sử dụng: BOQ, Nhập/Xuất kho, Tính giá thành.

## 4. HR MASTER
- **LEAVE TYPES (`leave_types`)**:
  - Danh mục cấu hình loại nghỉ phép (Số ngày tối đa, Quy tắc duyệt, Tác động lương).
  - Các module sử dụng: Leave Requests, Leave Balances, Payroll.

## 5. FINANCE & COMPANY MASTER (DỰ KIẾN - PENDING)
Để hệ thống hoàn chỉnh ERP, cần tạo thêm các Master Data sau:
- **COMPANY MASTER**: Cấu hình công ty, Mã số thuế.
- **CHART OF ACCOUNTS**: Hệ thống tài khoản kế toán (Sổ cái).
- **CURRENCIES**: Tiền tệ và tỷ giá.
- **FISCAL YEARS/PERIODS**: Kỳ kế toán (tháng/năm).
- **TAX RATES**: Các loại thuế và thuế suất.

## 6. QUY TẮC BẢO TRÌ MASTER DATA
1. **NO HARD DELETE**: Dữ liệu Master Data khi đã được tham chiếu bởi bất kỳ Transaction nào thì tuyệt đối không được xóa (`DELETE`). Chỉ được phép chuyển trạng thái `isActive = false` hoặc `status = 'INACTIVE'`.
2. **CENTRALIZED CREATION**: Master Data chỉ được tạo/sửa thông qua giao diện Admin riêng biệt, không được "Tạo nhanh" bừa bãi trong màn hình nghiệp vụ (trừ khi có quyền phân cấp).
