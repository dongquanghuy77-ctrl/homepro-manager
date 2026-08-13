# MASTER DATA MAP

Tài liệu này quy hoạch các nguồn dữ liệu tham chiếu gốc (Master Data) của hệ thống. 
Mỗi Master Data chỉ có MỘT nguồn chính (Single Source of Truth).
Các module khác chỉ được reference (Read-only / FK). Tuyệt đối không tạo lại bản copy của Master Data.

## 1. HỆ THỐNG / GLOBAL
| Master Data | Table Name | Owner | Downstream Usage |
|-------------|------------|-------|------------------|
| **Company** | `companies` *(To build)* | System | Kế toán, Hợp đồng, Thuế, In ấn. |
| **User** | `users` | System | Login, Auth. Mọi entity. |
| **Role** | `roles` *(Ref)* | System | Phân quyền RBAC toàn hệ thống. |
| **Document Type** | `document_types` *(To build)* | System | Quản lý File, Phân loại chứng từ. |

## 2. NHÂN SỰ (HR)
| Master Data | Table Name | Owner | Downstream Usage |
|-------------|------------|-------|------------------|
| **Department** | `departments` | HR | Sơ đồ tổ chức, Phân quyền Manager, Chấm công. |
| **Employee** | `users` | HR | Hợp đồng, Chấm công, Phép, Lương, Tài khoản, Dự án. |
| **Position** | `positions` | HR | Phân quyền, Lương, Hợp đồng. |
| **Leave Type** | `leave_types` | HR | Bảng chấm công, Lương (Deduct). |
| **Payroll Policy** | `payroll_policies` *(To build)* | HR | Công thức tính lương tự động. |
| **Salary Component**| `salary_components` *(To build)*| HR | Các khoản phụ cấp/khấu trừ linh động. |

## 3. DỰ ÁN & ĐỐI TÁC
| Master Data | Table Name | Owner | Downstream Usage |
|-------------|------------|-------|------------------|
| **Customer** | `customers` | Sales | Hợp đồng dự án, Công nợ, Giao hàng. |
| **Supplier** | `suppliers` *(To build)* | Purchasing | Đơn mua hàng (PO), Thanh toán, Kho. |
| **Project** | `projects` | Project | Kế hoạch dự án, BOQ, Tracking, Kế toán giá thành. |
| **Project Status** | `project_statuses` *(Ref)*| Project | Trạng thái vòng đời dự án. |

## 4. VẬT TƯ & KHO
| Master Data | Table Name | Owner | Downstream Usage |
|-------------|------------|-------|------------------|
| **Material** | `materials` | Inventory | BOQ, BOM, PO, Phiếu xuất nhập kho. |
| **Material Category**| `material_categories`*(To build)*| Inventory | Phân loại báo cáo vật tư. |
| **Warehouse** | `warehouses` *(To build)* | Inventory | Địa điểm lưu trữ, Chuyển kho, Tồn kho. |
| **Unit** | `units` *(Ref)* | Inventory | Đơn vị đo lường chuẩn hóa. |

## 5. TÀI CHÍNH KẾ TOÁN
| Master Data | Table Name | Owner | Downstream Usage |
|-------------|------------|-------|------------------|
| **Chart of Account**| `accounts` *(To build)* | Finance | Tài khoản kế toán tổng hợp. Ghi nhận giao dịch. |
| **Tax Code** | `tax_codes` *(To build)* | Finance | Mức thuế suất (VAT, PIT, CIT). |
| **Bank Account** | `bank_accounts` *(To build)* | Finance | Thông tin ngân hàng của nhân viên/đối tác. |

## QUY TẮC BẢO TRÌ MASTER DATA
1. **NO HARD DELETE**: Dữ liệu Master Data khi đã được tham chiếu bởi bất kỳ Transaction nào thì tuyệt đối không được xóa (`DELETE`). Chỉ được phép chuyển trạng thái `isActive = false` hoặc `status = 'INACTIVE'`.
2. **CENTRALIZED CREATION**: Master Data chỉ được tạo/sửa thông qua giao diện Admin riêng biệt (hoặc Role được cấp quyền `MANAGE_MASTER_DATA`), không được "Tạo nhanh" vô tội vạ trong màn hình nghiệp vụ.
