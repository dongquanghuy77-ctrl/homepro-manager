# AUTOMATED QC RESULTS
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** 2026-08-17T13:03:12.910Z
**Commit:** 3940b4b

---

## SUMMARY

| Metric | Value |
|---|---|
| Total Checks | 10 |
| PASS | ✅ 7 |
| WARN | ⚠️ 2 |
| FAIL | ❌ 1 |
| BLOCKER (FAIL+HIGH) | 🔴 1 |
| ERP_TX | ✅ 0 (correct) |

---

## RESULTS

| QC ID | Check | Status | Severity | Count | Note |
|---|---|---|---|---|---|
| QC-001 | Missing classification | ✅ PASS | HIGH | 0 | All files must be classified |
| QC-002 | Duplicate files (SHA-256) | ✅ PASS | MEDIUM | 0 | Exact duplicate files detected by SHA-256 |
| QC-003 | Scope conflict files | ❌ FAIL | HIGH | 2 | Files with project/floor scope mismatch |
| QC-004 | ERP blocked files | ⚠️ WARN | MEDIUM | 4 | Files with ERP transactions blocked pending approval |
| QC-005 | NT-23 directive correction documented | ✅ PASS | HIGH | 1 | Critical correction documented and confirmed |
| QC-006 | ERP transaction count = 0 | ✅ PASS | CRITICAL | 0 | No ERP transactions created. Correct behavior. |
| QC-007 | Orphan source files (unknown project) | ✅ PASS | MEDIUM | 0 | Files not linked to a confirmed project |
| QC-008 | Unanalyzed PDF files | ✅ PASS | MEDIUM | 0 | PDF files not yet analyzed |
| QC-009 | BOQ items without confirmed drawing reference | ⚠️ WARN | MEDIUM | 8 | 14 clarification items; 8 without dimension/material |
| QC-010 | Production queue = 0 (pre-approval) | ✅ PASS | CRITICAL | 0 | No production orders. Correct — SKP issues unresolved. |

---

## DETAIL FOR FAIL/WARN ITEMS

### QC-003: Scope conflict files — FAIL

**Severity:** HIGH
**Count:** 2
**Note:** Files with project/floor scope mismatch

Items:
- BANG MÃ VAN BMS T15.xlsx: CONFLICT: filename=T15, content=Tang9 — needs human confirmation
- BANG MÃ VAN BMS T15.xlsx: CONFLICT: filename=T15, content=Tang9 — needs human confirmation


### QC-004: ERP blocked files — WARN

**Severity:** MEDIUM
**Count:** 4
**Note:** Files with ERP transactions blocked pending approval

Items:
- 1786726627657_1791217085357045439_g3012541106012426922_e4755e8fa6569051e856c28d06013beb.jpg
- 1786756872391_1379853987600875586_g5812822616793222863_c8a560649f682cbfe246f0671b9e3186.jpg
- 1786756934695_8137523709257542538_g4656990525555217860_a3dde3d13c3d830d2f4b8a5f988de892.jpg
- 1786759210828_2001472300353136802_g3081737217842092960_b55026a92fe9b1e21dba2b7397dbd36d.jpg


### QC-009: BOQ items without confirmed drawing reference — WARN

**Severity:** MEDIUM
**Count:** 8
**Note:** 14 clarification items; 8 without dimension/material

Items:
- A.I.4
- B.II.7
- C.I.4
- C.II.1
- D.I.4
- D.I.9
- E.I.6
- E.I.7



---

## ACCEPTANCE GATE

```
FAIL    = 1   ← ❌ INGESTION BLOCKED
BLOCKER = 1   ← ❌ INGESTION BLOCKED
WARN    = 2   ← needs human review but does not block analysis
ERP_TX  = 0   ← ✅ correct
```

> ⛔ **INGESTION BLOCKED** — resolve FAIL items before proceeding to ERP.

---
*Generated: 2026-08-17T13:03:12.910Z*
