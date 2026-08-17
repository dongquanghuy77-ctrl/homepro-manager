# BAO MINH CMT8 — MATERIAL PURCHASE RECONCILIATION REPORT

**Dự án:** VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8 - TP HỒ CHÍ MINH  
**Phase:** 4 — Material Purchase Document Ingestion  
**Ngày:** 2026-08-17 16:50:35  
**Source ZIP:** `PHIẾU NHẬP VẬT TU.zip` (4 images)

---

## TỔNG QUAN

| Chỉ số | Giá trị |
|--------|---------|
| Tổng chứng từ | **4** |
| Tổng dòng vật tư | **16** |
| ERP transactions tạo | **0** |
| ERP postable ngay | **0 / 16** |
| Product match (CANDIDATE/MATCHED) | **7 / 16** |
| Product match (PENDING) | **9 / 16** |
| BOQ candidates | **16 / 16** |
| Supplier confirmed | **0 / 3** |
| Warehouse confirmed | **0 / 3** |
| Amount mismatches | **0** |
| Conflicts | **0** |

---

## A. CHỨNG TỪ NGUỒN

### SOURCE-01 — MATERIAL REQUIREMENT
| Trường | Giá trị |
|--------|---------|
| Tiêu đề | THAN TRE - KHỐI LƯỢNG VÁN VÀ CHỈ DÁN CẠNH VP BẢO MINH |
| Loại chứng từ | **MATERIAL_REQUIREMENT** |
| Ngày | NULL — không có trên chứng từ |
| Số chứng từ | NULL |
| Supplier | NULL |
| Warehouse | NULL |
| Tổng tiền | NULL — không có giá |
| ERP | **BLOCKED** — no price, no supplier |
| Ảnh nguồn | `SOURCE-01.jpg` (33,327 bytes) |

### SOURCE-02 — XÁC NHẬN ĐƠN HÀNG (Hồng Nghi)
| Trường | Giá trị |
|--------|---------|
| Tiêu đề | XÁC NHẬN ĐƠN HÀNG |
| Loại chứng từ | **SUPPLIER_ORDER_CONFIRMATION** |
| Ngày | NULL — không visible |
| Số chứng từ | NULL |
| Supplier | SUPPLIER_PENDING (VCB GIA PHÚC — 0501000112233) |
| Delivery | kho Hồng Nghi — WAREHOUSE_MATCH_PENDING |
| VAT | 8% đã bao gồm trong tổng |
| Tổng tiền | **38,220,754 ₫** (VAT included) |
| ERP | **BLOCKED** — no receipt confirmation |
| Ảnh nguồn | `SOURCE-02.jpg` (159,705 bytes) |

### SOURCE-03 — PHIẾU GIAO HÀNG (Tổng kho 1)
| Trường | Giá trị |
|--------|---------|
| Tiêu đề | Phiếu giao hàng / xuất kho (không tiêu đề rõ) |
| Loại chứng từ | **GOODS_DELIVERY_NOTE** *(cần xác nhận human)* |
| Khách hàng | CÔNG TY CỔ PHẦN ĐẦU TƯ VÀ PHÁT TRIỂN HOMEPRO (Mã KH: 32016240) |
| MST | 0317248874 |
| Supplier | SUPPLIER_PENDING (likely An Cuong — mã 9205S) |
| Warehouse | Tổng kho 1 — WAREHOUSE_MATCH_PENDING |
| Subtotal | 2,791,100 ₫ |
| VAT 8% (NQ43) | 223,288 ₫ |
| **Tổng cộng** | **3,014,388 ₫** |
| ERP | **BLOCKED** — document type ambiguous, supplier unconfirmed |
| Ảnh nguồn | `SOURCE-03.jpg` (99,873 bytes) |

### SOURCE-04 — ĐƠN ĐẶT HÀNG DHQ12.26008450
| Trường | Giá trị |
|--------|---------|
| Tiêu đề | ĐƠN ĐẶT HÀNG |
| Số | **DHQ12.26008450** |
| Ngày | **14/08/2026** |
| Buyer | CÔNG TY CỔ PHẦN ĐẦU TƯ VÀ PHÁT TRIỂN HOMEPRO |
| Supplier | SUPPLIER_PENDING (VIETINBANK, NVKD: Huỳnh Ngọc Thiên Thanh BTQ12-0005) |
| Delivery | Xưởng Thuận Giao — WAREHOUSE_MATCH_PENDING |
| Chiết khấu | 3,903,000 ₫ |
| Subtotal (sau CK) | 52,647,000 ₫ |
| VAT 8% | 4,211,760 ₫ |
| **Tổng thanh toán** | **56,858,760 ₫** |
| ERP | **BLOCKED** — PO only, no receipt |
| Ảnh nguồn | `SOURCE-04.jpg` (251,190 bytes) |

---

## B. RECONCILIATION TABLE — TẤT CẢ 16 DÒNG VẬT TƯ

| Source | Doc Type | Dòng | Mã hàng | Tên hàng hoá | Qty | ĐVT | Đơn giá | Đơn giá sau CK | Thành tiền | PM Status | BOQ Status | Recon Status |
|--------|----------|------|---------|--------------|----:|-----|--------:|------------:|----------:|-----------|------------|--------------|
| S001 | MR | L1-L01 | `—` | THAN TRE (KT: 1220 x 2440 x 8)mm | 10 | TẤM | N/A | N/A | N/A | PRODUCT_MATCH_PENDING | BOQ_CANDIDATE | 🔵 PENDING |
| S002 | OC | L2-L01 | `—` | 111G 2M LMR 17MM DW | 65 | CUỘN | 420,292 | N/A | 27,318,980 | PRODUCT_MATCH_PENDING | BOQ_CANDIDATE | 🔵 PENDING |
| S002 | OC | L2-L02 | `—` | 111G 2M LMR 9MM DW | 26 | PENDING | 300,499 | N/A | 7,812,974 | PRODUCT_MATCH_PENDING | BOQ_CANDIDATE | 🔵 PENDING |
| S002 | OC | L2-L03 | `—` | CHỈ 111SH (21x0.8)mm SM | 2 | PENDING | 140,400 | N/A | 280,800 | PRODUCT_MATCH_PENDING | BOQ_CANDIDATE | 🔵 PENDING |
| S002 | OC | L2-L04 | `—` | CHỈ 111SH (43x0.8)mm SM | 8 | PENDING | 351,000 | N/A | 2,808,000 | PRODUCT_MATCH_PENDING | BOQ_CANDIDATE | 🔵 PENDING |
| S003 | DN | L3-L01 | `250003217` | Chỉ PVC 9205 44x0.8mm | 30 | Mét | 4,370 | N/A | 131,100 | CANDIDATE | BOQ_CANDIDATE | 🟡 PARTIAL |
| S003 | DN | L3-L02 | `500005562` | Ván MELMDF 9205S/9205 MUESTSTD 1220x2440 | 4 | Tấm | 665,000 | N/A | 2,660,000 | CANDIDATE | BOQ_CANDIDATE | 🟡 PARTIAL |
| S004 | PO | L4-L01 | `LMRDW-17-ML2.SC010MW` | Ván LMR DW 17 mm x 1220 x 2440 phủ Melam | 67 | Tấm | 510,000 | 479,400 | 32,119,800 | CANDIDATE | BOQ_CANDIDATE | 🟡 PARTIAL |
| S004 | PO | L4-L02 | `LMRDW-8-ML2.SC010MW` | Ván LMR DW 8mm x 1220 x 2440 phủ Melamin | 21 | Tấm | 350,000 | 329,000 | 6,909,000 | CANDIDATE | BOQ_CANDIDATE | 🟡 PARTIAL |
| S004 | PO | L4-L03 | `CSC010M-21x0.8` | Chỉ SC010M (21 x 0.8) mm | 2 | Cuộn | 180,000 | 169,200 | 338,400 | CANDIDATE | BOQ_CANDIDATE | 🟡 PARTIAL |
| S004 | PO | L4-L04 | `CSC010M-43x0.8` | Chỉ SC010M (43 x 0.8) mm | 6 | Cuộn | 370,000 | 347,800 | 2,086,800 | CANDIDATE | BOQ_CANDIDATE | 🟡 PARTIAL |
| S004 | PO | L4-L05 | `LMRDW-17-ML2.XAM200T` | Ván LMR DW 17mm x 1220 x 2440 phủ Melami | 6 | Tấm | 500,000 | 385,000 | 2,310,000 | CANDIDATE | BOQ_CANDIDATE | 🟡 PARTIAL |
| S004 | PO | L4-L06 | `CXAMCT-21x0.8` | Chỉ Xám chỉ T (21 x 0.8) mm | 1 | Cuộn | 180,000 | 169,200 | 169,200 | PRODUCT_MATCH_PENDING | BOQ_CANDIDATE | 🔵 PENDING |
| S004 | PO | L4-L07 | `CXAMCT-43x0.8` | Chỉ Xám chỉ T (43 x 0.8) mm | 1 | Cuộn | 370,000 | 347,800 | 347,800 | PRODUCT_MATCH_PENDING | BOQ_CANDIDATE | 🔵 PENDING |
| S004 | PO | L4-L08 | `LMRDWE2-17` | LDF E2, LMR, Premium 17mm x 1220 x 2440 | 20 | Tấm | 350,000 | 329,000 | 6,580,000 | PRODUCT_MATCH_PENDING | BOQ_CANDIDATE | 🔵 PENDING |
| S004 | PO | L4-L09 | `LMRDWE2-8` | LDF E2, LMR, Premium 8mm x 1220 x 2440 | 10 | Tấm | 190,000 | 178,600 | 1,786,000 | PRODUCT_MATCH_PENDING | BOQ_CANDIDATE | 🔵 PENDING |

---

## C. PHÂN LOẠI KẾT QUẢ

### A. Có thể đưa vào ERP ngay
**(0 dòng)** — Không có dòng nào đủ điều kiện. Tất cả đang chờ xác nhận.

### B. Cần map Product Master
**(9 dòng)** — Chưa có mã hàng hoặc mã chưa match trong master:
- `SRC-001-L01`
- `SRC-002-L01`
- `SRC-002-L02`
- `SRC-002-L03`
- `SRC-002-L04`
- `SRC-004-L06`
- `SRC-004-L07`
- `SRC-004-L08`
- `SRC-004-L09`

### C. Cần map BOQ
**(16 dòng)** — BOQ là cấp đồ nội thất (tủ/bàn/vách), nguyên liệu thô chưa có BOQ line trực tiếp. Cần BOM explosion.
> **Ghi chú:** Đây KHÔNG phải lỗi. BOQ thiết kế ở cấp sản phẩm hoàn chỉnh. Mapping nguyên liệu → BOQ qua BOM chưa được thực hiện.

### D. Cần xác nhận Supplier
**(16 dòng)** — Tất cả chứng từ: SUPPLIER_PENDING:
- SOURCE-01: Không có supplier
- SOURCE-02: Likely Hồng Nghi (VCB GIA PHÚC) — chưa xác nhận
- SOURCE-03: Likely An Cuong (mã 9205S) — chưa xác nhận
- SOURCE-04: Likely An Cuong / nhà cung cấp ván LMR — chưa xác nhận

### E. Cần xác nhận Warehouse
**(16 dòng)** — 3 địa điểm, tất cả PENDING:
- `kho Hồng Nghi` — SOURCE-02 (Supplier warehouse hay điểm giao hàng?)
- `Tổng kho 1` — SOURCE-03 (HomePro hay An Cuong?)
- `Xưởng Thuận Giao` — SOURCE-04 (Production site, not inventory warehouse)

### F. Cần xác nhận đã nhập thực tế
**(9 dòng từ PO và Order Confirmation)** — SOURCE-02 và SOURCE-04:
- `SRC-002-L01`
- `SRC-002-L02`
- `SRC-002-L03`
- `SRC-002-L04`
- `SRC-004-L01`
- `SRC-004-L02`
- `SRC-004-L03`
- `SRC-004-L04`
- `SRC-004-L05`
- `SRC-004-L06`
- `SRC-004-L07`
- `SRC-004-L08`
- `SRC-004-L09`

### G. Conflicts giữa các chứng từ
**(0 conflicts)**  
Ghi chú: SOURCE-02 (LMR 111G 17mm, qty=65) và SOURCE-04 (LMRDW-17-ML2.SC010MW, qty=67) là hai chứng từ KHÁC NHAU — màu sắc khác nhau (111G vs SC010MW). **KHÔNG được cộng gộp.**

---

## D. KIỂM TRA AMOUNT

| Dòng | Qty | Đơn giá | Calc | Source | Match |
|------|----:|--------:|-----:|-------:|-------|
| SRC-002-L01 | 65 | 420,292 | 27,318,980 | 27,318,980 | ✅ |
| SRC-002-L02 | 26 | 300,499 | 7,812,974 | 7,812,974 | ✅ |
| SRC-002-L03 | 2 | 140,400 | 280,800 | 280,800 | ✅ |
| SRC-002-L04 | 8 | 351,000 | 2,808,000 | 2,808,000 | ✅ |
| SRC-003-L01 | 30 | 4,370 | 131,100 | 131,100 | ✅ |
| SRC-003-L02 | 4 | 665,000 | 2,660,000 | 2,660,000 | ✅ |
| SRC-004-L01 | 67 | 479,400 | 32,119,800 | 32,119,800 | ✅ |
| SRC-004-L02 | 21 | 329,000 | 6,909,000 | 6,909,000 | ✅ |
| SRC-004-L03 | 2 | 169,200 | 338,400 | 338,400 | ✅ |
| SRC-004-L04 | 6 | 347,800 | 2,086,800 | 2,086,800 | ✅ |
| SRC-004-L05 | 6 | 385,000 | 2,310,000 | 2,310,000 | ✅ |
| SRC-004-L06 | 1 | 169,200 | 169,200 | 169,200 | ✅ |
| SRC-004-L07 | 1 | 347,800 | 347,800 | 347,800 | ✅ |
| SRC-004-L08 | 20 | 329,000 | 6,580,000 | 6,580,000 | ✅ |
| SRC-004-L09 | 10 | 178,600 | 1,786,000 | 1,786,000 | ✅ |

> **Tất cả 15 dòng có giá: PASS ✅**

---

## E. CẢnh BÁO / FLAGS

> [!WARNING]
> **SOURCE-04, dòng 5 (LMRDW-17-ML2.XAM200T):** Tỷ lệ chiết khấu = **23%** trong khi tất cả dòng khác = 6%. Đây là dữ liệu trực tiếp từ ảnh chứng từ. Không sửa. Cần xác nhận lại với supplier.

> [!CAUTION]
> **SOURCE-04, dòng 8-9 (LMRDWE2-17, LMRDWE2-8):** Vật liệu **LDF E2** (Low-Density Fiberboard) — KHÔNG có trong Phase 3 SKP model material master. Đây là vật liệu mới, chưa được thiết kế vào mô hình SketchUp. Cần xác nhận với nhà thiết kế.

> [!IMPORTANT]
> **SOURCE-04, dòng 6-7 (CXAMCT):** Chỉ Xám CT 21x0.8 và 43x0.8 — KHÔNG có trong Phase 3F material master. Vật liệu mới.

> [!NOTE]
> **BOQ_MATCH_PENDING là trạng thái đúng.** BOQ thiết kế ở cấp đồ nội thất hoàn chỉnh (tủ, bàn, vách). Nguyên liệu thô (tấm ván, chỉ dán cạnh) được link qua BOM explosion — chưa thực hiện trong phase này.

---

## F. PROCUREMENT CHAIN STATUS

```
SOURCE-01 (THAN TRE — Yêu cầu mua):
  MR [SRC-001] → PO [MISSING] → Receipt [MISSING] → Stock [MISSING]

SOURCE-02 (XÁC NHẬN ĐƠN HÀNG — Hồng Nghi):
  PO [MISSING] ← Supplier confirms [SRC-002] → Receipt [MISSING] → Stock [MISSING]
  
SOURCE-03 (PHIẾU GIAO HÀNG — Tổng kho 1):
  PO [LINK_PENDING] → Delivery Note [SRC-003] → GRN [MISSING] → QC [MISSING] → Stock [MISSING]

SOURCE-04 (ĐƠN ĐẶT HÀNG DHQ12.26008450):
  PO [SRC-004] → Receipt [MISSING] → Invoice [MISSING] → Payment [MISSING]
```

---

## G. DATA LINEAGE

```
PHIẾU NHẬP VẬT TU.zip
  ├── SOURCE-01.jpg → SRC-BAO-MINH-001 → 1 line → MATERIAL_REQUIREMENT
  ├── SOURCE-02.jpg → SRC-BAO-MINH-002 → 4 lines → SUPPLIER_ORDER_CONFIRMATION → kho Hồng Nghi
  ├── SOURCE-03.jpg → SRC-BAO-MINH-003 → 2 lines → GOODS_DELIVERY_NOTE → Tổng kho 1
  └── SOURCE-04.jpg → SRC-BAO-MINH-004 → 9 lines → PURCHASE_ORDER DHQ12.26008450 → Thuận Giao
  
All lines → docs/projects/BAO-MINH-CMT8/source-document-register.json
All lines → docs/projects/BAO-MINH-CMT8/material-ingestion-reconciliation.json
ERP transactions: 0 (BLOCKED)
```

---

## TRẠNG THÁI CUỐI

| Gate | Result |
|------|--------|
| FAIL | **0** |
| BLOCKER | **0** |
| ORPHAN | **0** |
| UNTRACED | **0** |
| AMOUNT_MISMATCH | **0** |
| ERP_TRANSACTION_CREATED | **0** |

### Cần làm trước khi ERP posting:
1. 🔵 Xác nhận supplier cho SOURCE-02 (likely Hồng Nghi)
2. 🔵 Xác nhận supplier cho SOURCE-03/04 (likely An Cuong)
3. 🔵 Xác nhận loại chứng từ SOURCE-03 (Delivery Note hay Receipt?)
4. 🔵 Xác nhận 3 warehouse addresses
5. 🔵 Nhập Product Master cho 9 items PENDING
6. 🔵 Nhập GRN (Goods Receipt Note) cho SOURCE-02/04 (sau khi hàng thực tế nhận)
7. 🔵 BOM explosion để link raw materials → BOQ lines

---
*Tạo bởi HomePro Manager Phase 4 Pipeline — 2026-08-17 16:50:35*  
*FAIL=0 | BLOCKER=0 | ORPHAN=0 | UNTRACED=0*
