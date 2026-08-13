# HOMEPRO FINANCIAL DATA FLOW

Tài liệu này quy định luồng hạch toán tài chính (Financial Data Flow) tự động giữa các module vận hành (Operation Modules) và Kế toán (Accounting). Mục tiêu tối thượng là: **Không nhập lại dữ liệu giữa các module nếu có thể tự động liên kết.**

## 1. NGUYÊN TẮC HẠCH TOÁN (ACCOUNTING PRINCIPLES)
- Mọi nghiệp vụ sinh ra biến động tài sản/nguồn vốn đều phải được ghi nhận thành Sổ cái (General Ledger - GL Entry).
- Các module vận hành đóng vai trò là `Sub-ledger` (Sổ phụ). Khi hoàn tất quy trình, chúng sẽ bắn một Event (tạo bút toán) sang Module Accounting.

## 2. LUỒNG DỮ LIỆU TÀI CHÍNH CỤ THỂ

### 2.1. Chu trình Nhân sự & Tiền lương (HR to Payroll)
**Nghiệp vụ:** Chấm công -> Tính lương -> Ghi nhận chi phí -> Thanh toán.
- **Attendance / Leave / Overtime:** Không tạo ra bút toán kế toán, chỉ cung cấp dữ liệu định lượng.
- **Payroll (Lương tháng):**
  - Khi Phiếu lương chuyển trạng thái `PUBLISHED` (Chốt sổ).
  - Tự động sinh `Salary Expense` (Chi phí lương) và `Salary Payable` (Phải trả người lao động).
  - Bút toán:
    - Nợ: Chi phí nhân công (TK 622 / 642)
    - Có: Phải trả người lao động (TK 334)
    - Có: Các khoản trích theo lương (BHXH, BHYT - TK 338)

### 2.2. Chu trình Mua hàng & Tồn kho (Procure to Pay)
**Nghiệp vụ:** Yêu cầu mua -> Đơn hàng -> Nhập kho -> Hóa đơn -> Thanh toán.
- **Purchase Order:** Không hạch toán.
- **Warehouse (Nhập kho):**
  - Khi chốt phiếu nhập, sinh GL Entry tăng giá trị kho.
  - Bút toán:
    - Nợ: Hàng tồn kho (TK 152)
    - Có: Hàng hóa đang đi đường (TK 151) hoặc Phải trả NCC (TK 331)
- **Payment (Thanh toán):**
  - Nợ: Phải trả người bán (TK 331)
  - Có: Tiền gửi ngân hàng (TK 112)

### 2.3. Chu trình Dự án & Sản xuất (Project Costing)
**Nghiệp vụ:** Xuất vật tư -> Gia công -> Chi phí ngoại kiểm -> Bàn giao.
- **Warehouse (Xuất kho cho Sản xuất):**
  - Nợ: Chi phí SXKD dở dang (TK 154)
  - Có: Hàng tồn kho (TK 152)
- **Project Cost (Chi phí phát sinh):**
  - Nợ: Chi phí SXKD dở dang (TK 154)
  - Có: Phải trả / Tiền mặt.
- Khi Project chuyển `COMPLETED`:
  - Kết chuyển TK 154 sang Giá vốn hàng bán (TK 632).

## 3. CHUẨN BỊ CHO TƯƠNG LAI (GAP ANALYSIS)
**Hiện trạng:** Hệ thống đang thiếu toàn bộ cụm Accounting. Bảng `costs` hiện tại đang ghi nhận "Cost" nhưng chưa có đối ứng kế toán (Double-entry). 
**Hành động:** 
- Giai đoạn 1: Bổ sung bảng `accounting_ledgers` để nhận bút toán.
- Giai đoạn 2: Tạo logic Auto-post GL từ `monthly_payroll` khi chốt lương.
