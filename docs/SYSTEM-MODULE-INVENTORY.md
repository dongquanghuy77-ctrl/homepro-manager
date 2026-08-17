# SYSTEM MODULE INVENTORY

## 1. Overview
The HomePro Manager application is a comprehensive ERP/Management System for a manufacturing and construction workshop.

## 2. Modules & Pages (`src/app`)
- **(worker)**: Mobile/Worker interface for shop floor tracking and attendance.
- **accounting**: General ledger, accounts, accounting periods, and journal entries.
- **admin**: Administrative panel for users, roles, and settings.
- **approval-center**: Centralized hub for manager approvals (leave, overtime, etc.).
- **attendance & attendance-gate**: Timekeeping and gate check-in/out interfaces.
- **bom (Bill of Materials)**: Management of production materials.
- **change-password**: User security settings.
- **chi-phi (Costs)**: Project and operational costs management.
- **crm (Customer Relationship Management)**: Customers, contacts, and lead tracking.
- **demo**: Demonstration pages.
- **employees & hr**: Employee records, contracts, positions, and human resources.
- **engineering**: Design and technical documentation.
- **finance**: Financial overview and reporting.
- **installation**: Field installation tracking.
- **inventory**: Warehouse stock and inventory transactions.
- **leave**: Leave requests, leave types, and leave balances.
- **login**: Authentication entry point.
- **logs**: System and HR audit logs.
- **overtime**: Overtime request management.
- **payroll & payslip**: Monthly payroll calculation, salary components, and payslips.
- **production**: Production orders, routing, and job cards.
- **progress**: Project and task progress tracking.
- **projects**: Project lifecycle management.
- **purchasing**: Suppliers, purchase orders, and prices.
- **qc (Quality Control)**: Inspections, control points, standards, issues, and NCRs.
- **settings**: Global system configuration.
- **source-center**: Material sourcing and library.
- **tasks**: Task assignment and tracking.
- **tracking**: Material and component tracking via QR codes.

## 3. API Routes (`src/app/api`)
- `/api/accounting`: Endpoints for accounts and journal entries.
- `/api/approval-center`: Endpoints for approving/rejecting requests.
- `/api/auth`: Authentication operations.
- `/api/bom` & `/api/boq`: Endpoints for BOM and Bill of Quantities.
- `/api/costs`: Project cost endpoints.
- `/api/crm` & `/api/customers`: Customer management APIs.
- `/api/dashboard`: Aggregated data for dashboards.
- `/api/delegations`: Delegation of authority.
- `/api/engineering`: Technical endpoints.
- `/api/finance`: Finance reports.
- `/api/hr`: Human resources (employees, attendance, leaves).
- `/api/import`: Data import utilities.
- `/api/installation`: Installation site tracking.
- `/api/logs`: Audit log retrieval.
- `/api/materials`: Materials and inventory APIs.
- `/api/me`: Current user profile.
- `/api/payroll`: Payroll calculation and payslip retrieval.
- `/api/projects`: Project CRUD.
- `/api/purchasing`: POs and supplier endpoints.
- `/api/qc`: Quality control inspections and issues.
- `/api/server-time`: Time synchronization.
- `/api/settings`: System settings CRUD.
- `/api/source-center`: Source catalog endpoints.
- `/api/tasks`: Task management.
- `/api/tracking`: QR code tracking endpoints.
- `/api/users`: User management.

## 4. Permissions & Roles
- **Roles**: `ADMIN`, `HR`, `MANAGER`, `SUPERVISOR`, `WORKER`, `VIEWER`.
- Module access is controlled via `permissions` and `role_permissions` tables, as well as role checks in the API routes.
