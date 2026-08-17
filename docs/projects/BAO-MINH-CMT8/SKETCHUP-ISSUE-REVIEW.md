# SKETCHUP ISSUE REVIEW
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** 2026-08-17T12:54:33.303Z
**Source:** Phase 3I design-vs-survey.json, Phase 4 material-ingestion, this session NT-23 analysis

---

| ID | Severity | Type | Status |
|---|---|---|---|
| SKP-01 | HIGH | DIMENSION_CONFLICT | PENDING_HUMAN_REVIEW |
| SKP-02 | HIGH | DIMENSION_VERIFY | PENDING_HUMAN_REVIEW |
| SKP-03 | HIGH | STRUCTURAL_RISK | PENDING_HUMAN_REVIEW |
| SKP-04 | MEDIUM | MATERIAL_CONFLICT | PENDING_HUMAN_REVIEW |
| SKP-05 | MEDIUM | MATERIAL_CONFLICT | PENDING_HUMAN_REVIEW |
| SKP-06 | MEDIUM | NEW_MATERIAL | PENDING_HUMAN_REVIEW |
| SKP-07 | HIGH | DIRECTIVE_ERROR | PENDING_HUMAN_REVIEW |

---

## SKP-01 — HIGH: Ceiling height: Design 2540mm vs Survey UNMEASURED

| Field | Value |
|---|---|
| ID | SKP-01 |
| Severity | **HIGH** |
| Type | DIMENSION_CONFLICT |
| Description | Ceiling height: Design 2540mm vs Survey UNMEASURED |
| Source | Phase 3I design-vs-survey.json |
| Evidence | SKP model ceiling h=2540mm, survey shows high MEP density |
| Proposed Resolution | Measure actual clearance from slab to lowest MEP obstruction |
| Approval Required | **YES — Human must approve** |
| Current Status | ⏳ PENDING_HUMAN_REVIEW |


## SKP-02 — HIGH: Total furniture run: Design 10470mm — survey not measured

| Field | Value |
|---|---|
| ID | SKP-02 |
| Severity | **HIGH** |
| Type | DIMENSION_VERIFY |
| Description | Total furniture run: Design 10470mm — survey not measured |
| Source | Phase 3I design-vs-survey.json |
| Evidence | SKP total furniture run 10470mm vs site not yet measured |
| Proposed Resolution | Physical measurement at site before cutting |
| Approval Required | **YES — Human must approve** |
| Current Status | ⏳ PENDING_HUMAN_REVIEW |


## SKP-03 — HIGH: Structural obstruction / MEP column risk

| Field | Value |
|---|---|
| ID | SKP-03 |
| Severity | **HIGH** |
| Type | STRUCTURAL_RISK |
| Description | Structural obstruction / MEP column risk |
| Source | Phase 2 RISK-001..004 |
| Evidence | Survey photos S01-S14 show high MEP density |
| Proposed Resolution | On-site survey with tape measure + MEP coordination |
| Approval Required | **YES — Human must approve** |
| Current Status | ⏳ PENDING_HUMAN_REVIEW |


## SKP-04 — MEDIUM: Material: AC-9205S (SKP) vs MS-608EV (Survey confirmed)

| Field | Value |
|---|---|
| ID | SKP-04 |
| Severity | **MEDIUM** |
| Type | MATERIAL_CONFLICT |
| Description | Material: AC-9205S (SKP) vs MS-608EV (Survey confirmed) |
| Source | Phase 3G material-master.json, Phase 2 M05/M06 |
| Evidence | SKP uses AC-9205S, Survey photos show MS-608EV (An Cuong) |
| Proposed Resolution | Confirm with designer: which material is correct for T15? |
| Approval Required | **YES — Human must approve** |
| Current Status | ⏳ PENDING_HUMAN_REVIEW |


## SKP-05 — MEDIUM: 825 components use color #8208ec placeholder (not real material)

| Field | Value |
|---|---|
| ID | SKP-05 |
| Severity | **MEDIUM** |
| Type | MATERIAL_CONFLICT |
| Description | 825 components use color #8208ec placeholder (not real material) |
| Source | Phase 3F material-master.json |
| Evidence | 825/1325 production candidates have color placeholder |
| Proposed Resolution | Map each placeholder to real material code before cutting |
| Approval Required | **YES — Human must approve** |
| Current Status | ⏳ PENDING_HUMAN_REVIEW |


## SKP-06 — MEDIUM: LDF E2 (Low-Density Fiberboard) found in PO but NOT in SKP model

| Field | Value |
|---|---|
| ID | SKP-06 |
| Severity | **MEDIUM** |
| Type | NEW_MATERIAL |
| Description | LDF E2 (Low-Density Fiberboard) found in PO but NOT in SKP model |
| Source | Phase 4 material-ingestion-reconciliation.json |
| Evidence | SOURCE-04 lines L4-L08, L4-L09 have LDF E2 |
| Proposed Resolution | Confirm with designer: is LDF E2 replacement for any SKP component? |
| Approval Required | **YES — Human must approve** |
| Current Status | ⏳ PENDING_HUMAN_REVIEW |


## SKP-07 — HIGH: NT-23 drawing_code R-01 title was wrong in Phase 1B directive

| Field | Value |
|---|---|
| ID | SKP-07 |
| Severity | **HIGH** |
| Type | DIRECTIVE_ERROR |
| Description | NT-23 drawing_code R-01 title was wrong in Phase 1B directive |
| Source | NT-23.pdf text layer (this session) |
| Evidence | Directive said "Rèm/Rãnh" but actual title is "QUẦY TIẾP TÂN" (Reception Counter) |
| Proposed Resolution | Update directive mapping. Relink NT-23 to BOQ items B.II.4, B.II.6 (Quầy LT/GD) |
| Approval Required | **YES — Human must approve** |
| Current Status | ⏳ PENDING_HUMAN_REVIEW |



---

## Summary

- **HIGH severity:** 4 issues
- **MEDIUM severity:** 3 issues
- **All issues require human approval before proceeding to production**

> **Quan trọng:** Không tạo Production Order, Work Order, hay BOM từ SketchUp cho đến khi tất cả issues HIGH được resolve.

---
*FAIL=0 | BLOCKER=0 | ISSUES_HIGH=4 | Generated: 2026-08-17T12:54:33.303Z*
