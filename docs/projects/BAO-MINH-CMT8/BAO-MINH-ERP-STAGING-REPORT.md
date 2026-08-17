# ERP STAGING REPORT
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** 2026-08-17T13:16:14.283Z
**Commit:** 4350467

---

## ⛔ ERP TRANSACTION POLICY

> **ERP_TRANSACTION_CREATED = 0**
>
> Không có transaction thật nào được tạo trong phiên này.
> Tất cả records bên dưới là STAGING ONLY.
> ERP insertion chỉ xảy ra sau khi:
> 1. Huy approve từng BD item
> 2. Source conflicts = 0
> 3. Lineage đầy đủ
> 4. TSC + BUILD PASS

---

## STAGING RECORD COUNT

| Entity | Staging Count | ERP Ready | Blocked By |
|---|---|---|---|
| Project | 1 | ❌ | Project record not in ERP |
| Zones | 8 | ❌ | BD-07, area data missing |
| Materials | 8 | ❌ | BD-05, BD-06, conflicts |
| Suppliers | 3 | ❌ | BD-06, BT name unconfirmed |
| BOM Van | 8 | ❌ | BD-05 (GO GHEP THANH) |
| BOM Nep | 12 | ❌ | Depends on material approval |
| Cut List Parts | 1557 | ❌ | BD-04 production lock |
| Purchase Docs | 4 | ❌ | BD-06, warehouse unknown |
| Approval Items | 7 | — | Awaiting Huy |
| Lineage Records | 36 | — | — |

---

## WHAT WILL HAPPEN AFTER APPROVAL

### After BD-01 (BANG MÃ VAN scope):
→ Material code table linked to correct project scope
→ Unlocks material master for T15

### After BD-02 (NT-23):
→ DIRECTIVE_MAPPING code updated
→ BOQ items B.II.4, B.II.6 linked to NT-23 drawing
→ Procurement chain for Quầy TT materials enabled

### After BD-03 (14 KL items):
→ 14 BOQ items get missing dimension/material/drawing
→ BOM completeness improves

### After BD-04 (SKP HIGH):
→ Production lock lifted
→ Cut list → Work Orders enabled (still needs pricing)

### After BD-05 (GO GHEP THANH):
→ Material exception resolved
→ If new PO needed: purchase request created (staged)

### After BD-06 (Purchase confirm):
→ 4 purchase documents → Stock Entry (staged)
→ Material receipt recorded

### After BD-07 (Zone pages):
→ 32 drawings linked to zones/BOQ items
→ BOQ completeness improves significantly

---

## ERP INTEGRATION PLAN

Pipeline (không được skip):

```
[NOW]    Source Documents → registered
[NOW]    Staging Data     → created (this report)
[NOW]    Lineage Matrix   → complete
[NOW]    Approval Queue   → 7 items waiting Huy

[AFTER BD-01..07 APPROVED]
         ERP Project      → create
         ERP Zones        → create
         ERP Materials    → create
         ERP Suppliers    → create
         ERP BOM          → create (linked to project)

[AFTER PRODUCTION UNLOCKED]
         ERP Work Orders  → create from Cut List
         ERP QC Records   → create

[AFTER PURCHASE CONFIRMED]
         Stock Entry      → create from phiếu nhập
         Material Request → create

[NEVER WITHOUT APPROVAL]
         Cost transactions
         Invoice records
         Payment records
```

---
*ERP_TX=0 | All data is STAGING ONLY | Generated: 2026-08-17T13:16:14.283Z*
