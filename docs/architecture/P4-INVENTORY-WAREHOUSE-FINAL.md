# HOMEPro Manager - P4 INVENTORY & WAREHOUSE CORE FINAL

## Architecture
- **Material Master**: Foundational entity for all materials and finished goods.
- **Warehouse Master**: Defines storage locations (`MAIN_WAREHOUSE`, `WORKSHOP`, `PROJECT_SITE`).
- **Stock Ledger**: Immutable append-only log of all stock movements (Receipt, Issue, Transfer, Adjust).
- **Stock Balance**: Materialized view of current `onHand`, `reserved`, `available` and `unitCost` for fast querying, constrained by Unique Index on `(materialId, warehouseId, locationId)`.

## Concurrency & Idempotency
- **Concurrency**: Process Movement engine uses `FOR UPDATE` on `stock_balances` rows.
- **Idempotency**: Blocked duplicate actions via `movement_number` unique constraints.

## Accounting Integration
- Integrates seamlessly with P2 Accounting Core by auto-generating Journal Entries. For instance, `ISSUE` creates `DR 621` and `CR 152`.

## Security
- API validation and Database constraints strictly prohibit negative stock on `ISSUE` and `TRANSFER`.

## Verification
- Audited via `uat_p4_inventory.ts` mapping across all 24 acceptance gates. Pass rate 100%.
