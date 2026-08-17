# System Data Lineage & Traceability

## Overview

The **Data Lineage System** tracks the lifecycle and downstream dependencies of core operational entities within HomePro Manager. Its primary objective is to guarantee end-to-end traceability, allowing auditors and project managers to verify the origin and utilization of any resource.

## Traceability Pipeline Example

The system can trace a specific resource backwards (upstream) or forwards (downstream) across its entire operational lifecycle. A standard trace flow for **Materials** operates as follows:

1. **Material Definition (`materials`)**: The source record defining unit types, codes, and base pricing.
2. **Bill of Quantities (`boq_items`)**: The material is allocated to a specific project phase via BOQ.
3. **Purchase Request (`purchase_requests`)**: Based on BOQ shortages, an internal PR is generated.
4. **Purchase Order (`purchase_orders`)**: The PR is transformed into a legally binding PO sent to a supplier.
5. **Goods Receipt Note (GRN - `goods_receipts`)**: Items are received at the warehouse and cross-checked against the PO.
6. **Inventory Allocation (`inventory_balances`)**: The received materials dynamically update available warehouse stock.
7. **Production Consumption (`material_consumptions`)**: Stock is withdrawn to fulfill manufacturing work orders, linking back to the final product output.

## Technical Implementation

The Data Health Center UI provides a dynamic trace graph. By entering a root identifier (e.g., a Material ID), the API dynamically traverses the database joins—mapping `boq_items`, `purchase_request_items`, `purchase_order_items`, `goods_receipt_items`, and `material_consumptions`—to assemble a unified chain of custody.

If the chain breaks at any point (e.g., a PO was issued but GRN was never posted), the node is highlighted as `PENDING`, giving operators instant visual feedback on stalled processes.
