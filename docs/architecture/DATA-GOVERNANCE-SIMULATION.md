# PHASE 2 — DATA GOVERNANCE SIMULATION

## 1. MỤC TIÊU
Đảm bảo tuân thủ nguyên tắc Single Source of Truth (SSOT). Ngăn chặn tình trạng Duplicate Master Data hoặc Shadow Master Data.

## 2. BẢNG PHÂN TÍCH DATA OWNERSHIP

| Domain   | Master Table | Owner | Consumers                        | Risk |
| -------- | ------------ | ----- | -------------------------------- | ---- |
| Employee | `users`      | HR    | HR / Payroll / Accounting        | **Low** (Đã hợp nhất P0, dùng FK `employeeId`) |
| Customer | `customers`  | CRM   | CRM / Project / Accounting       | **Low** (Đã tách riêng bảng) |
| Supplier | `materials` (text) | Procure | Inventory / Accounting       | **Medium** (Tên supplier lưu dạng text ở bảng `materials`. Sẽ lỗi nếu đổi tên Supplier) |
| Material | `materials`  | Procure | BOQ / Inventory / Production     | **Low** (Đã chuẩn hóa, dùng `material_id`) |
| Project  | `projects`   | Manager | BOQ / Costing / Production       | **Low** (Dùng `project_id`) |
| Contract | N/A (Doc)    | Sales | HR / Accounting                  | **Medium** (Hợp đồng mới chỉ là files trong Document Center, chưa có data struct cứng) |
| Department | `departments` | HR | RBAC / Payroll / Operations      | **High** (Department bị tham chiếu cứng vào `users`, gây rủi ro historical data khi thuyên chuyển nhân sự) |

## 3. PHÁT HIỆN DATA RISKS (GOVERNANCE FAILURES)

### 3.1 Derived Data Incorrectly Stored
- Bảng `monthly_payroll` lưu trữ `officialSalary` và `basicSalary` tại thời điểm tính lương (Snapshot) -> **Good Practice**.
- Tuy nhiên, trong `projects`, trường `actual_cost` (nếu có tính tổng) hoặc các query tổng hợp chi phí đang phụ thuộc vào việc cộng gộp realtime bảng `costs` và `materials`. Nếu có transaction lớn, điều này sẽ làm tốn resource.

### 3.2 Shadow Master / Missing Master
- **Supplier (Nhà cung cấp)**: Hệ thống chưa có bảng `suppliers` độc lập. Trường `supplier` trong bảng `materials` đang là chuỗi text. Khi một nhà cung cấp đổi tên hoặc cần đánh giá năng lực, không có Master data để quản lý. => **Cần tạo bảng `suppliers` và thay bằng FK `supplier_id`**.
- **Location / Warehouse**: Bảng `materials` có `stock_qty` nhưng không chia theo Kho (Warehouse). Khi scale lên nhiều xưởng hoặc nhiều kho (Kho tổng, Kho xưởng 1, Kho công trình), hệ thống sẽ gãy vì chỉ có 1 số `stock_qty` duy nhất. => **Cần bảng `warehouses` và `inventory_balances` (material_id, warehouse_id, qty)**.

## 4. KẾT LUẬN & HƯỚNG XỬ LÝ (Không tạo bảng ngay lập tức)
- **Supplier Management**: Prioritize LATER.
- **Multi-Warehouse Inventory**: Prioritize NEXT (Bắt buộc trước khi Scale Phase 6).
- **Historical RBAC / Department Transfer**: Bắt buộc giải quyết (PROPOSE FIX: Bảng `employee_departments_history` hoặc lưu snapshot Department ID vào các records giao dịch thay vì join trực tiếp với users.departmentId hiện hành).
