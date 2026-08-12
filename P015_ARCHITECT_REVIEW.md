# P0.15-B: Architect Design Review (Round 2)

## 1. USER ↔ EMPLOYEE Constraints

**The Relationship:** `users (1) ↔ (0..1) employees`
- **Constraint Strategy**: `employees.user_id` must be `UNIQUE` and `FOREIGN KEY REFERENCES users.id ON DELETE SET NULL`.
- **User without Employee**: Valid. System Admin accounts exist solely for tech/API access and do not exist in HR payroll.
- **Employee without User**: Valid. Blue-collar workers who do not log into the software, but are tracked for attendance and payroll.
- **Duplicate Mapping**: Prevented natively by `UNIQUE(user_id)`.
- **Account Inactive vs Employee Terminated**: HR Terminated → triggers User Locked.

---

## 2. MANAGER MODEL: Source of Truth & RBAC Scope

**The Rule**: HR HIERARCHY != RBAC ACCESS SCOPE

- **`employees.manager_id`**: Strictly for HR reporting relationships (e.g., performance, direct line management). It MUST NOT automatically grant system authorization.
- **`employees.department_id`**: Organizational membership. The primary basis for Department RBAC scope.
- **`manager_departments`**: RBAC Department Access Scope. Determines which departments a `MANAGER` can access.
- **Direct Reports**: A Manager may access direct-report employees ONLY through an explicit authorization scope/permission (e.g., `employee.read.direct_reports`).
- **Cross Department Manager Example**: If Employee A (Xưởng Gỗ) reports to Manager B (Thi Công), Manager B does NOT automatically access Xưởng Gỗ. Manager B can access Employee A ONLY IF they have the explicit direct-report permission, OR if their `manager_departments` explicitly includes Xưởng Gỗ.

**Authorization Formula**:
`CAN_VIEW_EMPLOYEE = Permission AND (Department Scope OR Direct Report Scope OR Self Scope)`

---

## 3. COMPENSATION MODEL

- `salary_profiles`: Stores `base_salary`.
- `salary_components`: Lookup dictionary (`ALLOWANCE`, `BONUS`, `DEDUCTION`, `INSURANCE`, `TAX`), `taxable`.
- No hard-coded currencies. Values are `NUMERIC(15,2)`.

---

## 4. SALARY HISTORY & TEMPORAL INTEGRITY

**Rule**: No two active salary profiles can overlap.
- `CHECK (effective_from < effective_to OR effective_to IS NULL)`
- Application logic updates previous `effective_to` before insert.

---

## 5. PAYROLL SNAPSHOT STRATEGY

**Strategy: Complete Data Copy (Snapshotting)**
Once finalized, actual calculated numbers are hard-copied into the payslip record: `snapshot_base_salary`, `snapshot_total_allowance`, `snapshot_tax_deducted`, `snapshot_net_pay`. Locked via API logic.

---

## 6. DATA MIGRATION CLASSIFICATION

| Category | Definition | Fields |
| :--- | :--- | :--- |
| **A. SAFE MIGRATE** | Direct 1:1 mapping, no nulls | `name`, `employeeStatus`, `joinDate` |
| **B. MIGRATE AFTER REVIEW** | Needs transformation | `departmentId`, `employmentType` |
| **C. MANUAL INPUT REQUIRED**| Must be filled by HR | Missing `manager_id`, `officialSalary`, `employeeCode` |
| **D. DO NOT MIGRATE** | Obsolete legacy text | `users.department`, `users.position` |

---

## 7. DATA INTEGRITY (DB LEVEL)
- **UNIQUE**: `employees(employee_code)`, `employees(user_id)`
- **FOREIGN KEY**: `user_id`, `department_id`
- **CHECK**: `CHECK(effective_from <= effective_to)`
- **NOT NULL**: `full_name`, `employee_code`

---

## 8. ROLLBACK & DEPLOYMENT PHASES
Phase 1: CREATE -> Phase 2: COPY -> Phase 3: VERIFY -> Phase 4: SWITCH READ SOURCE -> Phase 5: DEPRECATE OLD DATA

---

## 9. ARCHITECT DECISION SUMMARY

> [!TIP]
> **DECISION: GO_WITH_CHANGES**

**RESOLUTION**: The critical ambiguity regarding Manager Hierarchies has been formally resolved by separating HR hierarchies from RBAC scope.

**FINAL PROPOSED MODEL**: Proceed with Entity separation and the new `AUTHORIZATION_SCOPE_MODEL`.

**MIGRATION SAFETY**: Guaranteed via Phase 1-5 Rollback strategy.

**PAYROLL SAFETY**: Hard-Copy Snapshot architecture for Finalized Payslips.
