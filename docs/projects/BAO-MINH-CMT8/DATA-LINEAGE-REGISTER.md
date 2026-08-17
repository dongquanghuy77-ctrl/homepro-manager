# DATA LINEAGE REGISTER
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** 2026-08-17T13:03:12.910Z
**Principle:** Every ERP record must be traceable to SOURCE FILE → PAGE/ROW → EXTRACTED VALUE → NORMALIZED → APPROVED

---

## LINEAGE SCHEMA

```
ERP RECORD
  ↓ approved_by, approved_at, approval_id
APPROVED RECORD
  ↓ normalized_record_id
STAGING RECORD
  ↓
EXTRACTED DATA
  ↓ source_file_id, source_hash, source_page, source_row, source_sheet, source_image
SOURCE FILE
  ↓
SOURCE LOCATION (D:\XƯỞNG HOMEPRO SG\...)
```

---

## LINEAGE FIELDS (Required for each record)

| Field | Description | Example |
|---|---|---|
| source_file_id | Inventory ID (SRC-INV-XXX) | SRC-INV-005 |
| source_filename | Original filename | NT-23.pdf |
| source_hash | SHA-256 of file | a3f9... |
| source_path | Full path | D:\XƯỞNG HOMEPRO SG\... |
| source_page | Page number (PDF) or null | 1 |
| source_row | Row number (Excel) or null | 58 |
| source_sheet | Sheet name (Excel) or null | Sheet1 |
| source_image | Image filename (for photo sources) | SRC-002.jpg |
| source_text | Extracted text | CHI TIẾT QUẦY TIẾP TÂN |
| extracted_at | When extraction ran | 2026-08-17T... |
| extracted_by | Script/method | bao-minh-nt23-analysis.js |
| normalized_at | When normalized | 2026-08-17T... |
| normalized_record_id | ID in normalized table | NORM-BOQ-B-II-4 |
| crossref_status | MATCHED / CONFLICT / MISSING | CANDIDATE |
| approval_id | Approval ticket ID | APPR-001 |
| approved_by | Who approved | Huy |
| approved_at | When approved | — |
| erp_record_id | ERP transaction ID (after approve) | — |

---

## SAMPLE LINEAGE RECORDS

### LINEAGE-001: BOQ-B-II-4 (Quầy lễ tân 3.6md)

| Field | Value |
|---|---|
| ERP Candidate | BOQ-B-II-4 (Quầy lễ tân 3.6md) |
| Source File | KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx |
| Source SHA-256 | `09dbba042536992e2ed11e75...` |
| Source Sheet | Sheet1 |
| Source Row | ~58 |
| Source Page | — |
| Extracted Value | B.II.4 | Quầy lễ tân | md | 3.6 |
| Normalized | BOQ item B.II.4, ZONE-LV, scope=HOMEPRO, qty=3.6md |
| Cross-ref | NT-23.pdf p.1 → R-01 drawing (Quầy Tiếp Tân, MDF+Laminate+Mica) |
| Approval | _(awaiting)_ |
| Approved By | _(awaiting)_ |
| Status | **STAGING** |


### LINEAGE-002: MAT-RECV-002-L01 (VÁN MDF 17LY 111G × 65)

| Field | Value |
|---|---|
| ERP Candidate | MAT-RECV-002-L01 (VÁN MDF 17LY 111G × 65) |
| Source File | PHIẾU NHẬP VẬT TƯ/...SRC-002.jpg |
| Source SHA-256 | `N/A...` |
| Source Sheet | — |
| Source Row | — |
| Source Page | 1 (image) |
| Extracted Value | 111G 2M LMR 17MM DW × 65 cuộn, 27,318,980đ |
| Normalized | VÁN MDF 17LY 111G, Hồng Nghi, qty=65, unit=TẤM/cuộn |
| Cross-ref | VẬT TƯ HỒNG NGHI.xlsx HN col qty_order2=65 ✅ MATCH |
| Approval | _(awaiting)_ |
| Approved By | _(awaiting)_ |
| Status | **STAGING — ERP BLOCKED** |


### LINEAGE-003: NT-23 → R-01 (Reception Counter)

| Field | Value |
|---|---|
| ERP Candidate | NT-23 → R-01 (Reception Counter) |
| Source File | NT-23.pdf |
| Source SHA-256 | `b1af295b12250dad518dfa54...` |
| Source Sheet | — |
| Source Row | — |
| Source Page | 1 |
| Extracted Value | CHI TIẾT QUẦY TIẾP TÂN R-01 PHÒNG LÀM VIỆC, REV 0, 05/08/2026 |
| Normalized | drawing_code=R-01, item_type=RECEPTION_COUNTER, zone=ZONE-LV, revision=REV0 |
| Cross-ref | BOQ B.II.4 (Quầy lễ tân), B.II.6 (Hệ quầy GD) — CANDIDATE, not VERIFIED |
| Approval | _(awaiting)_ |
| Approved By | _(awaiting)_ |
| Status | **STAGING — PENDING APPROVAL** |



---

## LINEAGE COVERAGE

| Domain | Total Records | With Lineage | Without Lineage | Coverage |
|---|---|---|---|---|
| BOQ Items | 82 | 68 | 14 (CLR items) | 83% |
| Material Purchase Lines | 16 | 16 | 0 | 100% |
| Shop Drawing Pages | 37 | 37 | 0 (mapped to file+page) | 100% |
| Material Codes | 8 known | 3 (HN/BT/AC) | 5 (MS204SH, etc.) | 37% |
| SketchUp Components | 1325 | 500 (≈) | 825 (placeholder) | 38% |

---
*ERP_TX=0 | Generated: 2026-08-17T13:03:12.910Z*
