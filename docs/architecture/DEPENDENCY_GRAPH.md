# DEPENDENCY GRAPH

Mô tả sự phụ thuộc giữa các domain nghiệp vụ trong hệ thống HomePro. Dữ liệu chảy từ Master Data xuống các Transaction Data, sau đó tổng hợp lên Reporting và Financial Ledger.

## 1. HR & PAYROLL DEPENDENCY

```
Company (Master)
 └── Department (Master)
      └── Employee (users)
           ├── Contract (Legal Profile/Document)
           ├── Salary Structure (users.basicSalary, users.officialSalary)
           ├── Attendance (attendance)
           │    └── Overtime (overtime_requests)
           └── Leave (leave_requests, leave_balances)
                 ↓
                 ↓ (Aggregation via Time & Attendance Engine)
                 ↓
               Payroll (monthly_payroll)
                 ↓
                 ↓ (Financial Post)
                 ↓
             Accounting (General Ledger)
```

## 2. PROJECT & PRODUCTION DEPENDENCY

```
Customer (Master)
 └── Contract
      └── Project (Master)
           ├── BOQ (boq_items)
           │    └── Material (Master)
           ├── Tasks / Progress (tasks, work_logs)
           ├── Procurement (Purchasing - Future)
           │    ├── Purchase Order
           │    └── Supplier (Master)
           ├── Warehouse (Inventory - Future)
           │    └── Material Tracking (material_tracking_logs)
           ├── Production (production_bom_lines)
           │    └── QC (qc_issues)
           └── Project Cost (costs)
                 ↓
                 ↓ (Cost Recognition)
                 ↓
             Accounting (General Ledger)
```

## 3. COMMERCIAL (PROCUREMENT & SALES) DEPENDENCY
```
Customer
 ├── Project
 ├── Invoice (Sales)
 └── Payment (Receipt) -> Accounting

Supplier
 ├── Contract
 ├── Purchase Order
 ├── Goods Receipt -> Warehouse
 ├── Invoice (Purchase)
 └── Payment -> Accounting
```

**Nguyên tắc cốt lõi:** Không cho phép Circular Dependency. Ví dụ, `Attendance` không bao giờ phụ thuộc vào `Payroll`. Dữ liệu một chiều chảy từ Nguồn (Source) đến Đích (Sink - thường là Accounting).
