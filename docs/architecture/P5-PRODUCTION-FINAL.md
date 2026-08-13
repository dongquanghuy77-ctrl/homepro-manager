# HOMEPro Manager - P5 PRODUCTION / MANUFACTURING CORE FINAL

## Architecture
- **Bill of Materials (BOM)**: Defines recipes (`bom_items`) required to produce a finished `material`.
- **Routing & Work Orders**: Defines the sequence of operations (e.g. `CNC` -> `ASSEMBLY`). Work Orders are auto-generated when a `Production Order` is created.
- **Material Consumption**: Atomic transaction issuing stock from P4 (`warehouses` -> `productionOrders`). Blocks start/release if dependencies fail. 
- **Production Output**: Generates Finished Goods back into P4 (`stockBalances` and `stockLedgers`), preventing over-production based on flag restrictions.
- **Scrap / Waste**: Dedicated audit logging tables tracking planned vs actual variances. 

## Concurrency & Idempotency
- **Concurrency**: `ProductionService` wraps all logic in DB transactions. Output processes lock `Production Order` rows with `FOR UPDATE` to strictly prevent over-completion.
- **Atomicity**: Issue of Raw Material and Logging of Consumption happen within the exact same PG transaction.

## Verification
- Audited via `uat_p5_production.ts` which verified end-to-end trace from Raw Material purchase in P3 -> Inventory Receipt in P4 -> Consumption in P5 -> Finished Good Output back to P4. Pass rate 100%.
