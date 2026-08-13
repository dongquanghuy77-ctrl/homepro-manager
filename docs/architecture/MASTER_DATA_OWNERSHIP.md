# MASTER DATA OWNERSHIP

Tài liệu này quy định dứt khoát Module nào là chủ sở hữu (Owner) của từng loại Master Data. Tuyệt đối không duplicate dữ liệu giữa các module.

| Master Data Entity | Owner Module | Database Table | Ownership Rules & Usage |
|--------------------|--------------|----------------|-------------------------|
| **Company** | CORE (Company Master) | `companies` (New) | Nguồn duy nhất về định danh pháp nhân, mã số thuế. Finance, HR đều phải tham chiếu tới đây. |
| **Department** | CORE (Company Master) | `departments` | Nguồn duy nhất cho cây sơ đồ tổ chức. Dùng cho RBAC và Employee mapping. |
| **Employee** | HR (Core HR) | `users` | Nguồn duy nhất lưu thông tin người lao động (Profile, Lương cơ bản). Dùng chung cho Auth/Login. Không tạo bảng `payroll_employee`. |
| **Customer** | PROJECT / CRM | `customers` | Nguồn duy nhất về khách hàng. Project và Invoice/Accounting sẽ tham chiếu. |
| **Supplier** | PROCUREMENT | `suppliers` (Future) | Nguồn duy nhất về nhà cung cấp. Mua hàng và Payable/Accounting tham chiếu. |
| **Project** | PROJECT (Core) | `projects` | Nguồn duy nhất định danh dự án/công trình. BOQ, Production, Costing tham chiếu. |
| **Material** | INVENTORY | `materials` | Từ điển danh mục vật tư. BOQ, Purchasing, Warehouse tham chiếu. |
| **Bank Account** | CORE (Company Master) | `company_bank_accounts` (New) | Nguồn duy nhất lưu tài khoản ngân hàng của Công ty. Payroll, Payable, Receivable tham chiếu để sinh UNC (Ủy nhiệm chi). |
| **Contract** | LEGAL / DOCS | `contracts` (Future) | Dữ liệu hợp đồng. Kế toán/Dự án tham chiếu. Liên kết cứng tới Document Center. |
| **Document** | DOCUMENT CENTER | `documents` (Future) | Nguồn lưu trữ và tracking file đính kèm trung tâm (S3/Cloud). Đa hình (Polymorphic) trỏ tới mọi entity khác. |
