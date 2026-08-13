# Production Employee Data Reconciliation

This report evaluates the current production data parity between the `users` (canonical) and `employees` (P0.15) tables to assess the impact of data duplication.

*Data sampled via `scripts/reconcile_employees_audit.ts` directly on production DB.*

## Reconciliation Results

- **Total Users (`users` table)**: 32
- **Total Employees (`employees` table)**: 15
- **Users without an `employees` record**: 17
- **Employees without a `users` record**: 0
- **Duplicate Employee-User Mappings**: 0
- **Department Mismatch**: 0 (Parity is maintained for the subset that exists)
- **Status Mismatch**: 0 (Parity is maintained for the subset that exists)

## Orphan Records Analysis
- **Contracts without Employee**: 0
- **Salary Profiles without Employee**: 0

## Conclusion
The `employees` table is currently a **sparse subset** of the `users` table. 17 active users in the system (used in P0.14 Attendance) do not even have an `employees` record. 

If we were to force `employees` as the single source of truth today, 17 users would disappear from HR modules or cause null pointer exceptions during Payroll. 

**Decision**: 
The `users` table MUST remain the canonical identity for Employee Data. The 15 records in the `employees` table provide no unique value that cannot be merged into `users` or migrated to `employment_contracts`/`salary_profiles`. We will migrate any unique downstream foreign keys (like Contracts) to point to `users.id` directly.
