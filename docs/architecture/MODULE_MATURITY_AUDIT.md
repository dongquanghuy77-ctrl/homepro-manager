# MODULE MATURITY AUDIT

Tài liệu này đánh giá mức độ trưởng thành (Maturity) của các phân hệ trong hệ thống hiện tại.
Chỉ đánh giá trạng thái COMPLETE khi module đáp ứng các tiêu chuẩn khắt khe về: UI, API, DB, RBAC, Validation, Workflow, Audit, Error Handling, Integration, UAT.

## TÌNH TRẠNG HIỆN TẠI

| Module | Status | Lý do / Đánh giá chi tiết |
|--------|--------|---------------------------|
| **Login / Session / Auth** | `COMPLETE` | Đã ổn định, sử dụng JWT/Session, có RBAC. |
| **RBAC / Delegation** | `COMPLETE` | Core permission và Data Scope đã chặt chẽ theo `manager_departments` và `role_permissions`. |
| **HR: Employee / Dept** | `PARTIAL` | Bảng `users` còn ôm đồm nhiều thông tin. Chưa tách biệt Employee Profile hoàn chỉnh. |
| **HR: Attendance (P0.14)** | `COMPLETE` | Có Audit Trail đầy đủ, Mobile Check-in (GPS), UAT PASS. |
| **HR: Leave (P0.18)** | `COMPLETE` | Workflow duyệt đa cấp, trừ quỹ phép, chặn xem chéo phòng ban. UAT PASS. |
| **HR: Payroll (Sprint 3)** | `COMPLETE` | Tính toán phức tạp, Payslip Disputes, DRAFT/PUBLISH states. |
| **Project / BOQ / Cost** | `PARTIAL` | Mới có cơ sở dữ liệu (`projects`, `tasks`, `boq_items`, `costs`), chưa có UI hoặc API tích hợp chuẩn, chưa có workflow rành mạch. |
| **Procurement / Inventory**| `BROKEN` / `MISSING` | Mới có danh sách `materials`. Thiếu PO, Nhập/Xuất kho, Báo giá NCC. |
| **Production / BOM** | `PARTIAL` | Có `production_bom_lines`, `material_tracking_logs`. Thiếu Work Order và Kế hoạch SX. |
| **QC** | `PARTIAL` | Có table `qc_issues`. UI/Workflow chưa đầy đủ. |
| **Accounting** | `MISSING` | Thiếu hoàn toàn. Mọi dữ liệu chi phí (Payroll, Project Cost) đang trôi nổi, chưa hội tụ về sổ cái (General Ledger). |
| **Document Center** | `MISSING` | Thiếu hoàn toàn. |

## ĐÁNH GIÁ CHUNG
Hệ thống hiện tại có khối HR & Time Tracking / Payroll được thiết kế rất tốt, kiến trúc SSOT mạnh mẽ. Tuy nhiên, khối Supply Chain (Purchasing, Warehouse) và Finance (Accounting) hoàn toàn vắng bóng hoặc chắp vá. Điều này dẫn đến rủi ro các phân hệ Project tự xây dựng "ví tiền" riêng.
Mức độ rủi ro kiến trúc: **MEDIUM - HIGH** (Cần xây dựng Accounting Core sớm trước khi các module khác bùng nổ dữ liệu tài chính).
