# MODULE MAP

Đây là bản đồ toàn bộ các Module hệ thống của HomePro Manager.
Quy định rõ Ownership và Trách nhiệm của từng Module.

| Module Name | Owner | Core Entity | Primary Responsibility | Downstream Integration |
|-------------|-------|-------------|------------------------|------------------------|
| **Auth/Session** | System | User Session | Quản lý đăng nhập, Token, Session. | Toàn bộ hệ thống |
| **RBAC** | System | Role, Permission | Quản lý phân quyền, Scope, Delegation. | Toàn bộ hệ thống |
| **Employee** | HR | Employee, Dept | Hồ sơ, Sơ đồ tổ chức nhân sự. | Payroll, Attendance, Contract, Project |
| **Contract** | HR | Contract | Hợp đồng lao động, thông tin bảo hiểm. | Payroll |
| **Attendance** | HR | Attendance | Dữ liệu quét vân tay/GPS hàng ngày. | Payroll |
| **Time Off (Leave)**| HR | Leave Request| Đơn xin nghỉ phép, Quỹ phép. | Attendance, Payroll |
| **Overtime** | HR | Overtime Req | Đơn xin tăng ca, duyệt giờ làm thêm. | Payroll |
| **Payroll** | HR/Finance| Payslip | Bảng tính lương, cấu thành lương, phiếu lương. | Accounting |
| **CRM** | Sales | Customer | Khách hàng, báo giá. | Project |
| **Project** | Project | Project | Quản lý dự án, tiến độ. | BOQ, Production, Warehouse |
| **BOQ** | Project | BOQ Item | Bóc tách khối lượng, dự toán ngân sách. | Procurement, Material, Production |
| **Procurement** | Purchasing| PO | Đơn đặt hàng, chọn Supplier. | Warehouse, Accounting |
| **Warehouse** | Inventory | Stock, Receipt| Nhập kho, Xuất kho, Theo dõi tồn kho. | Accounting, Production |
| **Production** | Production| BOM, Work Order| Kế hoạch sản xuất, xuất vật tư, đóng gói. | QC, Project |
| **QC** | Quality | QC Issue | Báo cáo lỗi sản phẩm, sửa chữa. | Production, Project |
| **Project Cost** | Project/Fin| Cost Entry | Phân bổ chi phí nhân công ngoài, vận chuyển. | Accounting |
| **Accounting** | Finance | GL Entry | Core tài chính: Sổ cái, Thu/Chi, Công nợ. | Toàn bộ (Nhận data từ module khác) |
| **Document Center**| System | Document | Lưu trữ văn bản pháp lý, hồ sơ đính kèm. | Toàn bộ hệ thống |
| **Audit** | System | Audit Log | Ghi vết hành động nhạy cảm của users. | Toàn bộ hệ thống |

---
**Quy tắc Integration:**
- Module Downstream chỉ được lấy dữ liệu (READ) từ Owner, hoặc nhận Event trigger từ Owner.
- Không cho phép ghi đè (WRITE) dữ liệu sang Master Table của Module khác. Nếu cần, tạo Request/Transaction để Owner tự xử lý.
