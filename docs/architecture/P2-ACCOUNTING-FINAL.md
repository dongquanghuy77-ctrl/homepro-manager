# P2 ACCOUNTING CORE — CLOSURE REPORT

## 1. Mục Tiêu & Trạng Thái
- **Mục tiêu**: Xây dựng Foundation Kế toán (Sổ cái & Hạch toán kép) để hứng dữ liệu từ các module HR, Payroll, Purchasing.
- **Trạng thái**: **P2 = CLOSED**
- **Quyết định Kỹ thuật**: Sử dụng chuẩn Hệ thống Tài khoản Kế toán Việt Nam (Thông tư 200). Đảm bảo tính toàn vẹn của Double-Entry (Nợ = Có) ở cấp độ Service trước khi Insert vào DB.

## 2. Những Thay Đổi Cốt Lõi (Architecture)
1. **Database Schema (`schema.ts`)**:
   - Thêm bảng `accounts` (Sổ cái - Chart of Accounts).
   - Thêm bảng `accounting_periods` (Kỳ kế toán - vd: 08/2026).
   - Thêm bảng `journal_entries` & `journal_entry_lines` (Phiếu hạch toán và Chi tiết hạch toán).
2. **Double-Entry Engine (`AccountingService`)**:
   - Tự động kiểm tra `totalDebit === totalCredit`.
   - Ngăn chặn ghi đè/xóa sửa vào các Kỳ kế toán đã khóa (`CLOSED`).
3. **Payroll Bridge Integration (`api/hr/payroll/publish`)**:
   - Khi Payroll được `PUBLISH`, hệ thống tự động gọi `AccountingService.createJournalEntry()`.
   - Tự động map: 
     - Chi phí lương (Nợ 6421).
     - Thuế TNCN (Có 3335).
     - Bảo hiểm XH (Có 3383).
     - Thực lĩnh (Có 3341).
4. **UI Dashboards**:
   - `/accounting/accounts`: Quản lý danh mục Sổ cái.
   - `/accounting/journal-entries`: Danh sách phiếu hạch toán phát sinh tự động/thủ công.

## 3. Data Reconciliation & Seed
- Hệ thống đã được Seed toàn bộ khung Sổ cái (16 tài khoản cốt lõi của TT200).
- Hệ thống đã được tạo sẵn Kỳ Kế Toán Mặc Định: `08-2026`.

## 4. Regression & Production Gate
- **Database Integrity**: PASS (Migration scripts chạy thành công).
- **TypeScript Compiler (`tsc`)**: PASS
- **Next.js Build (`npm run build`)**: PASS
- **P2 Accounting UAT (`uat_p2_accounting.ts`)**: PASS (Double-Entry logic strictly validated).

## 5. Sẵn Sàng Cho P3 (Purchasing / Costing)
Với Sổ Cái đã sẵn sàng, các module mua hàng (Purchasing), quản lý kho (Warehouse) hoặc kiểm soát chi phí dự án (Project Costing) ở P3 có thể an tâm tự động sinh Journal Entries mà không sợ tạo ra dữ liệu rác, đảm bảo 100% dữ liệu đổ về một báo cáo Tài chính hợp nhất.
