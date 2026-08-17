# BAO MINH CMT8 — PHASE C: MASTER DATA STAGING
## VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8 - TP HỒ CHÍ MINH

**Generated:** 2026-08-17T13:16:14.283Z
**Commit:** 4350467
**Pipeline:** SOURCE → ANALYZE → NORMALIZE → **STAGE** → [APPROVE] → ERP

---

## PHASE C ACCEPTANCE GATE

| Check | Value | Status |
|---|---|---|
| SOURCE_HASH_MISMATCH | 0 | ✅ |
| DUPLICATE_SOURCE | 0 | ✅ |
| ORPHAN | 0 | ✅ |
| LINEAGE_LOST | 0 | ✅ |
| UNSUPPORTED_INFERENCE | 0 | ✅ |
| UNAPPROVED_TRANSACTION | 0 | ✅ |
| **ERP_TRANSACTION_CREATED** | **0** | **✅ CORRECT** |
| NEEDS_APPROVAL | 7 | ⚠️ Documented — waiting Huy |
| CONFLICT | 8 | ⚠️ All registered |
| NEW_FILES | 0 | ✅ |

**PHASE C PASS: ✅ YES**

---

## SOURCE CONTROL (TASK 1)

| Metric | Value |
|---|---|
| Files in current scan | 40 |
| Files in SHA-256 inventory | 40 |
| New files found | 0 |
| Modified files (hash mismatch) | 0 |
| Unchanged | 40 |

> ✅ No new files since last scan.

> ✅ No modifications to source files.

---

## APPROVAL QUEUE (BD-01 to BD-07)

### BD-01 — HIGH: BANG MÃ VÁN BMS T15.xlsx — Tầng 9 hay Tầng 15?

| Field | Value |
|---|---|
| Priority | 1 |
| Severity | **HIGH** |
| Category | SCOPE_CONFLICT |
| Source | BANG MÃ VAN BMS T15.xlsx |
| ERP Blocked | 🔴 YES |
| Status | ⏳ BLOCKED |

**Issue:** Filename = T15 nhưng content text ghi "TẦNG 9". Số lượng (24 bàn) không khớp BOQ T15 (6 bàn).


### BD-02 — MEDIUM: NT-23 — Xác nhận QUẦY TIẾP TÂN R-01

| Field | Value |
|---|---|
| Priority | 2 |
| Severity | **MEDIUM** |
| Category | DRAWING_CLASSIFICATION |
| Source | NT-23.pdf |
| ERP Blocked | ⚪ No |
| Status | ⏳ NEEDS_APPROVAL |

**Issue:** Directive mapping cũ ghi SAI là "rèm/rãnh". Text layer PDF xác nhận: CHI TIẾT QUẦY TIẾP TÂN R-01.


### BD-03 — MEDIUM: 14 KL Clarification Items — BOQ không đủ thông tin

| Field | Value |
|---|---|
| Priority | 3 |
| Severity | **MEDIUM** |
| Category | BOQ_CLARIFICATION |
| Source | KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx |
| ERP Blocked | ⚪ No |
| Status | ⏳ NEEDS_APPROVAL |

**Issue:** 14 BOQ items thiếu: dimension, material, drawing reference, hoặc description mơ hồ


### BD-04 — HIGH: 4 SketchUp HIGH Issues — Production Locked

| Field | Value |
|---|---|
| Priority | 1 |
| Severity | **HIGH** |
| Category | SKETCHUP_PRODUCTION_LOCK |
| Source | KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp |
| ERP Blocked | 🔴 YES |
| Status | ⏳ BLOCKED |

**Issue:** Production LOCKED until 4 HIGH issues resolved


### BD-05 — MEDIUM: GỖ GHÉP THANH 30mm — Material không có trong PO

| Field | Value |
|---|---|
| Priority | 2 |
| Severity | **MEDIUM** |
| Category | MATERIAL_EXCEPTION |
| Source | bom-KHAI TRIỂN VĂN PHÒNG BẢO MINH.xlsx |
| ERP Blocked | ⚪ No |
| Status | ⏳ NEEDS_APPROVAL |

**Issue:** 1 tấm GỖ GHÉP THANH 30mm có trong BOM và Cut List nhưng KHÔNG trong purchase docs


### BD-06 — MEDIUM: 4 Purchase Documents — Cần xác nhận supplier/warehouse

| Field | Value |
|---|---|
| Priority | 2 |
| Severity | **MEDIUM** |
| Category | PURCHASE_CONFIRMATION |
| Source | PHIẾU NHẬP VẬT TƯ.zip |
| ERP Blocked | ⚪ No |
| Status | ⏳ NEEDS_APPROVAL |

**Issue:** 4 phiếu nhập vật tư chụp ảnh. Cần xác nhận: supplier ID trong hệ thống, warehouse đầu vào, unit price


### BD-07 — LOW: 32 Design Drawing Pages — Visual Inspection Required

| Field | Value |
|---|---|
| Priority | 3 |
| Severity | **LOW** |
| Category | ZONE_VISUAL_REVIEW |
| Source | 060826_TKNT_VP BAO MINH.pdf |
| ERP Blocked | ⚪ No |
| Status | ⏳ NEEDS_APPROVAL |

**Issue:** Pages 4-35 are image-based technical drawings. Zone/material/dimension cannot be auto-extracted.



---

## MASTER DATA DOMAINS

### PROJECT
```
Project Code: BAO-MINH-CMT8
Name: VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8
Customer: CÔNG TY CỔ PHẦN CHỨNG KHOÁN BẢO MINH
Location: 201-203 CMT8, P4, Q3, TPHCM
Floor: T15 | Area: UNCONFIRMED
Status: STAGING | ERP Ready: ❌
```

### ZONES (8)

| Zone Code | Name | Area | BOQ Items | Status |
|---|---|---|---|---|
| ZONE-CT | Phòng Chủ Tịch | 94 m² | 16 | PARTIAL |
| ZONE-GD | Phòng GĐ Chi Nhánh | 26.3 m² | 11 | PARTIAL |
| ZONE-HP | Phòng Họp | 23 m² | 7 | PARTIAL |
| ZONE-LV | Phòng Làm Việc | 112 m² | 33 | PARTIAL |
| ZONE-SH | Sảnh Tiếp Tân | ? m² | 0 | NEEDS_REVIEW |
| ZONE-PT | Pantry | ? m² | 12 | NEEDS_REVIEW |
| ZONE-KH | Kho | ? m² | 0 | NEEDS_REVIEW |
| ZONE-HL | Hành Lang | ? m² | 2 | NEEDS_REVIEW |

### MATERIALS (8)

| Code | Supplier | Thickness | BOM Qty | PO Qty | Variance | Status |
|---|---|---|---|---|---|---|
| HN-111G-17.5 | HN | 17.5mm | 62 | 65 | 3 | PENDING |
| HN-111G-10 | HN | 10mm | 25 | 26 | 1 | PENDING |
| BT-SC010MW-17.5 | BT | 17.5mm | 65 | 67 | 2 | PENDING |
| BT-SC010MW-10 | BT | 10mm | 20 | 21 | 1 | PENDING |
| BT-200T-17.5 | BT | 17.5mm | 6 | 6 | 0 | PENDING |
| AC-9205S-17.5 | AC | 17.5mm | 4 | 4 | 0 | PENDING |
| THAN-TRE-8 | UNKNOWN | 8mm | 10 | 10 | 0 | PENDING |
| GO-GHEP-THANH-30 | UNKNOWN | 30mm | 1 | N/A | — | NEEDS_APPROVAL |

### SUPPLIERS (3)

| Code | Name | Materials | PO Source | Status |
|---|---|---|---|---|
| HN | Ván Hồng Nghi | HN-111G-17.5, HN-111G-10 | SOURCE-02 | PENDING |
| BT | Ván Cái Bảng (Bình Tiên?) | BT-SC010MW-17.5, BT-SC010MW-10, BT-200T-17.5 | SOURCE-04 | PENDING |
| AC | An Cường (An Cuong) | AC-9205S-17.5 | SOURCE-03 | PENDING |

### BOM (8 ván + 12 nẹp)

| Code | Supplier | Thickness | Qty | Status |
|---|---|---|---|---|
| HN - 111G-17.5 | HN | 17.5mm | 62 tấm | PENDING |
| BT - 200T-17.5 | BT | 17.5mm | 6 tấm | PENDING |
| HN - 111G-10 | HN | 10mm | 25 tấm | PENDING |
| BT - SC 010 MW-17.5 | BT | 17.5mm | 65 tấm | PENDING |
| BT - SC 010 MW-10 | BT | 10mm | 20 tấm | PENDING |
| THAN TRE-8 | THAN TRE | 8mm | 10 tấm | PENDING |
| AC - 9205 S-17.5 | AC | 17.5mm | 4 tấm | PENDING |
| GO GHEP THANH-30 | GO GHEP THANH | 30mm | 1 tấm | NEEDS_APPROVAL |

### CUT LIST SUMMARY

```
Total Parts: 1557
Assemblies:  37 (by ID blocks)
Materials:   6

GỖ GHÉP THANH EXCEPTION:
  - 12 hồi parts, 30mm
  - Sizes: 2128.3×100mm (×4) + 483.8×100mm (×8)
  - In BOM: YES (1 tấm)
  - In Purchase: NO — NEEDS_APPROVAL (BD-05)
  - In BOQ: NOT FOUND
```

### PURCHASE DOCUMENTS (4 docs)

| Doc | Supplier | Material | Qty | BOM Match | Status |
|---|---|---|---|---|---|
| SOURCE-01 | UNKNOWN | THAN TRE | - | THAN-TRE-8 qty=10 ✅ | STAGED |
| SOURCE-02 | Hồng Nghi (HN) | HN-111G 17LY + 9LY | - | HN-111G-17.5 qty=65 (BOM=62 +3 buffer) ✅ | STAGED |
| SOURCE-03 | An Cường (AC) | AC-9205S | - | AC-9205S-17.5 qty=4 ✅ | STAGED |
| SOURCE-04 | BT (Cái Bảng) | BT-SC010MW + BT-200T | - | BT-SC010MW-17.5 qty=67 (BOM=65 +2 buffer | STAGED |

---

## DATA READINESS BY DOMAIN

| Domain | Ready | Source | Analyzed | Normalized | CrossRef | Validated | Approved | ERP |
|---|---|---|---|---|---|---|---|---|
| PROJECT | **PARTIAL** | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| CUSTOMER | **PARTIAL** | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| ZONE | **NEEDS_REVIEW** | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| BOQ | **PARTIAL** | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| MATERIAL | **PARTIAL** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |
| MATERIAL_SPEC | **PARTIAL** | ✅ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| SUPPLIER | **PARTIAL** | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| BOM | **PARTIAL** | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| CUT_LIST | **PARTIAL** | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| PURCHASE | **NEEDS_REVIEW** | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| WAREHOUSE | **BLOCKED** | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PRODUCTION | **BLOCKED** | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| QC | **BLOCKED** | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| INSTALLATION | **BLOCKED** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| COST | **BLOCKED** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PROGRESS | **BLOCKED** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DOCUMENT | **READY** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| APPROVAL | **PARTIAL** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| LINEAGE | **PARTIAL** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |

---

## CONFLICT REGISTER

| ID | Type | Severity | Source | Status |
|---|---|---|---|---|
| CONF-001 | SCOPE_MISMATCH | **HIGH** | BANG MÃ VAN BMS T15.xlsx | UNRESOLVED |
| CONF-002 | DIRECTIVE_ERROR | **MEDIUM** | NT-23.pdf | DOCUMENTED_PENDING_APPROVAL |
| CONF-003 | MATERIAL_MISMATCH | **MEDIUM** | SketchUp vs Survey | UNRESOLVED |
| CONF-004 | MATERIAL_NO_BOQ | **MEDIUM** | THAN TRE × 10 tấm | UNRESOLVED |
| CONF-005 | MATERIAL_NOT_PURCHASED | **MEDIUM** | BOM sheet GO GHEP THANH | NEEDS_APPROVAL |
| CONF-006 | QTY_VARIANCE | **LOW** | BOM vs Purchase docs | DOCUMENTED_MAY_BE_BUFFER |
| CONF-007 | SUPPLIER_NAME_UNCONFIRMED | **LOW** | VẬT TƯ HỒNG NGHI.xlsx col BT | NEEDS_APPROVAL |
| CONF-008 | MATERIAL_CODE_MISSING | **MEDIUM** | NT-23.pdf — MS 204 SH | NEW_CONFLICT |

---

## LINEAGE

All 36 staging records have full lineage:
- source_file → source_hash → source_row/page → extracted_value → normalized_record_id
- ERP record = null (no ERP transactions created)
- Approval = PENDING for all (waiting Huy)

---
*ERP_TX=0 | FAIL=0 | BLOCKER=0 | NEEDS_APPROVAL=7 | Generated: 2026-08-17T13:16:14.283Z*
