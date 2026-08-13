# P0 MASTER DATA CONSOLIDATION — CLOSURE REPORT

## 1. Mục Tiêu & Trạng Thái
- **Mục tiêu**: Hợp nhất Employee Identity về một Single Source of Truth (`users`), loại bỏ rủi ro Duplicate Master Data gây ra bởi bảng `employees` trong P0.15, dọn đường an toàn cho các module Payroll và Accounting.
- **Trạng thái**: **P0 = CLOSED**
- **Quyết định Kỹ thuật**: Sử dụng mô hình Canonical User Identity (tương tự OrangeHRM), trong đó `users.id` đóng vai trò là danh tính nhân viên duy nhất trong toàn hệ thống.

## 2. Những Thay Đổi Cốt Lõi (Architecture Refactor)
1. **Schema Migration**:
   - Thêm `user_id` vào các bảng `employment_contracts`, `salary_profiles`, `employee_salary_components` trỏ FK về `users(id)`.
   - Nới lỏng (`DROP NOT NULL`) constraint trên cột `employee_id` cũ.
2. **Data Backfill**:
   - Chạy script migration để map toàn bộ 15 nhân viên hiện hữu từ bảng `employees` sang `user_id` trên các bảng HR Core.
3. **Application Logic (hr-core.ts)**:
   - Thay thế toàn bộ JOIN logic đối với bảng `employees`. Hiện tại API `/api/hr/employees` trực tiếp lấy dữ liệu từ bảng `users`, join với `departments` và `employment_contracts`.
   - Update / Create Employee Logic đã được viết lại để bỏ qua việc insert/update vào bảng `employees`.
   
## 3. Data Reconciliation (Trước & Sau)
- **Trước Migration**:
  - `users`: 32 records
  - `employees`: 15 records
  - 17 users (những người sử dụng P0.14 Attendance) bị "Orphan" (không có hồ sơ nhân sự).
- **Sau Migration**:
  - 100% hợp đồng lao động và hồ sơ lương đã được gán trực tiếp vào Canonical `users.id`.
  - 17 users Orphan tự động được thừa nhận là Employee hợp lệ mà không cần backfill dữ liệu giả.

## 4. Regression & Production Gate
- **Database Integrity**: PASS (Migration scripts chạy thành công trên Neon DB).
- **TypeScript Compiler (`tsc`)**: PASS
- **Next.js Build (`npm run build`)**: PASS
- **P0.14 UAT (Attendance)**: PASS (100% Matrix - Verified in Production).
- **P0.18 UAT (Leave/HR)**: PASS (Verified in Production).
- **Commit SHA**: `addf107`

## 5. Architecture Invariants (Luật Bất Thành Văn Từ Sau P0)
1. **Tuyệt đối không sử dụng bảng `employees`**. Bảng này đang trong tiến trình Deprecation (Phase 7). Mọi query về nhân sự phải lấy từ bảng `users`.
2. **Foreign Key**: Bất kỳ bảng mới nào (ví dụ: `payslips`, `accounting_entries`, `qc_tasks`) cần gán cho nhân viên đều phải lưu `user_id` trỏ về `users(id)`.
3. Bảng `employees` sẽ bị DROP hoàn toàn trong tương lai gần sau khi hệ thống Payroll vận hành ổn định.

## 6. Sẵn Sàng Cho P1 (Payroll)
Hệ thống Master Data nay đã "SẠCH". Payroll hoàn toàn có thể an tâm lấy `basicSalary` từ `salary_profiles` (ưu tiên) hoặc fallback về `users.officialSalary` thông qua một Query duy nhất trên `users.id`. Kiến trúc này giải quyết triệt để rủi ro phân mảnh dòng tiền của Accounting.
