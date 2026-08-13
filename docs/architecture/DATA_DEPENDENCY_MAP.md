# DATA DEPENDENCY MAP

## TỔNG QUAN
Sơ đồ phụ thuộc dữ liệu quy định trình tự thiết lập và ràng buộc toàn vẹn dữ liệu trong hệ thống HomePro Manager. Không được xây dựng các thực thể ở phía dưới nếu thực thể phía trên chưa có hoặc chưa ổn định.

## 1. HR & PAYROLL DATA GRAPH
```text
COMPANY (System)
   │
   ├──> DEPARTMENT (Phân cấp phòng ban/tổ)
   │       │
   │       └──> EMPLOYEE (Nhân viên / User)
   │               │
   │               ├──> CONTRACT (Lương cứng, BHXH, Trạng thái LĐ)
   │               │
   │               ├──> LEAVE TYPE (Danh mục loại nghỉ)
   │               │       └──> LEAVE REQUEST & LEAVE BALANCE (Quỹ phép & Đơn nghỉ)
   │               │
   │               ├──> ATTENDANCE (Chấm công hàng ngày)
   │               │       └──> [Kế thừa Leave Request để tự động hiểu ngày nghỉ]
   │               │
   │               ├──> OVERTIME REQUEST (Đơn duyệt tăng ca)
   │               │
   │               └──> PAYROLL (Tính lương tháng)
   │                       └──> [Tích hợp: Contract, Attendance, Leave, Overtime]
   │                               │
   │                               └──> ACCOUNTING (Ghi nhận chi phí lương, Công nợ BHXH)
```

## 2. PROJECT & SUPPLY CHAIN DATA GRAPH
```text
CUSTOMER (Khách hàng)
   │
   └──> PROJECT (Dự án/Hợp đồng kinh tế)
           │
           ├──> BOQ (Bóc tách khối lượng / Dự toán)
           │       └──> MATERIAL (Danh mục Vật tư)
           │
           ├──> PURCHASING (Mua hàng)
           │       ├──> SUPPLIER (Nhà cung cấp)
           │       └──> PURCHASE ORDER (Dựa trên BOQ Demand)
           │               │
           │               └──> WAREHOUSE RECEIPT (Nhập kho vật tư)
           │                       │
           │                       └──> ACCOUNTING (Công nợ NCC, Ghi tăng Tồn kho)
           │
           ├──> PRODUCTION (Sản xuất)
           │       ├──> BOM (Cấu kiện - Kế thừa từ BOQ)
           │       └──> MATERIAL ISSUE (Xuất kho sản xuất)
           │               └──> MATERIAL TRACKING (Quét QR theo tiến độ: CNC, Dán Cạnh...)
           │
           ├──> QC (Quản lý chất lượng & Sửa chữa)
           │
           └──> PROJECT COST (Phân bổ chi phí khác: Vận chuyển, NC ngoài)
                   │
                   └──> ACCOUNTING (Hội tụ toàn bộ Chi phí Dự án + Doanh thu)
```

## 3. RÀNG BUỘC KIẾN TRÚC
1. **Upstream First**: Nếu Upstream (phía trên) bị đổi thiết kế, Downstream (phía dưới) phải được update. KHÔNG xây Downstream khi Upstream còn thiếu.
2. **Read-Only Downstream**: Payroll không được phép sửa Attendance. Nếu Payroll phát hiện sai sót giờ công, HR phải sửa ở Attendance, sau đó Payroll tính lại (recalculate).
3. **No Circular Dependency**: Ví dụ Attendance không được phụ thuộc ngược lại vào Payroll.
