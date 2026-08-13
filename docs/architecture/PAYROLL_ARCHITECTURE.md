# Payroll Architecture

## 1. Domain Overview
The Payroll system at HomePro Manager is designed to be the financial bridge between HR (Attendance, Leave, Contracts) and Accounting (Cost Centers, Expense, Liabilities).

## 2. Core Principles
1. **Single Source of Truth**: 
   - `users`: Canonical Employee Master Data.
   - `employment_contracts`: Canonical Legal/Employment relationship.
   - `salary_profiles`: Canonical rules for income generation.
   - `attendance` & `leave`: Canonical records of worked days.
   - `monthly_payroll`: The **Snapshot** and definitive ledger of computed payroll for a given period.
2. **Immutability (Snapshotting)**: 
   - Once a payroll period is computed (`DRAFT`), it takes a snapshot of `basic_salary`, `official_salary`, `allowances` at that exact point in time. 
   - Once `PUBLISHED`, the payroll is locked. Future changes to `salary_profiles` will NEVER alter past published payrolls.
3. **No Circular Dependencies**: Payroll is a pure downstream consumer. It reads from HR/Attendance and writes to Accounting.

## 3. Data Flow
```text
[ HR Core ]                [ Operations ]
  |                              |
  +-- users (Identity)           +-- attendance (Checkin/out)
  +-- employment_contracts       +-- leave_requests
  +-- salary_profiles            +-- overtime_requests
  |                              |
  v                              v
[ PAYROLL CALCULATION ENGINE ]
  |  (Applies BHXH, BHYT, PIT rules)
  v
[ MONTHLY PAYROLL (Snapshot) ]
  |  (DRAFT -> PUBLISHED)
  v
[ ACCOUNTING BRIDGE ]
  |  (Generates JV - Journal Vouchers)
  v
[ ACCOUNTING & COSTING ]
```

## 4. Open-Source Benchmark Influence
Derived from ERPNext and Odoo:
- **Salary Structure**: Like Odoo's `hr.contract` and ERPNext's `Salary Structure`, we use `salary_profiles` to map out base salary and fixed allowances.
- **Payslip**: `monthly_payroll` acts as the `hr.payslip`. It contains JSON `line_items` for granular auditing of every penny without exploding the schema with 50+ columns.
