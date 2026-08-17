# 08 — ERP MAPPING
## BẢO MINH CMT8 — HomePro ERP Architecture

**Generated:** 2026-08-17T08:44:21.206Z

## CRM Layer

| Entity | Value | Status |
|---|---|---|
| Customer | Công ty CP Chứng khoán Bảo Minh | ESTABLISH if not exists |
| Project Name | VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CN CMT8 - TP HCM | CREATE |
| Address | 201-203 Cách Mạng Tháng Tám, P.Bàn Cờ, Q.3, TP.HCM, Tầng 15 | CREATE |
| General Contractor | AQCONS | REFERENCE |
| Contract Type | INTERIOR FITOUT | SET |

## Project Layer

| Entity | Value | Status |
|---|---|---|
| project_code | BAO-MINH-CMT8 | CREATE |
| project_name | VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CN CMT8 | CREATE |
| location | Tầng 15, 201-203 CMT8, Q.3, TP.HCM | CREATE |
| scope | Interior Fitout — Nội thất | SET |
| owner | Công ty CP Chứng khoán Bảo Minh | LINK CRM |
| contractor | HomePro | SET |
| general_contractor | AQCONS | SET |
| status | PHASE_1_TECHNICAL_INGESTION | SET |

## Technical Document Layer

| Document | Type | Revision | Date | Status |
|---|---|---|---|---|
| 060826_TKNT_VP BAO MINH.pdf | PRIMARY_TECHNICAL | REV 0 | 05/08/2026 | ATTACH — SOURCE OF TRUTH |
| NT-23.pdf | SINGLE_DRAWING | REV 0 | 05/08/2026 | ATTACH — reference NT-23/R-01 |
| 26.07.22 HS TKYT...pdf | SUPERSEDED | PREV | 26/07/2022 | ATTACH — SUPERSEDED, do not use |

> Revision chain: REV 0 is current. When REV 1 arrives → DO NOT overwrite. Create new version record.

## Drawing Register Layer (NT-01 → NT-35)

| Page | drawing_code | item_type | ERP Item Reference | Status |
|---|---|---|---|---|
| NT-01 | MB-FLOOR | FLOOR_PLAN | Technical reference only | REGISTER |
| NT-02 | T-01 | CABINET | ERP Item T-01 | REGISTER |
| NT-03 | T-01 | CABINET | ERP Item T-01 (sheet 2) | REGISTER |
| NT-04 | V-01 | PARTITION | ERP Item V-01 | REGISTER |
| NT-05 | T-10 | CABINET | ERP Item T-10 | REGISTER |
| NT-06 | V-05 | PARTITION | ERP Item V-05 | REGISTER |
| NT-07 | V-02 | PARTITION | ERP Item V-02 | REGISTER |
| NT-08 | V-05 | PARTITION | ERP Item V-05 (sheet 2) | REGISTER |
| NT-09 | D-03 | FURNITURE | ERP Item D-03 | REGISTER |
| NT-10 | T-02 | CABINET | ERP Item T-02 | REGISTER |
| NT-11 | BL-01 | DESK | ERP Item BL-01 | REGISTER |
| NT-12 | BL-06 | DESK | ERP Item BL-06 | REGISTER |
| NT-13 | V-04 | PARTITION | ERP Item V-04 | REGISTER |
| NT-14 | G-01 | CHAIR | ERP Item G-01 | REGISTER |
| NT-15 | T-03 | CABINET | ERP Item T-03 | REGISTER |
| NT-16 | T-04 | CABINET | ERP Item T-04 | REGISTER |
| NT-17 | T-05 | CABINET | ERP Item T-05 | REGISTER |
| NT-18 | T-06 | CABINET | ERP Item T-06 | REGISTER |
| NT-19 | T-07 | CABINET | ERP Item T-07 | REGISTER |
| NT-20 | T-08 | CABINET | ERP Item T-08 | REGISTER |
| NT-21 | T-09 | CABINET | ERP Item T-09 | REGISTER |
| NT-22 | D-01 | FURNITURE | ERP Item D-01 | REGISTER |
| NT-23 | R-01 | CURTAIN_RAIL | ERP Item R-01 | REGISTER |
| NT-24 | D-02 | FURNITURE | ERP Item D-02 | REGISTER |
| NT-25 | BL-02 | DESK | ERP Item BL-02 | REGISTER |
| NT-26 | BL-04 | DESK | ERP Item BL-04 | REGISTER |
| NT-27 | BL-03 | DESK | ERP Item BL-03 | REGISTER |
| NT-28 | GD-01 | COUNTER | ERP Item GD-01 | REGISTER |
| NT-29 | MB-01 | LAYOUT_PLAN | Technical reference only | REGISTER |
| NT-30 | BL-05 | DESK | ERP Item BL-05 | REGISTER |
| NT-31 | MI-01 | INOX_DETAIL | ERP Item MI-01 | REGISTER |
| NT-32 | MI-02 | INOX_DETAIL | ERP Item MI-02 | REGISTER |
| NT-33 | V-04 | PARTITION | ERP Item V-04 (sheet 2) | REGISTER |
| NT-34 | G-02 | CHAIR | ERP Item G-02 | REGISTER |
| NT-35 | G-03 | CHAIR | ERP Item G-03 | REGISTER |

## Unique ERP Technical Items

| item_code | item_type | Pages | BOQ items linked |
|---|---|---|---|
| T-01 | CABINET | NT-02, NT-03 | C.I.4 (inferred) |
| T-02 | CABINET | NT-10 | D.I.4 (inferred) |
| T-03 | CABINET | NT-15 | B.I.5 (inferred) |
| T-04 | CABINET | NT-16 | B.II.12 (inferred) |
| T-05 | CABINET | NT-17 | B.II.12 (inferred) |
| T-06 | CABINET | NT-18 | B.II.25 (inferred) |
| T-07 | CABINET | NT-19 | B.II.26 (inferred) |
| T-08 | CABINET | NT-20 | B.II.26 (inferred) |
| T-09 | CABINET | NT-21 | B.II.27 |
| T-10 | CABINET | NT-05 | E.I.6 |
| V-01 | PARTITION | NT-04 | A.I.4, E.I.4 |
| V-02 | PARTITION | NT-07 | C.I.5 |
| V-04 | PARTITION | NT-13, NT-33 | B.II.7, B.I.4 |
| V-05 | PARTITION | NT-06, NT-08 | B.II.8, B.II.18 |
| BL-01 | DESK | NT-11 | B.II.16 |
| BL-02 | DESK | NT-25 | B.II.20 |
| BL-03 | DESK | NT-27 | B.II.22 |
| BL-04 | DESK | NT-26 | C.II.1 |
| BL-05 | DESK | NT-30 | B.II.28 |
| BL-06 | DESK | NT-12 | A.II.1 |
| GD-01 | COUNTER | NT-28 | B.II.4, B.II.6 |
| G-01 | CHAIR | NT-14 | B.II.2, A.II.2 |
| G-02 | CHAIR | NT-34 | C.II.5 |
| G-03 | CHAIR | NT-35 | D.I.9 |
| D-01 | FURNITURE | NT-22 | B.II.11, B.II.13 |
| D-02 | FURNITURE | NT-24 | B.II.15, B.II.19, B.II.24 |
| D-03 | FURNITURE | NT-09 | B.II.14 |
| R-01 | CURTAIN_RAIL | NT-23 | A.I.3, B.I.3, C.I.3, D.I.3, E.I.3 |
| MI-01 | INOX_DETAIL | NT-31 | A.I.5, E.I.5 |
| MI-02 | INOX_DETAIL | NT-32 | A.I.5, E.I.5 |
| MB-FLOOR | FLOOR_PLAN | NT-01 | Reference |
| MB-01 | LAYOUT_PLAN | NT-29 | Reference |

## BOQ Layer

| Source | Status |
|---|---|
| KL Excel (82 items, reconciled) | PHASE 1 ACCEPTED — Awaiting Human Review |
| unit_price | NULL (all 82 items — NO price assumed) |
| NEED_QUOTATION items | 50 items (scope=HOMEPRO) |
| NOT_APPLICABLE items | 32 items (CLIENT + NOT_EXECUTED) |

## BOM Layer

| Status | Condition |
|---|---|
| BOM creation | NOT YET — Only after: vật liệu + quy cách + định mức đủ rõ |
| BOM source | Requires: drawing dimensions + material specs + waste factors |
| Preliminary BOM | bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx (needs verification against technical drawings) |

## Routing / Work Order / Purchase Order

| Entity | Status |
|---|---|
| ROUTING | NOT IN PHASE 1 — Create after BOM confirmed |
| WORK ORDER | NOT IN PHASE 1 |
| PURCHASE ORDER | NOT IN PHASE 1 |
| STOCK TRANSACTION | NOT IN PHASE 1 |
| PAYMENT / ACCOUNTING | NOT IN PHASE 1 |

## Technical Dependencies Required BEFORE Production

1. Clarify 14 items (clarification_required=YES) — see REVIEW QUEUE
2. Confirm electrical preparation requirements with M&E contractor and CĐT
3. Confirm LED positions in technical drawings
4. Confirm all dimensions from drawings (NEEDS_MANUAL_REVIEW items)
5. Obtain BOM material codes from BANG MÃ VAN BMS T15.xlsx

---
*Phase 1I — ERP Mapping | FAIL=0 | Generated: 2026-08-17T08:44:21.206Z*
