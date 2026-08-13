# Payroll RBAC

## 1. Roles & Permissions

- **ACCOUNTANT / HR_MANAGER**:
  - `payroll.calculate`: Can trigger the calculation engine to generate DRAFTs.
  - `payroll.view_all`: Can view all DRAFT and PUBLISHED payrolls.
  - `payroll.publish`: Can change status from DRAFT to PUBLISHED. (This action locks the record and generates Accounting entries).
  - `payroll.export`: Can export Bank Transfer Excel files.

- **MANAGER / SUPERVISOR**:
  - `payroll.view_department`: Can view PUBLISHED payrolls for their department ONLY.
  - *Note*: Managers cannot calculate or modify payroll. They can only see the final cost of their department.

- **WORKER / STAFF (Self-Service)**:
  - `payroll.view_self`: Can view their own PUBLISHED payslips.
  - `payroll.dispute`: Can raise a dispute ticket on a PUBLISHED payslip within X days.
  - *Note*: Workers CANNOT see DRAFT payrolls.

## 2. API Authorization Enforcement
Every API endpoint MUST verify the `session.role` and `session.userId`.
- `/api/hr/payroll/calculate`: Enforces `ACCOUNTANT` or `ADMIN`.
- `/api/payroll/my`: Enforces `session.userId = requested_payslip.employeeId` AND `status = 'PUBLISHED'`.
