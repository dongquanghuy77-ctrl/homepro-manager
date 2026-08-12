# SCHEMA DRIFT REPORT
**Status:** AUDIT COMPLETED

This report compares the Drizzle ORM schema (`src/db/schema.ts`) against the actual Neon PostgreSQL database schema.

## ROOT CAUSE (Nguyên nhân lệch)
Mã nguồn Drizzle schema (`src/db/schema.ts`) đã được lập trình viên đi trước thiết kế thêm các tính năng mới (như quản lý `leave_types`, luồng duyệt đa cấp `approved_by_manager`, `approved_by_hr`, `period`, `attachment_url`...). Tuy nhiên, các thay đổi này CHƯA từng được migrate (chưa chạy `drizzle-kit push` hoặc `drizzle-kit generate`) xuống cơ sở dữ liệu PostgreSQL thực tế trên NeonDB. Điều này dẫn đến tình trạng Drift (Drizzle Schema đi trước Database Schema).

## PROPOSAL (Đề xuất đồng bộ)
1. Sinh file migration: `npx drizzle-kit generate:pg`
2. Review lại file migration SQL sinh ra để đảm bảo không làm mất dữ liệu cũ.
3. Chạy lệnh áp dụng: `npx drizzle-kit push:pg` hoặc chạy script migrate.
*(Lưu ý: Theo lệnh P0.5, hiện tại nghiêm cấm thực hiện thao tác này trên DB thật. Để chạy Test P0 an toàn bằng Drizzle ORM thuần túy, các cột bị lệch trong `src/db/schema.ts` sẽ được comment out tạm thời để phản ánh đúng schema thực tế của DB).*

## Table: `attendance`

**Database Foreign Keys:**
- `employee_id` -> `users(id)`
- `corrected_by` -> `users(id)`
- `approved_by_manager` -> `users(id)`
- `approved_by_hr` -> `users(id)`
- `leave_request_id` -> `leave_requests(id)`

## Table: `departments`

**Database Foreign Keys:**
- `parent_id` -> `departments(id)`

## Table: `leave_requests`
- **MISSING_IN_DB**: Column `leave_type_id` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `period` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `attachment_url` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `approved_by_manager` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `approved_by_manager_at` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `manager_note` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `approved_by_hr` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `approved_by_hr_at` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `hr_note` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `cancelled_at` is defined in Drizzle but missing in the actual DB.
- **MISSING_IN_DB**: Column `cancel_reason` is defined in Drizzle but missing in the actual DB.

**Database Foreign Keys:**
- `employee_id` -> `users(id)`
- `reviewed_by` -> `users(id)`

## Table: `leave_types`
- **MISSING_IN_DB**: Table `leave_types` does not exist in the database.

## Table: `manager_departments`

**Database Foreign Keys:**
- `manager_id` -> `users(id)`
- `department_id` -> `departments(id)`

## Table: `users`

**Database Foreign Keys:**
- `manager_id` -> `users(id)`
- `department_id` -> `departments(id)`
