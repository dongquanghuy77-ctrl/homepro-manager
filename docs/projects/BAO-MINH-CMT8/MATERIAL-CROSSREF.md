# MATERIAL CROSS-REFERENCE REPORT
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** 2026-08-17T12:54:33.303Z

---

## 1. VẬT TƯ HỒNG NGHI — Material Requirement Register

Title: "KHỐI LƯỢNG VÁN VÀ CHỈ DÁN CẠNH VP BẢO MINH"
(Ván và chỉ dán cạnh for Văn Phòng Bảo Minh)

### Supplier Breakdown

| Supplier | Code | Products | Note |
|---|---|---|---|
| Hồng Nghi (HN) | 111G | VÁN MDF 17LY, 9LY + CHỈ 2F/4F | Confirmed in SOURCE-02 purchase doc |
| BT / Cai Bang | SC010MW | VÁN MDF 17LY, 9LY + CHỈ 2F/4F + VÁN 200T | Confirmed in SOURCE-04 purchase doc |
| An Cuong (AC) | 9205S | VÁN MDF (MUESTSTD) + CHỈ PVC | Confirmed in SOURCE-03 purchase doc |

### Quantity Register (from VẬT TƯ HỒNG NGHI.xlsx)

| STT | Product | Unit | Qty (Req 1) | Qty (Req 2) | Supplier | Link to PO |
|---|---|---|---|---|---|---|
| 1 | VÁN MDF 17LY 111G | TẤM | 50 | 65 | HN | SOURCE-02 L2-L01 (65 cuộn) |
| 2 | VÁN MDF 9LY 111G | TẤM | 15 | 26 | HN | SOURCE-02 L2-L02 (26 tấm) |
| CHỈ DÁN CẠNH HN | | | | | | |
| 1 | CHỈ 2F 111G | MÉT | 200 | 200 | HN | SOURCE-02 L2-L03 |
| 2 | CHỈ 4F 111G | MÉT | 400 | 800 | HN | SOURCE-02 L2-L04 |
| VÁN BT | | | | | | |
| 1 | VÁN MDF 17LY SC 010 MW | TẤM | 50 | 67 | BT | SOURCE-04 L4-L01 (67 tấm, đã CK) |
| 2 | VÁN MDF 9LY SC 010 MW | TẤM | 15 | 21 | BT | SOURCE-04 L4-L02 (21 tấm) |
| 3 | VÁN MDF 17LY 200T | TẤM | 0 | 6 | BT | SOURCE-04 L4-L05 (6 tấm XAM200T) |
| CHỈ DÁN CẠNH BT | | | | | | |
| 1 | CHỈ 2F SC 010 MW | MÉT | 200 | 200 | BT | SOURCE-04 L4-L03 |
| 2 | CHỈ 4F SC 010 MW | MÉT | 400 | 600 | BT | SOURCE-04 L4-L04 |
| 3 | CHỈ 2F SC 200T | MÉT | 0 | 50 | BT | Not in SOURCE-04 yet |
| 4 | CHỈ 4F SC 200T | MÉT | 0 | 50 | BT | Not in SOURCE-04 yet |

---

## 2. BANG MÃ VAN BMS T15.xlsx — ⚠️ SCOPE ISSUE

**Title in file:** "BẢNG FINAL MÃ VÁN VĂN PHÒNG BMS **TẦNG 9**"
**File name:** BANG MÃ VAN BMS **T15**.xlsx
**Project:** BAO-MINH-CMT8 = TẦNG 15

> ⚠️ **CONFLICT: File is named T15 but contains Tầng 9 data**
>
> Column headers: STT | HẠNG MỤC | HÌNH ẢNH | KÍCH THƯỚC | DIỄN GIẢI | ĐVT | KL | **MÃ VÁN** | HÌNH ẢNH | GHI CHÚ

| STT | Hạng mục | KT (mm) | ĐVT | KL | Mã ván |
|---|---|---|---|---|---|
| A | Nội thất liền tường | | | | |
| 1 | Tủ hồ sơ cao | R400*C2700 | m2 | 28.35 | BT66MM |
| 2 | Tủ hồ sơ thấp | D1800*R400*C550 | cái | 4 | BT66MM |
| 3 | Tủ bếp dưới | D2420*R500*C750 | md | 2.42 | BT66MM |
| 4 | Đá mặt bếp | — | md | 2.42 | (stone) |
| B | Nội thất rời | | | | |
| 5 | Bàn LV nhân viên | 1200*600*750 | cái | 24 | 111G |
| 6 | Vách ngăn mica | D1000*C350 | cái | 12 | — |
| 7 | Tủ di động 3NK | 470*510*670 | cái | 24 | 111G |
| 8 | Bàn LV phó phòng | 1400*600*750 | cái | 3 | BT66MM |
| 9 | Bàn LV trưởng phòng | 1600*700*750 | cái | 7 | BT66MM |

> **NOTE:** These items (tủ hồ sơ, bàn LV 24 cái, tủ di động 24 cái) appear larger in quantity than BAO-MINH-CMT8 BOQ.
> BAO-MINH-CMT8 has: Bàn LV NV = 6 cái (B.II.16), Tủ di động NV = 6 cái (B.II.19), Tủ di động TP/PP = 3 cái (B.II.24).
> **LIKELY Tầng 9 project data — NOT for Tầng 15.**

### Cross-ref: BANG MÃ VAN vs BOQ Tầng 15

| Mã ván BMS | Items using it | BOQ Tầng 15 | Qty T15 | Qty T9 BOM | Conflict? |
|---|---|---|---|---|---|
| 111G | Bàn LV NV, Tủ di động | B.II.16 (6 bàn), B.II.19 (6 tủ) | 12 items | 48 items (24+24) | ⚠️ QTY DIFFERS — likely different project |
| BT66MM | Tủ hồ sơ, Bàn PP/TP | B.II.20 (2 PP), B.II.22 (1 TP) | 3 | 14 | ⚠️ QTY DIFFERS |

---

## 3. NT-23 MATERIAL EXTRACTION

| Code from NT-23 | Match in VẬT TƯ HN | Match in BANG MÃ | Status |
|---|---|---|---|
| HN-111G | ✅ VÁN MDF 111G | ✅ mã ván 111G | MATCHED |
| MS 204 SH | ❌ Not found | ❌ Not found | MISSING — needs supplier info |
| MDF+Laminate vân đá | ❌ Not found | ❌ Not found | MISSING — special order? |
| Mica xanh | ❌ Not found | ❌ Not found | MISSING — special order? |

---

## 4. PURCHASE DOCUMENT vs MATERIAL REGISTER

| Purchase Line | Material | Supplier | Confirmed? | In VẬT TƯ HN? |
|---|---|---|---|---|
| SRC-001 | THAN TRE 1220x2440x8mm | UNKNOWN | ❌ | ❌ Not in HN list |
| SRC-002-L01 | 111G 2M LMR 17MM DW (65 cuộn) | Hồng Nghi | ⚠️ PENDING | ✅ VÁN MDF 17LY 111G |
| SRC-002-L02 | 111G 2M LMR 9MM DW (26 tấm) | Hồng Nghi | ⚠️ PENDING | ✅ VÁN MDF 9LY 111G |
| SRC-003-L01 | Chỉ PVC 9205 44x0.8mm | An Cuong | ⚠️ PENDING | ❌ AC not in HN file |
| SRC-003-L02 | Ván MELMDF 9205S (4 tấm) | An Cuong | ⚠️ PENDING | ❌ AC not in HN file |
| SRC-004-L01 | LMRDW-17-ML2.SC010MW (67 tấm) | An Cuong/BT | ⚠️ PENDING | ✅ VÁN MDF 17LY SC010MW |

---

## 5. FLAGS

### FLAG-MAT-001: MS 204 SH not found in any material register
- Found in: NT-23.pdf text layer
- Expected in: BANG MÃ VAN, VẬT TƯ HỒNG NGHI
- Status: MISSING — needs supplier identification

### FLAG-MAT-002: BANG MÃ VAN BMS T15 = Tầng 9 data
- File name says T15, content says Tầng 9
- Quantities don't match BAO-MINH-CMT8 BOQ
- Action: Confirm with Huy — is T15 BANG MÃ available?

### FLAG-MAT-003: THAN TRE not in any BOQ item
- SOURCE-01: 10 tấm THAN TRE 1220x2440x8mm
- Not found in BOQ 82 items
- SKP material: "THAN TRE" = HIGH confidence candidate
- Status: NEEDS_BOQ_CLARIFICATION — which item uses Than Tre?

---
*FAIL=0 | BLOCKER=0 | FLAGS=3 | Generated: 2026-08-17T12:54:33.303Z*
