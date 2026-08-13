# Payroll UAT Matrix

## 1. Test Accounts
- `admin` (Role: ADMIN)
- `hra` (Role: HR)
- `letramkt` (Role: ACCOUNTANT)
- `manager` (Role: MANAGER)
- `demo` (Role: STAFF)

## 2. Test Cases

| ID | Action | Actor | Expected Result |
| :--- | :--- | :--- | :--- |
| **PY-01** | Trigger Calculation | `letramkt` | Calculates DRAFT payrolls for all active `users`. Retrieves `officialSalary` from `users` (or `salary_profiles`). |
| **PY-02** | Trigger Calculation | `demo` | HTTP 403 Forbidden. |
| **PY-03** | View DRAFT | `letramkt` | Can view the breakdown and JSON line items. |
| **PY-04** | View DRAFT | `demo` | HTTP 403 / Returns empty. Workers cannot see DRAFT. |
| **PY-05** | Publish Payroll | `letramkt` | Status changes to PUBLISHED. Timestamp recorded. |
| **PY-06** | View My Payslip | `demo` | Can view PUBLISHED payslip on `/payroll`. |
| **PY-07** | Recalculate Published | `letramkt` | Fails / Skipped. Cannot recalculate PUBLISHED payroll. |
| **PY-08** | Accounting Bridge | System | (Mock) Verification that `PUBLISHED` event is emitted. |

## 3. Execution Script
Path: `scripts/uat_payroll_prod.ts`
Will execute Playwright tests covering PY-01 through PY-07.
