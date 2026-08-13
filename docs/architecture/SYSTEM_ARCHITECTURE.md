# SYSTEM ARCHITECTURE

## 1. TỔNG QUAN
HomePro Manager được xây dựng theo kiến trúc **Modular ERP** (Enterprise Resource Planning), tập trung vào tính toàn vẹn dữ liệu (Data Integrity), nguồn dữ liệu duy nhất (Single Source of Truth), và luồng dữ liệu một chiều (Unidirectional Data Flow).

Hệ thống học hỏi nguyên lý từ ERPNext, Odoo và Dolibarr để chia cắt trách nhiệm rành mạch giữa các miền nghiệp vụ (Domain/Module).

## 2. NGUYÊN TẮC KIẾN TRÚC LÕI

1. **Single Source of Truth (SSOT)**: 
   Mỗi Entity nghiệp vụ (Ví dụ: Employee, Project, Material) chỉ được định nghĩa tại một Module duy nhất, do Module đó sở hữu (Owner). Các Module khác chỉ được read-only và tham chiếu (Reference) tới.
2. **Master Data First**: 
   Dữ liệu Master Data phải được khởi tạo và quản lý độc lập. Các Transaction Data (Attendance, PO, Invoice) không được phép ghi đè hay tạo trực tiếp Master Data mới.
3. **Financial Core (Accounting)**:
   Mọi giao dịch tài chính từ Payroll, Project Cost, Inventory Valuation, Purchasing đều phải hội tụ về module Accounting. Accounting là SSOT duy nhất của tài chính doanh nghiệp. Không tạo "ví tiền" riêng cho từng module.
4. **Config-Driven UI (Navigation & Layout)**:
   Giao diện và menu (Sidebar) được sinh ra từ cấu hình (Config). Không hardcode các route. Layout AppShell tự thích ứng theo Workspace.
5. **Role-Based Access Control (RBAC) Toàn diện**:
   Kiểm soát quyền truy cập ở cả UI (Client-side) và API (Server-side). Chặn theo Action (VIEW, CREATE, EDIT, DELETE, APPROVE) và Data Scope (OWN, DEPARTMENT, ALL).
6. **Immutable Audit Trail**:
   Mọi thay đổi nhạy cảm (Duyệt phép, Chấm công bù, Lương, Xuất kho) đều phải ghi lại vết (Audit Log) không thể xóa.

## 3. KIẾN TRÚC MODULE & WORKSPACE

Hệ thống được chia thành các Workspace (không gian làm việc), mỗi Workspace chứa nhiều Module:
- **Executive**: Dashboard tổng hợp dành cho BGĐ.
- **HR**: Employee, Contract, Attendance, Leave, Overtime, Payroll.
- **Finance**: Accounting, Tax, Bank, Billing.
- **Project**: CRM, Project, BOQ, Task, QC.
- **Procurement & Inventory**: Material, Warehouse, PO, Receipt.
- **Production**: BOM, Work Order, Material Issue, Manufacturing, Tracking.
- **System**: Users, Role, Settings, Audit Log, Document Center.

## 4. UNIDIRECTIONAL DATA FLOW (HR & PROJECT)

### HR Lifecycle Flow:
`Employee → Contract → Attendance → Time Off (Leave) → Overtime → Payroll → Accounting`

### Project & Production Flow:
`Customer → Project → BOQ → Material Demand → Purchase Order → Warehouse Receipt → Production Issue → Manufacturing → QC → Project Cost → Accounting`

## 5. DOCUMENT MANAGEMENT ARCHITECTURE
Documents không phải là file lưu trữ đơn giản. Chúng là các thực thể gắn liền với Master Data (Ví dụ: Hợp đồng lao động gắn với Employee, Hóa đơn gắn với PO). Quản lý qua metadata và phân quyền tập trung.
