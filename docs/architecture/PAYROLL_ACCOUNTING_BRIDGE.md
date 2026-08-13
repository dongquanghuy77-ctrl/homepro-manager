# Payroll Accounting Bridge

## 1. Philosophy
Payroll is an operational liability generator. Accounting is the system of record for all financial movements. Payroll should NOT create arbitrary accounting tables; it should interface with a standard Chart of Accounts.

## 2. Integration Point (The Bridge)
When a `monthly_payroll` record moves from `DRAFT` to `PUBLISHED`, the system must trigger an Accounting Event.

### Event: `PAYROLL_PUBLISHED`
**Action**: Generate Journal Vouchers (JVs).

**Accounting Entries (Example)**:
1. **Gross Salary Expense** (Dr. 642/622/627 - Salary Expense)
2. **Employer BHXH Expense** (Dr. 642/622/627 - Insurance Expense)
3. **Payroll Liability** (Cr. 334 - Payable to Employees)
4. **Insurance Liability** (Cr. 3383/3384/3386 - Payable to State)
5. **PIT Liability** (Cr. 3335 - Personal Income Tax Payable)

## 3. Cost Center Mapping
To allocate expenses correctly (e.g., Factory Worker vs Office Admin), the JV generation must look at the `users.departmentId` (Cost Center) or `project_id` (Project Costing) if timesheets are used.

## 4. Phase 5 Readiness
Currently, the Accounting module does not exist. 
**Implementation Rule**: Create a webhook or event emitter (`emit('PAYROLL_PUBLISHED', payrollId)`) inside the `publish` API. When Accounting is built, it simply listens to this event to generate the ledgers. Do not build the ledgers inside the HR module.
