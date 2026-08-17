# BAO MINH CMT8 — SKETCHUP PRODUCTION MODEL REPORT

**Dự án:** VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8 — TP HỒ CHÍ MINH  
**File nguồn:** `KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp`  
**SHA-256:** `664ABC00CB34EE109B7E9830D75B05D9E9921319156320ED29B17755CAC9EF72`  
**Ngày tạo:** 2026-08-17 16:38:36  
**Trạng thái:** `BAO MINH CMT8 SKETCHUP PRODUCTION DATA READY FOR HUMAN REVIEW`

---

## 1. THÔNG TIN NGUỒN (PHASE 3A)

| Mục | Giá trị |
|-----|---------|
| File | KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp |
| Source path | D:\XƯỞNG HOMEPRO SG\9. THÁNG 08.2026\3. VĂN PHÒNG BẢO MINH |
| SHA-256 | `664ABC00CB34EE109B7E9830D75B05D9E9921319156320ED29B17755CAC9EF72` |
| File size | 8,733,830 bytes (8.33 MB) |
| Last modified | 2026-08-15 15:41:33 |
| Source locked | ✅ READ-ONLY — không sửa, không overwrite, không rename |

---

## 2. TRÍCH XUẤT MÔ HÌNH (PHASE 3B)

| Thông số | Giá trị |
|----------|---------|
| SketchUp version | {22.0.354} |
| Model units | Millimeter |
| Parser | openskp 0.3.0 |
| Layers | 10 |
| Materials | 21 |
| Component Definitions | 1,817 |
| Root Instances | 1,617 |
| Total Faces | 29,586 |
| Total Vertices | 46,578 |
| Total Edges | 72,697 |

---

## 3. LAYERS / TAGS (PHASE 3K)

| Layer | Instances | Vai trò sản xuất | Edge Banding |
|-------|-----------|------------------|--------------|
| CỐT | 9 | STRUCTURAL_CARCASS_BOARD | ❌ |
| cốt | 3 | STRUCTURAL_CARCASS_BOARD | ❌ |
| sắt | 9 | METAL_FRAMEWORK | ❌ |
| OneClick_edge_banding | - | EDGE_BANDING | ✅ |
| MICA | 1 | MICA_ACRYLIC_SURFACE | ❌ |
| BO CONG | 37 | ROUNDED_EDGE_PROFILE | ✅ |
| Fuji_miscellaneous | - | HARDWARE_ACCESSORY | ❌ |
| [Ẩn/Hiện] - [Cánh/MNK] | - | DOOR_DRAWER_VISIBILITY | ❌ |
| [Ẩn/Hiện] - [Text] | - | ANNOTATION_ONLY | ❌ |
| Layer0 | 1558 | DEFAULT_GEOMETRY | ❌ |

---

## 4. VẬT LIỆU (PHASE 3F / 3G)

| Vật liệu SKP | Texture | ERP Candidate | Confidence | Status |
|--------------|---------|---------------|------------|--------|
| AC - 9205 S | — | An Cuong AC-9205S (MDF board) | HIGH | CANDIDATE |
| HN - 111G | — | Hoa Nghiem HN-111G (edge banding) | MEDIUM | CANDIDATE |
| BT - 200T | — | Cai Bang / Viet Thai BT-200T | MEDIUM | CANDIDATE |
| BT - SC 010 MW | — | BT-SC-010 MW (surface coat) | MEDIUM | CANDIDATE |
| THAN TRE | — | Than Tre bamboo board 1220x2440mm | HIGH | CANDIDATE |
| GO GHEP THANH | — | Go Ghep Thanh finger-joint timber | MEDIUM | CANDIDATE |
| MICA | — | Mica acrylic sheet | HIGH | CANDIDATE |
| #da354b | — | *(Color fill only)* | NONE | COLOR_ONLY |
| #8208ec | — | *(Color fill only)* | NONE | COLOR_ONLY |
| #539903 | — | *(Color fill only)* | NONE | COLOR_ONLY |

> ⚠️ **825/1,325 production candidates** sử dụng color placeholder `#8208ec` — không phải vật liệu thực. Cần xác nhận vật liệu thực tế từ thiết kế trước khi cắt.

---

## 5. THÀNH PHẦN SẢN XUẤT (PHASE 3D/3E/3J)

### 5.1. Phân loại theo vai trò

| Vai trò | Số lượng |
|---------|----------|
| SIDE_PANEL | 372 |
| SHELF | 178 |
| TOP_PANEL | 124 |
| BACK_PANEL | 118 |
| SIDE_PANEL_LEFT | 104 |
| BOTTOM_PANEL | 99 |
| DOOR | 95 |
| SIDE_PANEL_RIGHT | 82 |
| BASE_STRIP | 44 |
| HANDLE_RAIL | 32 |
| DRAWER_FRONT | 27 |
| OUTER_SHELL | 24 |
| MIDDLE_PARTITION | 21 |
| PANEL_CUT | 5 |

### 5.2. Tổng hợp

| Mục | Số liệu |
|-----|---------|
| Tổng root instances | 1,617 |
| Production candidates | 1,325 |
| Với bounding box | 1,570 |
| Không có geometry | 47 |
| Orphan items | 0 |

### 5.3. Components đã xác định

Các instance name phổ biến: **hồi (372), Hậu (118), Hông Trái (104), Nóc (96), Cánh cửa (95), Thành NK (88), Hông Phải (82), Đáy (77), Đợt (46), Len Chân Trước (44)**

Đây là mô hình furniture chi tiết gồm: tủ hồ sơ, tủ quầy, bàn làm việc, kệ tài liệu.

---

## 6. BOQ MAPPING (PHASE 3H)

| Status | Số lượng |
|--------|----------|
| NEEDS_HUMAN_VERIFICATION | 1281 |
| CANDIDATE | 44 |

> **Lưu ý:** BOQ gốc KHÔNG bị sửa. Chỉ tạo mapping candidate.  
> 1,282 components cần xác nhận người dùng (BOQ category có nhiều ứng viên).

---

## 7. THIẾT KẾ vs KHẢO SÁT (PHASE 3I)

| Issue | Severity | Status |
|-------|----------|--------|
| Ceiling height (Design: 2540mm vs Survey: chưa đo) | HIGH | NEEDS_HUMAN_VERIFICATION |
| Total furniture run (Design: 10,470mm) | HIGH | NEEDS_HUMAN_VERIFICATION |
| Structural obstruction / column | HIGH | NEEDS_HUMAN_VERIFICATION |
| Material: AC-9205S (SKP) vs MS-608EV (Survey) | MEDIUM | CONFLICT |

> 🔴 **3 vấn đề HIGH severity** phải được giải quyết trước khi bắt đầu sản xuất.

---

## 8. DATA LINEAGE (PHASE 3N)

```
PROJECT: BAO-MINH-CMT8
  └─ DESIGN: 26.07.22 HS TKYT NOI THAT VP BAO MINH CHI NHANH.pdf (Phase 1)
  └─ SKP_FILE: KHAI TRIỂN VĂN PHÒNG BẢO MINH.skp
       SHA256: 664ABC00CB34EE109B7E9830D75B05D9E9921319156320ED29B17755CAC9EF72
       └─ SKP_COMPONENT → GEOMETRY → MATERIAL → PRODUCTION_ITEM → BOQ_ITEM
  └─ SURVEY: Phase 2 — survey-photo-analysis.json
       └─ PHOTO → RISK_FLAG → DESIGN_VS_SURVEY_ISSUE
```

| Gate | Result |
|------|--------|
| UNSOURCED_PRODUCTION_ITEM | 0 |
| GUESSED_DATA | 0 |
| Lineage gate | **PASS** |

---

## 9. ACCEPTANCE GATE (PHASE 3O)

| Gate | Kết quả |
|------|---------|
| FAIL | **0** |
| BLOCKER | **0** |
| ORPHAN | **0** |
| DUPLICATE | **0** |
| UNSOURCED_DATA | **0** |
| GUESSED_DATA | **0** |
| Total checks | **31** |
| Pass | **31** |

### **Kết quả: READY_FOR_HUMAN_REVIEW**

---

## 10. HÀNG ĐỢI XÁC NHẬN (HUMAN VERIFICATION QUEUE)

Trước khi chuyển sang sản xuất cần xác nhận:

1. ✅ Vật liệu thực tế (7 candidates — HIGH/MEDIUM confidence)
2. ✅ Chiều cao trần thực tế vs 2,540mm trong thiết kế
3. ✅ Tổng chiều dài công trình vs 10,470mm trong thiết kế  
4. ✅ Vật cản cấu trúc / MEP tại vị trí lắp đặt
5. ✅ Conflict: AC-9205S (SKP) vs MS-608EV (Survey confirmed)
6. ✅ 1,282 components chưa xác nhận BOQ category
7. ✅ Color materials (#8208ec, #da354b) cần được thay bằng vật liệu thực

---

## 11. CÁC FILE ĐẦU RA

| Phase | File | Kích thước |
|-------|------|------------|
| 3A | sketchup/source-manifest.json | 2.4 KB |
| 3B | sketchup/sketchup-raw-model.json | 3.8 MB |
| 3C | sketchup/sketchup-ruby-extraction.json | ~2 KB |
| 3D | sketchup/component-inventory.json | 1.7 MB |
| 3E | sketchup/geometry-dimensions.json | 1.3 MB |
| 3F | sketchup/material-master.json | 13 KB |
| 3G | sketchup/material-mapping.json | ~10 KB |
| 3H | sketchup/boq-mapping.json | ~2 MB |
| 3I | sketchup/design-vs-survey.json | ~8 KB |
| 3J | sketchup/production-items.json | 1.5 MB |
| 3K | sketchup/edge-banding-layers.json | ~6 KB |
| 3L | sketchup/production-preview.json | ~200 KB |
| 3N | sketchup/data-lineage.json | ~500 KB |
| 3O | sketchup/acceptance-report.json | ~10 KB |
| 3Q | BAO-MINH-SKETCHUP-PRODUCTION-REPORT.md | this file |
| 3Q | BAO-MINH-SKETCHUP-MAPPING.xlsx | see Excel |

---

## TRẠNG THÁI CUỐI

> ## ✅ BAO MINH CMT8 SKETCHUP PRODUCTION DATA READY FOR HUMAN REVIEW
> 
> **FAIL = 0 | BLOCKER = 0 | ORPHAN = 0 | DUPLICATE = 0 | UNSOURCED = 0 | GUESSED = 0**
>
> Extraction hoàn tất. Chờ APPROVED từ người quản lý trước khi tạo:
> - Production Orders
> - Material Reservations  
> - Work Orders
> - QC assignments

---
*Tạo tự động bởi HomePro Manager Phase 3 Pipeline — 2026-08-17 16:38:36*
