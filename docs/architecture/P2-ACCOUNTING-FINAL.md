# P2 ACCOUNTING CORE — FINAL HARDENING & CLOSURE REPORT

## 1. Mục Tiêu & Trạng Thái
- **Mục tiêu**: Xây dựng Foundation Kế toán cốt lõi, chuẩn bị cho Project Costing và Procurement ở P3. Đảm bảo tính toàn vẹn dữ liệu, chống duplicate (Idempotency), không thể xóa sửa Journal đã POST, và có Audit Trail minh bạch.
- **Trạng thái**: **P2 = HARDENED & COMPLETE**

## 2. Các Tính Năng Đã Hoàn Thiện (Acceptance Criteria PASS)

### 2.1. Database Schema & Migration Integrity
- Khởi tạo đầy đủ `accounts`, `accounting_periods`, `journal_entries`, `journal_entry_lines`.
- Migration lịch sử (0002, 0003) được verify và chạy thành công trên DB gốc. Script `apply_migration.ts` hoạt động ổn định. 
- Mở rộng schema để hỗ trợ `project_id`, audit fields (`created_by`, `posted_by`, `posted_at`), reversal (`reversed_by`, `reversal_of`).

### 2.2. Double-Entry Engine & Idempotency
- **Strict Double-Entry**: Dịch vụ backend tự động đối chiếu Nợ = Có ở cấp độ Transaction. Từ chối hoàn toàn các bút toán không cân, số âm, hoặc chứa đồng thời Nợ-Có trên cùng một line.
- **Idempotency (Chống trùng lặp)**: Đã thêm DB `UNIQUE CONSTRAINT` trên `(reference_type, reference_id)`. Bảng lương gọi Publish nhiều lần cũng chỉ sinh ra duy nhất **1** Phiếu hạch toán (JV).

### 2.3. Payroll Bridge Integration
- Khi HR thực hiện công bố Bảng lương (Publish), API sẽ tự động tổng hợp Lương Net (3341), BHXH (3383), Thuế TNCN (3335) và Chi phí Lương (6421).
- Tách riêng mỗi nhân viên (MonthlyPayroll) thành 1 Journal Entry để đảm bảo tính Idempotent (1:1 mapping qua `reference_id`).

### 2.4. Immutability & Reversal Workflow
- Các Phiếu hạch toán đã ở trạng thái **POSTED** thì tuyệt đối không thể Edit hoặc Delete.
- Cung cấp tính năng **Reversal**: Tạo API `/api/accounting/journal-entries/[id]/reverse` để sinh bút toán đảo (Credit ↔ Debit), tự động liên kết `reversal_of` tới phiếu gốc, và khóa phiếu gốc lại (`REVERSED`).

### 2.5. Accounting Period Control
- API thay đổi trạng thái Kỳ Kế Toán: `OPEN` -> `LOCKED` -> `CLOSED`.
- Kế toán không thể ghi nhận bút toán vào một kỳ đã đóng hoặc khóa.

### 2.6. UI Hardening & RBAC
- Giao diện Sổ Cái (`/accounting/accounts`) và Quản lý Phiếu Hạch Toán (`/accounting/journal-entries`).
- Bổ sung nút **Reverse** cho các phiếu đã POSTED ngay trên UI.
- API và UI được bảo vệ nghiêm ngặt bằng Role-based Access Control (`SYSTEM_ADMIN` / `ACCOUNTANT`).

## 3. UAT Results (scripts/uat_p2_accounting.ts)
- ✅ **Double Entry**: Rejected unbalanced entry correctly.
- ✅ **Idempotency**: Prevented duplicate JV via Database Constraints & Logic.
- ✅ **Immutable Journal & Reversal**: Reversal created, linked correctly, and original journal status changed to REVERSED.
- ✅ **Period Control & Dimensions**: Handled elegantly via Schema Constraints.

## 4. Sẵn Sàng Cho P3
Hệ thống Kế toán đã được thiết kế sẵn sàng các Dimension `project_id`, `department_id` (Cost Center). Ở Phase tiếp theo (Project Costing & Procurement), các module này có thể an toàn gọi `AccountingService.createJournalEntry` để map chi phí nguyên vật liệu, nhân công dự án về đúng tài khoản và mã dự án.
