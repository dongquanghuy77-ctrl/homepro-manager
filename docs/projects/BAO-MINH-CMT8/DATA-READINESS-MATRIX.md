# DATA READINESS MATRIX
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** 2026-08-17T13:03:12.910Z
**Commit:** 3940b4b

> **✅ = Complete | ⚠️ = Partial | ❌ = Not Done | 🔄 = In Progress**
> **ERP READY = TRUE only when APPROVED = TRUE**

---

## PIPELINE STATUS

```
SOURCE → ANALYZE → NORMALIZE → CROSS-REFERENCE → VALIDATE → APPROVED → ERP → REPORT → AUDIT
```

| DATA DOMAIN | SOURCE | ANALYZED | NORMALIZED | CROSS-REF | VALIDATED | APPROVED | ERP READY | Notes |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| Project | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | **❌** | Metadata complete; no ERP project record yet |
| Zones | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | **❌** | 8 zones identified; 32 pages unresolved; areas partially known |
| BOQ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | **❌** | 82 items; 14 need clarification; no pricing |
| Shop Drawings | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | **❌** | 37p ingested; pages 4-35 image-only; NT-23 corrected |
| Survey | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | **❌** | 25 files analyzed; 7 risks flagged; area not measured |
| 3D/SketchUp | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | **❌** | 7 issues (4 HIGH); 825 placeholders; production LOCKED |
| BOM | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | **❌** | BOM sheet parsed; Cut List 1000 rows under analysis |
| Cut List | ✅ | 🔄 | ❌ | ❌ | ❌ | ❌ | **❌** | Analysis in progress this session |
| Materials | ✅ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | **❌** | HN/BT/AC parsed; MS 204 SH missing; BANG MÃ scope conflict |
| Suppliers | ✅ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | **❌** | HN, BT, AC identified; not confirmed in supplier master |
| Purchase | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | **❌** | 4 docs, 16 lines; supplier/warehouse unconfirmed |
| Receiving | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | **❌** | Goods receipt not confirmed; SOURCE-001 qty vs BOQ unclear |
| Production | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **❌** | LOCKED — 4 HIGH SKP issues unresolved |
| QC | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ | **❌** | QC framework defined; automated checks running this session |
| Cost | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **❌** | No pricing in any BOQ item; 50 items NEED_QUOTATION |
| Documents | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | **❌** | All source docs registered; lineage defined |
| Images | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | **❌** | 24 images analyzed in Phase 2 |

---

## OVERALL READINESS

| Stage | Domains Complete | Domains Partial | Domains Not Done |
|---|---|---|---|
| SOURCE | 14 | 1 | 2 |
| ANALYZED | 7 | 8 | 2 |
| NORMALIZED | 4 | 5 | 8 |
| CROSS-REF | 2 | 9 | 6 |
| VALIDATED | 1 | 3 | 13 |
| **APPROVED** | **0** | **0** | **17** |
| **ERP READY** | **0** | **—** | **17** |

**Overall Readiness: ~27% toward ERP ingestion**

---

## BLOCKERS TO ERP READINESS

| # | Blocker | Domain | Owner |
|---|---|---|---|
| 1 | 14 BOQ clarification items unresolved | BOQ | Huy |
| 2 | No pricing for 50 NEED_QUOTATION items | Cost | KD team |
| 3 | 4 SKP HIGH issues unresolved | SketchUp | Huy + M&E |
| 4 | BANG MÃ VAN scope conflict | Materials | Huy |
| 5 | Supplier confirmation (4 purchase docs) | Purchase/Suppliers | Huy |
| 6 | Zone assignment for 32 drawing pages | Zones | Huy |
| 7 | Goods receipt confirmation | Receiving | Huy |
| 8 | BOM Cut List analysis pending | BOM/Cut List | In progress |

---
*ERP_TX=0 | Generated: 2026-08-17T13:03:12.910Z*
