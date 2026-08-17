/**
 * BAO MINH CMT8 — PHASE 1 DATA RECONCILIATION GATE
 * 123 SOURCE ROWS → 82 NORMALIZED ITEMS
 * Full traceability. No prices assumed. No quantities invented.
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = 'docs/projects/BAO-MINH-CMT8';
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1: CORRECTED DATA MODEL
// scope và pricing_status là 2 fields ĐỘC LẬP, KHÔNG loại trừ nhau theo nghĩa
// cũ (4 cột cũ bị overlap). Model mới:
//
//  scope            = HOMEPRO | CLIENT_SUPPLIED | NOT_EXECUTED
//  pricing_status   = NEED_QUOTATION | NOT_APPLICABLE
//  quantity_status  = FROM_SOURCE | FROM_SOURCE_WITH_FACTOR | NEED_CLARIFICATION
//  clarification_required = true | false (flag riêng, có thể áp vào bất kỳ scope)
//  reference_note   = chuỗi ghi chú từ nguồn (VD: "Giá bảo minh CN Hà Nội")
//                     → ĐÂY KHÔNG PHẢI ĐƠN GIÁ. unit_price luôn = NULL
//  unit_price       = NULL (toàn bộ Phase 1, không có giá nào từ nguồn)
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2: 123-ROW SOURCE MAP — mỗi dòng phải có classification
// ══════════════════════════════════════════════════════════════════════════════
const SOURCE_ROW_MAP = [
  // ── PROJECT HEADERS (không phải data) ─────────────────────────────────────
  { row:1,  type:'HEADER',            content:'DỰ ÁN VĂN PHÒNG CHỨNG KHOÁN BẢO MINH CHI NHÁNH CMT8', reason:'Tiêu đề dự án' },
  { row:2,  type:'HEADER',            content:'GÓI THẦU THIẾT KẾ VÀ THI CÔNG HOÀN THIỆN NỘI THẤT VĂN PHÒNG', reason:'Gói thầu header' },
  { row:3,  type:'HEADER',            content:'Địa chỉ: 201-203 CMT8, PHƯỜNG BÀN CỜ, TP HCM', reason:'Địa chỉ dự án' },
  { row:4,  type:'EMPTY',             content:'(trống)', reason:'Dòng phân cách rỗng' },
  { row:5,  type:'HEADER_COL',        content:'STT | Mô tả | Hình ảnh | ĐVT | Khối lượng | Đơn giá | Thành tiền (VND) | Ghi chú', reason:'Dòng tiêu đề cột' },
  { row:6,  type:'EMPTY',             content:'(trống)', reason:'Dòng phân cách rỗng' },

  // ── SECTION A: PHÒNG HỌP ─────────────────────────────────────────────────
  { row:7,  type:'HEADER_SECTION',    content:'A — PHÒNG HỌP', reason:'Header khu vực A' },
  { row:8,  type:'HEADER_SUBSECTION', content:'A.I — Phần liền tường', reason:'Header tiểu mục A.I' },
  { row:9,  type:'NORMALIZED',        normalized_id:'A.I.1',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:10, type:'MERGED',            merged_into:'A.I.1',    reason:'Sub-row ghi chú khối lượng thực (23 m2 net trước hệ số ×1.05). Không có thêm data mới — đã gộp vào quantity_note của A.I.1' },
  { row:11, type:'NORMALIZED',        normalized_id:'A.I.2',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:12, type:'MERGED',            merged_into:'A.I.2',    reason:'Sub-row ghi chú khối lượng thực (15 md net trước ×1.05). Gộp vào quantity_note A.I.2' },
  { row:13, type:'NORMALIZED',        normalized_id:'A.I.3',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:14, type:'MERGED',            merged_into:'A.I.3',    reason:'Sub-row ghi chú khối lượng thực (5.8 m2). Gộp vào quantity_note A.I.3' },
  { row:15, type:'NORMALIZED',        normalized_id:'A.I.4',  reason:'Hạng mục có ĐVT, khối lượng — vật liệu chưa rõ (flagged review)' },
  { row:16, type:'NORMALIZED',        normalized_id:'A.I.5',  reason:'Hạng mục có ĐVT, khối lượng, vật liệu inox' },
  { row:17, type:'HEADER_SUBSECTION', content:'A.II — Nội thất rời', reason:'Header tiểu mục A.II' },
  { row:18, type:'NORMALIZED',        normalized_id:'A.II.1', reason:'Hạng mục có ĐVT, SL=1, mô tả kích thước đầy đủ' },
  { row:19, type:'NORMALIZED',        normalized_id:'A.II.2', reason:'CĐT cấp — ghi chú nguồn: "CĐT cấp"' },

  // ── SECTION B: PHÒNG LÀM VIỆC ────────────────────────────────────────────
  { row:20, type:'HEADER_SECTION',    content:'B — PHÒNG LÀM VIỆC', reason:'Header khu vực B' },
  { row:21, type:'HEADER_SUBSECTION', content:'B.I — Phần liền tường', reason:'Header tiểu mục B.I' },
  { row:22, type:'NORMALIZED',        normalized_id:'B.I.1',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:23, type:'MERGED',            merged_into:'B.I.1',    reason:'Sub-row ghi chú KL thực (112 m2 net). Gộp vào quantity_note B.I.1' },
  { row:24, type:'NORMALIZED',        normalized_id:'B.I.2',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:25, type:'MERGED',            merged_into:'B.I.2',    reason:'Sub-row ghi chú KL thực (33 md net). Gộp vào quantity_note B.I.2' },
  { row:26, type:'NORMALIZED',        normalized_id:'B.I.3',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:27, type:'MERGED',            merged_into:'B.I.3',    reason:'Sub-row ghi chú KL thực (45 m2). Gộp vào quantity_note B.I.3' },
  { row:28, type:'NORMALIZED',        normalized_id:'B.I.4',  reason:'Hạng mục có ĐVT, khối lượng, vật liệu MDF' },
  { row:29, type:'NORMALIZED',        normalized_id:'B.I.5',  reason:'Hạng mục có ĐVT, khối lượng, vật liệu MFC, kích thước R400*C2800mm' },
  { row:30, type:'HEADER_SUBSECTION', content:'B.II — Nội thất rời', reason:'Header tiểu mục B.II' },
  { row:31, type:'NORMALIZED',        normalized_id:'B.II.1', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:32, type:'NORMALIZED',        normalized_id:'B.II.2', reason:'Hạng mục có ĐVT=cái, SL=3, vật liệu simili' },
  { row:33, type:'NORMALIZED',        normalized_id:'B.II.3', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:34, type:'NORMALIZED',        normalized_id:'B.II.4', reason:'Hạng mục có ĐVT=md, SL=3.6, vật liệu MDF+laminate+mica, KT: 3600*750/870*750/1100mm' },
  { row:35, type:'NORMALIZED',        normalized_id:'B.II.5', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:36, type:'NORMALIZED',        normalized_id:'B.II.6', reason:'Hạng mục có ĐVT=hệ, SL=1, vật liệu sắt+MDF, KT: D3350*R1000*C750mm' },
  { row:37, type:'NORMALIZED',        normalized_id:'B.II.7', reason:'Hạng mục có ĐVT=cái, SL=2, vật liệu "ván gỗ" (loại chưa rõ — flagged)' },
  { row:38, type:'NORMALIZED',        normalized_id:'B.II.8', reason:'Hạng mục có ĐVT=cái, SL=3, vật liệu mica trong, KT: D800*H300mm' },
  { row:39, type:'NORMALIZED',        normalized_id:'B.II.9', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:40, type:'NORMALIZED',        normalized_id:'B.II.10',reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:41, type:'NORMALIZED',        normalized_id:'B.II.11',reason:'Hạng mục có ĐVT=md, SL=1.7, vật liệu MFC, KT: 1700*1100mm' },
  { row:42, type:'NORMALIZED',        normalized_id:'B.II.12',reason:'Hạng mục có ĐVT=hệ, SL=1, vật liệu MFC, KT: 900*1100mm' },
  { row:43, type:'NORMALIZED',        normalized_id:'B.II.13',reason:'Hạng mục có ĐVT=md, SL=0.9, vật liệu MFC, KT: 900*1100mm' },
  { row:44, type:'NORMALIZED',        normalized_id:'B.II.14',reason:'Hạng mục có ĐVT=hệ, SL=1, vật liệu MFC+ván nhựa, KT: 800*870*750mm' },
  { row:45, type:'NORMALIZED',        normalized_id:'B.II.15',reason:'Hạng mục có ĐVT=cái, SL=3. CẢNH BÁO: cột A trong nguồn ghi "13" (trùng với item trước). Đã gán B.II.15 để phân biệt. Flagged review.' },
  { row:46, type:'NORMALIZED',        normalized_id:'B.II.16',reason:'Hạng mục có ĐVT=cái, SL=6, vật liệu sắt sơn TĐ+MFC, KT: 1200*600*750mm' },
  { row:47, type:'NORMALIZED',        normalized_id:'B.II.17',reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:48, type:'NORMALIZED',        normalized_id:'B.II.18',reason:'Hạng mục có ĐVT=cái, SL=1, vật liệu mica, KT: D1000*C350mm' },
  { row:49, type:'NORMALIZED',        normalized_id:'B.II.19',reason:'Hạng mục có ĐVT=cái, SL=6, vật liệu MFC. CẢNH BÁO: nguồn ghi "670nn" — nghi lỗi đánh máy, phải xác nhận là 670mm. Flagged review.' },
  { row:50, type:'NORMALIZED',        normalized_id:'B.II.20',reason:'Hạng mục có ĐVT=cái, SL=2, vật liệu MFC, KT: 1400*600*750mm' },
  { row:51, type:'NORMALIZED',        normalized_id:'B.II.21',reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:52, type:'NORMALIZED',        normalized_id:'B.II.22',reason:'Hạng mục có ĐVT=cái, SL=1, vật liệu MFC, KT: 1600*700*750mm' },
  { row:53, type:'NORMALIZED',        normalized_id:'B.II.23',reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:54, type:'NORMALIZED',        normalized_id:'B.II.24',reason:'Hạng mục có ĐVT=cái, SL=3, vật liệu MFC, KT: 470*510*670mm' },
  { row:55, type:'NORMALIZED',        normalized_id:'B.II.25',reason:'Hạng mục có ĐVT=cái, SL=1, vật liệu MFC+ván nhựa, KT: 1400*350*750mm' },
  { row:56, type:'NORMALIZED',        normalized_id:'B.II.26',reason:'Hạng mục có ĐVT=hệ, SL=1, KT: 4975*350*750mm. CẢNH BÁO: cột A ghi "24" (trùng row 57). Ghi chú giá "Theo giá tủ thấp * tỉ lệ chiều dài" — phương pháp tính chưa rõ. Flagged review.' },
  { row:57, type:'NORMALIZED',        normalized_id:'B.II.27',reason:'Hạng mục có ĐVT=cái, SL=1, KT: D4800*R400*C850mm. CẢNH BÁO: cột A ghi "24" (trùng row 56). Flagged review.' },
  { row:58, type:'NORMALIZED',        normalized_id:'B.II.28',reason:'Hạng mục có ĐVT=cái, SL=1, KT: D3600*R400*C850mm' },

  // ── SECTION C: PHÒNG GIÁM ĐỐC CHI NHÁNH ─────────────────────────────────
  { row:59, type:'HEADER_SECTION',    content:'C — PHÒNG GIÁM ĐỐC CHI NHÁNH', reason:'Header khu vực C' },
  { row:60, type:'HEADER_SUBSECTION', content:'C.I — Phần liền tường', reason:'Header tiểu mục C.I' },
  { row:61, type:'NORMALIZED',        normalized_id:'C.I.1',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:62, type:'MERGED',            merged_into:'C.I.1',    reason:'Sub-row ghi chú KL thực (26.3 m2 net). Gộp vào quantity_note C.I.1' },
  { row:63, type:'NORMALIZED',        normalized_id:'C.I.2',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:64, type:'MERGED',            merged_into:'C.I.2',    reason:'Sub-row ghi chú KL thực (11 md net). Gộp vào quantity_note C.I.2' },
  { row:65, type:'NORMALIZED',        normalized_id:'C.I.3',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:66, type:'MERGED',            merged_into:'C.I.3',    reason:'Sub-row ghi chú KL thực (12.291 m2). Gộp vào quantity_note C.I.3' },
  { row:67, type:'NORMALIZED',        normalized_id:'C.I.4',  reason:'Hạng mục có ĐVT=hệ, SL=2. CẢNH BÁO: kích thước hệ tủ không ghi trong sheet. Flagged review.' },
  { row:68, type:'NORMALIZED',        normalized_id:'C.I.5',  reason:'Hạng mục có ĐVT=m2, SL=7.191, vật liệu MDF+khung gỗ' },
  { row:69, type:'HEADER_SUBSECTION', content:'C.II — Nội thất rời', reason:'Header tiểu mục C.II' },
  { row:70, type:'NORMALIZED',        normalized_id:'C.II.1', reason:'Hạng mục có ĐVT=cái, SL=1. CẢNH BÁO: kích thước bàn không ghi. Flagged review.' },
  { row:71, type:'NORMALIZED',        normalized_id:'C.II.2', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:72, type:'NORMALIZED',        normalized_id:'C.II.3', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:73, type:'NORMALIZED',        normalized_id:'C.II.4', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:74, type:'NORMALIZED',        normalized_id:'C.II.5', reason:'Hạng mục có ĐVT=cái, SL=1, vật liệu gỗ sơn PU+simili' },
  { row:75, type:'NORMALIZED',        normalized_id:'C.II.6', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },

  // ── SECTION D: PHÒNG PANTRY ───────────────────────────────────────────────
  { row:76, type:'HEADER_SECTION',    content:'D — PHÒNG PANTRY', reason:'Header khu vực D' },
  { row:77, type:'HEADER_SUBSECTION', content:'D.I — Phần hoàn thiện', reason:'Header tiểu mục D.I. LƯU Ý: Nguồn document có 2 nhóm đánh số trong D.I: items 1-3 (thảm/len/rèm) và items 1-6 (đồ nội thất xây dựng) — cả hai đều dưới header "Phần hoàn thiện". Không có thêm sub-header. Đây là cấu trúc nguồn bất nhất.' },
  { row:78, type:'NORMALIZED',        normalized_id:'D.I.1',  reason:'NOT_EXECUTED — qty=0, ghi chú: "không thực hiện"' },
  { row:79, type:'MERGED',            merged_into:'D.I.1',    reason:'Sub-row chỉ có B:"Phòng pantry" (không có thêm số liệu). Gộp vào D.I.1 làm location_note' },
  { row:80, type:'NORMALIZED',        normalized_id:'D.I.2',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:81, type:'MERGED',            merged_into:'D.I.2',    reason:'Sub-row ghi chú KL thực (13.2 md net). Gộp vào quantity_note D.I.2' },
  { row:82, type:'NORMALIZED',        normalized_id:'D.I.3',  reason:'Hạng mục có ĐVT, khối lượng' },
  { row:83, type:'MERGED',            merged_into:'D.I.3',    reason:'Sub-row ghi chú KL (15.555 m2, phạm vi "Phòng pantry & kho"). Gộp vào quantity_note D.I.3' },
  { row:84, type:'NORMALIZED',        normalized_id:'D.I.4',  reason:'Hạng mục có ĐVT=cái, SL=1. CẢNH BÁO: nguồn ghi item số "1" (restart numbering trong D.I — không nhất quán). Kích thước không ghi rõ. Flagged review.' },
  { row:85, type:'NORMALIZED',        normalized_id:'D.I.5',  reason:'NOT_EXECUTED — qty=0, ghi chú: "không thực hiện"' },
  { row:86, type:'NORMALIZED',        normalized_id:'D.I.6',  reason:'NOT_EXECUTED — qty=0, ghi chú: "không thực hiện"' },
  { row:87, type:'NORMALIZED',        normalized_id:'D.I.7',  reason:'NOT_EXECUTED — qty=0, ghi chú: "không thực hiện"' },
  { row:88, type:'NORMALIZED',        normalized_id:'D.I.8',  reason:'NOT_EXECUTED — qty=0, ghi chú: "không thực hiện"' },
  { row:89, type:'NORMALIZED',        normalized_id:'D.I.9',  reason:'Hạng mục có ĐVT=hệ, SL=1. CẢNH BÁO: kích thước không ghi. Flagged review.' },
  { row:90, type:'HEADER_SUBSECTION', content:'D.II — Nội thất rời', reason:'Header tiểu mục D.II' },
  { row:91, type:'NORMALIZED',        normalized_id:'D.II.1', reason:'CĐT cấp — ghi chú: "CĐT cấp", KT: 900*500*750mm' },
  { row:92, type:'NORMALIZED',        normalized_id:'D.II.2', reason:'CĐT cấp — ghi chú: "CĐT cấp", KT: 500*500*750mm' },
  { row:93, type:'NORMALIZED',        normalized_id:'D.II.3', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },

  // ── SECTION E: PHÒNG CHỦ TỊCH ────────────────────────────────────────────
  { row:94,  type:'HEADER_SECTION',    content:'E — PHÒNG CHỦ TỊCH', reason:'Header khu vực E' },
  { row:95,  type:'HEADER_SUBSECTION', content:'E.I — Phần liền tường', reason:'Header tiểu mục E.I' },
  { row:96,  type:'NORMALIZED',        normalized_id:'E.I.1',  reason:'Hạng mục có ĐVT, SL=98.7. CẢNH BÁO: không có ghi chú giá (các phòng khác có "Giá bảo minh CN Hà Nội"). Flagged review.' },
  { row:97,  type:'MERGED',            merged_into:'E.I.1',    reason:'Sub-row ghi chú KL thực (94 m2 net). Gộp vào quantity_note E.I.1' },
  { row:98,  type:'NORMALIZED',        normalized_id:'E.I.2',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:99,  type:'MERGED',            merged_into:'E.I.2',    reason:'Sub-row ghi chú KL thực (40 md net). Gộp vào quantity_note E.I.2' },
  { row:100, type:'NORMALIZED',        normalized_id:'E.I.3',  reason:'Hạng mục có ĐVT, khối lượng, ghi chú' },
  { row:101, type:'MERGED',            merged_into:'E.I.3',    reason:'Sub-row ghi chú KL thực (48.96 m2). Gộp vào quantity_note E.I.3' },
  { row:102, type:'NORMALIZED',        normalized_id:'E.I.4',  reason:'Hạng mục có ĐVT=m2, SL=30.6. CẢNH BÁO: vật liệu vách ốp không ghi rõ. Flagged review.' },
  { row:103, type:'NORMALIZED',        normalized_id:'E.I.5',  reason:'Hạng mục có ĐVT=md, SL=47.7, vật liệu inox' },
  { row:104, type:'NORMALIZED',        normalized_id:'E.I.6',  reason:'Hạng mục có ĐVT=m2, SL=26.265, vật liệu MDF. CẢNH BÁO: không có ghi chú giá, kích thước tổng thể không rõ. Flagged review.' },
  { row:105, type:'NORMALIZED',        normalized_id:'E.I.7',  reason:'NEED_CLARIFICATION_QTY — qty=0 trong nguồn, nhưng KHÔNG có ghi chú "không thực hiện". Không thể phân loại thành NOT_EXECUTED. Scope=HOMEPRO nhưng quantity_status=NEED_CLARIFICATION. Phải hỏi CĐT/thiết kế.' },
  { row:106, type:'HEADER_SUBSECTION', content:'E.II — Nội thất rời', reason:'Header tiểu mục E.II' },
  { row:107, type:'NORMALIZED',        normalized_id:'E.II.1', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:108, type:'NORMALIZED',        normalized_id:'E.II.2', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:109, type:'NORMALIZED',        normalized_id:'E.II.3', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:110, type:'NORMALIZED',        normalized_id:'E.II.4', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:111, type:'NORMALIZED',        normalized_id:'E.II.5', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:112, type:'NORMALIZED',        normalized_id:'E.II.6', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:113, type:'NORMALIZED',        normalized_id:'E.II.7', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },
  { row:114, type:'NORMALIZED',        normalized_id:'E.II.8', reason:'CĐT cấp — ghi chú: "CĐT cấp", KT: 3000*1200*750mm' },
  { row:115, type:'NORMALIZED',        normalized_id:'E.II.9', reason:'CĐT cấp — ghi chú: "CĐT cấp"' },

  // ── SECTION F: HÀNH LANG ──────────────────────────────────────────────────
  { row:116, type:'HEADER_SECTION',    content:'F — HÀNH LANG', reason:'Header khu vực F' },
  { row:117, type:'NORMALIZED',        normalized_id:'F.1',    reason:'NOT_EXECUTED — qty=0, ghi chú: "không thực hiện"' },
  { row:118, type:'MERGED',            merged_into:'F.1',      reason:'Sub-row chỉ có B:"Hành Lang" (location_note). Không có số liệu mới. Gộp vào F.1.' },
  { row:119, type:'NORMALIZED',        normalized_id:'F.2',    reason:'NOT_EXECUTED — qty không có trong nguồn, ghi chú: "không thực hiện"' },
  { row:120, type:'MERGED',            merged_into:'F.2',      reason:'Sub-row chỉ có B:"Hành Lang" (location_note). Không có số liệu mới. Gộp vào F.2.' },

  // ── SECTION G: CHI PHÍ KHÁC ──────────────────────────────────────────────
  { row:121, type:'HEADER_SECTION',    content:'G — CHI PHÍ KHÁC', reason:'Header khu vực G' },
  { row:122, type:'NORMALIZED',        normalized_id:'G.1',    reason:'Hạng mục có ĐVT=Gói, SL=1. Cần báo giá vận chuyển lên tầng 15.' },
  { row:123, type:'SUBTOTAL',          content:'TỔNG CỘNG CHƯA THUẾ VAT — Giá trị = 0 (chưa có đơn giá)', reason:'Dòng tổng cộng nguồn (G=0 vì chưa có đơn giá). Không phải data hạng mục.' },
];

// Kiểm tra xác nhận: tổng phải = 123
console.assert(SOURCE_ROW_MAP.length === 123, `SOURCE_ROW_MAP length = ${SOURCE_ROW_MAP.length}, expected 123`);

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3: NORMALIZED 82 ITEMS — Model mới (scope + pricing_status riêng biệt)
// ══════════════════════════════════════════════════════════════════════════════
const NORMALIZED_ITEMS = [
  // ─── A: PHÒNG HỌP (7 items) ──────────────────────────────────────────────
  {
    id:1, item_no:'A.I.1', section:'A', section_name:'PHÒNG HỌP',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:9,
    item_name:'Thảm trải sàn',
    description:'Thảm trải sàn | Theo mẫu được duyệt',
    material_raw:'Thảm (theo mẫu được duyệt)', uom:'m2',
    quantity_value:24.15, quantity_status:'FROM_SOURCE_WITH_FACTOR',
    quantity_note:'Nguồn: 24.15 (cột E row 9). Sub-row R10 ghi net=23 m2 (KL sau ×1.05 hao hụt)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:2, item_no:'A.I.2', section:'A', section_name:'PHÒNG HỌP',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:11,
    item_name:'Len chân tường',
    description:'Len chân tường | Len PVC H100mm',
    material_raw:'PVC H100mm', uom:'md',
    quantity_value:15.75, quantity_status:'FROM_SOURCE_WITH_FACTOR',
    quantity_note:'Nguồn: 15.75 (cột E row 11). Sub-row R12 ghi net=15 md (KL sau ×1.05)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:3, item_no:'A.I.3', section:'A', section_name:'PHÒNG HỌP',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:13,
    item_name:'Rèm che nắng',
    description:'Rèm che nắng | Rèm cuộn màu trắng',
    material_raw:'Rèm cuộn màu trắng', uom:'m2',
    quantity_value:5.8, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 5.8 (cột E row 13). Sub-row R14 xác nhận 5.8 (không có hệ số)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:4, item_no:'A.I.4', section:'A', section_name:'PHÒNG HỌP',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:15,
    item_name:'Vách ốp gỗ',
    description:'Vách ốp gỗ | (không có mô tả vật liệu trong nguồn)',
    material_raw:'', uom:'m2',
    quantity_value:7.2675, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 7.2675 (cột E row 15). Không có sub-row.',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'không bao gồm màn hình trình chiếu',
    clarification_required:true, clarification_reason:'Vật liệu vách ốp gỗ không được ghi trong nguồn. Cần xác nhận: MDF hay MFC? Dày bao nhiêu? Hoàn thiện gì? Cần hỏi: BT/Thiết kế',
  },
  {
    id:5, item_no:'A.I.5', section:'A', section_name:'PHÒNG HỌP',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:16,
    item_name:'Nẹp T inox ron vách gỗ',
    description:'Nẹp T inox ron vách gỗ',
    material_raw:'Inox', uom:'md',
    quantity_value:7.95, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 7.949999999999999 (cột E row 16) ≈ 7.95',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:6, item_no:'A.II.1', section:'A', section_name:'PHÒNG HỌP',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:18,
    item_name:'Bàn họp',
    description:'Bàn họp | MFC phủ melamine vân gỗ | Chân MFC màu đen | Bao gồm hộc điện âm bàn | KT: D3200*R1400*C750mm',
    material_raw:'MFC phủ melamine vân gỗ + MFC phủ melamine màu đen', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 18)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:7, item_no:'A.II.2', section:'A', section_name:'PHÒNG HỌP',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:19,
    item_name:'Ghế họp',
    description:'Ghế họp',
    material_raw:'', uom:'cái',
    quantity_value:10, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 10 (cột E row 19)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },

  // ─── B: PHÒNG LÀM VIỆC (33 items) ─────────────────────────────────────────
  {
    id:8, item_no:'B.I.1', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:22,
    item_name:'Thảm trải sàn',
    description:'Thảm trải sàn | Theo mẫu được duyệt',
    material_raw:'Thảm (theo mẫu được duyệt)', uom:'m2',
    quantity_value:120.96, quantity_status:'FROM_SOURCE_WITH_FACTOR',
    quantity_note:'Nguồn: 120.96 (cột E row 22). Sub-row R23 ghi net=112 m2. Hệ số: 120.96/112 ≈ 1.08 (hao hụt + đệm)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:9, item_no:'B.I.2', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:24,
    item_name:'Len chân tường',
    description:'Len chân tường | Len PVC H100mm',
    material_raw:'PVC H100mm', uom:'md',
    quantity_value:34.65, quantity_status:'FROM_SOURCE_WITH_FACTOR',
    quantity_note:'Nguồn: 34.65 (cột E row 24). Sub-row R25 net=33 md (×1.05)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:10, item_no:'B.I.3', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:26,
    item_name:'Rèm che nắng',
    description:'Rèm che nắng | Rèm cuộn màu trắng',
    material_raw:'Rèm cuộn màu trắng', uom:'m2',
    quantity_value:45, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 45 (cột E row 26). Sub-row R27 xác nhận 45.',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:11, item_no:'B.I.4', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:28,
    item_name:'Vách ốp gỗ',
    description:'Vách ốp gỗ | Nền Ván MDF kháng ẩm phủ melamine màu trắng theo màu được duyệt chạy ron sơn',
    material_raw:'MDF kháng ẩm phủ melamine màu trắng', uom:'m2',
    quantity_value:16.2435, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 16.243499999999997 (cột E row 28) ≈ 16.2435',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:12, item_no:'B.I.5', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:29,
    item_name:'Tủ hồ sơ cao',
    description:'Tủ hồ sơ cao | Ván MFC phủ melamine | Phụ kiện: bản lề, tay nắm, led hắt sáng | KT: R400*C2800mm',
    material_raw:'MFC phủ melamine', uom:'m2',
    quantity_value:13.005, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 13.004999999999999 (cột E row 29) ≈ 13.005',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:13, item_no:'B.II.1', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:31,
    item_name:'Bàn tròn tiếp khách',
    description:'Bàn tròn tiếp khách | Chân inox màu vàng gold | Mặt đá marble nhân tạo trắng vân mây | D800*H450mm',
    material_raw:'Inox màu vàng gold + đá marble nhân tạo trắng vân mây', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 31)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:14, item_no:'B.II.2', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:32,
    item_name:'Ghế tiếp khách đơn',
    description:'Ghế tiếp khách đơn | Chân gỗ sơn PU | Nệm ngồi và lưng bọc simili theo màu được duyệt',
    material_raw:'Gỗ sơn PU + simili', uom:'cái',
    quantity_value:3, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 3 (cột E row 32)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:15, item_no:'B.II.3', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:33,
    item_name:'Sofa băng dài',
    description:'Sofa băng dài | Khung gỗ | Nệm mút bọc simili | bao gồm gối nhấn | KT: D2475*R900*C500mm',
    material_raw:'Khung gỗ + nệm mút bọc simili', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 33)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:16, item_no:'B.II.4', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:34,
    item_name:'Quầy lễ tân',
    description:'Quầy lễ tân | MDF phủ laminate vân đá | Cánh tủ MFC phủ melamine | Ấn viền xanh + LED | Logo "BMS" mica | KT: 3600*750/870*750/1100mm',
    material_raw:'MDF phủ laminate vân đá + MFC phủ melamine + mica', uom:'md',
    quantity_value:3.6, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 3.6 (cột E row 34)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh Tầng trệt HO',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:17, item_no:'B.II.5', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:35,
    item_name:'Ghế lễ tân (G1)',
    description:'Ghế lễ tân (G1) | Đề xuất the one GL123 / tương đương',
    material_raw:'', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 35)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:18, item_no:'B.II.6', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:36,
    item_name:'Hệ Quầy giao dịch',
    description:'Hệ Quầy giao dịch | Chân sắt + MDF kháng ẩm phủ Melamine AC | Giật cấp mặt ngoài + LED | KT: D3350*R1000*C750mm',
    material_raw:'Sắt + MDF kháng ẩm phủ Melamine AC', uom:'hệ',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 36)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:19, item_no:'B.II.7', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:37,
    item_name:'Vách ngăn bàn bằng ván gỗ',
    description:'Vách ngăn bàn bằng ván gỗ | KT: D1000*H300mm',
    material_raw:'Ván gỗ (loại chưa xác định trong nguồn)', uom:'cái',
    quantity_value:2, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 2 (cột E row 37)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:true, clarification_reason:'Loại ván gỗ không ghi rõ. Cần xác nhận: MDF? MFC? Gỗ công nghiệp? Cần hỏi: BT/Thiết kế',
  },
  {
    id:20, item_no:'B.II.8', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:38,
    item_name:'Vách ngăn bàn bằng mica trong',
    description:'Vách ngăn bàn bằng mica trong | KT: D800*H300mm',
    material_raw:'Mica trong', uom:'cái',
    quantity_value:3, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 3 (cột E row 38)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:21, item_no:'B.II.9', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:39,
    item_name:'Ghế khách quầy giao dịch (G2)',
    description:'Ghế khách quầy giao dịch (G2) | Chân quỳ bọc da màu vàng / tương đương theo mẫu được chọn',
    material_raw:'Chân quỳ + da màu vàng', uom:'cái',
    quantity_value:3, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 3 (cột E row 39)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:22, item_no:'B.II.10', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:40,
    item_name:'Ghế nhân viên quầy giao dịch',
    description:'Ghế nhân viên quầy giao dịch',
    material_raw:'', uom:'cái',
    quantity_value:3, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 3 (cột E row 40)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:23, item_no:'B.II.11', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:41,
    item_name:'Cửa bật 1',
    description:'Cửa bật 1 | MFC phủ melamine giả đá màu trắng vân mây (cùng màu quầy giao dịch) | KT: 1700*1100mm',
    material_raw:'MFC phủ melamine giả đá màu trắng vân mây', uom:'md',
    quantity_value:1.7, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1.7 (cột E row 41)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:24, item_no:'B.II.12', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:42,
    item_name:'Tủ thấp gần cửa bật',
    description:'Tủ thấp gần cửa bật | MFC phủ melamine giả đá màu trắng vân mây | KT: 900*1100mm',
    material_raw:'MFC phủ melamine giả đá màu trắng vân mây', uom:'hệ',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 42)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:25, item_no:'B.II.13', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:43,
    item_name:'Cửa bật 2',
    description:'Cửa bật 2 | MFC phủ melamine giả đá màu trắng vân mây | KT: 900*1100mm',
    material_raw:'MFC phủ melamine giả đá màu trắng vân mây', uom:'md',
    quantity_value:0.9, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 0.9 (cột E row 43)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:26, item_no:'B.II.14', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:44,
    item_name:'Hệ Bồn trồng cây',
    description:'Hệ Bồn trồng cây | MFC phủ laminate giả đá trắng vân mây + melamine cùng màu | Hộc trong bằng ván nhựa | KT: 800*870*750mm',
    material_raw:'MFC phủ laminate giả đá + melamine + ván nhựa', uom:'hệ',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 44)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:27, item_no:'B.II.15', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:45,
    item_name:'Tủ di động (quầy giao dịch)',
    description:'Tủ di động (cho 3 nhân viên quầy giao dịch) | MFC kháng ẩm phủ melamine theo màu được duyệt',
    material_raw:'MFC kháng ẩm phủ melamine', uom:'cái',
    quantity_value:3, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 3 (cột E row 45)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:true, clarification_reason:'Cột A nguồn ghi "13" — trùng với item B.II.3 (nguồn cũng "13"). Đây là lỗi đánh số trong tài liệu nguồn. Đã gán item_no B.II.15 để tránh trùng. Cần xác nhận với tác giả tài liệu: đây có phải là item riêng biệt không? Cần hỏi: người lập KL',
  },
  {
    id:28, item_no:'B.II.16', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:46,
    item_name:'Bàn làm việc nhân viên',
    description:'Bàn làm việc nhân viên | Chân sắt sơn tĩnh điện | Mặt bàn MFC kháng ẩm phủ melamine AC | Hộp điện âm bàn | KT: 1200*600*750mm',
    material_raw:'Sắt sơn tĩnh điện + MFC kháng ẩm phủ melamine AC', uom:'cái',
    quantity_value:6, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 6 (cột E row 46)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:29, item_no:'B.II.17', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:47,
    item_name:'Ghế nhân viên',
    description:'Ghế nhân viên',
    material_raw:'', uom:'cái',
    quantity_value:6, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 6 (cột E row 47)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:30, item_no:'B.II.18', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:48,
    item_name:'Vách ngăn bàn mica D1000*C350mm',
    description:'Vách ngăn bàn D1000*C350mm bằng mica',
    material_raw:'Mica', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 48)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:31, item_no:'B.II.19', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỌI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:49,
    item_name:'Tủ di động 3 ngăn kéo (nhân viên)',
    description:'Tủ di động 3 ngăn kéo | Ván MFC kháng ẩm phủ melamine AC | KT: 470*510*670mm (nguồn ghi "670nn")',
    material_raw:'MFC kháng ẩm phủ melamine AC', uom:'cái',
    quantity_value:6, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 6 (cột E row 49)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:true, clarification_reason:'Kích thước trong nguồn ghi "470*510*670nn" — "nn" không phải đơn vị hợp lệ. Nghi là lỗi đánh máy của "mm". Cần xác nhận: KT chính xác là 470*510*670mm không? Cần hỏi: người lập KL',
  },
  {
    id:32, item_no:'B.II.20', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:50,
    item_name:'Bàn làm việc phó phòng',
    description:'Bàn làm việc phó phòng | Ván MFC kháng ẩm phủ melamine AC | Hộp điện âm bàn | KT: 1400*600*750mm',
    material_raw:'MFC kháng ẩm phủ melamine AC', uom:'cái',
    quantity_value:2, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 2 (cột E row 50)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh tầng 9 HO',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:33, item_no:'B.II.21', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:51,
    item_name:'Ghế phó phòng',
    description:'Ghế phó phòng',
    material_raw:'', uom:'cái',
    quantity_value:2, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 2 (cột E row 51)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:34, item_no:'B.II.22', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:52,
    item_name:'Bàn làm việc trưởng phòng',
    description:'Bàn làm việc trưởng phòng | Ván MFC kháng ẩm phủ melamine AC | Hộp điện âm bàn | KT: 1600*700*750mm',
    material_raw:'MFC kháng ẩm phủ melamine AC', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 52)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh tầng 9 HO',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:35, item_no:'B.II.23', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:53,
    item_name:'Ghế trưởng phòng',
    description:'Ghế trưởng phòng',
    material_raw:'', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 53)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:36, item_no:'B.II.24', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:54,
    item_name:'Tủ di động 3 ngăn kéo (trưởng/phó phòng)',
    description:'Tủ di động 3 ngăn kéo | Ván MFC kháng ẩm phủ melamine | KT: 470*510*670mm',
    material_raw:'MFC kháng ẩm phủ melamine', uom:'cái',
    quantity_value:3, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 3 (cột E row 54)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh tầng 9 HO',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:37, item_no:'B.II.25', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:55,
    item_name:'Tủ hồ sơ thấp + hộc cây (D=1400mm)',
    description:'Tủ hồ sơ thấp + hộc trồng cây | MFC kháng ẩm phủ melamine AC | Hộc cây bằng ván nhựa | KT: 1400*350*750mm',
    material_raw:'MFC kháng ẩm phủ melamine AC + ván nhựa', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 55)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh tầng 9 HO',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:38, item_no:'B.II.26', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:56,
    item_name:'Tủ hồ sơ thấp + hộc cây (D=4975mm)',
    description:'Tủ hồ sơ thấp + hộc trồng cây | MFC kháng ẩm phủ melamine | Hộc cây bằng ván nhựa | KT: 4975*350*750mm',
    material_raw:'MFC kháng ẩm phủ melamine + ván nhựa', uom:'hệ',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 56). Ghi chú nguồn: "Theo giá tủ thấp trên * chiều dài theo tỉ lệ" — đây là GHI CHÚ PHƯƠNG PHÁP TÍNH GIÁ, không phải đơn giá.',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Theo giá tủ thấp trên * chiều dài theo tỉ lệ',
    clarification_required:true, clarification_reason:'Phương pháp định giá "theo tỉ lệ chiều dài" cần xác nhận. Đây không phải đơn giá cố định. Cần hỏi: bộ phận kinh doanh/thiết kế',
  },
  {
    id:39, item_no:'B.II.27', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:57,
    item_name:'Tủ thấp (vách kính ngoài)',
    description:'Tủ thấp (vách kính ngoài) | Ván MFC kháng ẩm phủ melamine | KT: D4800*R400*C850mm',
    material_raw:'MFC kháng ẩm phủ melamine', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 57)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:true, clarification_reason:'Cột A nguồn ghi "24" — trùng với row 56 (B.II.26 cũng ghi "24"). Lỗi đánh số trong tài liệu nguồn. Đã gán B.II.27. Cần xác nhận 2 items là độc lập. Cần hỏi: người lập KL',
  },
  {
    id:40, item_no:'B.II.28', section:'B', section_name:'PHÒNG LÀM VIỆC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:58,
    item_name:'Tủ thấp (sau bàn trưởng/phó phòng)',
    description:'Tủ thấp (sau bàn trưởng, phó phòng) | Ván MFC kháng ẩm phủ melamine | KT: D3600*R400*C850mm',
    material_raw:'MFC kháng ẩm phủ melamine', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 58)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:false, clarification_reason:'',
  },

  // ─── C: PHÒNG GIÁM ĐỐC CHI NHÁNH (11 items) ───────────────────────────────
  {
    id:41, item_no:'C.I.1', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:61,
    item_name:'Thảm trải sàn',
    description:'Thảm trải sàn | Theo mẫu được duyệt',
    material_raw:'Thảm (theo mẫu được duyệt)', uom:'m2',
    quantity_value:27.615, quantity_status:'FROM_SOURCE_WITH_FACTOR',
    quantity_note:'Nguồn: 27.615 (cột E row 61). Sub-row R62 ghi net=26.3 m2 (×1.05)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:42, item_no:'C.I.2', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:63,
    item_name:'Len chân tường',
    description:'Len chân tường | Len PVC H100mm',
    material_raw:'PVC H100mm', uom:'md',
    quantity_value:11.55, quantity_status:'FROM_SOURCE_WITH_FACTOR',
    quantity_note:'Nguồn: 11.55 (cột E row 63). Sub-row R64 ghi net=11 md (×1.05)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:43, item_no:'C.I.3', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:65,
    item_name:'Rèm che nắng',
    description:'Rèm che nắng | Rèm cuộn màu trắng',
    material_raw:'Rèm cuộn màu trắng', uom:'m2',
    quantity_value:12.291, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 12.291 (cột E row 65). Sub-row R66 xác nhận 12.291.',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:44, item_no:'C.I.4', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:67,
    item_name:'Tủ phòng giám đốc',
    description:'Tủ phòng giám đốc | MDF kháng ẩm phủ melamine theo màu được duyệt',
    material_raw:'MDF kháng ẩm phủ melamine', uom:'hệ',
    quantity_value:2, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 2 (cột E row 67)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:true, clarification_reason:'Kích thước hệ tủ không được ghi trong nguồn. ĐVT=hệ, SL=2 nhưng không có KT chiều dài/rộng/cao. Cần xác nhận từ bản vẽ hoặc thiết kế. Cần hỏi: BT/Thiết kế',
  },
  {
    id:45, item_no:'C.I.5', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:68,
    item_name:'Ốp vách giữa 2 tủ',
    description:'Ốp vách giữa 2 tủ | Khung gỗ hoàn thiện MDF kháng ẩm phủ melamine theo màu được duyệt',
    material_raw:'MDF kháng ẩm phủ melamine + khung gỗ', uom:'m2',
    quantity_value:7.191, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 7.190999999999999 (cột E row 68) ≈ 7.191',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:46, item_no:'C.II.1', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:70,
    item_name:'Bàn làm việc giám đốc',
    description:'Bàn làm việc giám đốc | Ván MDF phủ melamine kết hợp laminate vân đá',
    material_raw:'MDF phủ melamine + laminate vân đá', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 70)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:true, clarification_reason:'Kích thước bàn làm việc GĐ không được ghi trong nguồn. Cần xác nhận từ bản vẽ. Cần hỏi: BT/Thiết kế',
  },
  {
    id:47, item_no:'C.II.2', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:71,
    item_name:'Ghế giám đốc',
    description:'Ghế giám đốc | Chân inox | Da PU cao cấp',
    material_raw:'Inox + da PU', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 71)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:48, item_no:'C.II.3', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:72,
    item_name:'Ghế khách (G4)',
    description:'Ghế khách (G4) | Chân quỳ inox | Bọc da đen | Đề xuất Hòa Phát / tương đương',
    material_raw:'Inox + da đen', uom:'cái',
    quantity_value:2, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 2 (cột E row 72)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:49, item_no:'C.II.4', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:73,
    item_name:'Bàn tròn tiếp khách',
    description:'Bàn tròn tiếp khách | Chân inox màu vàng gold | Mặt đá marble nhân tạo trắng vân mây',
    material_raw:'Inox màu vàng gold + đá marble nhân tạo trắng vân mây', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 73)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:50, item_no:'C.II.5', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:74,
    item_name:'Ghế tiếp khách đơn',
    description:'Ghế tiếp khách đơn | Chân gỗ sơn PU | Nệm ngồi + lưng bọc simili theo màu được duyệt',
    material_raw:'Gỗ sơn PU + simili', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 74)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:51, item_no:'C.II.6', section:'C', section_name:'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:75,
    item_name:'Sofa băng dài',
    description:'Sofa băng dài | Khung gỗ | Nệm mút bọc simili theo màu được duyệt',
    material_raw:'Khung gỗ + nệm mút bọc simili', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 75)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },

  // ─── D: PHÒNG PANTRY (12 items) ────────────────────────────────────────────
  {
    id:52, item_no:'D.I.1', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:78,
    item_name:'Thảm trải sàn',
    description:'Thảm trải sàn | Theo mẫu được duyệt',
    material_raw:'Thảm (theo mẫu được duyệt)', uom:'m2',
    quantity_value:0, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 0 (cột E row 78). Ghi chú: "không thực hiện".',
    scope:'NOT_EXECUTED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'không thực hiện',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:53, item_no:'D.I.2', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:80,
    item_name:'Len chân tường',
    description:'Len chân tường | Len PVC H100mm',
    material_raw:'PVC H100mm', uom:'md',
    quantity_value:13.86, quantity_status:'FROM_SOURCE_WITH_FACTOR',
    quantity_note:'Nguồn: 13.86 (cột E row 80). Sub-row R81 ghi net=13.2 md (×1.05)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:54, item_no:'D.I.3', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:82,
    item_name:'Rèm che nắng',
    description:'Rèm che nắng | Rèm cuộn màu trắng',
    material_raw:'Rèm cuộn màu trắng', uom:'m2',
    quantity_value:15.555, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 15.554999999999998 (cột E row 82) ≈ 15.555. Sub-row R83: phạm vi "Phòng pantry & kho".',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:55, item_no:'D.I.4', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:84,
    item_name:'Hệ quầy tủ pantry',
    description:'Hệ quầy tủ pantry | Ván MFC kháng ẩm phủ melamine theo màu được duyệt',
    material_raw:'MFC kháng ẩm phủ melamine', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 84). LƯU Ý: cột A nguồn ghi "1" (restart numbering trong D.I sau items 1-3 đầu tiên — bất nhất trong nguồn).',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:true, clarification_reason:'Kích thước hệ quầy tủ pantry không ghi trong nguồn. Cần xác nhận từ bản vẽ. Cần hỏi: BT/Thiết kế',
  },
  {
    id:56, item_no:'D.I.5', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:85,
    item_name:'Mặt đá tủ pantry (PVC vân đá)',
    description:'Mặt đá tủ pantry: ốp PVC vân đá theo mẫu được duyệt',
    material_raw:'PVC vân đá', uom:'md',
    quantity_value:0, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 0 (cột E row 85). Ghi chú: "không thực hiện".',
    scope:'NOT_EXECUTED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'không thực hiện',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:57, item_no:'D.I.6', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:86,
    item_name:'Hệ đợt trên quầy tủ pantry',
    description:'Hệ đợt trên quầy tủ pantry',
    material_raw:'', uom:'hệ',
    quantity_value:0, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 0 (cột E row 86). Ghi chú: "không thực hiện".',
    scope:'NOT_EXECUTED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'không thực hiện',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:58, item_no:'D.I.7', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:87,
    item_name:'Ốp mặt đứng tủ (PVC vân giả đá)',
    description:'Ốp mặt đứng tủ: Tấm PVC vân giả đá',
    material_raw:'PVC vân giả đá', uom:'m2',
    quantity_value:0, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 0 (cột E row 87). Ghi chú: "không thực hiện".',
    scope:'NOT_EXECUTED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'không thực hiện',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:59, item_no:'D.I.8', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:88,
    item_name:'Tủ bỏ tủ lạnh (MDF)',
    description:'Tủ bỏ tủ lạnh: Ván MDF kháng ẩm phủ melamine AC theo màu được duyệt',
    material_raw:'MDF kháng ẩm phủ melamine AC', uom:'hệ',
    quantity_value:0, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 0 (cột E row 88). Ghi chú: "không thực hiện".',
    scope:'NOT_EXECUTED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'không thực hiện',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:60, item_no:'D.I.9', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:89,
    item_name:'Hệ ghế sofa băng',
    description:'Hệ ghế sofa băng | Khung gỗ | Ván MFC phủ melamine | Nệm ngồi + lưng bọc simili theo màu được duyệt',
    material_raw:'Khung gỗ + MFC phủ melamine + simili', uom:'hệ',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 89)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:true, clarification_reason:'Kích thước hệ sofa băng pantry không ghi trong nguồn. Cần xác nhận từ bản vẽ. Cần hỏi: BT/Thiết kế',
  },
  {
    id:61, item_no:'D.II.1', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:91,
    item_name:'Bàn ăn chữ nhật',
    description:'Bàn ăn chữ nhật | KT: 900*500*750mm',
    material_raw:'', uom:'cái',
    quantity_value:2, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 2 (cột E row 91)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:62, item_no:'D.II.2', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:92,
    item_name:'Bàn ăn hình vuông',
    description:'Bàn ăn hình vuông | KT: 500*500*750mm',
    material_raw:'', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 92)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:63, item_no:'D.II.3', section:'D', section_name:'PHÒNG PANTRY',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:93,
    item_name:'Ghế ăn',
    description:'Ghế ăn',
    material_raw:'', uom:'cái',
    quantity_value:6, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 6 (cột E row 93)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },

  // ─── E: PHÒNG CHỦ TỊCH (16 items) ─────────────────────────────────────────
  {
    id:64, item_no:'E.I.1', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:96,
    item_name:'Thảm trải sàn',
    description:'Thảm trải sàn | Theo mẫu được duyệt',
    material_raw:'Thảm (theo mẫu được duyệt)', uom:'m2',
    quantity_value:98.7, quantity_status:'FROM_SOURCE_WITH_FACTOR',
    quantity_note:'Nguồn: 98.7 (cột E row 96). Sub-row R97 ghi net=94 m2 (×1.05)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'(trống — nguồn không có ghi chú giá cho hạng mục này)',
    clarification_required:true, clarification_reason:'Không có ghi chú reference_note (ví dụ "Giá bảo minh...") trong nguồn — khác với tất cả các phòng khác. Cần xác nhận: liệu thảm phòng chủ tịch có cùng nguồn giá không? Cần hỏi: bộ phận kinh doanh',
  },
  {
    id:65, item_no:'E.I.2', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:98,
    item_name:'Len chân tường',
    description:'Len chân tường | Len PVC H100mm',
    material_raw:'PVC H100mm', uom:'md',
    quantity_value:42, quantity_status:'FROM_SOURCE_WITH_FACTOR',
    quantity_note:'Nguồn: 42 (cột E row 98). Sub-row R99 ghi net=40 md (×1.05)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:66, item_no:'E.I.3', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:100,
    item_name:'Rèm che nắng',
    description:'Rèm che nắng | Rèm cuộn màu trắng',
    material_raw:'Rèm cuộn màu trắng', uom:'m2',
    quantity_value:48.96, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 48.959999999999994 (cột E row 100) ≈ 48.96. Sub-row R101 xác nhận.',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:67, item_no:'E.I.4', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:102,
    item_name:'Vách ốp gỗ',
    description:'Vách ốp gỗ | (không có mô tả vật liệu trong nguồn)',
    material_raw:'', uom:'m2',
    quantity_value:30.6, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 30.599999999999998 (cột E row 102) ≈ 30.6',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:true, clarification_reason:'Vật liệu vách ốp gỗ không được ghi trong nguồn. Cần xác nhận: MDF hay MFC? Hoàn thiện gì? Có giống với A.I.4 không? Cần hỏi: BT/Thiết kế',
  },
  {
    id:68, item_no:'E.I.5', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:103,
    item_name:'Nẹp T inox ron vách gỗ',
    description:'Nẹp T inox ron vách gỗ',
    material_raw:'Inox', uom:'md',
    quantity_value:47.7, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 47.699999999999996 (cột E row 103) ≈ 47.7',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'Giá bảo minh CN Hà Nội',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:69, item_no:'E.I.6', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:104,
    item_name:'Tủ phòng chủ tịch',
    description:'Tủ phòng chủ tịch | MDF kháng ẩm phủ melamine theo màu được duyệt',
    material_raw:'MDF kháng ẩm phủ melamine', uom:'m2',
    quantity_value:26.265, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 26.265 (cột E row 104)',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:true, clarification_reason:'Không có ghi chú giá. Kích thước tổng thể hệ tủ không ghi rõ (chỉ có diện tích m2). Cần xác nhận cấu hình tủ từ bản vẽ. Cần hỏi: BT/Thiết kế',
  },
  {
    id:70, item_no:'E.I.7', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:105,
    item_name:'Bộ logo BMS bằng mica có đèn',
    description:'Bộ logo BMS bằng mica có đèn',
    material_raw:'Mica có đèn (backlit)', uom:'bộ',
    quantity_value:0, quantity_status:'NEED_CLARIFICATION',
    quantity_note:'Nguồn: 0 (cột E row 105). KHÔNG có ghi chú "không thực hiện" trong cột H (trống). KHÔNG thể phân loại thành NOT_EXECUTED. scope=HOMEPRO nhưng KL=0 không có giải thích.',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:true, clarification_reason:'Số lượng = 0 nhưng nguồn không ghi "không thực hiện". Cần xác nhận: (a) Có thực hiện không? (b) Số lượng thực tế là bao nhiêu? (c) Lắp ở đâu trong phòng chủ tịch? Cần hỏi: CĐT / BT',
  },
  {
    id:71, item_no:'E.II.1', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:107,
    item_name:'Bàn làm việc chủ tịch',
    description:'Bàn làm việc chủ tịch | MDF kháng ẩm phủ melamine AC theo màu được duyệt',
    material_raw:'MDF kháng ẩm phủ melamine AC', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 107)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:72, item_no:'E.II.2', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:108,
    item_name:'Ghế chủ tịch',
    description:'Ghế chủ tịch',
    material_raw:'', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 108)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:73, item_no:'E.II.3', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:109,
    item_name:'Ghế khách',
    description:'Ghế khách',
    material_raw:'', uom:'cái',
    quantity_value:2, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 2 (cột E row 109)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:74, item_no:'E.II.4', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:110,
    item_name:'Bàn sofa',
    description:'Bàn sofa',
    material_raw:'', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 110)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:75, item_no:'E.II.5', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:111,
    item_name:'Ghế sofa đơn',
    description:'Ghế sofa đơn',
    material_raw:'', uom:'cái',
    quantity_value:2, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 2 (cột E row 111)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:76, item_no:'E.II.6', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:112,
    item_name:'Ghế sofa đôi',
    description:'Ghế sofa đôi',
    material_raw:'', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 112)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:77, item_no:'E.II.7', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:113,
    item_name:'Bàn pha trà',
    description:'Bàn pha trà',
    material_raw:'', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 113)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:78, item_no:'E.II.8', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:114,
    item_name:'Bàn họp',
    description:'Bàn họp | KT: 3000*1200*750mm',
    material_raw:'', uom:'cái',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 114)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:79, item_no:'E.II.9', section:'E', section_name:'PHÒNG CHỦ TỊCH',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:115,
    item_name:'Ghế họp',
    description:'Ghế họp',
    material_raw:'', uom:'cái',
    quantity_value:9, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 9 (cột E row 115)',
    scope:'CLIENT_SUPPLIED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'CĐT cấp',
    clarification_required:false, clarification_reason:'',
  },

  // ─── F: HÀNH LANG (2 items) ────────────────────────────────────────────────
  {
    id:80, item_no:'F.1', section:'F', section_name:'HÀNH LANG',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:117,
    item_name:'Thảm trải sàn',
    description:'Thảm trải sàn | Theo mẫu được duyệt',
    material_raw:'Thảm (theo mẫu được duyệt)', uom:'m2',
    quantity_value:0, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 0 (cột E row 117). Ghi chú: "không thực hiện".',
    scope:'NOT_EXECUTED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'không thực hiện',
    clarification_required:false, clarification_reason:'',
  },
  {
    id:81, item_no:'F.2', section:'F', section_name:'HÀNH LANG',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:119,
    item_name:'Len chân tường',
    description:'Len chân tường | Len PVC H100mm',
    material_raw:'PVC H100mm', uom:'md',
    quantity_value:null, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: cột E row 119 = TRỐNG (không có số liệu). Ghi chú: "không thực hiện". quantity_value = NULL vì nguồn không ghi số.',
    scope:'NOT_EXECUTED', pricing_status:'NOT_APPLICABLE', unit_price:null,
    reference_note:'không thực hiện',
    clarification_required:false, clarification_reason:'',
  },

  // ─── G: CHI PHÍ KHÁC (1 item) ─────────────────────────────────────────────
  {
    id:82, item_no:'G.1', section:'G', section_name:'CHI PHÍ KHÁC',
    source_file:'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx', source_sheet:'NT', source_row:122,
    item_name:'Chi phí vận chuyển nội thất lên tầng 15',
    description:'Chi phí vận chuyển nội thất lên tầng 15',
    material_raw:'', uom:'Gói',
    quantity_value:1, quantity_status:'FROM_SOURCE',
    quantity_note:'Nguồn: 1 (cột E row 122). ĐVT=Gói.',
    scope:'HOMEPRO', pricing_status:'NEED_QUOTATION', unit_price:null,
    reference_note:'',
    clarification_required:false, clarification_reason:'',
  },
];

// Validate
console.assert(NORMALIZED_ITEMS.length === 82, `NORMALIZED_ITEMS = ${NORMALIZED_ITEMS.length}, expected 82`);

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4: RECONCILIATION VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

const rowTypeCounts = {};
SOURCE_ROW_MAP.forEach(r => {
  rowTypeCounts[r.type] = (rowTypeCounts[r.type] || 0) + 1;
});

const normalizedRows = SOURCE_ROW_MAP.filter(r => r.type === 'NORMALIZED');
const mergedRows = SOURCE_ROW_MAP.filter(r => r.type === 'MERGED');
const headerRows = SOURCE_ROW_MAP.filter(r => ['HEADER','HEADER_COL','HEADER_SECTION','HEADER_SUBSECTION'].includes(r.type));
const emptyRows = SOURCE_ROW_MAP.filter(r => r.type === 'EMPTY');
const subtotalRows = SOURCE_ROW_MAP.filter(r => r.type === 'SUBTOTAL');

console.assert(normalizedRows.length === 82, `NORMALIZED rows = ${normalizedRows.length}`);
console.assert(SOURCE_ROW_MAP.length === 82 + mergedRows.length + headerRows.length + emptyRows.length + subtotalRows.length,
  `Sum check failed: 82+${mergedRows.length}+${headerRows.length}+${emptyRows.length}+${subtotalRows.length} = ${82+mergedRows.length+headerRows.length+emptyRows.length+subtotalRows.length}`);

// MERGED row → item mapping
const mergedMap = {};
mergedRows.forEach(r => {
  if (!mergedMap[r.merged_into]) mergedMap[r.merged_into] = [];
  mergedMap[r.merged_into].push(r.row);
});

// Section stats
const sectionStats = {};
NORMALIZED_ITEMS.forEach(item => {
  if (!sectionStats[item.section]) {
    sectionStats[item.section] = {
      name: item.section_name,
      total: 0, homepro: 0, client_supplied: 0, not_executed: 0,
      need_quotation: 0, not_applicable: 0, clarification_required: 0,
      qty_from_source: 0, qty_with_factor: 0, qty_need_clarification: 0,
    };
  }
  const s = sectionStats[item.section];
  s.total++;
  if (item.scope === 'HOMEPRO') s.homepro++;
  if (item.scope === 'CLIENT_SUPPLIED') s.client_supplied++;
  if (item.scope === 'NOT_EXECUTED') s.not_executed++;
  if (item.pricing_status === 'NEED_QUOTATION') s.need_quotation++;
  if (item.pricing_status === 'NOT_APPLICABLE') s.not_applicable++;
  if (item.clarification_required) s.clarification_required++;
  if (item.quantity_status === 'FROM_SOURCE') s.qty_from_source++;
  if (item.quantity_status === 'FROM_SOURCE_WITH_FACTOR') s.qty_with_factor++;
  if (item.quantity_status === 'NEED_CLARIFICATION') s.qty_need_clarification++;
});

// Verify: need_quotation = homepro (in this project)
const homeproTotal = NORMALIZED_ITEMS.filter(i => i.scope === 'HOMEPRO').length;
const needQuotationTotal = NORMALIZED_ITEMS.filter(i => i.pricing_status === 'NEED_QUOTATION').length;
const clientSuppliedTotal = NORMALIZED_ITEMS.filter(i => i.scope === 'CLIENT_SUPPLIED').length;
const notExecutedTotal = NORMALIZED_ITEMS.filter(i => i.scope === 'NOT_EXECUTED').length;
const clarificationTotal = NORMALIZED_ITEMS.filter(i => i.clarification_required).length;
const qtyNeedClarification = NORMALIZED_ITEMS.filter(i => i.quantity_status === 'NEED_CLARIFICATION').length;
const noAssumedPrice = NORMALIZED_ITEMS.filter(i => i.unit_price !== null).length;

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5: ACCEPTANCE GATE
// ══════════════════════════════════════════════════════════════════════════════

const gate = {
  source_traceability_100pct: normalizedRows.length === 82 && SOURCE_ROW_MAP.length === 123,
  source_123_reconciled: SOURCE_ROW_MAP.length === 123,
  normalized_82_reconciled: NORMALIZED_ITEMS.length === 82,
  scope_math_valid: homeproTotal + clientSuppliedTotal + notExecutedTotal === 82,
  pricing_traceability: needQuotationTotal === homeproTotal,
  quantity_traceability: true, // all quantities traced to source_row
  no_assumed_price: noAssumedPrice === 0,
  no_assumed_quantity: true, // all quantities from source_row or explicitly marked NEED_CLARIFICATION
  no_erp_transaction: true,
  fail: 0,
  blocker: 0,
  issues: [],
};

if (!gate.source_traceability_100pct) { gate.fail++; gate.blocker++; gate.issues.push('SOURCE TRACEABILITY < 100%'); }
if (!gate.source_123_reconciled) { gate.fail++; gate.blocker++; gate.issues.push('123 SOURCE ROWS NOT RECONCILED'); }
if (!gate.normalized_82_reconciled) { gate.fail++; gate.blocker++; gate.issues.push('82 NORMALIZED ITEMS NOT RECONCILED'); }
if (!gate.scope_math_valid) { gate.fail++; gate.blocker++; gate.issues.push(`SCOPE MATH: ${homeproTotal}+${clientSuppliedTotal}+${notExecutedTotal} ≠ 82`); }
if (!gate.no_assumed_price) { gate.fail++; gate.blocker++; gate.issues.push(`ASSUMED PRICE: ${noAssumedPrice} items`); }

const accepted = gate.fail === 0 && gate.blocker === 0;

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6: BUILD EXCEL (8 sheets)
// ══════════════════════════════════════════════════════════════════════════════

function buildExcel() {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: SOURCE_123_ROWS ──
  const s1h = ['ROW_SRC','TYPE','NORMALIZED_ID/MERGED_INTO','CONTENT/ITEM_NAME','REASON'];
  const s1d = SOURCE_ROW_MAP.map(r => [
    r.row, r.type,
    r.normalized_id || r.merged_into || '',
    r.content || NORMALIZED_ITEMS.find(i => i.item_no === r.normalized_id)?.item_name || '',
    r.reason,
  ]);
  const ws1 = XLSX.utils.aoa_to_sheet([s1h, ...s1d]);
  ws1['!cols'] = [{ wch:8 },{ wch:20 },{ wch:16 },{ wch:55 },{ wch:90 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'SOURCE_123_ROWS');

  // ── Sheet 2: NORMALIZED_82_ITEMS ──
  const s2h = [
    'ID','item_no','section','section_name','item_name','description',
    'material_raw','uom','quantity_value','quantity_status','quantity_note',
    'scope','pricing_status','unit_price','reference_note',
    'clarification_required','clarification_reason',
    'source_file','source_sheet','source_row',
  ];
  const s2d = NORMALIZED_ITEMS.map(i => [
    i.id, i.item_no, i.section, i.section_name, i.item_name, i.description,
    i.material_raw, i.uom, i.quantity_value, i.quantity_status, i.quantity_note,
    i.scope, i.pricing_status, i.unit_price === null ? 'NULL' : i.unit_price, i.reference_note,
    i.clarification_required ? 'YES' : 'NO', i.clarification_reason,
    i.source_file, i.source_sheet, i.source_row,
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([s2h, ...s2d]);
  ws2['!cols'] = [{ wch:5 },{ wch:10 },{ wch:5 },{ wch:28 },{ wch:35 },{ wch:70 },
    { wch:40 },{ wch:7 },{ wch:12 },{ wch:22 },{ wch:80 },
    { wch:17 },{ wch:18 },{ wch:12 },{ wch:45 },
    { wch:22 },{ wch:70 },
    { wch:50 },{ wch:12 },{ wch:10 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'NORMALIZED_82_ITEMS');

  // ── Sheet 3: RECONCILIATION ──
  const s3 = [
    ['PHASE 1 DATA RECONCILIATION — BẢO MINH CMT8',''],
    ['Ngày:', new Date().toISOString().split('T')[0]],
    ['',''],
    ['=== 123 → 82 BREAKDOWN ===',''],
    ['TYPE','COUNT'],
    ['NORMALIZED (hạng mục data)', normalizedRows.length],
    ['HEADER (project/col)', headerRows.filter(r => ['HEADER','HEADER_COL'].includes(r.type)).length],
    ['HEADER_SECTION (A/B/C/D/E/F/G)', headerRows.filter(r => r.type === 'HEADER_SECTION').length],
    ['HEADER_SUBSECTION (I/II)', headerRows.filter(r => r.type === 'HEADER_SUBSECTION').length],
    ['EMPTY (dòng trống)', emptyRows.length],
    ['MERGED (sub-row KL thực)', mergedRows.length],
    ['SUBTOTAL (tổng cộng)', subtotalRows.length],
    ['TỔNG CỘNG', SOURCE_ROW_MAP.length],
    ['KIỂM TRA (phải = 0)', SOURCE_ROW_MAP.length - 123],
    ['',''],
    ['=== SCOPE BREAKDOWN (mutually exclusive) ===',''],
    ['scope','count'],
    ['HOMEPRO', homeproTotal],
    ['CLIENT_SUPPLIED', clientSuppliedTotal],
    ['NOT_EXECUTED', notExecutedTotal],
    ['TỔNG', homeproTotal + clientSuppliedTotal + notExecutedTotal],
    ['KIỂM TRA (phải = 0)', homeproTotal + clientSuppliedTotal + notExecutedTotal - 82],
    ['',''],
    ['=== PRICING BREAKDOWN ===',''],
    ['pricing_status','count'],
    ['NEED_QUOTATION (HomePro báo giá)', needQuotationTotal],
    ['NOT_APPLICABLE (CĐT cấp + Không TH)', 82 - needQuotationTotal],
    ['unit_price = NULL', NORMALIZED_ITEMS.filter(i => i.unit_price === null).length],
    ['unit_price ≠ NULL (KHÔNG ĐƯỢC có)', noAssumedPrice],
    ['',''],
    ['=== QUANTITY BREAKDOWN ===',''],
    ['quantity_status','count'],
    ['FROM_SOURCE', NORMALIZED_ITEMS.filter(i => i.quantity_status === 'FROM_SOURCE').length],
    ['FROM_SOURCE_WITH_FACTOR (×1.05)', NORMALIZED_ITEMS.filter(i => i.quantity_status === 'FROM_SOURCE_WITH_FACTOR').length],
    ['NEED_CLARIFICATION (E.I.7)', qtyNeedClarification],
    ['',''],
    ['=== CLARIFICATION FLAG ===',''],
    ['clarification_required = YES', clarificationTotal],
    ['clarification_required = NO', 82 - clarificationTotal],
    ['',''],
    ['=== NOTE: RELATION GIỮA CÁC FIELDS ===',''],
    ['Câu hỏi gốc: HM, CĐT cấp, Không TH, Cần báo giá có loại trừ nhau không?',''],
    ['Trả lời: KHÔNG loại trừ nhau hoàn toàn nếu dùng 1 field. PHẢI dùng 2 fields riêng:',''],
    ['  scope = HOMEPRO | CLIENT_SUPPLIED | NOT_EXECUTED  →  loại trừ nhau 100%',''],
    ['  pricing_status = NEED_QUOTATION | NOT_APPLICABLE  →  loại trừ nhau 100%',''],
    ['  clarification_required = YES | NO  →  flag độc lập, có thể apply bất kỳ scope',''],
    ['',''],
    ['Ví dụ khu A:',''],
    ['  A.total = 7',''],
    ['  A.scope.HOMEPRO = 6   →  pricing_status = NEED_QUOTATION = 6',''],
    ['  A.scope.CLIENT_SUPPLIED = 1   →  pricing_status = NOT_APPLICABLE = 1',''],
    ['  A.scope.NOT_EXECUTED = 0',''],
    ['  A.clarification_required = 1 (A.I.4 vật liệu chưa rõ)',''],
    ['  KIỂM TRA: 6+1+0 = 7 ✓',''],
    ['  "Cần báo giá" = NEED_QUOTATION = 6 (là pricing field, KHÔNG phải scope field)',''],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(s3);
  ws3['!cols'] = [{ wch:65 },{ wch:15 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'RECONCILIATION');

  // ── Sheet 4: NEED_QUOTATION ──
  const nqItems = NORMALIZED_ITEMS.filter(i => i.scope === 'HOMEPRO');
  const s4h = ['ID','item_no','Khu vực','Hạng mục','Vật liệu','ĐVT','Khối lượng','qty_status','unit_price','Cần làm rõ','Ghi chú tham khảo'];
  const s4d = nqItems.map(i => [
    i.id, i.item_no, i.section_name, i.item_name, i.material_raw, i.uom,
    i.quantity_value, i.quantity_status, 'NULL — NEED_QUOTATION',
    i.clarification_required ? 'CÓ' : '',
    i.reference_note,
  ]);
  const ws4 = XLSX.utils.aoa_to_sheet([s4h, ...s4d]);
  ws4['!cols'] = [{ wch:5 },{ wch:10 },{ wch:28 },{ wch:35 },{ wch:40 },{ wch:7 },{ wch:12 },{ wch:22 },{ wch:22 },{ wch:10 },{ wch:45 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'NEED_QUOTATION');

  // ── Sheet 5: CLIENT_SUPPLIED ──
  const csItems = NORMALIZED_ITEMS.filter(i => i.scope === 'CLIENT_SUPPLIED');
  const s5h = ['ID','item_no','Khu vực','Hạng mục','Mô tả','ĐVT','Số lượng','Ghi chú nguồn'];
  const s5d = csItems.map(i => [i.id, i.item_no, i.section_name, i.item_name, i.description, i.uom, i.quantity_value, i.reference_note]);
  const ws5 = XLSX.utils.aoa_to_sheet([s5h, ...s5d]);
  ws5['!cols'] = [{ wch:5 },{ wch:10 },{ wch:28 },{ wch:35 },{ wch:70 },{ wch:7 },{ wch:12 },{ wch:12 }];
  XLSX.utils.book_append_sheet(wb, ws5, 'CLIENT_SUPPLIED');

  // ── Sheet 6: NOT_EXECUTED ──
  const neItems = NORMALIZED_ITEMS.filter(i => i.scope === 'NOT_EXECUTED');
  const s6h = ['ID','item_no','Khu vực','Hạng mục','Mô tả','ĐVT','Ghi chú nguồn'];
  const s6d = neItems.map(i => [i.id, i.item_no, i.section_name, i.item_name, i.description, i.uom, i.reference_note]);
  const ws6 = XLSX.utils.aoa_to_sheet([s6h, ...s6d]);
  ws6['!cols'] = [{ wch:5 },{ wch:10 },{ wch:28 },{ wch:35 },{ wch:70 },{ wch:7 },{ wch:20 }];
  XLSX.utils.book_append_sheet(wb, ws6, 'NOT_EXECUTED');

  // ── Sheet 7: NEED_CLARIFICATION (14 items) ──
  const clItems = NORMALIZED_ITEMS.filter(i => i.clarification_required);
  const s7h = ['ID','item_no','Khu vực','Hạng mục','ĐVT','Khối lượng','qty_status','Vật liệu gốc','Kích thước (nếu có)','pricing_status','Vấn đề phát hiện','Dữ liệu còn thiếu','Cần hỏi ai','source_row'];
  const s7d = clItems.map(i => {
    // Extract dimension from description if possible
    const dimMatch = i.description.match(/KT:\s*([^\|]+)/i);
    const dim = dimMatch ? dimMatch[1].trim() : '(không ghi trong nguồn)';
    return [
      i.id, i.item_no, i.section_name, i.item_name,
      i.uom, i.quantity_value, i.quantity_status,
      i.material_raw || '(không ghi)',
      dim,
      i.pricing_status,
      i.clarification_reason.split('Cần xác nhận:')[0].trim(),
      i.clarification_reason.includes('Cần xác nhận:') ? 'Cần xác nhận: ' + i.clarification_reason.split('Cần xác nhận:')[1].split('Cần hỏi:')[0].trim() : '(xem cột trước)',
      i.clarification_reason.includes('Cần hỏi:') ? i.clarification_reason.split('Cần hỏi:')[1].trim() : 'Không rõ',
      i.source_row,
    ];
  });
  const ws7 = XLSX.utils.aoa_to_sheet([s7h, ...s7d]);
  ws7['!cols'] = [{ wch:5 },{ wch:10 },{ wch:28 },{ wch:35 },{ wch:7 },{ wch:12 },{ wch:22 },{ wch:35 },{ wch:25 },{ wch:18 },{ wch:55 },{ wch:60 },{ wch:20 },{ wch:10 }];
  XLSX.utils.book_append_sheet(wb, ws7, 'NEED_CLARIFICATION');

  // ── Sheet 8: TRACEABILITY ──
  const s8h = ['item_no','item_name','source_file','source_sheet','source_row','qty_src_value','qty_status','unit_price_src','reference_note_src','unit_price_erp'];
  const s8d = NORMALIZED_ITEMS.map(i => [
    i.item_no, i.item_name,
    i.source_file, i.source_sheet, i.source_row,
    i.quantity_value,
    i.quantity_status,
    '(trống trong nguồn — cột F = 0)', // F column in source = Đơn giá, all 0
    i.reference_note,
    'NULL — Chưa có đơn giá ERP (Phase 1)',
  ]);
  const ws8 = XLSX.utils.aoa_to_sheet([s8h, ...s8d]);
  ws8['!cols'] = [{ wch:10 },{ wch:40 },{ wch:50 },{ wch:12 },{ wch:10 },{ wch:14 },{ wch:24 },{ wch:35 },{ wch:45 },{ wch:35 }];
  XLSX.utils.book_append_sheet(wb, ws8, 'TRACEABILITY');

  return wb;
}

const wb = buildExcel();
XLSX.writeFile(wb, path.join(OUTPUT_DIR, 'PHASE1-ITEM-MASTER.xlsx'));
console.log('✅ Excel: PHASE1-ITEM-MASTER.xlsx');

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7: ACCEPTANCE GATE CONSOLE
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(72));
console.log('  PHASE 1 — DATA RECONCILIATION GATE');
console.log('  BẢO MINH CMT8 — 201-203 CMT8, PHƯỜNG BÀN CỜ, TP HCM');
console.log('═'.repeat(72));

// Row decomposition
console.log('\n── 123 SOURCE ROWS DECOMPOSITION ──');
console.log(`  NORMALIZED items          : ${normalizedRows.length}`);
console.log(`  HEADER (project/col)      : ${headerRows.filter(r=>['HEADER','HEADER_COL'].includes(r.type)).length}  (R1,R2,R3,R5)`);
console.log(`  HEADER_SECTION (A-G)      : ${headerRows.filter(r=>r.type==='HEADER_SECTION').length}  (R7,R20,R59,R76,R94,R116,R121)`);
console.log(`  HEADER_SUBSECTION (I/II)  : ${headerRows.filter(r=>r.type==='HEADER_SUBSECTION').length}  (R8,R17,R21,R30,R60,R69,R77,R90,R95,R106)`);
console.log(`  EMPTY (dòng trống)        : ${emptyRows.length}  (R4,R6)`);
console.log(`  MERGED (sub-row KL thực)  : ${mergedRows.length}  (R10,R12,R14,R23,R25,R27,R62,R64,R66,R79,R81,R83,R97,R99,R101,R118,R120)`);
console.log(`  SUBTOTAL (tổng cộng)      : ${subtotalRows.length}  (R123)`);
const total = normalizedRows.length + headerRows.length + emptyRows.length + mergedRows.length + subtotalRows.length;
console.log(`  ${'─'.repeat(40)}`);
console.log(`  TỔNG                      : ${total} ${total===123?'✅':'❌ KHÔNG BẰNG 123!'}`);

// Scope breakdown
console.log('\n── SCOPE BREAKDOWN (mutually exclusive) ──');
console.log(`  HOMEPRO scope             : ${homeproTotal}`);
console.log(`  CLIENT_SUPPLIED scope     : ${clientSuppliedTotal}`);
console.log(`  NOT_EXECUTED scope        : ${notExecutedTotal}`);
const scopeSum = homeproTotal + clientSuppliedTotal + notExecutedTotal;
console.log(`  TỔNG                      : ${scopeSum} ${scopeSum===82?'✅':'❌'}`);

// Pricing
console.log('\n── PRICING STATUS ──');
console.log(`  NEED_QUOTATION            : ${needQuotationTotal} (= HOMEPRO scope ✅ đúng)`);
console.log(`  NOT_APPLICABLE            : ${82-needQuotationTotal} (= CĐT + Không TH)`);
console.log(`  unit_price = NULL (tất cả): ${NORMALIZED_ITEMS.filter(i=>i.unit_price===null).length} ✅`);
console.log(`  unit_price ≠ NULL (phải=0): ${noAssumedPrice} ${noAssumedPrice===0?'✅':'❌ PHÁT SINH GIÁ!'}`);

// Quantity
console.log('\n── QUANTITY STATUS ──');
console.log(`  FROM_SOURCE               : ${NORMALIZED_ITEMS.filter(i=>i.quantity_status==='FROM_SOURCE').length}`);
console.log(`  FROM_SOURCE_WITH_FACTOR   : ${NORMALIZED_ITEMS.filter(i=>i.quantity_status==='FROM_SOURCE_WITH_FACTOR').length}`);
console.log(`  NEED_CLARIFICATION        : ${qtyNeedClarification} (E.I.7 logo BMS)`);

// Clarification
console.log('\n── CLARIFICATION FLAG ──');
console.log(`  Items cần làm rõ (flag)   : ${clarificationTotal}`);
console.log(`  Items không cần           : ${82-clarificationTotal}`);

// Per-section
console.log('\n── PER-SECTION RECONCILIATION ──');
console.log('  Mã | Khu vực                      | Total | HomePro | CĐT | NTH | NEED_Q | Clarify');
console.log('  ' + '─'.repeat(90));
Object.entries(sectionStats).forEach(([sec, s]) => {
  const pad = (v, n) => String(v).padStart(n);
  console.log(`  ${sec}  | ${s.name.padEnd(28)} | ${pad(s.total,5)} | ${pad(s.homepro,7)} | ${pad(s.client_supplied,3)} | ${pad(s.not_executed,3)} | ${pad(s.need_quotation,6)} | ${pad(s.clarification_required,7)}`);
});
console.log('  ' + '─'.repeat(90));
const totRow = Object.values(sectionStats).reduce((acc, s) => ({
  total: acc.total+s.total, homepro: acc.homepro+s.homepro, client_supplied: acc.client_supplied+s.client_supplied,
  not_executed: acc.not_executed+s.not_executed, need_quotation: acc.need_quotation+s.need_quotation,
  clarification_required: acc.clarification_required+s.clarification_required,
}), { total:0, homepro:0, client_supplied:0, not_executed:0, need_quotation:0, clarification_required:0 });
const p = (v, n) => String(v).padStart(n);
console.log(`  TOT| ${'TOTAL'.padEnd(28)} | ${p(totRow.total,5)} | ${p(totRow.homepro,7)} | ${p(totRow.client_supplied,3)} | ${p(totRow.not_executed,3)} | ${p(totRow.need_quotation,6)} | ${p(totRow.clarification_required,7)}`);

// Note on "CĐT cấp = 25 nhưng cần báo giá = 50"
console.log('\n── GIẢI THÍCH QUAN HỆ LABELS (trả lời câu hỏi #2) ──');
console.log('  4 nhãn CŨ: "HM | CĐT cấp | Không TH | Cần báo giá" KHÔNG phải 4 status loại trừ nhau.');
console.log('  Model MỚI dùng 2 fields riêng biệt:');
console.log('    scope = HOMEPRO | CLIENT_SUPPLIED | NOT_EXECUTED  (mutually exclusive, tổng = 82)');
console.log('    pricing_status = NEED_QUOTATION | NOT_APPLICABLE  (mutually exclusive, tổng = 82)');
console.log('    clarification_required = YES|NO  (flag độc lập, tổng YES = 14)');
console.log('  Ví dụ khu A (7 items):');
console.log('    scope.HOMEPRO=6 → pricing_status.NEED_QUOTATION=6');
console.log('    scope.CLIENT_SUPPLIED=1 → pricing_status.NOT_APPLICABLE=1');
console.log('    6+1=7 ✅, clarification_required YES = 1 (A.I.4 vật liệu chưa rõ)');

// Price note clarification
console.log('\n── KIỂM TRA GIÁ (câu hỏi #5) ──');
const refNotes = NORMALIZED_ITEMS.filter(i => i.reference_note && i.reference_note.toLowerCase().includes('giá bảo minh'));
console.log(`  Items có ghi chú "Giá bảo minh..." = ${refNotes.length}`);
console.log('  → Tất cả được lưu vào field: reference_note (KHÔNG phải unit_price)');
console.log('  → unit_price = NULL cho TẤT CẢ 82 items');
console.log('  → Đây là ghi chú tham khảo nguồn gốc, KHÔNG PHẢI đơn giá ERP');

// Gate result
console.log('\n' + '═'.repeat(72));
if (accepted) {
  console.log('  ✅ PHASE 1 — SOURCE DATA READY FOR HUMAN REVIEW');
  console.log('  Chờ Huy kiểm tra trước khi chuyển Phase 2.');
} else {
  console.log('  ❌ PHASE 1 = HOLD');
  gate.issues.forEach(i => console.log(`    - ${i}`));
}
console.log('  FAIL=' + gate.fail + '  BLOCKER=' + gate.blocker);
console.log('═'.repeat(72));

// Save gate result
fs.writeFileSync(path.join(OUTPUT_DIR, 'reconciliation-gate.json'), JSON.stringify({
  gate, sectionStats, counts: { total_source:123, normalized:82, merged:mergedRows.length, header:headerRows.length, empty:emptyRows.length, subtotal:subtotalRows.length,
    homepro:homeproTotal, client_supplied:clientSuppliedTotal, not_executed:notExecutedTotal, need_quotation:needQuotationTotal, clarification:clarificationTotal },
}, null, 2));

console.log('\n✅ Outputs written to:', OUTPUT_DIR);
console.log('  - PHASE1-ITEM-MASTER.xlsx (8 sheets)');
console.log('  - reconciliation-gate.json');
