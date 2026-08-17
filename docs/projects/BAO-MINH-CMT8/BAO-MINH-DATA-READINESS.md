# DATA READINESS REPORT
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** 2026-08-17T12:54:33.303Z
**Pipeline:** SOURCE → EXTRACT → NORMALIZE → STAGING → REVIEW → APPROVED → ERP → REPORT → AUDIT

---

## PIPELINE STATUS

| Stage | Items | Ready | Needs Review | Blocked | ERP |
|---|---|---|---|---|---|
| SOURCE | 40 files | 39 | 1 (BANG MÃ scope) | 0 | — |
| EXTRACT | 37 files processed | 37 | 0 | 0 | — |
| NORMALIZE | 82 BOQ items | 68 | 14 (CLR items) | 0 | — |
| STAGING | 16 purchase lines | 0 | 16 | 16 | — |
| REVIEW | — | — | — | — | — |
| APPROVED | 0 | — | — | — | — |
| ERP | **0 transactions** | — | — | — | ✅ CORRECT |

---

## DOMAIN READINESS

### BOQ (82 items)
| Status | Count |
|---|---|
| VERIFIED (traced to source) | 68 |
| NEEDS_CLARIFICATION | 14 |
| ERP READY | **0** — no pricing yet |

### Technical Drawings
| Drawing | Status |
|---|---|
| 060826_TKNT_VP BAO MINH.pdf (37p) | ✅ INGESTED |
| NT-23.pdf | ✅ ANALYZED (CORRECTED) — was wrongly classified |
| Pages 4-35 (3D persp.) | ⚠️ UNRESOLVED — visual inspection needed |

### Zones (8)
| Zone | Items | Area | Status |
|---|---|---|---|
| ZONE-CT | 16 | 94 m² | ⚠️ ITEMS_OK, AREA_FROM_KL |
| ZONE-GD | 11 | 26.3 m² | ⚠️ ITEMS_OK, AREA_FROM_KL |
| ZONE-HP | 7 | 23 m² | ⚠️ ITEMS_OK, AREA_FROM_KL |
| ZONE-LV | 33 | 112 m² | ⚠️ ITEMS_OK, AREA_FROM_KL |
| ZONE-SH | 0 | UNKNOWN | ❌ NO_ITEMS |
| ZONE-PT | 12 | UNKNOWN | ⚠️ ITEMS_OK, AREA_MISSING |
| ZONE-KH | 0 | UNKNOWN | ❌ NO_ITEMS — grouped |
| ZONE-HL | 2 | UNKNOWN | ✅ NOT_EXECUTED |

### Materials
| Status | Count |
|---|---|
| MATCHED (in purchase + supplier spec) | HN-111G, SC010MW, 9205S |
| NEEDS_REVIEW | MS 204 SH, Laminate vân đá, Mica xanh, THAN TRE |
| CONFIRMED | An Cuong MS-608EV (survey) |
| CONFLICT | AC-9205S (SKP) vs MS-608EV (survey) |

### Purchase Documents (4 docs, 16 lines)
| Status | Lines |
|---|---|
| ERP BLOCKED — awaiting receipt | 16/16 |
| Amount verified | 15/15 with price |
| Supplier confirmed | 0/4 documents |
| Warehouse confirmed | 0/3 locations |

### SketchUp
| Status | Count |
|---|---|
| HIGH issues | 4 |
| MEDIUM issues | 3 |
| Production ready | ❌ NOT READY |

---

## READINESS SCORECARD

| Domain | Readiness | Blocker |
|---|---|---|
| BOQ Source | 83% (68/82) | 14 clarification items |
| Technical Drawings | 60% | 32 unresolved zone pages |
| Material Master | 40% | MS 204 SH, laminate, mica missing |
| Purchase Docs | 0% ERP ready | No receipt confirmation |
| SketchUp | 0% Production ready | 4 HIGH issues |
| Pricing | 0% | No ERP prices entered |
| **OVERALL** | **~30%** | Multiple blockers |

---

## WHAT CAN BE DONE NOW (without approval)

1. ✅ Parse remaining Excel files further
2. ✅ Update directive mapping (NT-23 correction)
3. ✅ Generate review reports (this document)
4. ✅ Prepare PRICING-REVIEW template for 50 NEED_QUOTATION items
5. ✅ Cross-reference BOM Cut List with BOQ

## WHAT REQUIRES HUMAN APPROVAL

1. ❌ BOQ Pricing (50 items NEED_QUOTATION)
2. ❌ Confirm suppliers for 4 purchase documents
3. ❌ Confirm 3 warehouse addresses
4. ❌ Resolve 14 KL clarification items
5. ❌ Visual zone assignment pages 4-35
6. ❌ Resolve SKP 4 HIGH issues
7. ❌ Confirm BANG MÃ VAN BMS T15 scope (Tầng 9 vs 15)
8. ❌ NT-23 directive correction sign-off

---
*FAIL=0 | BLOCKER=0 | PENDING_APPROVAL=8 categories | Generated: 2026-08-17T12:54:33.303Z*
