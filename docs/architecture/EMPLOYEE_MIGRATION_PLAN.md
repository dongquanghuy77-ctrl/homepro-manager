# Employee Data Migration Strategy

To resolve the duplicate `employees` table without breaking Production (P0.14, P0.18) and to safely enable Payroll and Accounting, we will follow this backward-compatible migration plan.

## Phase 1: Freeze Current Architecture
- Halt any new feature development that inserts into the `employees` table.
- Declare `users` as the definitive canonical source for Employee Data (ID, Name, Department, Status, Base Salary).

## Phase 2: Schema Compatibility Layer
- Modify the `employment_contracts` and `salary_profiles` tables.
- **Action**: Add `user_id` columns to both tables as foreign keys pointing directly to `users.id`. 
- **Action**: Make `employee_id` nullable (for backward compatibility).

## Phase 3: Data Backfill
- Run a migration script: `UPDATE employment_contracts SET user_id = (SELECT user_id FROM employees WHERE employees.id = employment_contracts.employee_id)`.
- Do the same for `salary_profiles` and `employee_salary_components`.
- This ensures that all downstream financial data is directly linked to the canonical `users.id`.

## Phase 4: Application Logic Migration
- Update `hr-core.ts` repositories and services.
- Replace any JOINs against the `employees` table with direct queries against `users`.
- Update API endpoints to fetch Employee profiles directly from `users`.

## Phase 5: Payroll Data Contract Definition
- When Payroll calculates monthly salaries, it will execute:
  1. Look up `salary_profiles` where `user_id = X` and `status = ACTIVE`.
  2. If none exist, fallback to `users.basic_salary` and `users.official_salary` (to preserve backward compatibility for the 17 legacy users).
- Snapshot this data into `monthly_payroll` so that future contract changes do not alter historical payslips.

## Phase 6: Deprecation & Removal
- Once Phase 5 is fully verified in Production, drop the `employee_id` columns from Contracts/Profiles.
- **Final Step**: Safely `DROP TABLE employees CASCADE` to permanently eliminate the architecture risk.
