# P0 - MASTER DATA CONSOLIDATION FINAL DECISION

## DECISION OUTCOME

### OPTION D: Cần refactor sâu trước Accounting.
*(And specifically, Option C: Cần migration trước Payroll)*

Based on the evidence gathered via Production Data Reconciliation, 17 out of 32 active users (who rely on P0.14 Attendance and P0.18 Leave) do not exist in the newly introduced `employees` table. Furthermore, the `employees` table duplicates master HR fields already managed within the `users` table.

Therefore, the current architecture **cannot be kept** (rules out Option A). A simple compatibility layer (Option B) would be brittle because there is no single source of truth for base salary and department identity. We must undergo a full migration (Option C & D).

## Final Question Answered

> "Nếu ngày mai tôi xây Payroll + Accounting thì Employee, Contract, Salary, Attendance và Leave có cùng một nguồn dữ liệu chuẩn hay chưa?"

**TRẢ LỜI: CHƯA.**

**Minh chứng bằng Schema & Evidence:**
- **Attendance & Leave** đang chĩa vào `users.id` (thông qua `employeeId` foreign key).
- **Contract & Salary Profiles** (P0.15) đang chĩa vào `employees.id`.
- Dữ liệu Production cho thấy có sự phân mảnh (17 users không có employee record).
- Nếu Payroll chạy hôm nay, nó sẽ không thể biết nên lấy `basicSalary` từ `users` hay từ `salary_profiles`, dẫn đến sai lệch trầm trọng trong tính lương. Và từ đó Accounting sẽ nhận dữ liệu rác.

## Required Actions (Migration Strategy Approved)

Để đạt được trạng thái SẴN SÀNG cho Payroll và Accounting, chúng ta BẮT BUỘC phải thực hiện Phase 2 & Phase 3 của `EMPLOYEE_MIGRATION_PLAN.md`:

1. **Alter Table**: Thêm cột `user_id` vào `employment_contracts` và `salary_profiles`, trỏ FK thẳng về `users(id)`.
2. **Backfill**: Map toàn bộ data hiện tại của `employees` sang `user_id` tương ứng trong bảng Contracts và Salary Profiles.
3. **Drop Table**: Xóa bỏ hoàn toàn bảng `employees` (P0.15) vì nó là Duplicate Master Data.
4. **Deprecate**: Loại bỏ `officialSalary` và `basicSalary` khỏi bảng `users` TRONG TƯƠNG LAI, sau khi Payroll đã được code xong để đọc từ `salary_profiles`.

**KẾT LUẬN CUỐI CÙNG**: KHÔNG được xây Accounting cho đến khi 4 bước Migration trên được hoàn tất và deploy an toàn lên Production. Kiến trúc hiện tại tiềm ẩn nguy cơ sai lệch dòng tiền (Financial Data Risk) rất lớn do Duplicate Master Data.
