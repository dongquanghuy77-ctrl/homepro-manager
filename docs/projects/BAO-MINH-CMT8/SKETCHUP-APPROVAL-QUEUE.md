# SKETCHUP APPROVAL QUEUE
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** 2026-08-17T13:03:12.910Z
**Total Issues:** 7 (4 HIGH, 3 MEDIUM)
**Status:** ALL PENDING — không được tạo Production Order cho đến khi issues HIGH được resolve

---

## ⛔ PRODUCTION LOCK

> Toàn bộ Production Order, Work Order, BOM cut execution bị BLOCKED cho đến khi:
> - Tất cả issues HIGH (SKP-APRV-01..04) được resolved và approved
> - BANG MÃ VAN scope conflict (CONFLICT-001) được resolved
>
> **Hiện tại: 0 items in production queue. ERP_TX = 0.**

---

## SKP-APRV-01 — HIGH: DIMENSION_CONFLICT

| Field | Value |
|---|---|
| **Issue ID** | SKP-APRV-01 |
| **Severity** | **HIGH** |
| **Type** | DIMENSION_CONFLICT |
| **Model** | KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp |
| **Object** | Trần treo / Ceiling system |
| **Current Value** | H = 2,540 mm (thiết kế) |
| **Expected Value** | Cần đo thực tế: từ sàn hoàn thiện đến mặt dưới ống gió thấp nhất |
| **Evidence** | Survey RISK-001: MEP density cao, ống gió xuống sát sàn (S12, S13) |
| **Impact** | Nếu không đủ clearance, không lắp được trần treo ở H=2540mm. Toàn bộ hệ trần phải redesign. |
| **Proposed Fix** | Đo thực tế MEP clearance. Nếu < 2400mm cần họp với M&E + CĐT. |
| **Approval Required** | ✅ YES |
| **Approved By** | _(awaiting)_ |
| **Approved At** | _(awaiting)_ |
| **Status** | ⏳ PENDING |


## SKP-APRV-02 — HIGH: DIMENSION_VERIFY

| Field | Value |
|---|---|
| **Issue ID** | SKP-APRV-02 |
| **Severity** | **HIGH** |
| **Type** | DIMENSION_VERIFY |
| **Model** | KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp |
| **Object** | Furniture total run / Tổng chiều dài bố trí nội thất |
| **Current Value** | Total run = 10,470 mm (từ SKP model) |
| **Expected Value** | Kích thước thực tế chưa đo |
| **Evidence** | Survey photos S01-S14 chụp trong giai đoạn phá dỡ, chưa đo kích thước room width |
| **Impact** | Nếu thực tế < 10,470mm, phải điều chỉnh layout toàn bộ Phòng Làm Việc |
| **Proposed Fix** | Đo đạc thực tế phòng LV (width + length + column positions) |
| **Approval Required** | ✅ YES |
| **Approved By** | _(awaiting)_ |
| **Approved At** | _(awaiting)_ |
| **Status** | ⏳ PENDING |


## SKP-APRV-03 — HIGH: STRUCTURAL_RISK

| Field | Value |
|---|---|
| **Issue ID** | SKP-APRV-03 |
| **Severity** | **HIGH** |
| **Type** | STRUCTURAL_RISK |
| **Model** | KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp |
| **Object** | MEP coordination / vách + cột |
| **Current Value** | Không có dữ liệu MEP trong SKP model |
| **Expected Value** | MEP routes phải được resolved trước khi sản xuất vách |
| **Evidence** | RISK-001..004 (High): MEP dày đặc, ống gió, cáp điện lõng lẻo, sequence phá dỡ sai |
| **Impact** | Vách mới lắp vào vị trí có MEP gây xung đột. Chi phí sửa cao. |
| **Proposed Fix** | MEP coordination meeting với đơn vị M&E + CĐT trước khi bắt đầu lắp vách |
| **Approval Required** | ✅ YES |
| **Approved By** | _(awaiting)_ |
| **Approved At** | _(awaiting)_ |
| **Status** | ⏳ PENDING |


## SKP-APRV-04 — HIGH: DIRECTIVE_ERROR

| Field | Value |
|---|---|
| **Issue ID** | SKP-APRV-04 |
| **Severity** | **HIGH** |
| **Type** | DIRECTIVE_ERROR |
| **Model** | KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp |
| **Object** | NT-23 shop drawing reference |
| **Current Value** | Script directive: CURTAIN_RAIL (rèm/rãnh) |
| **Expected Value** | Actual: RECEPTION_COUNTER (Quầy Tiếp Tân) — confirmed from PDF text layer |
| **Evidence** | NT-23.pdf text: "CHI TIẾT QUẦY TIẾP TÂN R-01 PHÒNG LÀM VIỆC NT-23 1/30" |
| **Impact** | BOQ links A.I.3..E.I.3 (curtain) were wrongly mapped to NT-23. Correct = B.II.4, B.II.6. |
| **Proposed Fix** | Update DIRECTIVE_MAPPING, re-link NT-23 → Quầy TT BOQ items. Find curtain drawing. |
| **Approval Required** | ✅ YES |
| **Approved By** | _(awaiting)_ |
| **Approved At** | _(awaiting)_ |
| **Status** | ⏳ PENDING |


## SKP-APRV-05 — MEDIUM: MATERIAL_CONFLICT

| Field | Value |
|---|---|
| **Issue ID** | SKP-APRV-05 |
| **Severity** | **MEDIUM** |
| **Type** | MATERIAL_CONFLICT |
| **Model** | KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp |
| **Object** | Primary board material code |
| **Current Value** | SKP model: AC-9205S |
| **Expected Value** | Survey M05/M06 confirmed: An Cuong MS-608EV (Mellow Chestnut) |
| **Evidence** | Phase 3G material-master.json vs Phase 2 survey-photo-analysis.json |
| **Impact** | If different material, production cut list dimensions may be wrong (thickness?) |
| **Proposed Fix** | Designer confirms: which material is correct for T15? Update SKP if needed. |
| **Approval Required** | ✅ YES |
| **Approved By** | _(awaiting)_ |
| **Approved At** | _(awaiting)_ |
| **Status** | ⏳ PENDING |


## SKP-APRV-06 — MEDIUM: MATERIAL_PLACEHOLDER

| Field | Value |
|---|---|
| **Issue ID** | SKP-APRV-06 |
| **Severity** | **MEDIUM** |
| **Type** | MATERIAL_PLACEHOLDER |
| **Model** | KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp |
| **Object** | 825 components with color placeholder #8208ec |
| **Current Value** | 825/1325 production components have placeholder color (not real material) |
| **Expected Value** | All components should have confirmed material code |
| **Evidence** | Phase 3F material-master.json — 825 with color #8208ec |
| **Impact** | Cannot cut these components without material confirmation. |
| **Proposed Fix** | Map each placeholder to real material code from BANG MÃ VAN (when scope confirmed). |
| **Approval Required** | ✅ YES |
| **Approved By** | _(awaiting)_ |
| **Approved At** | _(awaiting)_ |
| **Status** | ⏳ PENDING |


## SKP-APRV-07 — MEDIUM: NEW_MATERIAL_NOT_IN_SKP

| Field | Value |
|---|---|
| **Issue ID** | SKP-APRV-07 |
| **Severity** | **MEDIUM** |
| **Type** | NEW_MATERIAL_NOT_IN_SKP |
| **Model** | KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp |
| **Object** | LDF E2 (Low-Density Fiberboard) |
| **Current Value** | SKP model: NOT PRESENT |
| **Expected Value** | Purchase docs (SOURCE-04 L4-L08, L4-L09): LDF E2 purchased |
| **Evidence** | Phase 4 material-ingestion-reconciliation.json |
| **Impact** | LDF E2 is purchased but has no corresponding SKP component. May be for specific detail. |
| **Proposed Fix** | Confirm with designer: where is LDF E2 used? Add to SKP or document as misc material. |
| **Approval Required** | ✅ YES |
| **Approved By** | _(awaiting)_ |
| **Approved At** | _(awaiting)_ |
| **Status** | ⏳ PENDING |



---

## HOW TO APPROVE

Huy điền vào các field sau cho mỗi issue:

```
ISSUE_ID: SKP-APRV-XX
DECISION: [APPROVED | REJECTED | CORRECTION_REQUIRED]
RESOLUTION: [mô tả quyết định]
APPROVED_BY: Huy
APPROVED_AT: YYYY-MM-DD
NOTES: [ghi chú thêm]
```

Sau khi nhận approval, hệ thống sẽ:
1. Cập nhật DIRECTIVE_MAPPING (SKP-APRV-04)
2. Cập nhật material master (SKP-APRV-05, 06, 07)
3. Ghi lineage: approved_by, approved_at, version
4. Mở production queue cho items đã resolved

---
*No ERP transactions created | Generated: 2026-08-17T13:03:12.910Z*
