# Employee Data Ownership & Canonical Source Mapping

This audit maps the business facts regarding Employees across the fragmented tables introduced during P0.15 and defines the Canonical Source (Target Architecture).

## Findings
During Sprint 3 & P0.15, the `employees` table was created as a 1:1 mapping to `users`. This caused duplication of several core attributes (e.g. `department_id`, `salary`, `status`) and fractured the Single Source of Truth.

## Business Fact Mapping

| Business Fact | Current Table | Current Field | Used By | Correct Owner | Action Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Login identity** | `users` | `username`, `pin_hash` | Auth, P0.14 | `users` | Keep as is. |
| **Employee identity** | `users` / `employees` | `id`, `employee_code` | P0.14, P0.15 | `users` | **Deprecate `employees`**. Merge identities. |
| **Department** | `users` / `employees` | `department_id` | RBAC, P0.14 | `users` | Use `users.department_id`. Remove from `employees`. |
| **Basic salary** | `users` / `salary_profiles` | `basic_salary` / `base_salary` | Payroll | `users` / `salary_profiles` | Phase out `users.basic_salary`. **Canonical**: `salary_profiles` linked directly to `users.id`. |
| **Employment Status** | `users` / `employees` | `employee_status` / `employment_status` | P0.14, Leave | `users` | Keep `users.employee_status`. |
| **Contract Lifecycle** | `employment_contracts` | `status`, `start_date` | None yet | `employment_contracts` | Point FK directly to `users.id` instead of `employees.id`. |
| **Attendance** | `attendance` | `employee_id` | P0.14 | `attendance` | Keep as is (already points to `users.id`). |
| **Leave Balance** | `leave_balances` | `employee_id` | P0.18 | `leave_balances` | Keep as is (already points to `users.id`). |

## Target Architecture

The decision is to treat `users` as the unified User+Employee master record. This prevents breaking P0.14 and P0.18 which already heavily rely on `users` for both authentication and HR context.

```text
USER (Identity + Core HR fields: department, status, role)
  │
  ├─(1:N)──────► EMPLOYMENT CONTRACT (Legal terms, contract type, dates)
  │
  ├─(1:N)──────► SALARY PROFILE (Base salary, historical salary changes)
  │
  ├─(1:N)──────► ATTENDANCE (Daily tracking)
  │
  ├─(1:N)──────► LEAVE (Requests & Balances)
  │
  └─(1:N)──────► PAYROLL (Monthly snapshots)
```

## Anti-Pattern Rules Established
1. Do **NOT** read `employees.department_id`. Use `users.department_id`.
2. Do **NOT** use `employees.id` as a foreign key for future modules. Always link to `users.id` directly.
3. Payroll will pull the `basicSalary` from the active `salary_profiles` record for the given `users.id` during the snapshot phase, falling back to `users.basicSalary` during the migration period.
