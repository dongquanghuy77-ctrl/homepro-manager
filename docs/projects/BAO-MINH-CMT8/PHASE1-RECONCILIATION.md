# PHASE 1 — DATA RECONCILIATION REPORT
## VĂN PHÒNG CHỨNG KHOÁN BẢO MINH — CHI NHÁNH CMT8

**Ngày:** 2026-08-17
**Script:** scripts/bao-minh-reconciliation.js
**Nguồn:** KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx — Sheet: NT
**Trạng thái:** ✅ PHASE 1 ACCEPTED — AWAITING HUMAN REVIEW

---

## ✅ ACCEPTANCE GATE

| Tiêu chí | Kết quả | Status |
|---|---|---|
| SOURCE TRACEABILITY = 100% | 123/123 rows explained | ✅ PASS |
| 123 SOURCE ROWS RECONCILED | 123 = 82+4+7+10+2+17+1 | ✅ PASS |
| 82 NORMALIZED ITEMS RECONCILED | 82 items traced | ✅ PASS |
| SCOPE MATH (50+25+7=82) | 82 ✅ | ✅ PASS |
| PRICING TRACEABILITY | NEED_QUOTATION = HOMEPRO scope | ✅ PASS |
| QUANTITY TRACEABILITY | Mọi qty gắn source_row | ✅ PASS |
| NO ASSUMED PRICE | unit_price = NULL (82/82) | ✅ PASS |
| NO ASSUMED QUANTITY | 0 qty tự phát sinh | ✅ PASS |
| NO ERP TRANSACTION | 0 | ✅ PASS |
| FAIL | 0 | ✅ PASS |
| BLOCKER | 0 | ✅ PASS |

> **🟢 PHASE 1 — SOURCE DATA READY FOR HUMAN REVIEW**
> Không chuyển Phase 2. Chờ Huy kiểm tra và phê duyệt.

---

## 1. ĐỐI CHIẾU 123 → 82

### 1A. Tổng hợp phân loại

| Loại | Số dòng | Dòng cụ thể |
|---|---|---|
| **NORMALIZED** | **82** | R9,R11,R13,R15,R16,R18,R19,R22,R24,R26,R28,R29,R31–R58,R61,R63,R65,R67,R68,R70–R75,R78,R80,R82,R84–R89,R91–R93,R96,R98,R100,R102–R105,R107–R115,R117,R119,R122 |
| **HEADER** (project/col) | **4** | R1,R2,R3,R5 |
| **HEADER_SECTION** (khu A–G) | **7** | R7,R20,R59,R76,R94,R116,R121 |
| **HEADER_SUBSECTION** (I/II) | **10** | R8,R17,R21,R30,R60,R69,R77,R90,R95,R106 |
| **EMPTY** | **2** | R4,R6 |
| **MERGED** (sub-row KL thực) | **17** | R10,R12,R14,R23,R25,R27,R62,R64,R66,R79,R81,R83,R97,R99,R101,R118,R120 |
| **SUBTOTAL** | **1** | R123 |
| **TỔNG** | **123 ✅** | = 82+4+7+10+2+17+1 |

### 1B. Bảng 123 dòng đầy đủ

| Row | Loại | ID / Into | Nội dung | Lý do phân loại |
|---|---|---|---|---|
| R1 | HEADER | — | DỰ ÁN VP CHỨNG KHOÁN BẢO MINH... | Tiêu đề dự án |
| R2 | HEADER | — | GÓI THẦU THIẾT KẾ VÀ THI CÔNG... | Gói thầu header |
| R3 | HEADER | — | Địa chỉ: 201-203 CMT8, TP HCM | Địa chỉ dự án |
| R4 | EMPTY | — | (trống) | Dòng phân cách |
| R5 | HEADER_COL | — | STT|Mô tả|ĐVT|Khối lượng|Đơn giá|... | Tiêu đề cột |
| R6 | EMPTY | — | (trống) | Dòng phân cách |
| R7 | HEADER_SECTION | — | A — PHÒNG HỌP | Header khu vực A |
| R8 | HEADER_SUBSECTION | — | A.I — Phần liền tường | Header tiểu mục A.I |
| R9 | **NORMALIZED** | **A.I.1** | Thảm trải sàn (m2=24.15) | Hạng mục có ĐVT, KL, ghi chú |
| R10 | MERGED | → A.I.1 | Phòng họp: 23 | Sub-row KL thực (net=23, ×1.05) |
| R11 | **NORMALIZED** | **A.I.2** | Len chân tường (md=15.75) | Hạng mục có ĐVT, KL |
| R12 | MERGED | → A.I.2 | Phòng họp: 15 | Sub-row KL thực (net=15, ×1.05) |
| R13 | **NORMALIZED** | **A.I.3** | Rèm che nắng (m2=5.8) | Hạng mục có ĐVT, KL |
| R14 | MERGED | → A.I.3 | Phòng họp: 5.8 | Sub-row xác nhận KL |
| R15 | **NORMALIZED** | **A.I.4** | Vách ốp gỗ (m2=7.2675) | ⚠️ Vật liệu chưa ghi — flagged |
| R16 | **NORMALIZED** | **A.I.5** | Nẹp T inox (md=7.95) | Hạng mục đầy đủ |
| R17 | HEADER_SUBSECTION | — | A.II — Nội thất rời | Header tiểu mục A.II |
| R18 | **NORMALIZED** | **A.II.1** | Bàn họp D3200×R1400×C750mm | Hạng mục đầy đủ |
| R19 | **NORMALIZED** | **A.II.2** | Ghế họp (CĐT cấp, 10 cái) | scope=CLIENT_SUPPLIED |
| R20 | HEADER_SECTION | — | B — PHÒNG LÀM VIỆC | Header khu vực B |
| R21 | HEADER_SUBSECTION | — | B.I — Phần liền tường | Header tiểu mục B.I |
| R22 | **NORMALIZED** | **B.I.1** | Thảm trải sàn (m2=120.96) | Net=112, ×1.08 |
| R23 | MERGED | → B.I.1 | Phòng LV: 112 | Sub-row KL thực |
| R24 | **NORMALIZED** | **B.I.2** | Len chân tường (md=34.65) | Net=33, ×1.05 |
| R25 | MERGED | → B.I.2 | Phòng LV: 33 | Sub-row KL thực |
| R26 | **NORMALIZED** | **B.I.3** | Rèm che nắng (m2=45) | KL xác nhận |
| R27 | MERGED | → B.I.3 | Phòng LV: 45 | Sub-row xác nhận |
| R28 | **NORMALIZED** | **B.I.4** | Vách ốp gỗ MDF trắng (m2=16.2435) | Vật liệu ghi rõ |
| R29 | **NORMALIZED** | **B.I.5** | Tủ hồ sơ cao R400×C2800mm (m2=13.005) | MFC phủ melamine |
| R30 | HEADER_SUBSECTION | — | B.II — Nội thất rời | Header tiểu mục B.II |
| R31 | **NORMALIZED** | **B.II.1** | Bàn tròn tiếp khách (CĐT cấp) | scope=CLIENT_SUPPLIED |
| R32 | **NORMALIZED** | **B.II.2** | Ghế tiếp khách đơn (3 cái) | Gỗ PU+simili |
| R33 | **NORMALIZED** | **B.II.3** | Sofa băng dài (CĐT cấp) | scope=CLIENT_SUPPLIED |
| R34 | **NORMALIZED** | **B.II.4** | Quầy lễ tân (3.6 md) | MDF+laminate+mica |
| R35 | **NORMALIZED** | **B.II.5** | Ghế lễ tân G1 (CĐT cấp) | scope=CLIENT_SUPPLIED |
| R36 | **NORMALIZED** | **B.II.6** | Hệ quầy giao dịch (1 hệ) | Sắt+MDF, D3350 |
| R37 | **NORMALIZED** | **B.II.7** | Vách ngăn bàn ván gỗ (2 cái) | ⚠️ Loại gỗ chưa rõ |
| R38 | **NORMALIZED** | **B.II.8** | Vách ngăn mica trong (3 cái) | D800×H300mm |
| R39 | **NORMALIZED** | **B.II.9** | Ghế khách GD G2 (CĐT cấp, 3c) | scope=CLIENT_SUPPLIED |
| R40 | **NORMALIZED** | **B.II.10** | Ghế NV quầy GD (CĐT cấp, 3c) | scope=CLIENT_SUPPLIED |
| R41 | **NORMALIZED** | **B.II.11** | Cửa bật 1 (1.7 md) | MFC, KT:1700×1100mm |
| R42 | **NORMALIZED** | **B.II.12** | Tủ thấp gần cửa bật (1 hệ) | MFC, KT:900×1100mm |
| R43 | **NORMALIZED** | **B.II.13** | Cửa bật 2 (0.9 md) | MFC, KT:900×1100mm |
| R44 | **NORMALIZED** | **B.II.14** | Hệ bồn trồng cây (1 hệ) | MFC+laminate+ván nhựa |
| R45 | **NORMALIZED** | **B.II.15** | Tủ di động quầy GD (3 cái) | ⚠️ src item_no "13" trùng — flagged |
| R46 | **NORMALIZED** | **B.II.16** | Bàn LV nhân viên (6 cái) | Sắt+MFC, 1200×600×750mm |
| R47 | **NORMALIZED** | **B.II.17** | Ghế nhân viên (CĐT cấp, 6c) | scope=CLIENT_SUPPLIED |
| R48 | **NORMALIZED** | **B.II.18** | Vách ngăn mica D1000 (1 cái) | D1000×C350mm |
| R49 | **NORMALIZED** | **B.II.19** | Tủ di động 3NK NV (6 cái) | ⚠️ Nguồn ghi "670nn" — flagged |
| R50 | **NORMALIZED** | **B.II.20** | Bàn LV phó phòng (2 cái) | MFC, 1400×600×750mm |
| R51 | **NORMALIZED** | **B.II.21** | Ghế phó phòng (CĐT cấp, 2c) | scope=CLIENT_SUPPLIED |
| R52 | **NORMALIZED** | **B.II.22** | Bàn LV trưởng phòng (1 cái) | MFC, 1600×700×750mm |
| R53 | **NORMALIZED** | **B.II.23** | Ghế trưởng phòng (CĐT cấp) | scope=CLIENT_SUPPLIED |
| R54 | **NORMALIZED** | **B.II.24** | Tủ di động 3NK TP/PP (3 cái) | MFC, 470×510×670mm |
| R55 | **NORMALIZED** | **B.II.25** | Tủ thấp+hộc cây D=1400mm | MFC+ván nhựa |
| R56 | **NORMALIZED** | **B.II.26** | Tủ thấp D=4975mm | ⚠️ Nguồn ghi "24" trùng R57 |
| R57 | **NORMALIZED** | **B.II.27** | Tủ thấp vách kính ngoài | ⚠️ Nguồn ghi "24" trùng R56 |
| R58 | **NORMALIZED** | **B.II.28** | Tủ thấp sau bàn TP/PP | MFC, D3600×R400×C850mm |
| R59 | HEADER_SECTION | — | C — PHÒNG GIÁM ĐỐC CHI NHÁNH | Header khu vực C |
| R60 | HEADER_SUBSECTION | — | C.I — Phần liền tường | Header tiểu mục C.I |
| R61 | **NORMALIZED** | **C.I.1** | Thảm trải sàn (m2=27.615) | Net=26.3, ×1.05 |
| R62 | MERGED | → C.I.1 | Phòng GĐ CN: 26.3 | Sub-row KL thực |
| R63 | **NORMALIZED** | **C.I.2** | Len chân tường (md=11.55) | Net=11, ×1.05 |
| R64 | MERGED | → C.I.2 | Phòng GĐ CN: 11 | Sub-row KL thực |
| R65 | **NORMALIZED** | **C.I.3** | Rèm che nắng (m2=12.291) | KL xác nhận |
| R66 | MERGED | → C.I.3 | Phòng GĐ CN: 12.291 | Sub-row xác nhận |
| R67 | **NORMALIZED** | **C.I.4** | Tủ phòng GĐ (2 hệ, MDF) | ⚠️ KT không ghi — flagged |
| R68 | **NORMALIZED** | **C.I.5** | Ốp vách giữa 2 tủ (m2=7.191) | MDF+khung gỗ |
| R69 | HEADER_SUBSECTION | — | C.II — Nội thất rời | Header tiểu mục C.II |
| R70 | **NORMALIZED** | **C.II.1** | Bàn LV GĐ (1 cái, MDF+laminate) | ⚠️ KT không ghi — flagged |
| R71 | **NORMALIZED** | **C.II.2** | Ghế GĐ (CĐT cấp) | scope=CLIENT_SUPPLIED |
| R72 | **NORMALIZED** | **C.II.3** | Ghế khách G4 (CĐT cấp, 2c) | scope=CLIENT_SUPPLIED |
| R73 | **NORMALIZED** | **C.II.4** | Bàn tròn tiếp khách (CĐT cấp) | scope=CLIENT_SUPPLIED |
| R74 | **NORMALIZED** | **C.II.5** | Ghế tiếp khách đơn (1 cái) | Gỗ PU+simili |
| R75 | **NORMALIZED** | **C.II.6** | Sofa băng dài (CĐT cấp) | scope=CLIENT_SUPPLIED |
| R76 | HEADER_SECTION | — | D — PHÒNG PANTRY | Header khu vực D |
| R77 | HEADER_SUBSECTION | — | D.I — Phần hoàn thiện | ⚠️ Nguồn có 2 nhóm đánh số trong D.I |
| R78 | **NORMALIZED** | **D.I.1** | Thảm trải sàn (NOT_EXECUTED) | qty=0, "không thực hiện" |
| R79 | MERGED | → D.I.1 | Phòng pantry | Location note, không có data mới |
| R80 | **NORMALIZED** | **D.I.2** | Len chân tường (md=13.86) | Net=13.2, ×1.05 |
| R81 | MERGED | → D.I.2 | Phòng pantry: 13.2 | Sub-row KL thực |
| R82 | **NORMALIZED** | **D.I.3** | Rèm che nắng (m2=15.555) | Pantry & kho |
| R83 | MERGED | → D.I.3 | Phòng pantry & kho: 15.555 | Sub-row KL và phạm vi |
| R84 | **NORMALIZED** | **D.I.4** | Hệ quầy tủ pantry | ⚠️ Src restart "1". KT không ghi — flagged |
| R85 | **NORMALIZED** | **D.I.5** | Mặt đá PVC (NOT_EXECUTED) | qty=0, "không thực hiện" |
| R86 | **NORMALIZED** | **D.I.6** | Hệ đợt trên quầy (NOT_EXECUTED) | qty=0, "không thực hiện" |
| R87 | **NORMALIZED** | **D.I.7** | Ốp mặt đứng PVC (NOT_EXECUTED) | qty=0, "không thực hiện" |
| R88 | **NORMALIZED** | **D.I.8** | Tủ bỏ tủ lạnh (NOT_EXECUTED) | qty=0, "không thực hiện" |
| R89 | **NORMALIZED** | **D.I.9** | Hệ ghế sofa băng (1 hệ) | ⚠️ KT không ghi — flagged |
| R90 | HEADER_SUBSECTION | — | D.II — Nội thất rời | Header tiểu mục D.II |
| R91 | **NORMALIZED** | **D.II.1** | Bàn ăn chữ nhật (CĐT, 2c) | 900×500×750mm |
| R92 | **NORMALIZED** | **D.II.2** | Bàn ăn vuông (CĐT) | 500×500×750mm |
| R93 | **NORMALIZED** | **D.II.3** | Ghế ăn (CĐT, 6c) | scope=CLIENT_SUPPLIED |
| R94 | HEADER_SECTION | — | E — PHÒNG CHỦ TỊCH | Header khu vực E |
| R95 | HEADER_SUBSECTION | — | E.I — Phần liền tường | Header tiểu mục E.I |
| R96 | **NORMALIZED** | **E.I.1** | Thảm trải sàn (m2=98.7) | ⚠️ Không có reference_note — flagged |
| R97 | MERGED | → E.I.1 | Phòng chủ tịch: 94 | Net=94, ×1.05 |
| R98 | **NORMALIZED** | **E.I.2** | Len chân tường (md=42) | Net=40, ×1.05 |
| R99 | MERGED | → E.I.2 | Phòng chủ tịch: 40 | Sub-row KL thực |
| R100 | **NORMALIZED** | **E.I.3** | Rèm che nắng (m2=48.96) | KL xác nhận |
| R101 | MERGED | → E.I.3 | Phòng chủ tịch: 48.96 | Sub-row xác nhận |
| R102 | **NORMALIZED** | **E.I.4** | Vách ốp gỗ (m2=30.6) | ⚠️ Vật liệu không ghi — flagged |
| R103 | **NORMALIZED** | **E.I.5** | Nẹp T inox (md=47.7) | Inox |
| R104 | **NORMALIZED** | **E.I.6** | Tủ chủ tịch MDF (m2=26.265) | ⚠️ Không có reference_note, KT chưa rõ |
| R105 | **NORMALIZED** | **E.I.7** | Logo BMS mica đèn (qty=0) | ⚠️ qty=0 KHÔNG "không TH" — NEED_CLARIFICATION |
| R106 | HEADER_SUBSECTION | — | E.II — Nội thất rời | Header tiểu mục E.II |
| R107 | **NORMALIZED** | **E.II.1** | Bàn LV chủ tịch (CĐT) | scope=CLIENT_SUPPLIED |
| R108 | **NORMALIZED** | **E.II.2** | Ghế chủ tịch (CĐT) | scope=CLIENT_SUPPLIED |
| R109 | **NORMALIZED** | **E.II.3** | Ghế khách (CĐT, 2c) | scope=CLIENT_SUPPLIED |
| R110 | **NORMALIZED** | **E.II.4** | Bàn sofa (CĐT) | scope=CLIENT_SUPPLIED |
| R111 | **NORMALIZED** | **E.II.5** | Ghế sofa đơn (CĐT, 2c) | scope=CLIENT_SUPPLIED |
| R112 | **NORMALIZED** | **E.II.6** | Ghế sofa đôi (CĐT) | scope=CLIENT_SUPPLIED |
| R113 | **NORMALIZED** | **E.II.7** | Bàn pha trà (CĐT) | scope=CLIENT_SUPPLIED |
| R114 | **NORMALIZED** | **E.II.8** | Bàn họp 3000×1200×750mm (CĐT) | scope=CLIENT_SUPPLIED |
| R115 | **NORMALIZED** | **E.II.9** | Ghế họp (CĐT, 9c) | scope=CLIENT_SUPPLIED |
| R116 | HEADER_SECTION | — | F — HÀNH LANG | Header khu vực F |
| R117 | **NORMALIZED** | **F.1** | Thảm trải sàn (NOT_EXECUTED) | qty=0, "không thực hiện" |
| R118 | MERGED | → F.1 | Hành Lang | Location note |
| R119 | **NORMALIZED** | **F.2** | Len chân tường (NOT_EXECUTED) | qty=NULL (cột E trống), "không thực hiện" |
| R120 | MERGED | → F.2 | Hành Lang | Location note |
| R121 | HEADER_SECTION | — | G — CHI PHÍ KHÁC | Header khu vực G |
| R122 | **NORMALIZED** | **G.1** | Chi phí vận chuyển tầng 15 | HOMEPRO, NEED_QUOTATION |
| R123 | SUBTOTAL | — | TỔNG CỘNG CHƯA THUẾ VAT = 0 | Tổng cộng nguồn (=0 vì chưa có giá) |

---

## 2. MODEL DATA MỚI — QUAN HỆ CÁC NHÃN

> 4 nhãn cũ KHÔNG phải 4 trạng thái loại trừ nhau. Dùng 2 field riêng:

### field 1: scope (mutually exclusive)
| scope | Định nghĩa | Count |
|---|---|---|
| HOMEPRO | HomePro mua/sản xuất | **50** |
| CLIENT_SUPPLIED | CĐT tự cấp | **25** |
| NOT_EXECUTED | Xác nhận không TH | **7** |
| TỔNG | | **82 ✅** |

### field 2: pricing_status (mutually exclusive)
| pricing_status | Count |
|---|---|
| NEED_QUOTATION | **50** (= HOMEPRO) |
| NOT_APPLICABLE | **32** (= CĐT + Không TH) |
| TỔNG | **82 ✅** |

### flag: clarification_required (độc lập)
- YES = **14** items | NO = 68 items

**Ví dụ khu A (7 items):**
- scope: HOMEPRO=6, CLIENT_SUPPLIED=1, NOT_EXECUTED=0 → 6+1+0=7 ✅
- pricing_status: NEED_QUOTATION=6, NOT_APPLICABLE=1 → 6+1=7 ✅
- clarification_required YES=1 (A.I.4 vật liệu chưa ghi)

---

## 3. RECONCILIATION THEO KHU VỰC

| Mã | Khu vực | Total | HOMEPRO | CLIENT | NOT_EXE | NEED_Q | Clarify |
|---|---|---|---|---|---|---|---|
| A | Phòng Họp | 7 | 6 | 1 | 0 | 6 | 1 |
| B | Phòng Làm Việc | 33 | 25 | 8 | 0 | 25 | 5 |
| C | Phòng GĐ CN | 11 | 7 | 4 | 0 | 7 | 2 |
| D | Phòng Pantry | 12 | 4 | 3 | 5 | 4 | 2 |
| E | Phòng Chủ Tịch | 16 | 7 | 9 | 0 | 7 | 4 |
| F | Hành Lang | 2 | 0 | 0 | 2 | 0 | 0 |
| G | Chi Phí Khác | 1 | 1 | 0 | 0 | 1 | 0 |
| **TOT** | | **82** | **50** | **25** | **7** | **50** | **14** |

Kiểm tra: Total = HOMEPRO + CLIENT + NOT_EXE → mỗi hàng đều khớp ✅
NEED_Q = HOMEPRO → nhất quán 100% ✅
Clarify KHÔNG phải category riêng, KHÔNG cộng vào Total ✅

---

## 4. DANH SÁCH 14 ITEMS CẦN LÀM RÕ

| # | item_no | R | Hạng mục | ĐVT | KL | Qty status | Vấn đề | Dữ liệu thiếu | Hỏi ai |
|---|---|---|---|---|---|---|---|---|---|
| 1 | A.I.4 | 15 | Vách ốp gỗ (P.Họp) | m2 | 7.2675 | FROM_SOURCE | Vật liệu không ghi | MDF/MFC? Dày? Hoàn thiện? | BT/Thiết kế |
| 2 | B.II.7 | 37 | Vách ngăn ván gỗ | cái | 2 | FROM_SOURCE | "ván gỗ" loại không xác định | MDF? MFC? Gỗ công nghiệp? | BT/Thiết kế |
| 3 | B.II.15 | 45 | Tủ di động quầy GD | cái | 3 | FROM_SOURCE | Src item_no "13" trùng | Item này độc lập không? | Người lập KL |
| 4 | B.II.19 | 49 | Tủ di động 3NK NV | cái | 6 | FROM_SOURCE | Nguồn ghi "670nn" (sai đơn vị) | KT = 670mm không? | Người lập KL |
| 5 | B.II.26 | 56 | Tủ thấp D=4975mm | hệ | 1 | FROM_SOURCE | Src "24" trùng R57. PP giá "tỉ lệ" | PP định giá chính xác? | KD/Thiết kế |
| 6 | B.II.27 | 57 | Tủ thấp vách kính ngoài | cái | 1 | FROM_SOURCE | Src "24" trùng R56 | 2 items độc lập không? | Người lập KL |
| 7 | C.I.4 | 67 | Tủ phòng GĐ | hệ | 2 | FROM_SOURCE | KT hệ tủ không ghi | KT chiều dài/rộng/cao? | BT/Thiết kế |
| 8 | C.II.1 | 70 | Bàn LV GĐ | cái | 1 | FROM_SOURCE | KT bàn không ghi | KT bàn làm việc? | BT/Thiết kế |
| 9 | D.I.4 | 84 | Hệ quầy tủ pantry | cái | 1 | FROM_SOURCE | KT không ghi. Src restart số | KT hệ quầy? | BT/Thiết kế |
| 10 | D.I.9 | 89 | Hệ sofa băng pantry | hệ | 1 | FROM_SOURCE | KT sofa không ghi | KT hệ sofa? | BT/Thiết kế |
| 11 | E.I.1 | 96 | Thảm (P.Chủ Tịch) | m2 | 98.7 | FROM_SOURCE_WITH_FACTOR | Không có reference_note | Nguồn giá tham khảo? | KD |
| 12 | E.I.4 | 102 | Vách ốp gỗ (P.CT) | m2 | 30.6 | FROM_SOURCE | Vật liệu không ghi | Cùng spec A.I.4? MDF/MFC? | BT/Thiết kế |
| 13 | E.I.6 | 104 | Tủ P.Chủ Tịch | m2 | 26.265 | FROM_SOURCE | Không có reference_note. Cấu hình chưa rõ | Thiết kế tủ? KT? | BT/Thiết kế |
| 14 | E.I.7 | 105 | Logo BMS mica đèn | bộ | **0** | **NEED_CLARIFICATION** | qty=0 KHÔNG có "không TH" trong nguồn | Có TH không? SL? Vị trí? | CĐT/BT |

---

## 5. KIỂM TRA GIÁ

- unit_price = NULL: **82/82 items** ✅
- unit_price tự suy đoán: **0 items** ✅
- Ghi chú "Giá bảo minh CN Hà Nội" (31 items) → lưu vào reference_note ONLY
- Ghi chú "Giá bảo minh tầng 9 HO" (5 items) → lưu vào reference_note ONLY
- Ghi chú "Theo giá tỉ lệ chiều dài" (1 item) → reference_note, flagged clarification

**Định nghĩa:**
- reference_note = ghi chú THAM KHẢO từ nguồn, KHÔNG phải đơn giá ERP
- unit_price (ERP) = NULL cho tất cả Phase 1

---

## 6. KIỂM TRA SỐ LƯỢNG

| quantity_status | Count |
|---|---|
| FROM_SOURCE | 72 |
| FROM_SOURCE_WITH_FACTOR (×1.05) | 9 |
| NEED_CLARIFICATION | 1 (E.I.7) |

9 items với hệ số nhân:

| item_no | qty nguồn | qty net | hệ số |
|---|---|---|---|
| A.I.1 | 24.15 | 23 | ×1.05 |
| A.I.2 | 15.75 | 15 | ×1.05 |
| B.I.1 | 120.96 | 112 | ×1.08 |
| B.I.2 | 34.65 | 33 | ×1.05 |
| C.I.1 | 27.615 | 26.3 | ×1.05 |
| C.I.2 | 11.55 | 11 | ×1.05 |
| D.I.2 | 13.86 | 13.2 | ×1.05 |
| E.I.1 | 98.7 | 94 | ×1.05 |
| E.I.2 | 42 | 40 | ×1.05 |

F.2 (Len HLang): qty = NULL (cột E trống trong nguồn). Không điền 0 vì nguồn không ghi số.

---

## 7. GHI CHÚ CẤU TRÚC NGUỒN BẤT NHẤT

1. D.I đánh số 2 lần: items 1-3 (thảm/len/rèm) rồi restart 1-6 (nội thất) — cùng dưới header D.I "Phần hoàn thiện", không có sub-header phân cách. Đã normalize D.I.1–D.I.9 tuần tự.

2. B.II item "24" trùng: R56 và R57 đều A="24". Lỗi đánh số trong nguồn. Đã gán B.II.26 và B.II.27. Cần xác nhận.

---

## 8. FILES ĐẦU RA

| File | Đường dẫn |
|---|---|
| PHASE1-ITEM-MASTER.xlsx (8 sheets) | docs/projects/BAO-MINH-CMT8/ |
| reconciliation-gate.json | docs/projects/BAO-MINH-CMT8/ |
| BAO-MINH-SOURCE-REVIEW.xlsx | docs/projects/BAO-MINH-CMT8/ |
| BAO-MINH-SOURCE-REVIEW.csv | docs/projects/BAO-MINH-CMT8/ |

---

*Reconciliation: 2026-08-17 | FAIL=0 | BLOCKER=0*
*✅ PHASE 1 — SOURCE DATA READY FOR HUMAN REVIEW*
