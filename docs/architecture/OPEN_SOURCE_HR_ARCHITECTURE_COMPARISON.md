# Open-Source HR Architecture Benchmark

To validate our decision to consolidate `users` and `employees` (or strictly separate them), we benchmarked against leading Open-Source ERP solutions.

## 1. ERPNext / Frappe HR
- **Authentication**: `User` Document.
- **Employee Identity**: `Employee` Document. 
- **Relationship**: 1:1 mapping (User ID stored in Employee). 
- **Ownership**: ERPNext strictly separates `User` (login, permissions) from `Employee` (salary, leave, department). 
- **Why it works for them**: They built it this way from Day 1. All HR modules (Leave, Attendance, Payroll) reference `Employee`, NOT `User`.
- **Contrast to HomePro**: HomePro P0.14 (Attendance) and P0.18 (Leave) were built referencing `users`. Attempting the ERPNext model now would require rewriting the entire foundation.

## 2. Odoo (Community Edition)
- **Authentication**: `res.users`.
- **Employee Identity**: `hr.employee`.
- **Relationship**: 1:1 mapping (`user_id` inside `hr.employee`).
- **Contracts**: `hr.contract`. It links strictly to `hr.employee`. The contract defines the salary and wage.
- **Payroll**: `hr.payslip` uses the active `hr.contract` at the date of payslip generation to determine base pay.

## 3. OrangeHRM
- **Identity**: System is heavily Employee-centric. The `User` is merely an authentication wrapper around the `Employee` entity.

## Benchmark Conclusion & HomePro Strategy
While ERPNext and Odoo maintain strict separation between `User` and `Employee`, they enforce this separation uniformly across the *entire* codebase. 

In HomePro, the `users` table already evolved to become the de-facto `Employee` table (holding `employeeCode`, `departmentId`, `officialSalary`). The introduction of the `employees` table in P0.15 violated the established architecture of P0.14.

**Our Architecture Choice**:
We will adopt the **OrangeHRM pattern** (Employee-centric merged with Auth). For our scale, merging `Employee` into `User` simplifies queries, removes synchronization bugs, and aligns perfectly with our existing Attendance and Leave modules. We will use `employment_contracts` (similar to Odoo's `hr.contract`) to manage the historical lifecycle of salaries, pointing it directly at the unified `users` table.
