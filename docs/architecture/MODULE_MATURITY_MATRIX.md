# Module Maturity Matrix

| Module | UI | API | DB | RBAC | Workflow | Audit | UAT | Financial Impact | Maturity | Risk |
| ------ | -- | --- | -- | ---- | -------- | ----- | --- | ---------------- | -------- | ---- |
| **Authentication & Session** | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | None | **A - PRODUCTION READY** | Low |
| **Attendance (P0.14)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | High (Payroll) | **A - PRODUCTION READY** | Low |
| **Leave Management (P0.18)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | High (Payroll) | **A - PRODUCTION READY** | Low |
| **Dashboard** | ✅ | ✅ | N/A | ✅ | N/A | N/A | ✅ | None | **A - PRODUCTION READY** | Low |
| **Payroll (Sprint 3)** | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | Critical | **B - INCOMPLETE** | Medium |
| **Projects** | ⚠️ | ✅ | ✅ | ❌ | ⚠️ | ❌ | ❌ | High (Revenue) | **C - FOUNDATION ONLY** | High |
| **Tasks** | ⚠️ | ✅ | ✅ | ❌ | ⚠️ | ❌ | ❌ | Low | **C - FOUNDATION ONLY** | High |
| **Materials / Inventory** | ⚠️ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | High (Cost) | **C - FOUNDATION ONLY** | High |
| **Production (BOM)** | ⚠️ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | High (Cost) | **C - FOUNDATION ONLY** | High |
| **QC (Quality Control)** | ⚠️ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | Low | **C - FOUNDATION ONLY** | High |
| **Contract Management** | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | Critical | **F - ARCHITECTURE RISK** | Critical |
| **Accounting / Finance** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Critical | **E - MISSING** | N/A |

### Note on Module Classifications
- **Contract Management (F - ARCHITECTURE RISK)**: The schema contains `employees`, `employment_contracts`, and `salary_profiles` tables which duplicate the master data already present in the `users` table (which holds `officialSalary`, `basicSalary`, `employmentType`, `employeeStatus`). This duplicate ownership of the Employee business fact causes significant risks to Data Integrity and Payroll calculations.
- **Projects/Tasks/Materials (C - FOUNDATION ONLY)**: Schema exists, but lacks robust RBAC and strict state machines.
- **Accounting / Finance (E - MISSING)**: Requires upstream modules (Payroll, Purchasing, Projects) to be fully hardened before implementation.
