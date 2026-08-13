# MASTER SYSTEM AUDIT - FINAL REPORT

## 1. Executive Summary
An exhaustive audit of the HomePro Manager ERP system has been performed across the UI, API, Database, RBAC, and Workflow architectures. The system currently demonstrates strong stability in its foundational modules (Authentication, Dashboard, Attendance, Leave), but shows architectural risks in the downstream HR and Finance integrations (specifically regarding the recent P0.15 HR additions).

**Objective Achieved**: We have successfully mapped the current architecture, documented the risks, provided a priority matrix for future modules, and answered the core question of scalability.

## 2. Current Architecture
- **UI Architecture**: Strongly adheres to a workspace-based navigation model (`src/config/navigation.ts`). Consistent use of standard components (`DashboardShell`, `DataTable`).
- **API Architecture**: Uses Next.js App Router API endpoints with robust Zod validation.
- **RBAC**: A sophisticated multi-layered RBAC system exists (Roles + Manager Departments + Specific Permissions).

## 3. Module Maturity Matrix
See `MODULE_MATURITY_MATRIX.md` for a complete breakdown.
- **P0.14 & P0.18 (Attendance/Leave)**: A (Production Ready)
- **Payroll**: B (Incomplete)
- **Contracts**: F (Architecture Risk)

## 4. Master Data Map
| Entity | Master Source of Truth | Identified Duplicate Risk |
| ------ | ---------------------- | ------------------------- |
| Users / Employees | `users` table | `employees` table (P0.15) |
| Departments | `departments` table | Legacy string fields |
| Materials | `materials` table | N/A |
| Roles/Permissions | `role_permissions` | N/A |

## 5. Dependency Graph
See `MODULE_DEPENDENCY_GRAPH.md`.
The graph explicitly forbids building the **Accounting** module until Payroll and Inventory are frozen, as it heavily depends on downstream financial computations from these modules.

## 6. Financial Data Flow
- **Labor Costs**: `users.officialSalary` & `users.basicSalary` → `attendance` (days worked) / `overtime_requests` (hours) / `leave_requests` (paid/unpaid) → `monthly_payroll` (gross, net, tax) → **Accounting**.
- **Material Costs**: `projects` → `boq_items` → `materials` → `purchase_orders` → `costs` → **Accounting**.

## 7. RBAC Audit
- **WHO**: Roles (ADMIN, MANAGER, HR, SUPERVISOR, WORKER, VIEWER).
- **SCOPE**: `manager_departments` dictates who can view/approve/manage specific departments.
- **DELEGATION**: Temporary delegations allow SUPERVISORs to act on behalf of MANAGERs.
- **CONCLUSION**: The RBAC foundation is solid and scalable for future modules.

## 8. Workflow Audit
- **Leave**: PENDING → (PENDING_HR) → APPROVED / REJECTED (Strict 1 or 2-level approval).
- **Payroll**: DRAFT → PUBLISHED (Needs intermediate REVIEW/LOCKED state before Accounting injection).
- **Contract**: Currently missing formal state machine.

## 9. Document Architecture
Currently, attachments are handled per-module (e.g., `leave_requests.attachment_url`).
**Recommendation**: Implement a central `documents` table (Document Center) with polymorphic relationships (`entity_type`, `entity_id`) to standardize storage and RBAC for files across Contracts, Projects, and Leaves.

## 10. UI/UX Architecture
The `DashboardShell` pattern works exceptionally well. The transition from Desktop (Sidebar) to Mobile (Bottom Action) is natively supported by the UI foundation.

## 11. Database Risks
- **CRITICAL RISK**: The addition of `employees`, `employment_contracts`, `salary_profiles`, and `salary_components` in P0.15 duplicates the master data already established in the `users` table (which already handles `officialSalary`, `basicSalary`, `departmentId`, `employmentType`). 
- **Resolution Path**: Merge HR fields back to `users` as the Single Source of Truth, or strictly demarcate `users` as Auth-only and migrate ALL employee data into `employees` (a massive refactor). The safest path is treating `users` as the unified User/Employee entity (which P0.14 relies on) and linking `contracts` directly to `users`.

## 12. API Risks
Duplicate business logic in `hr-core.ts` handling the redundant `employees` entity. This must be deprecated in favor of unified `users` logic.

## 13. Audit Log Gaps
- `hr_audit_logs` exists and captures Leave/Attendance/Employee creation.
- Needs expansion to capture `monthly_payroll` publication and `contract` adjustments.

## 14-16. Missing & Incomplete Modules
- **Accounting**: Completely missing (Correctly so, pending downstream data).
- **Payroll**: Calculations exist but lack final approval/lock workflow.

## 17. Architecture Risks
If we proceed to build Accounting on top of the fragmented Employee/Contract data model, financial calculations will diverge. 

## 18-19. Recommended Module Order & Roadmap
See `NEXT_MODULE_PRIORITY.md`.
1. **P0**: Fix Employee/Contract Data Ownership.
2. **P1**: Stabilize Payroll and Document Center.
3. **P2**: Inventory and Purchasing.
4. **P3**: Accounting.

## 20-21. Regression & Production Results
- **P0.14 (Attendance)**: PASS (Verified in Production)
- **P0.18 (Leave)**: PASS (Verified in Production)
- **Master Dashboard**: PASS (Verified in Production)
- **Build / TSC**: PASS

## 22. FINAL RECOMMENDATION & ANSWER TO SCALABILITY QUESTION

> "Nếu ngày mai thêm Accounting, Purchasing, Inventory, Production, QC, Costing và Project Management vào hệ thống thì kiến trúc hiện tại có chịu được không?"

**TRẢ LỜI: KHÔNG (Chưa hoàn toàn chịu được ngay lập tức).**

**Lý do & Cách khắc phục:**
1. **Đối với Purchasing, Inventory, Production, QC, Costing, Project Management:** Kiến trúc CÓ THỂ CHỊU ĐƯỢC. Nền tảng RBAC (`permissions`, `role_permissions`) và Workspace UI đã đủ linh hoạt để cắm (plug-in) các module này vào mà không vỡ UI hay phân quyền.
2. **Đối với Accounting (Đặc biệt liên quan đến Lương/Nhân sự):** KHÔNG THỂ CHỊU ĐƯỢC nếu không giải quyết tận gốc rủi ro trùng lặp dữ liệu (Architecture Risk) giữa bảng `users` (dùng trong P0.14/P0.18) và bảng `employees` (P0.15). Kế toán sẽ không biết lấy lương cơ bản từ `users.basicSalary` hay `salary_profiles.baseSalary`.

**Hành động bắt buộc trước khi mở rộng:**
Phải thiết kế Compatibility Layer hoặc Refactor hợp nhất dữ liệu Nhân viên về MỘT Nguồn Sự Thật Duy Nhất (Single Source of Truth), sau đó chốt Data Contract của Payroll. Một khi Payroll và Purchasing xuất ra dữ liệu tài chính chuẩn (Gross, Net, Deductions, Costs), Accounting module có thể dễ dàng map vào các tài khoản kế toán.
