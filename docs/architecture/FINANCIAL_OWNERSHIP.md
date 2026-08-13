# FINANCIAL OWNERSHIP

Tài liệu này định nghĩa trách nhiệm tài chính của từng module trong hệ thống HomePro.
Nguyên tắc tối thượng: **TUYỆT ĐỐI không để Payroll, Project hoặc Warehouse tự tạo logic kế toán (sổ cái, định khoản) riêng. Tất cả phải đổ về Module Kế toán (Accounting).**

## 1. PHÂN LOẠI MODULE THEO TRÁCH NHIỆM TÀI CHÍNH

### 1.1. Module CUNG CẤP dữ liệu (Data Providers)
Các module này ghi nhận thực tế vận hành (Operations), cung cấp định lượng (Số lượng, Giờ công, Ngày phép).
- **Attendance / Leave / Overtime**: Cung cấp "Số liệu nhân sự". Không liên quan đến tiền.
- **Production / Material Tracking**: Cung cấp "Số lượng tiêu hao". Không liên quan đến tiền.
- **QC**: Đánh giá đạt/không đạt.

### 1.2. Module TẠO dữ liệu tài chính (Financial Source Modules - Sub-ledgers)
Các module này có số tiền, có giá trị, định hình nghĩa vụ tài chính nhưng KHÔNG trực tiếp chốt sổ. Chúng đóng vai trò Sổ Phụ (Sub-ledger).
- **Payroll**: Chuyển "Giờ công" thành "Tiền lương" (Salary Expense, Payable, Tax Deductions).
- **Purchasing (PO / Invoice)**: Tạo ra nghĩa vụ trả nợ (Account Payable).
- **Sales (Project Contract / Sales Invoice)**: Tạo ra quyền đòi nợ (Account Receivable) và Ghi nhận doanh thu.
- **Warehouse (Goods Receipt / Issue)**: Chuyển "Số lượng" thành "Giá trị hàng tồn kho" (Inventory Valuation).
- **Project Costs**: Chi phí phát sinh phân bổ cho dự án.

### 1.3. Module GHI NHẬN transaction (Financial Ledger)
- **Accounting (Chưa xây dựng)**: 
  - Module DUY NHẤT sở hữu Hệ thống tài khoản (Chart of Accounts).
  - Module DUY NHẤT thực hiện định khoản (Debit/Credit).
  - Mọi Source Modules (Payroll, PO, Invoice) khi hoàn thành (vd: `PUBLISHED` hoặc `APPROVED`) sẽ gửi một bản ghi cấu trúc chuẩn sang bảng `gl_entries` của Accounting.
- **Bank / Cash**: Quản lý dòng tiền thực tế ra/vào và đối soát (Reconciliation). Thanh toán tiền lương (từ Payroll) hay thanh toán nhà cung cấp (từ PO) đều phải qua đây.

### 1.4. Module TỔNG HỢP báo cáo (Financial Reporting)
- **Financial Reports**: Bảng Cân Đối Kế Toán, Báo Cáo KQKD (P&L), Lưu Chuyển Tiền Tệ. Đọc 100% từ bảng `gl_entries` của Accounting.

## 2. QUY TẮC CẤM (STRICT PROHIBITIONS)
- KHÔNG tạo cột `debit_account` hay `credit_account` bên trong bảng `monthly_payroll`. Payroll chỉ quan tâm đến "Lương cơ bản", "BHXH", "Thực nhận". Accounting Engine sẽ làm nhiệm vụ map những khoản đó vào TK 642, 334, 338.
- KHÔNG tạo bảng `project_accounting` riêng cho dự án.
- Mọi dữ liệu tài chính sinh ra từ các module Sub-ledger sau khi chốt (POST) thì không được xóa, chỉ được phép Cancel/Revert bằng bút toán đảo.
