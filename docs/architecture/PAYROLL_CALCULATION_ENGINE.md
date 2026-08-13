# Payroll Calculation Engine

## 1. Processing Pipeline
The Calculation Engine runs asynchronously to generate a `DRAFT` payroll.

1. **Resolution Phase**:
   - Fetch all active `users`.
   - Resolve active `salary_profiles` and `employee_salary_components`.
   - If `salary_profiles` missing, fallback to `users.officialSalary` and `users.basicSalary` for backward compatibility.
2. **Attendance Aggregation**:
   - Query `attendance` (days worked, late mins).
   - Query `leave_requests` (paid leave, unpaid leave).
   - Query `overtime_requests` (approved OT hours).
3. **Gross Calculation**:
   - `Prorated Base` = `(Official Salary / Standard Working Days) * (Worked Days + Paid Leave)`.
   - `Allowances` = Sum of recurring allowances.
   - `OT Pay` = Sum of OT hours * rate.
   - `Gross Earnings` = `Prorated Base + Allowances + OT Pay`.
4. **Deductions (Vietnam Statutory Rules)**:
   - **BHXH/BHYT/BHTN**: Based on `basicSalary` (Lương cơ sở đóng BHXH) up to the legal cap.
   - **PIT (Thuế TNCN)**: Calculated on `Gross Earnings - Exemptions - BHXH Employee - Dependents`.
5. **Net Calculation**:
   - `Net Salary` = `Gross Earnings - Statutory Deductions - Other Deductions`.
6. **Snapshotting**:
   - Write everything into `monthly_payroll` table with `status = DRAFT`.
   - Serialize detailed calculation steps into `line_items_json`.

## 2. Configuration & Legal Compliance (Vietnam)
Do NOT hardcode rates like `8%`, `1.5%`, `1%` in the core loop without a configuration layer.
Use a `payroll_settings` or constant dictionary that can be versioned by effective date:
```json
{
  "bhxh_employee": 0.08,
  "bhyt_employee": 0.015,
  "bhtn_employee": 0.01,
  "base_salary_cap": 36000000,
  "personal_exemption": 11000000,
  "dependent_exemption": 4400000
}
```
