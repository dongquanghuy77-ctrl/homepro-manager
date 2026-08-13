# HOMEPRO MODULE MAP

Tài liệu này ánh xạ toàn bộ các Module nghiệp vụ hiện có và dự kiến của hệ thống HomePro.

## 1. CORE (NỀN TẢNG HỆ THỐNG)
- **Identity & User:** Quản lý tài khoản (Users)
- **RBAC & Permission:** Quản lý phân quyền, ủy quyền (ManagerDepartments, Delegations, RolePermissions)
- **Organization:** Sơ đồ tổ chức (Departments)
- **Company Identity (Dự kiến):** Cấu hình công ty, tài khoản ngân hàng, thông tin pháp lý
- **System Settings:** Cấu hình hệ thống chung (Settings)

## 2. HR (NHÂN SỰ)
- **Employee Profile:** Quản lý hồ sơ nhân sự (gắn với User)
- **Attendance:** Chấm công đa kênh (GPS, Phần cứng) (Attendance)
- **Leave Management:** Đơn từ nghỉ phép (LeaveRequests, LeaveTypes, LeaveBalances)
- **Overtime Management:** Đơn tăng ca (OvertimeRequests)
- **Payroll:** Bảng lương tháng (MonthlyPayroll, PayslipDisputes)
- **Insurance & PIT (Dự kiến):** Bảo hiểm xã hội, Thuế TNCN
- **HR Audit:** Nhật ký thao tác nhân sự (HrAuditLogs)

## 3. PROJECT (QUẢN LÝ DỰ ÁN)
- **Project Catalog:** Quản lý dự án (Projects)
- **Customer CRM:** Quản lý khách hàng (Customers)
- **Task Management:** Quản lý công việc (Tasks, WorkLogs)
- **BOQ:** Bóc tách khối lượng (BoqItems)

## 4. PROCUREMENT & INVENTORY (MUA HÀNG & KHO)
- **Material Catalog:** Danh mục vật tư (Materials)
- **Inventory (Dự kiến):** Quản lý kho, nhập/xuất kho
- **Purchasing (Dự kiến):** Yêu cầu mua hàng, Đơn đặt hàng (PR/PO)

## 5. PRODUCTION & QC (SẢN XUẤT & CHẤT LƯỢNG)
- **Production BOM:** Định mức vật tư sản xuất (ProductionBomLines)
- **Material Tracking:** Theo dõi cấu kiện tại xưởng (MaterialTrackingLogs)
- **QC Issues:** Kiểm soát lỗi (QcIssues)

## 6. FINANCE (TÀI CHÍNH & KẾ TOÁN)
- **Project Costs:** Chi phí phát sinh dự án (Costs)
- **Accounting (Dự kiến):** Hệ thống tài khoản, Sổ cái
- **Payable/Receivable (Dự kiến):** Công nợ phải thu, phải trả
- **Cash & Bank (Dự kiến):** Quản lý tiền mặt, ngân hàng
- **Tax (Dự kiến):** Quản lý thuế

## 7. DOCUMENT MANAGEMENT (Dự kiến)
- **Document Center:** Hệ thống quản lý file, văn bản pháp lý, hợp đồng, hồ sơ thanh toán.

---
**Ghi chú:** Những module ghi "Dự kiến" là những module được yêu cầu trong kiến trúc tổng thể dựa trên ERPNext/Frappe nhưng chưa có database table cụ thể trong hệ thống tính đến hiện tại.
