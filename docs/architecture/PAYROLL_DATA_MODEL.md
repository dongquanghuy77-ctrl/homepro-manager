# Payroll Data Model

## 1. Core Entities

### Canonical User / Employee (`users`)
- `id` (PK)
- `officialSalary` / `basicSalary` (Legacy fallback. Will be migrated entirely to `salary_profiles`).

### Salary Profile (`salary_profiles`)
Defines the base rules for a specific period of time.
- `id`
- `user_id` (FK to `users.id`)
- `base_salary`: Lương đóng BHXH (Basic Salary)
- `official_salary`: Lương thỏa thuận thực tế (Gross)
- `effective_from`
- `effective_to`
- `status`: `ACTIVE` | `ARCHIVED`

### Salary Components (`salary_components` & `employee_salary_components`)
Defines recurring additions/deductions (e.g., Housing Allowance, Meal Allowance).
- `type`: `ALLOWANCE` | `DEDUCTION`
- `taxable`: `boolean` (Is this component subject to PIT?)
- `is_bhxh`: `boolean` (Is this included in BHXH calculation?)

### Monthly Payroll (`monthly_payroll`)
The **immutable snapshot** of a payroll period.
- `id`
- `employee_id` (FK to `users.id`)
- `month`, `year`
- `status`: `DRAFT` | `PUBLISHED`
- **Snapshot fields**: `official_salary`, `basic_salary`.
- **Inputs**: `regular_worked_days`, `paid_leave_days`, `evening_ot_hours`, `absent_days`, etc.
- **Computed Outputs**: `gross_earnings`, `net_salary`, `bhxh_employee`, `bhxh_employer`, `total_deductions`.
- **Line Items (`line_items_json`)**: Detailed JSON breakdown (e.g., `[{ "code": "OT_NIGHT", "amount": 500000 }, ...]`).

## 2. Relationships
- `users` (1) ─── (N) `monthly_payroll`
- `users` (1) ─── (N) `salary_profiles` (Only 1 `ACTIVE` at a time)
- `users` (1) ─── (N) `employee_salary_components`
