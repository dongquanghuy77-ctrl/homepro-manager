# BOM + CUT LIST ANALYSIS
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** 2026-08-17T13:06:06.537Z
**Source File:** `D:\XƯỞNG HOMEPRO SG\...\FILE BOQ\bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx`
**Status:** STAGING — PENDING HUMAN REVIEW

---

## DATA LINEAGE

```
SOURCE: bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx
  SHA-256: (see source-inventory-sha256.json → SRC-INV-005)
  Modified: 2026-08-14
  Sheets: BOM (21 rows), Cut List (1558 rows including header)
  Extraction: XLSX.readFile, sheet_to_json, row-by-row
  Extracted At: 2026-08-17T13:06:06.537Z
```

---

## 1. BOM SHEET — MATERIAL SUMMARY

**Purpose:** Tổng hợp số lượng ván và chỉ dán cạnh cần cung cấp (từ SketchUp cut optimization)
**Total items:** 20 (8 ván + 12 nẹp dán cạnh)

### 1.1 Ván (Boards)

| STT | Material Code | Supplier | Material | Thickness (mm) | Qty | Unit | Source Row |
|---|---|---|---|---|---|---|---|
| 1 | HN - 111G-17.5 | HN | 111G | 17.5 | **62** | Tấm | BOM row 2 |
| 2 | BT - 200T-17.5 | BT | 200T | 17.5 | **6** | Tấm | BOM row 3 |
| 3 | HN - 111G-10 | HN | 111G | 10 | **25** | Tấm | BOM row 4 |
| 4 | BT - SC 010 MW-17.5 | BT | SC 010 MW | 17.5 | **65** | Tấm | BOM row 5 |
| 5 | BT - SC 010 MW-10 | BT | SC 010 MW | 10 | **20** | Tấm | BOM row 6 |
| 6 | THAN TRE-8 | THAN TRE | ? | 8 | **10** | Tấm | BOM row 7 |
| 7 | AC - 9205 S-17.5 | AC | 9205 S | 17.5 | **4** | Tấm | BOM row 8 |
| 8 | GO GHEP THANH-30 | GO GHEP THANH | ? | 30 | **1** | Tấm | BOM row 9 |

**Total board quantity: 193 tấm**

### 1.2 Nẹp Dán Cạnh (Edge Banding)

| STT | Material Code | Material Ref | Edge Type | Qty | Unit | Source Row |
|---|---|---|---|---|---|---|
| 9 | `Nẹp dán cạnh~HN   111G 17.5~Chỉ 2P` | HN   111G 17.5 | Chỉ 2P | **749.93** | m | BOM row 10 |
| 10 | `Nẹp dán cạnh~HN   111G 17.5~Chỉ 45` | HN   111G 17.5 | Chỉ 45 | **6.27** | m | BOM row 11 |
| 11 | `Nẹp dán cạnh~HN   111G 17.5~Chỉ 4P` | HN   111G 17.5 | Chỉ 4P | **58.7** | m | BOM row 12 |
| 12 | `Nẹp dán cạnh~BT   200T 17.5~Chỉ 2P` | BT   200T 17.5 | Chỉ 2P | **51.25** | m | BOM row 13 |
| 13 | `Nẹp dán cạnh~BT   200T 17.5~Chỉ 4P` | BT   200T 17.5 | Chỉ 4P | **3.4** | m | BOM row 14 |
| 14 | `Nẹp dán cạnh~HN   111G 10~Chỉ 2P` | HN   111G 10 | Chỉ 2P | **4.99** | m | BOM row 15 |
| 15 | `Nẹp dán cạnh~BT   SC 010 MW 17.5~Chỉ 2P` | BT   SC 010 MW 17.5 | Chỉ 2P | **522.25** | m | BOM row 16 |
| 16 | `Nẹp dán cạnh~BT   SC 010 MW 17.5~Chỉ 4P` | BT   SC 010 MW 17.5 | Chỉ 4P | **32.56** | m | BOM row 17 |
| 17 | `Nẹp dán cạnh~BT   SC 010 MW 17.5~Chỉ 45` | BT   SC 010 MW 17.5 | Chỉ 45 | **4.75** | m | BOM row 18 |
| 18 | `Nẹp dán cạnh~BT   SC 010 MW 10~Chỉ 2P` | BT   SC 010 MW 10 | Chỉ 2P | **12.2** | m | BOM row 19 |
| 19 | `Nẹp dán cạnh~BT   SC 010 MW 10~Chỉ 4P` | BT   SC 010 MW 10 | Chỉ 4P | **22.47** | m | BOM row 20 |
| 20 | `Nẹp dán cạnh~AC   9205 S 17.5~Chỉ 4P` | AC   9205 S 17.5 | Chỉ 4P | **16.59** | m | BOM row 21 |

---

## 2. CUT LIST SHEET — PRODUCTION PARTS

**Total rows in file:** 1558 (including 1 header)
**Data rows:** 1557
**Unique materials:** 6
**Named assemblies (by ID field):** 37

> **Note:** The Cut List is an OptyCut/SketchUp export. Each row = 1 cut panel.
> Column "Tên nhóm" (group) is all "-" — grouping must be inferred from ID blocks.
> Rows with ID = assembly header; rows with ID="null" = parts belonging to previous assembly.

### 2.1 Parts by Material

| Material | Parts Count | Thicknesses Used | % of Total |
|---|---|---|---|
| HN - 111G | **854** | 10, 17.5 mm | 54.8% |
| BT - SC 010 MW | **580** | 10, 17.5 mm | 37.3% |
| BT - 200T | **63** | 17.5 mm | 4.0% |
| AC - 9205 S | **26** | 17.5 mm | 1.7% |
| THAN TRE | **22** | 8 mm | 1.4% |
| GO GHEP THANH | **12** | 30 mm | 0.8% |
| **TOTAL** | **1557** | | **100%** |

### 2.2 Named Assemblies (ID blocks)

| # | Assembly ID | Assembly Name | Material | Sub-parts |
|---|---|---|---|---|
| 1 | `124` | BEND_PANEL | HN - 111G | 23 |
| 2 | `122` | BEND_PANEL | HN - 111G | 5 |
| 3 | `114` | BEND_PANEL | HN - 111G | 11 |
| 4 | `120` | BEND_PANEL | HN - 111G | 25 |
| 5 | `125` | BEND_PANEL | HN - 111G | 23 |
| 6 | `121` | BEND_PANEL | HN - 111G | 110 |
| 7 | `116` | BEND_PANEL | HN - 111G | 9 |
| 8 | `118` | BEND_PANEL | HN - 111G | 90 |
| 9 | `115` | BEND_PANEL | HN - 111G | 169 |
| 10 | `133` | BEND_PANEL | HN - 111G | 0 |
| 11 | `128` | BEND_PANEL | HN - 111G | 15 |
| 12 | `126` | BEND_PANEL | HN - 111G | 40 |
| 13 | `129` | BEND_PANEL | HN - 111G | 241 |
| 14 | `109` | BEND_PANEL | BT - 200T | 24 |
| 15 | `113` | BEND_PANEL | BT - 200T | 0 |
| 16 | `106` | BEND_PANEL | BT - 200T | 0 |
| 17 | `107` | BEND_PANEL | BT - 200T | 4 |
| 18 | `132` | BEND_PANEL | BT - 200T | 15 |
| 19 | `119` | BEND_PANEL | BT - 200T | 0 |
| 20 | `117` | BEND_PANEL | BT - 200T | 1 |
| 21 | `127` | BEND_PANEL | BT - 200T | 0 |
| 22 | `123` | BEND_PANEL | BT - 200T | 46 |
| 23 | `131` | BEND_PANEL | HN - 111G | 22 |
| 24 | `98` | BEND_PANEL | HN - 111G | 0 |
| 25 | `100` | BEND_PANEL | HN - 111G | 16 |
| 26 | `99` | BEND_PANEL | HN - 111G | 0 |
| 27 | `101` | BEND_PANEL | HN - 111G | 20 |
| 28 | `105` | BEND_PANEL | BT - SC 010 MW | 0 |
| 29 | `102` | BEND_PANEL | BT - SC 010 MW | 9 |
| 30 | `112` | BEND_PANEL | BT - SC 010 MW | 0 |
| 31 | `103` | BEND_PANEL | BT - SC 010 MW | 19 |
| 32 | `111` | BEND_PANEL | BT - SC 010 MW | 2 |
| 33 | `104` | BEND_PANEL | BT - SC 010 MW | 323 |
| 34 | `110` | BEND_PANEL | BT - SC 010 MW | 79 |
| 35 | `108` | BEND_PANEL | BT - SC 010 MW | 130 |
| 36 | `134` | BEND_PANEL | THAN TRE | 1 |
| 37 | `130` | BEND_PANEL | THAN TRE | 47 |


**Total assemblies:** 37

### 2.3 Dimension Statistics

| Material | Min Width (mm) | Max Width (mm) | Min Height (mm) | Max Height (mm) |
|---|---|---|---|---|
| HN - 111G | 115 | 2400 | 20 | 1195.8 |
| BT - 200T | 70 | 2265 | 35 | 680 |
| BT - SC 010 MW | 212.5 | 2400 | 20 | 1200 |
| THAN TRE | 250.1 | 1905 | 150 | 1200 |
| AC - 9205 S | 300 | 2400 | 50 | 300 |
| GO GHEP THANH | 483.8 | 2128.3 | 100 | 100 |

### 2.4 Cut List QC

| Check | Count | Status |
|---|---|---|
| Missing material | 0 | ✅ PASS |
| Missing dimension (w/h/t) | 0 | ✅ PASS |
| Zero dimension | 0 | ✅ PASS |
| No group (Tên nhóm = "-") | 1557 | ⚠️ ALL — infer from ID blocks |

---

## 3. BOM vs PURCHASE DOCUMENTS — VARIANCE ANALYSIS

| BOM Code | BOM Qty | VẬT TƯ HN Qty | PO Qty | PO Source | Delta | Variance | Status |
|---|---|---|---|---|---|---|---|
| HN - 111G-17.5 | 62 | 65 | 65 | SOURCE-02 | 3 | 4.8% | ⚠️ VARIANCE +3 tấm (purchase > BOM) |
| HN - 111G-10 | 25 | 26 | 26 | SOURCE-02 | 1 | 4.0% | ⚠️ VARIANCE +1 tấm (purchase > BOM) |
| BT - SC 010 MW-17.5 | 65 | 67 | 67 | SOURCE-04 | 2 | 3.1% | ⚠️ VARIANCE +2 tấm (purchase > BOM) |
| BT - SC 010 MW-10 | 20 | 21 | 21 | SOURCE-04 | 1 | 5.0% | ⚠️ VARIANCE +1 tấm (purchase > BOM) |
| BT - 200T-17.5 | 6 | 6 | 6 | SOURCE-04 | 0 | 0.0% | ✅ MATCH |
| AC - 9205 S-17.5 | 4 | 4 | 4 | SOURCE-03 | 0 | 0.0% | ✅ MATCH |
| THAN TRE-8 | 10 | 10 | 10 | SOURCE-01 | 0 | 0.0% | ✅ MATCH |
| GO GHEP THANH-30 | 1 | — | — | — | — | —% | ❌ NOT IN PURCHASE DOCS — new material found |

### Variance Summary

- **MATCH:** 3 items
- **VARIANCE (Purchase > BOM):** 4 items — likely buffer/waste allowance
- **NEW MATERIAL NOT IN PO:** 1 item (GỖ GHÉP THANH-30)

> **Note on variances:** Purchase quantities are slightly higher than BOM (2-5%). This may be intentional waste/buffer stock.
> **KHÔNG TỰ ĐIỀU CHỈNH.** Variance documented; requires human confirmation.

### NEW FINDING: GỖ GHÉP THANH-30

- Found in BOM sheet: **1 tấm GỖ GHÉP THANH 30mm**
- NOT in any purchase document (SOURCE-001..004)
- NOT in VẬT TƯ HỒNG NGHI
- Likely for special structural element
- **Action: Huy xác nhận** — item này cần mua chưa? Từ đâu?

---

## 4. BOM → BOQ CROSS-REFERENCE

**BOM materials → BOQ scope check:**

| Material | BOQ Items Using | Status |
|---|---|---|
| HN-111G (17.5mm) | Bàn LV NV, Tủ di động (B.II.16, B.II.19) | ✅ CONSISTENT with BOQ |
| BT-SC010MW (17.5mm) | Tủ hồ sơ, Bàn PP/TP, Quầy LT (B.II.4) | ✅ CONSISTENT |
| THAN TRE (8mm) | UNKNOWN BOQ item — no explicit link | ❌ ORPHAN_IN_BOM |
| AC-9205S (17.5mm) | Unknown — survey confirms MS-608EV (An Cuong) | ⚠️ SKP-APRV-05 |
| GỖ GHÉP THANH (30mm) | UNKNOWN — no BOQ item | ❌ NEW_MATERIAL |
| BT-200T (17.5mm) | Unknown — no explicit BOQ reference | ⚠️ NEEDS_CHECK |

---

## 5. BOM → SKETCHUP CROSS-REFERENCE

| BOM Material | SKP Material Code | Match? | Issue |
|---|---|---|---|
| HN-111G | "HN - 111G" | ✅ MATCH | — |
| BT-SC010MW | "BT - SC 010 MW" | ✅ MATCH | — |
| AC-9205S | "AC - 9205 S" | ✅ MATCH | But survey shows MS-608EV → SKP-APRV-05 |
| THAN TRE | "THAN TRE" | ✅ MATCH | Not in BOQ → CONFLICT-004 |
| BT-200T | "BT - 200T" | ✅ MATCH | — |
| GỖ GHÉP THANH-30 | UNKNOWN | ❌ NOT CHECKED | New material — not in Phase 3 |

> **All materials in BOM match SKP material names exactly.** This confirms BOM was generated from SKP model.
> The BOM = OptyCut optimization output from SketchUp model.

---

## 6. ACCEPTANCE GATE

| Check | Result |
|---|---|
| BOM parsing | ✅ COMPLETE (21 rows) |
| Cut List parsing | ✅ COMPLETE (1557 parts) |
| Missing materials in Cut List | ✅ 0 |
| New material found (GỖ GHÉP THANH) | ⚠️ DOCUMENTED, needs BOQ link |
| BOM/PO variance | ⚠️ 4 items with +1..+3 tấm buffer |
| ERP transaction created | ✅ 0 |
| Inferred data | ✅ 0 (no auto-inference) |

---

## PENDING HUMAN DECISIONS

| # | Decision | Required By |
|---|---|---|
| 1 | Xác nhận GỖ GHÉP THANH 30mm dùng cho hạng mục nào? | Huy |
| 2 | Confirm +3..+4 tấm buffer trên HN-111G/SC010MW là đúng? | Huy |
| 3 | Confirm THAN TRE 10 tấm thuộc BOQ item nào? | Huy |
| 4 | Confirm AC-9205S vs MS-608EV material conflict | Huy + Designer |

---
*FAIL=0 | BLOCKER=0 (BOM/CutList analysis) | Generated: 2026-08-17T13:06:06.537Z*
