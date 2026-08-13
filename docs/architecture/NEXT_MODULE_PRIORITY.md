# Next Module Priority

| Priority | Module / Initiative | Rationale | Maturity Target |
| :--- | :--- | :--- | :--- |
| **P0** | **Master Data Consolidation & Contract Foundation** | Critical Architecture Risk. The `employees` table currently duplicates data from `users`. If left unfixed, Payroll and Contracts will have fragmented Single Sources of Truth. Must refactor Contracts to rely on `users` directly or define `users` as auth and `employees` as HR data (but strictly migrating all HR fields out of `users` into `employees` without duplication). | A |
| **P1** | **Payroll Stabilization** | Depends on Attendance, Leave, and Contracts. Essential for Financial Data Flow. Must finalize the data contract before Accounting can be built. | A |
| **P1** | **Document Architecture (Document Center)** | Prevents each module (Contracts, Leave, Projects) from building bespoke attachment logics. | B |
| **P2** | **Materials, Purchasing, & Inventory** | Required to accurately calculate project costs and manage supply chain. Downstream from BOQ. | B |
| **P3** | **Accounting / Finance Foundation** | Ultimate downstream consumer. Should not be built until Payroll and Inventory data contracts are rock solid. | C |
