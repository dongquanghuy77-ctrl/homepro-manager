# SYSTEM DATA DICTIONARY

This document describes the schema and data models defined in `src/db/schema.ts`.

## 1. Core Models
- **`departments`**: Stores organization structures (Xưởng Gỗ, Thi Công, Kho, etc.). Self-referencing via `parentId`.
- **`users`**: Central user table encompassing authentication, HR, and payroll baseline data (e.g., `officialSalary`, `basicSalary`).
- **`permissions` & `rolePermissions`**: RBAC permissions matrix.
- **`settings`**: Key-value pairs for global system configuration.

## 2. Projects & Tasks
- **`projects`**: Construction/manufacturing projects with details like contract value, target costs, and status.
- **`tasks`**: Work items linked to projects with assignee, priority, status, and progress.
- **`workLogs`**: Daily logs recorded against tasks or projects.
- **`costs`**: Cost entries incurred by a project.

## 3. Human Resources & Attendance
- **`attendance`**: Daily timekeeping records for employees, supporting multi-source tracking (GPS, Hardware, Manual) with a 2-level approval workflow.
- **`leaveTypes` & `leaveBalances`**: Definitions of leave types and yearly balance tracking per employee.
- **`leaveRequests` & `overtimeRequests`**: Employee requests with dynamic approval levels.
- **`hrAuditLogs`**: Audit trails for HR-related actions.
- **`employees`, `employmentContracts`, `positions`**: Detailed HR records.

## 4. Payroll
- **`monthlyPayroll`**: Aggregated monthly payroll calculations including basic, official salaries, OT, deductions, and total earnings.
- **`payslipDisputes`**: Employee disputes regarding their payslips.
- **`salaryProfiles` & `salaryComponents`**: Flexible payroll component definitions.

## 5. Production & Inventory
- **`materials`**: Material catalog with stock quantity, pricing, and supplier info.
- **`boqs`, `boqSections`, `boqItems`**: Bill of Quantities associated with projects.
- **`productionBomLines`**: Break-down of components for production.
- **`materialTrackingLogs`**: Tracking of material status across stages (CNC, Dán cạnh, Đóng gói, Lắp đặt).

## 6. Quality Control (QC)
- **`qcStandards` & `qcControlPoints`**: QC requirements and stages.
- **`qcInspections`**: Inspection records mapped to projects, BOM, or routing steps.
- **`qcIssues` & `qcNcrs`**: Non-conformance reports and defect tracking.

## 7. Customer & CRM
- **`customers`**: Client organization or individual details.
- **`contacts`**: Associated contact persons for a customer.

## 8. Purchasing & Accounting
- **`suppliers`, `supplierContacts`, `supplierItems`, `supplierPrices`**: Vendor management.
- **`accounts`, `accountingPeriods`, `journalEntries`, `journalEntryLines`**: General ledger functionality.

## Enumerations
- **`ProjectStatus`**: ACTIVE, COMPLETED, ON_HOLD, CANCELLED
- **`TaskStatus`**: NOT_STARTED, IN_PROGRESS, COMPLETED, PAUSED, OVERDUE
- **`AttendanceStatus`**: PRESENT, ABSENT, LATE, HALF_DAY, ON_LEAVE, etc.
- **`LeaveRequestStatus`**: PENDING, PENDING_HR, APPROVED, REJECTED, CANCELLED
- **`UserRole`**: ADMIN, HR, MANAGER, SUPERVISOR, WORKER, VIEWER
