# UI NAVIGATION MAP

Tài liệu này định nghĩa cấu trúc Workspace và Module Navigation mới của HomePro, tách biệt hoàn toàn khỏi code UI components. 

## CẤU TRÚC WORKSPACE

Hệ thống được chia thành 8 Workspace chính:

1. **Dashboard (Tổng quan)**
   - `/` - Bảng điều khiển chung

2. **Điều hành (Operations)**
   - `/progress` - Tiến độ tổng thể
   - `/tasks` - Giao việc & Theo dõi
   - `/logs` - Nhật ký công việc (Daily Logs)

3. **Nhân sự (HR)**
   - `/hr/dashboard` - HR Dashboard
   - `/hr/employees` - Hồ sơ nhân sự
   - `/hr/attendance` - Quản lý chấm công
   - `/hr/leave` - Đơn từ nghỉ phép
   - `/hr/overtime` - Đơn tăng ca
   - `/hr/payroll` - Bảng lương
   - `/hr/disputes` - Khiếu nại lương
   - `/hr/reports` - Báo cáo nhân sự

4. **Tài chính - Kế toán (Finance)**
   - `/finance/costs` (trước là `/chi-phi`) - Chi phí dự án
   - *(Dự kiến)* Bảng cân đối, Sổ cái, Công nợ, Thanh toán...

5. **Dự án (Projects & CRM)**
   - `/projects` - Quản lý dự án
   - `/customers` (trước là `/khach-hang`) - Khách hàng

6. **Vật tư - Kho (Inventory & Procurement)**
   - `/inventory/materials` (trước là `/vat-tu`) - Danh mục vật tư
   - *(Dự kiến)* Nhập kho, Xuất kho, Theo dõi tồn kho...

7. **Sản xuất (Production & QC)**
   - `/production/bom` (trước là `/bom`) - BOQ / BOM
   - `/production/tracking` (trước là `/tracking`) - Theo dõi mã QR
   - `/production/qc` (trước là `/qc`) - Kiểm soát chất lượng (Lỗi)

8. **Hệ thống (System)**
   - `/admin/users` - Phân quyền & Tài khoản
   - `/admin/settings` - Cấu hình hệ thống

---

## MAPPING TỪ ROUTE CŨ SANG WORKSPACE MỚI

| Route Hiện Tại | Workspace Mới | Module ID (Config) | Route Mới (Nếu đổi) | Ghi chú |
|----------------|---------------|--------------------|---------------------|---------|
| `/` | Dashboard | `dashboard` | - | - |
| `/projects` | Dự án | `projects` | - | - |
| `/tasks` | Điều hành | `tasks` | - | - |
| `/progress` | Điều hành | `progress` | - | - |
| `/qc` | Sản xuất | `qc` | `/production/qc` | (1) |
| `/logs` | Điều hành | `logs` | - | - |
| `/vat-tu` | Vật tư - Kho | `materials` | `/inventory/materials` | (1) |
| `/chi-phi` | Tài chính | `costs` | `/finance/costs` | (1) |
| `/khach-hang` | Dự án | `customers` | `/customers` | (1) |
| `/admin/users` | Hệ thống | `users` | - | - |
| `/settings` | Hệ thống | `settings` | `/admin/settings` | (1) |
| `/employees` | Nhân sự | `hr-employees` | `/hr/employees` | (1) Đưa vào scope HR |
| `/attendance` | Nhân sự | `hr-attendance`| `/hr/attendance` | (1) Đưa vào scope HR |
| `/leave` | Nhân sự | `hr-leave` | `/hr/leave` | (1) Đưa vào scope HR |
| `/overtime` | Nhân sự | `hr-overtime` | `/hr/overtime` | (1) Đưa vào scope HR |
| `/hr/reports` | Nhân sự | `hr-reports` | - | - |
| `/payroll` | Nhân sự | `hr-payroll` | `/hr/payroll` | (1) Đưa vào scope HR |
| `/hr/disputes` | Nhân sự | `hr-disputes` | - | - |
| `/bom` | Sản xuất | `prod-bom` | `/production/bom` | (1) |
| `/tracking` | Sản xuất | `prod-tracking` | `/production/tracking` | (1) |
| `/bom/report` | Sản xuất | `prod-report` | `/production/budget` | (1) |

*(1) Lưu ý: Dù đường dẫn route có thể từ từ chuyển đổi để không bị break, nhưng cấu trúc trên UI Sidebar phải hiển thị theo nhóm Workspace này.*
