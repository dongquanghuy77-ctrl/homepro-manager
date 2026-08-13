# Module Dependency Graph

This document illustrates the architectural and data dependencies between modules in the HomePro Manager ERP system.

## HR & Payroll Subsystem

```mermaid
graph TD
    USERS[Master Data: Users/Employees] --> ATTENDANCE[Attendance]
    USERS --> LEAVE[Leave Requests]
    USERS --> OT[Overtime]
    USERS --> CONTRACTS[Contracts & Salary Profiles]
    
    ATTENDANCE --> PAYROLL[Payroll Processing]
    LEAVE --> PAYROLL
    OT --> PAYROLL
    CONTRACTS --> PAYROLL
    
    PAYROLL --> FINANCE[Financial Data / Accounting]
```

## Production & Cost Subsystem

```mermaid
graph TD
    PROJECTS[Projects] --> TASKS[Tasks]
    PROJECTS --> BOQ[BOQ Items]
    
    MATERIALS[Master Data: Materials] --> BOQ
    MATERIALS --> PURCHASE[Purchase Orders]
    
    BOQ --> PURCHASE
    BOQ --> PRODUCTION[Production BOM]
    
    PURCHASE --> WAREHOUSE[Warehouse / Inventory]
    
    PRODUCTION --> QC[Quality Control]
    QC --> COST[Project Costs]
    
    WAREHOUSE --> COST
    TASKS --> COST
    
    COST --> FINANCE[Financial Data / Accounting]
```

## Global Dependencies

- **Master Data (Users, Departments, Roles, Permissions)**: Upstream to ALL modules for RBAC and ownership.
- **Accounting / Finance**: The ultimate downstream module. It depends entirely on upstream data contracts (Payroll outputs, Purchasing costs, Material consumption) and MUST NOT duplicate business logic for calculating those costs.

## Financial Impact Points (Integration Contracts)
1. **HR → Accounting**: `monthly_payroll` (gross earnings, deductions, net salary, employer tax/BHXH).
2. **Project → Accounting**: `costs` (material consumption, external labor, logistics).
3. **Inventory → Accounting**: Valuation of stock, goods received notes.
