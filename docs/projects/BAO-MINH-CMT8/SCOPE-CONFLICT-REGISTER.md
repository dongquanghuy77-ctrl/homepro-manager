# SCOPE CONFLICT REGISTER
## BAO MINH CMT8 — VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8

**Generated:** 2026-08-17T13:03:12.910Z
**Status:** PENDING HUMAN CONFIRMATION — All conflicts require human approval to resolve.

---

## CONFLICT-001: BANG MÃ VAN BMS T15.xlsx — FLOOR SCOPE MISMATCH

| Field | Value |
|---|---|
| **Conflict ID** | CONFLICT-001 |
| **Source File** | `BANG MÃ VAN BMS T15.xlsx` |
| **Source Path** | `D:\XƯỞNG HOMEPRO SG\...\FILE BOQ\BANG MÃ VAN BMS T15.xlsx` |
| **SHA-256** | `cecb73f184b56dec33d6fceab70783acc68b185af102a65ccee30e269e79e8f8` |
| **File Size** | 13210.3 KB |
| **Modified** | 2026-08-13 |
| **Expected Scope** | BAO-MINH-CMT8 = **TẦNG 15** (201-203 CMT8, Q3) |
| **Actual Scope (from content)** | **TẦNG 9** — text in file: "BẢNG FINAL MÃ VÁN VĂN PHÒNG BMS TẦNG 9" |
| **Severity** | 🔴 **HIGH** |
| **Approval Required** | ✅ YES |

### Evidence

**File Name:** `BANG MÃ VAN BMS T15.xlsx`
→ Implies Tầng 15 project

**Content Text Extracted (pdfjs-like approach — XLSX row scan):**
| Row | Content |
|---|---|
| 3 | `BẢNG FINAL MÃ VÁN VĂN PHÒNG BMS TẦNG 9` |
| 4 | `Khách hàng: Công Ty Cổ Phần Xây Dựng Aqcons` |
| 5 | `Dự án:` |
| 6 | `Hạng mục: Cung cấp và lắp đặt nội thất` |
| 7 | `Địa điểm:` |
| 8 | `STT HẠNG MỤC HÌNH ẢNH KÍCH THƯỚC
( mm ) DIỄN GIẢI ĐVT KL MÃ VÁN  HÌNH ẢNH  GHI CHÚ` |
| 10 | `A  Nội thất liền tường` |
| 11 | `1 Tủ hồ sơ cao  R400* C2700 * Ván MDF chống ẩm phủ melamine theo màu được duyệt
* Phụ kiện bản lề, tay nắm, led hắt sán` |
| 12 | `2 Tủ hồ sơ thấp  D1800* R400* C550 * Ván MDF chống ẩm phủ melamine theo màu được duyệt
* Phụ kiện bản lề, tay nắm, led ` |
| 13 | `3 Tủ bếp dưới  D2420* R500* C750 * Ván MDF chống ẩm phủ melamine theo màu được duyệt
* Vị trí chậu rửa ván nhựa chống n` |
| 14 | `4 Đá mặt bếp   * Đá kim sa trung khổ 500mm
* Ghép cạnh 40mm  md 2.42` |
| 15 | `B Nội thất rời` |
| 16 | `5 Bàn làm việc nhân viên  1200*600*750 * Chân sắt sơn tĩnh điện,
* Mặt bàn MDF chống ẩm phủ melamine theo màu được duyệ` |
| 17 | `6 Vách ngăn bàn bằng mica  D1000*C350 * Mica  cái 12` |
| 18 | `7 Tủ di động 3 ngăn kéo  470*510*670 * Ván MDF chống ẩm phủ melamine theo màu được duyệt cái 24 111G` |

**Key conflicting text found:** "BẢNG FINAL MÃ VÁN VĂN PHÒNG BMS TẦNG 9"
**Customer in file:** "Công Ty Cổ Phần Xây Dựng Aqcons"
→ Aqcons = đơn vị thi công, not BMSC (owner). This is consistent with T15, but "TẦNG 9" text contradicts.

### Quantity Mismatch Evidence

| Item | Qty in BANG MÃ (BMS) | Qty in BAO-MINH-CMT8 BOQ | Verdict |
|---|---|---|---|
| Bàn làm việc nhân viên | 24 cái | 6 cái (B.II.16) | ⚠️ DIFFERS 4× |
| Tủ di động 3 ngăn kéo | 24 cái | 6 cái (B.II.19) | ⚠️ DIFFERS 4× |
| Bàn làm việc phó phòng | 3 cái | 2 cái (B.II.20) | ⚠️ DIFFERS |
| Bàn làm việc trưởng phòng | 7 cái | 1 cái (B.II.22) | ⚠️ DIFFERS 7× |

→ The quantities in BANG MÃ VAN are **significantly larger** than T15 BOQ.
→ This is consistent with a larger floor (T9 vs T15 or T9 being another office).

### Hypothesis (NOT CONFIRMED — requires human)

| # | Hypothesis | Evidence For | Evidence Against |
|---|---|---|---|
| H1 | File is for T9, mistakenly named T15 | Content says Tầng 9, qty mismatch | — |
| H2 | File is for T15 but text was copied from T9 template | Qty doesn't match T15 BOQ | — |
| H3 | T15 has multiple areas (T9 + T15 combined office) | Aqcons works on both | No evidence |
| H4 | This is entirely unrelated project data | All evidence above | None |

### Proposed Resolution

> **APPROVAL REQUIRED (Huy):**
>
> 1. Xác nhận file `BANG MÃ VAN BMS T15.xlsx` dùng cho dự án nào?
> 2. Nếu là Tầng 9: cung cấp file BANG MÃ VAN chính xác cho Tầng 15
> 3. Nếu là Tầng 15 (nội dung sai): cung cấp mã ván chính xác cho T15 items
> 4. Hệ thống sẽ KHÔNG sử dụng file này cho BOQ T15 cho đến khi được confirm

**Current Status:** 🔴 BLOCKED — file NOT linked to any BOQ item until approval

---

## CONFLICT-002: NT-23 DIRECTIVE MAPPING (RESOLVED — PENDING CONFIRMATION)

| Field | Value |
|---|---|
| **Conflict ID** | CONFLICT-002 |
| **Source File** | `NT-23.pdf` |
| **Previous Classification** | CURTAIN_RAIL (Chi tiết rèm/rãnh R-01) |
| **Actual Classification** | **RECEPTION_COUNTER** (Chi tiết Quầy Tiếp Tân R-01) |
| **Evidence** | pdfjs-dist@3.11 text extraction, 1486 chars, 86 items — "CHI TIẾT QUẦY TIẾP TÂN R-01 PHÒNG LÀM VIỆC NT-23" |
| **Severity** | 🟡 MEDIUM (discovered and corrected in analysis, not yet in directive code) |
| **Approval Required** | ✅ YES — confirm before updating DIRECTIVE_MAPPING code |

### Proposed Resolution

> **APPROVAL REQUIRED (Huy):**
>
> 1. Confirm: NT-23 = Quầy Tiếp Tân R-01 cho Phòng Làm Việc (not curtain rail)
> 2. Correct BOQ links: B.II.4 (Quầy lễ tân), B.II.6 (Hệ quầy giao dịch) thay cho A.I.3..E.I.3
> 3. Identify which drawing covers rèm (curtain) items in main PDF

**Current Status:** 🟡 DOCUMENTED, correction prepared, awaiting approval to commit

---

## CONFLICT-003: MATERIAL CODE MS 204 SH — NOT IN ANY SUPPLIER REGISTER

| Field | Value |
|---|---|
| **Conflict ID** | CONFLICT-003 |
| **Source** | NT-23.pdf text layer — "MFC PHỦ MELAMIN MÀU ĐEN MS 204 SH" |
| **Expected** | Code should appear in BANG MÃ VAN or VẬT TƯ HỒNG NGHI |
| **Actual** | NOT FOUND in BANG MÃ VAN (scope conflict), NOT in VẬT TƯ HỒNG NGHI |
| **Severity** | 🟡 MEDIUM |
| **Approval Required** | ✅ YES |

> **APPROVAL REQUIRED (Huy):** Who supplies MS 204 SH? Is it from BT/Cai Bang (SC010MW equivalent)?

---

## CONFLICT-004: THAN TRE — IN PURCHASE DOCS BUT NOT IN BOQ

| Field | Value |
|---|---|
| **Conflict ID** | CONFLICT-004 |
| **Source** | SOURCE-001: 10 tấm THAN TRE 1220×2440×8mm |
| **BOQ** | NOT FOUND in 82 BOQ items |
| **SketchUp** | "THAN TRE" material exists in SKP model |
| **Severity** | 🟡 MEDIUM |
| **Approval Required** | ✅ YES |

> **APPROVAL REQUIRED (Huy):** Which BOQ item does THAN TRE belong to? Is it for Ốp tường/vách or separate item?

---

## APPROVAL QUEUE SUMMARY

| Conflict | Severity | Blocker? | Pending With |
|---|---|---|---|
| CONFLICT-001: BANG MÃ VAN scope | HIGH | ✅ YES (file unusable until resolved) | Huy |
| CONFLICT-002: NT-23 classification | MEDIUM | ❌ (documented, not blocking analysis) | Huy |
| CONFLICT-003: MS 204 SH supplier | MEDIUM | ❌ | Huy |
| CONFLICT-004: THAN TRE BOQ link | MEDIUM | ❌ | Huy |

---
*FAIL=0 | BLOCKER=1 (CONFLICT-001) | Generated: 2026-08-17T13:03:12.910Z*
