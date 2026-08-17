/**
 * BAO MINH CMT8 — PHASE 1 SOURCE DATA AUDIT & NORMALIZATION
 * HomePro ERP — Data Ingestion Pipeline
 *
 * Phase 1A: Source Document Audit
 * Phase 1B: Normalized Raw Data (BAO_MINH_SOURCE_ITEMS)
 * Phase 1C: Business Classification
 * Phase 1D: Material Extraction
 * Phase 1E: Dimension Normalization
 * Phase 1F: CĐT Cấp Handling
 * Phase 1G: Không Thực Hiện Handling
 * Phase 1H: Price Validation (NO GUESSING)
 * Phase 1I: Review CSV/Excel Output
 * Phase 1J: Data Quality Check
 * Phase 1K: Acceptance Gate
 *
 * RULE: NO ERP import. Staging only. No price guessing. No qty invention.
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ── CONFIG ──────────────────────────────────────────────────────────────────

const SOURCE_FILE = 'KL NỘI THẤT VP BẢO MINH- CN SÀI GÒN- homepro.xlsx';
const OUTPUT_DIR = 'docs/projects/BAO-MINH-CMT8';
const SCRIPTS_DIR = 'scripts';

// ── ITEM STATUS ENUM ─────────────────────────────────────────────────────────

const STATUS = {
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  CLIENT_SUPPLIED: 'CLIENT_SUPPLIED',
  NOT_EXECUTED: 'NOT_EXECUTED',
  MISSING_QUANTITY: 'MISSING_QUANTITY',
  MISSING_PRICE: 'MISSING_PRICE',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
};

// ── BUSINESS CATEGORY ENUM ───────────────────────────────────────────────────

const CATEGORY = {
  FINISHING: 'A. FINISHING',
  BUILT_IN_FURNITURE: 'B. BUILT_IN_FURNITURE',
  LOOSE_FURNITURE: 'C. LOOSE_FURNITURE',
  PARTITION: 'D. PARTITION',
  DOOR: 'E. DOOR',
  CURTAIN: 'F. CURTAIN',
  FLOOR_FINISH: 'G. FLOOR_FINISH',
  WALL_FINISH: 'H. WALL_FINISH',
  ACCESSORY: 'I. ACCESSORY',
  SIGNAGE: 'J. SIGNAGE',
  LOGO: 'K. LOGO',
  TRANSPORT: 'L. TRANSPORT',
  CLIENT_SUPPLIED: 'M. CLIENT_SUPPLIED',
  NOT_EXECUTED: 'N. NOT_EXECUTED',
  OTHER: 'O. OTHER',
};

// ── PHASE 1B: RAW DATA ────────────────────────────────────────────────────────
// Hand-built from the Excel reading — preserving EXACT raw values
// Each record = one line item from the source document
// Convention: quantities with *1.05 factor are listed as "dim * 1.05" — we keep raw

const SOURCE_ITEMS_RAW = [
  // ── A. PHÒNG HỌP ────────────────────────────────────────────────────────
  {
    source_row: 7,
    section_code: 'A',
    section_name: 'PHÒNG HỌP',
    item_type: 'SECTION_HEADER',
    item_no: 'A',
    item_name_raw: 'PHÒNG HỌP',
    description_raw: '',
  },
  {
    source_row: 8,
    section_code: 'A.I',
    section_name: 'PHÒNG HỌP — Phần liền tường',
    item_type: 'SUB_HEADER',
    item_no: 'A.I',
    item_name_raw: 'Phần liền tường',
    description_raw: '',
  },
  {
    source_row: 9,
    source_page: 'Sheet NT',
    section_code: 'A',
    section_name: 'PHÒNG HỌP',
    item_no: 'A.I.1',
    item_name_raw: 'Thảm trải sàn',
    description_raw: 'Thảm trải sàn\nTheo mẫu được duyệt',
    material_raw: 'Thảm (theo mẫu được duyệt)',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '24.15',
    quantity_note: 'Phòng họp: 23 (net), hệ số x1.05',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 11,
    source_page: 'Sheet NT',
    section_code: 'A',
    section_name: 'PHÒNG HỌP',
    item_no: 'A.I.2',
    item_name_raw: 'Len chân tường',
    description_raw: 'Len chân tường\nLen PVC H100mm',
    material_raw: 'PVC H100mm',
    dimension_raw: 'H100mm',
    uom_raw: 'md',
    quantity_raw: '15.75',
    quantity_note: 'Phòng họp: 15 (net), hệ số x1.05',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 13,
    source_page: 'Sheet NT',
    section_code: 'A',
    section_name: 'PHÒNG HỌP',
    item_no: 'A.I.3',
    item_name_raw: 'Rèm che nắng',
    description_raw: 'Rèm che nắng\nRèm cuộn màu trắng',
    material_raw: 'Rèm cuộn màu trắng',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '5.8',
    quantity_note: 'Phòng họp: 5.8',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 15,
    source_page: 'Sheet NT',
    section_code: 'A',
    section_name: 'PHÒNG HỌP',
    item_no: 'A.I.4',
    item_name_raw: 'Vách ốp gỗ',
    description_raw: 'Vách ốp gỗ',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '7.2675',
    client_supplied: false,
    not_execute: false,
    source_note: 'không bao gồm màn hình trình chiếu',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'MEDIUM',
    review_required: true,
    review_reason: 'Vật liệu không được ghi rõ trong mô tả',
  },
  {
    source_row: 16,
    source_page: 'Sheet NT',
    section_code: 'A',
    section_name: 'PHÒNG HỌP',
    item_no: 'A.I.5',
    item_name_raw: 'Nẹp T inox ron vách gỗ',
    description_raw: 'Nẹp T inox ron vách gỗ',
    material_raw: 'Inox',
    dimension_raw: '',
    uom_raw: 'md',
    quantity_raw: '7.95',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  // A.II Nội thất rời
  {
    source_row: 18,
    source_page: 'Sheet NT',
    section_code: 'A',
    section_name: 'PHÒNG HỌP',
    item_no: 'A.II.1',
    item_name_raw: 'Bàn họp',
    description_raw: 'Bàn họp\nMặt bàn MFC phủ melamine vân gỗ\nChân bàn MFC phủ melamine màu đen theo màu được đuyệt\nBao gồm học điện âm bàn\nKT: D3200*R1400*C750mm',
    material_raw: 'MFC phủ melamine vân gỗ, MFC phủ melamine màu đen',
    dimension_raw: 'D3200*R1400*C750mm',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 19,
    source_page: 'Sheet NT',
    section_code: 'A',
    section_name: 'PHÒNG HỌP',
    item_no: 'A.II.2',
    item_name_raw: 'Ghế họp',
    description_raw: 'Ghế họp',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '10',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },

  // ── B. PHÒNG LÀM VIỆC ──────────────────────────────────────────────────
  {
    source_row: 22,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.I.1',
    item_name_raw: 'Thảm trải sàn',
    description_raw: 'Thảm trải sàn\nTheo mẫu được duyệt',
    material_raw: 'Thảm (theo mẫu được duyệt)',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '120.96',
    quantity_note: 'Phòng họp làm việc: 112 (net), hệ số x1.05 + 8 phụ trội',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 24,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.I.2',
    item_name_raw: 'Len chân tường',
    description_raw: 'Len chân tường\nLen PVC H100mm',
    material_raw: 'PVC H100mm',
    dimension_raw: 'H100mm',
    uom_raw: 'md',
    quantity_raw: '34.65',
    quantity_note: 'Phòng làm việc: 33 (net), hệ số x1.05',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 26,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.I.3',
    item_name_raw: 'Rèm che nắng',
    description_raw: 'Rèm che nắng\nRèm cuộn màu trắng',
    material_raw: 'Rèm cuộn màu trắng',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '45',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 28,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.I.4',
    item_name_raw: 'Vách ốp gỗ',
    description_raw: 'Vách ốp gỗ\nNền Ván MDF kháng ẩm phủ melamine màu trắng theo màu được duyệt chạy ron sơn',
    material_raw: 'MDF kháng ẩm phủ melamine màu trắng',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '16.2435',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 29,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.I.5',
    item_name_raw: 'Tủ hồ sơ cao',
    description_raw: 'Tủ hồ sơ cao\nVán MFC phủ melamine theo màu được duyệt\nPhụ kiện bản lề, tay nắm, led hắt sáng,..\nKT: R400*C2800mm',
    material_raw: 'MFC phủ melamine',
    dimension_raw: 'R400*C2800mm',
    uom_raw: 'm2',
    quantity_raw: '13.005',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  // B.II Nội thất rời
  {
    source_row: 31,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.1',
    item_name_raw: 'Bàn tròn tiếp khách',
    description_raw: 'Bàn tròn tiếp khách\nChân inox màu vàng gold, mặt đá marble nhân tạo trắng vân mây\nD800*H450mm',
    material_raw: 'Inox màu vàng gold, đá marble nhân tạo trắng vân mây',
    dimension_raw: 'D800*H450mm',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 32,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.2',
    item_name_raw: 'Ghế tiếp khách đơn',
    description_raw: 'Ghế tiếp khách đơn\nChân gỗ sơn PU, nệm ngồi và lưng bọc simili theo mầu được duyệt',
    material_raw: 'Gỗ sơn PU, simili',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '3',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 33,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.3',
    item_name_raw: 'Sofa băng dài',
    description_raw: 'Sofa băng dài\nKhung gỗ, nệm mút bọc simili theo màu được duyệt (bao gồm gối nhấn)\nKT: D2475*R900*C500mm',
    material_raw: 'Khung gỗ, nệm mút bọc simili',
    dimension_raw: 'D2475*R900*C500mm',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 34,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.4',
    item_name_raw: 'Quầy lễ tân',
    description_raw: 'Quầy lễ tân\nMDF phủ laminate vân đá theo mẫu được duyệt\nĐợt, cánh tủ phía trong ván MFC phủ melamine\nẤn viền màu xanh ở trên, led hắt sáng chân quầy\nLen chân màu trắng\nLogo "BMS" bằng mica\nKT: 3600*750/870*750/1100mm',
    material_raw: 'MDF phủ laminate vân đá, MFC phủ melamine, mica',
    dimension_raw: '3600*750/870*750/1100mm',
    uom_raw: 'md',
    quantity_raw: '3.6',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh Tầng trệt HO',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 35,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.5',
    item_name_raw: 'Ghế lễ tân (G1)',
    description_raw: 'Ghế lễ tân (G1)\nĐề xuất ghế the one GL123/ tương đương',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 36,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.6',
    item_name_raw: 'Hệ Quầy giao dịch',
    description_raw: 'Hệ Quầy giao dịch\nChân sắt, ván MDF kháng ẩm phủ Melamine AC theo màu được duyệt\nGiật cấp mặt ngoài, led hắt sáng\nKT: D3350*R1000*C750mm',
    material_raw: 'Sắt, MDF kháng ẩm phủ Melamine AC',
    dimension_raw: 'D3350*R1000*C750mm',
    uom_raw: 'hệ',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 37,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.7',
    item_name_raw: 'Vách ngăn bàn bằng ván gỗ',
    description_raw: 'Vách ngăn bàn bằng ván gỗ\nKT: D1000*H300mm',
    material_raw: 'Ván gỗ (loại chưa xác định)',
    dimension_raw: 'D1000*H300mm',
    uom_raw: 'cái',
    quantity_raw: '2',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'MEDIUM',
    review_required: true,
    review_reason: 'Loại gỗ/ván chưa xác định',
  },
  {
    source_row: 38,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.8',
    item_name_raw: 'Vách ngăn bàn bằng mica trong',
    description_raw: 'Vách ngăn bàn bằng mica trong\nKT: D800*H300mm',
    material_raw: 'Mica trong',
    dimension_raw: 'D800*H300mm',
    uom_raw: 'cái',
    quantity_raw: '3',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 39,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.9',
    item_name_raw: 'Ghế khách quầy giao dịch (G2)',
    description_raw: 'Ghế khách quầy giao dịch (G2)\nĐề xuất ghế chân quỳ bọc da màu vàng/ tương đương theo mẫu được chọn',
    material_raw: 'Chân quỳ, da màu vàng',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '3',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 40,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.10',
    item_name_raw: 'Ghế nhân viên quầy giao dịch',
    description_raw: 'Ghế nhân viên quầy giao dịch',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '3',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 41,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.11',
    item_name_raw: 'Cửa bật 1',
    description_raw: 'Cửa bật 1\nMFC phủ melamine giả đá màu trắng vân mây (cùng màu với quầy giao dịch)\nKT: 1700*1100mm',
    material_raw: 'MFC phủ melamine giả đá màu trắng vân mây',
    dimension_raw: '1700*1100mm',
    uom_raw: 'md',
    quantity_raw: '1.7',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 42,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.12',
    item_name_raw: 'Tủ thấp gần cửa bật',
    description_raw: 'Tủ thấp gần cửa bật\nMFC phủ melamine giả đá màu trắng vân mây (cùng màu với quầy giao dịch)\nKT: 900*1100mm',
    material_raw: 'MFC phủ melamine giả đá màu trắng vân mây',
    dimension_raw: '900*1100mm',
    uom_raw: 'hệ',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 43,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.13',
    item_name_raw: 'Cửa bật 2',
    description_raw: 'Cửa bật 2\nMFC phủ melamine giả đá màu trắng vân mây (cùng màu với quầy giao dịch)\nKT: 900*1100mm',
    material_raw: 'MFC phủ melamine giả đá màu trắng vân mây',
    dimension_raw: '900*1100mm',
    uom_raw: 'md',
    quantity_raw: '0.9',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 44,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.14',
    item_name_raw: 'Hệ Bồn trồng cây',
    description_raw: 'Hệ Bồn trồng cây\nMFC phủ laminate giả đá màu trắng vân mây kết hợp với melamine cùng màu\nHộc trồng cây phía trong làm bằng ván nhựa\nKT: 800*870*750mm',
    material_raw: 'MFC phủ laminate giả đá, melamine, ván nhựa',
    dimension_raw: '800*870*750mm',
    uom_raw: 'hệ',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 45,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.15',
    item_name_raw: 'Tủ di động (cho 3 nhân viên quầy giao dịch)',
    description_raw: 'Tủ di động (cho 3 nhân viên quầy giao dịch)\nMFC kháng ẩm phủ melamine theo màu được duyệt',
    material_raw: 'MFC kháng ẩm phủ melamine',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '3',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
    review_required: true,
    review_reason: 'Row số 13 trùng lặp trong sheet — cần xác nhận item_no thực tế',
  },
  {
    source_row: 46,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.16',
    item_name_raw: 'Bàn làm việc nhân viên',
    description_raw: 'Bàn làm việc nhân viên\nChân sắt sơn tĩnh điện, Mặt bàn ván MFC kháng ẩm phủ melamine AC theo màu được duyệt, hộp điện âm bàn\nKT: 1200*600*750mm',
    material_raw: 'Sắt sơn tĩnh điện, MFC kháng ẩm phủ melamine AC',
    dimension_raw: '1200*600*750mm',
    uom_raw: 'cái',
    quantity_raw: '6',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 47,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.17',
    item_name_raw: 'Ghế nhân viên',
    description_raw: 'Ghế nhân viên',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '6',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 48,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.18',
    item_name_raw: 'Vách ngăn bàn D1000*C350mm bằng mica',
    description_raw: 'Vách ngăn bàn D1000*C350mm bằng mica',
    material_raw: 'Mica',
    dimension_raw: 'D1000*C350mm',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 49,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.19',
    item_name_raw: 'Tủ di động 3 ngăn kéo (nhân viên)',
    description_raw: 'Tủ di động 3 ngăn kéo\nVán MFC kháng ẩm phủ melamine AC theo màu được duyệt\nKT: 470*510*670mm',
    material_raw: 'MFC kháng ẩm phủ melamine AC',
    dimension_raw: '470*510*670mm',
    uom_raw: 'cái',
    quantity_raw: '6',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'MEDIUM',
    review_required: true,
    review_reason: 'KT ghi "670nn" - cần xác nhận có thể là 670mm',
  },
  {
    source_row: 50,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.20',
    item_name_raw: 'Bàn làm việc phó phòng',
    description_raw: 'Bàn làm việc phó phòng\nVán MFC kháng ẩm phủ melamine AC theo màu được duyệt, hộp điện âm bàn\nKT: 1400*600*750mm',
    material_raw: 'MFC kháng ẩm phủ melamine AC',
    dimension_raw: '1400*600*750mm',
    uom_raw: 'cái',
    quantity_raw: '2',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh tầng 9 HO',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 51,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.21',
    item_name_raw: 'Ghế phó phòng',
    description_raw: 'Ghế phó phòng',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '2',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 52,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.22',
    item_name_raw: 'Bàn làm việc trưởng phòng',
    description_raw: 'Bàn làm việc trưởng phòng\nVán MFC kháng ẩm phủ melamine AC theo màu được duyệt, hộp điện âm bàn\nKT: 1600*700*750mm',
    material_raw: 'MFC kháng ẩm phủ melamine AC',
    dimension_raw: '1600*700*750mm',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh tầng 9 HO',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 53,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.23',
    item_name_raw: 'Ghế trưởng phòng',
    description_raw: 'Ghế trưởng phòng',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 54,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.24',
    item_name_raw: 'Tủ di động 3 ngăn kéo (trưởng/phó phòng)',
    description_raw: 'Tủ di động 3 ngăn kéo\nVán MFC kháng ẩm phủ melamine theo màu được duyệt\nKT: 470*510*670mm',
    material_raw: 'MFC kháng ẩm phủ melamine',
    dimension_raw: '470*510*670mm',
    uom_raw: 'cái',
    quantity_raw: '3',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh tầng 9 HO',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 55,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.25',
    item_name_raw: 'Tủ hồ sơ thấp kết hợp hộc trồng cây (1400mm)',
    description_raw: 'Tủ hồ sơ thấp kết hợp với hộc trồng cây\nVán MFC kháng ẩm phủ melamine AC theo màu được duyệt\nHộc trồng cây phía trong làm bằng ván nhựa\nKT: 1400*350*750mm',
    material_raw: 'MFC kháng ẩm phủ melamine AC, ván nhựa',
    dimension_raw: '1400*350*750mm',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh tầng 9 HO',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 56,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.26',
    item_name_raw: 'Tủ hồ sơ thấp kết hợp hộc trồng cây (4975mm)',
    description_raw: 'Tủ hồ sơ thấp kết hợp với hộc trồng cây\nVán MFC kháng ẩm phủ melamine theo màu được duyệt\nHộc trồng cây phía trong làm bằng ván nhựa\nKT: 4975*350*750mm',
    material_raw: 'MFC kháng ẩm phủ melamine, ván nhựa',
    dimension_raw: '4975*350*750mm',
    uom_raw: 'hệ',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: 'Theo giá tủ thấp trên * chiều dài theo tỉ lệ',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'MEDIUM',
    review_required: true,
    review_reason: 'Giá theo tỉ lệ chiều dài — cần xác nhận phương pháp tính giá',
  },
  {
    source_row: 57,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.27',
    item_name_raw: 'Tủ thấp (vách kính ngoài)',
    description_raw: 'Tủ thấp (vách kính ngoài)\nVán MFC kháng ẩm phủ melamine theo màu được duyệt\nKT: D4800*R400*C850mm',
    material_raw: 'MFC kháng ẩm phủ melamine',
    dimension_raw: 'D4800*R400*C850mm',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
    review_required: true,
    review_reason: 'Item_no 24 bị trùng lặp trong nguồn (row 56 và 57)',
  },
  {
    source_row: 58,
    source_page: 'Sheet NT',
    section_code: 'B',
    section_name: 'PHÒNG LÀM VIỆC',
    item_no: 'B.II.28',
    item_name_raw: 'Tủ thấp (sau bàn trưởng, phó phòng)',
    description_raw: 'Tủ thấp (sau bàn trưởng, phó phòng)\nVán MFC kháng ẩm phủ melamine theo màu được duyệt\nKT: D3600*R400*C850mm',
    material_raw: 'MFC kháng ẩm phủ melamine',
    dimension_raw: 'D3600*R400*C850mm',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },

  // ── C. PHÒNG GIÁM ĐỐC CHI NHÁNH ─────────────────────────────────────────
  {
    source_row: 61,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.I.1',
    item_name_raw: 'Thảm trải sàn',
    description_raw: 'Thảm trải sàn\nTheo mẫu được duyệt',
    material_raw: 'Thảm (theo mẫu được duyệt)',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '27.615',
    quantity_note: 'Phòng GĐ Chi Nhánh: 26.3 (net), hệ số x1.05',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 63,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.I.2',
    item_name_raw: 'Len chân tường',
    description_raw: 'Len chân tường\nLen PVC H100mm',
    material_raw: 'PVC H100mm',
    dimension_raw: 'H100mm',
    uom_raw: 'md',
    quantity_raw: '11.55',
    quantity_note: 'Phòng GĐ Chi Nhánh: 11 (net), hệ số x1.05',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 65,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.I.3',
    item_name_raw: 'Rèm che nắng',
    description_raw: 'Rèm che nắng\nRèm cuộn màu trắng',
    material_raw: 'Rèm cuộn màu trắng',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '12.291',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 67,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.I.4',
    item_name_raw: 'Tủ phòng giám đốc',
    description_raw: 'Tủ phòng giám đốc\nMDF kháng ẩm phủ melamine theo màu được duyệt',
    material_raw: 'MDF kháng ẩm phủ melamine',
    dimension_raw: '',
    uom_raw: 'hệ',
    quantity_raw: '2',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'MEDIUM',
    review_required: true,
    review_reason: 'Kích thước hệ tủ chưa được ghi rõ',
  },
  {
    source_row: 68,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.I.5',
    item_name_raw: 'Ốp vách giữa 2 tủ',
    description_raw: 'Ốp vách giữa 2 tủ\nKhung gỗ hoàn thiện MDF kháng ẩm phủ melamine theo màu được duyệt',
    material_raw: 'MDF kháng ẩm phủ melamine, khung gỗ',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '7.191',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  // C.II Nội thất rời
  {
    source_row: 70,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.II.1',
    item_name_raw: 'Bàn làm việc giám đốc',
    description_raw: 'Bàn làm việc giám đốc\nVán MDF phủ melamine kết hợp với laminate vân đá',
    material_raw: 'MDF phủ melamine, laminate vân đá',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'MEDIUM',
    review_required: true,
    review_reason: 'Kích thước bàn không được ghi rõ trong sheet',
  },
  {
    source_row: 71,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.II.2',
    item_name_raw: 'Ghế giám đốc',
    description_raw: 'Ghế giám đốc\nChân inox, da PU cao cấp',
    material_raw: 'Inox, da PU',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 72,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.II.3',
    item_name_raw: 'Ghế khách (G4)',
    description_raw: 'Ghế khách (G4)\nChân quỳ inox, bọc da đen\nĐề xuất Hòa Phát: theo mẫu',
    material_raw: 'Inox, da đen',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '2',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 73,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.II.4',
    item_name_raw: 'Bàn tròn tiếp khách',
    description_raw: 'Bàn tròn tiếp khách\nChân inox màu vàng gold, mặt đá marble nhân tạo trắng vân mây',
    material_raw: 'Inox màu vàng gold, đá marble nhân tạo trắng vân mây',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 74,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.II.5',
    item_name_raw: 'Ghế tiếp khách đơn',
    description_raw: 'Ghế tiếp khách đơn\nChân gỗ sơn PU, nệm ngồi và lưng bọc simili theo màu được duyệt',
    material_raw: 'Gỗ sơn PU, simili',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 75,
    source_page: 'Sheet NT',
    section_code: 'C',
    section_name: 'PHÒNG GIÁM ĐỐC CHI NHÁNH',
    item_no: 'C.II.6',
    item_name_raw: 'Sofa băng dài',
    description_raw: 'Sofa băng dài\nKhung gỗ, nệm mút bọc simili theo màu được duyệt',
    material_raw: 'Khung gỗ, nệm mút bọc simili',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },

  // ── D. PHÒNG PANTRY ──────────────────────────────────────────────────────
  // D.I Phần hoàn thiện
  {
    source_row: 78,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.I.1',
    item_name_raw: 'Thảm trải sàn',
    description_raw: 'Thảm trải sàn\nTheo mẫu được duyệt',
    material_raw: 'Thảm (theo mẫu được duyệt)',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '0',
    client_supplied: false,
    not_execute: true,
    source_note: 'không thực hiện',
    price_raw: '',
    amount_raw: '0',
    price_status: 'NOT_EXECUTED',
    confidence: 'HIGH',
  },
  {
    source_row: 80,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.I.2',
    item_name_raw: 'Len chân tường',
    description_raw: 'Len chân tường\nLen PVC H100mm',
    material_raw: 'PVC H100mm',
    dimension_raw: 'H100mm',
    uom_raw: 'md',
    quantity_raw: '13.86',
    quantity_note: 'Phòng pantry: 13.2 (net), hệ số x1.05',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 82,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.I.3',
    item_name_raw: 'Rèm che nắng',
    description_raw: 'Rèm che nắng\nRèm cuộn màu trắng',
    material_raw: 'Rèm cuộn màu trắng',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '15.555',
    quantity_note: 'Phòng pantry & kho: 15.555',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 84,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.I.4',
    item_name_raw: 'Hệ quầy tủ pantry',
    description_raw: 'Hệ quầy tủ pantry\nVán MFC kháng ẩm phủ melamine theo màu được duyệt',
    material_raw: 'MFC kháng ẩm phủ melamine',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'MEDIUM',
    review_required: true,
    review_reason: 'Kích thước hệ quầy tủ chưa được ghi rõ',
  },
  {
    source_row: 85,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.I.5',
    item_name_raw: 'Mặt đá tủ pantry',
    description_raw: 'Mặt đá tủ pantry: ốp PVC vân đá theo mẫu được duyệt',
    material_raw: 'PVC vân đá',
    dimension_raw: '',
    uom_raw: 'md',
    quantity_raw: '0',
    client_supplied: false,
    not_execute: true,
    source_note: 'không thực hiện',
    price_raw: '',
    amount_raw: '0',
    price_status: 'NOT_EXECUTED',
    confidence: 'HIGH',
  },
  {
    source_row: 86,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.I.6',
    item_name_raw: 'Hệ đợt trên quầy tủ pantry',
    description_raw: 'Hệ đợt trên quầy tủ pantry',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'hệ',
    quantity_raw: '0',
    client_supplied: false,
    not_execute: true,
    source_note: 'không thực hiện',
    price_raw: '',
    amount_raw: '0',
    price_status: 'NOT_EXECUTED',
    confidence: 'HIGH',
  },
  {
    source_row: 87,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.I.7',
    item_name_raw: 'Ốp mặt đứng tủ',
    description_raw: 'Ốp mặt đứng tủ: Tấm PVC vân giả đá',
    material_raw: 'PVC vân giả đá',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '0',
    client_supplied: false,
    not_execute: true,
    source_note: 'không thực hiện',
    price_raw: '',
    amount_raw: '0',
    price_status: 'NOT_EXECUTED',
    confidence: 'HIGH',
  },
  {
    source_row: 88,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.I.8',
    item_name_raw: 'Tủ bỏ tủ lạnh',
    description_raw: 'Tủ bỏ tủ lạnh: Ván MDF kháng ẩm phủ melamine AC theo màu được duyệt',
    material_raw: 'MDF kháng ẩm phủ melamine AC',
    dimension_raw: '',
    uom_raw: 'hệ',
    quantity_raw: '0',
    client_supplied: false,
    not_execute: true,
    source_note: 'không thực hiện',
    price_raw: '',
    amount_raw: '0',
    price_status: 'NOT_EXECUTED',
    confidence: 'HIGH',
  },
  {
    source_row: 89,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.I.9',
    item_name_raw: 'Hệ ghế sofa băng',
    description_raw: 'Hệ ghế sofa băng\nKhung gỗ, Ván MFC phủ melamine, nệm ngồi và lưng bọc simili theo màu được duyệt',
    material_raw: 'Khung gỗ, MFC phủ melamine, simili',
    dimension_raw: '',
    uom_raw: 'hệ',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'MEDIUM',
    review_required: true,
    review_reason: 'Kích thước sofa băng chưa được ghi rõ',
  },
  // D.II Nội thất rời
  {
    source_row: 91,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.II.1',
    item_name_raw: 'Bàn ăn chữ nhật',
    description_raw: 'Bàn ăn chữ nhật\nKT: 900*500*750mm',
    material_raw: '',
    dimension_raw: '900*500*750mm',
    uom_raw: 'cái',
    quantity_raw: '2',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 92,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.II.2',
    item_name_raw: 'Bàn ăn hình vuông',
    description_raw: 'Bàn ăn hình vuông\nKT: 500*500*750mm',
    material_raw: '',
    dimension_raw: '500*500*750mm',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 93,
    source_page: 'Sheet NT',
    section_code: 'D',
    section_name: 'PHÒNG PANTRY',
    item_no: 'D.II.3',
    item_name_raw: 'Ghế ăn',
    description_raw: 'Ghế ăn',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '6',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },

  // ── E. PHÒNG CHỦ TỊCH ────────────────────────────────────────────────────
  {
    source_row: 96,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.I.1',
    item_name_raw: 'Thảm trải sàn',
    description_raw: 'Thảm trải sàn\nTheo mẫu được duyệt',
    material_raw: 'Thảm (theo mẫu được duyệt)',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '98.7',
    quantity_note: 'Phòng chủ tịch: 94 (net), hệ số x1.05',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
    review_required: true,
    review_reason: 'Không có ghi chú giá (khác các phòng khác)',
  },
  {
    source_row: 98,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.I.2',
    item_name_raw: 'Len chân tường',
    description_raw: 'Len chân tường\nLen PVC H100mm',
    material_raw: 'PVC H100mm',
    dimension_raw: 'H100mm',
    uom_raw: 'md',
    quantity_raw: '42',
    quantity_note: 'Phòng chủ tịch: 40 (net), hệ số x1.05',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 100,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.I.3',
    item_name_raw: 'Rèm che nắng',
    description_raw: 'Rèm che nắng\nRèm cuộn màu trắng',
    material_raw: 'Rèm cuộn màu trắng',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '48.96',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 102,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.I.4',
    item_name_raw: 'Vách ốp gỗ',
    description_raw: 'Vách ốp gỗ',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '30.6',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'MEDIUM',
    review_required: true,
    review_reason: 'Vật liệu vách ốp gỗ chưa được ghi rõ — cần xác nhận loại MDF/MFC',
  },
  {
    source_row: 103,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.I.5',
    item_name_raw: 'Nẹp T inox ron vách gỗ',
    description_raw: 'Nẹp T inox ron vách gỗ',
    material_raw: 'Inox',
    dimension_raw: '',
    uom_raw: 'md',
    quantity_raw: '47.7',
    client_supplied: false,
    not_execute: false,
    source_note: 'Giá bảo minh CN Hà Nội',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
  {
    source_row: 104,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.I.6',
    item_name_raw: 'Tủ phòng chủ tịch',
    description_raw: 'Tủ phòng chủ tịch\nMDF kháng ẩm phủ melamine theo màu được duyệt',
    material_raw: 'MDF kháng ẩm phủ melamine',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '26.265',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'MEDIUM',
    review_required: true,
    review_reason: 'Không có ghi chú giá, kích thước tổng thể chưa rõ',
  },
  {
    source_row: 105,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.I.7',
    item_name_raw: 'Bộ logo BMS bằng mica có đèn',
    description_raw: 'Bộ logo BMS bằng mica có đèn',
    material_raw: 'Mica có đèn',
    dimension_raw: '',
    uom_raw: 'bộ',
    quantity_raw: '0',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'LOW',
    review_required: true,
    review_reason: 'Số lượng = 0 nhưng không có ghi chú không thực hiện — cần xác nhận',
  },
  // E.II Nội thất rời
  {
    source_row: 107,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.II.1',
    item_name_raw: 'Bàn làm việc chủ tịch',
    description_raw: 'Bàn làm việc chủ tịch\nMDF kháng ẩm phủ melamine AC theo màu được duyệt',
    material_raw: 'MDF kháng ẩm phủ melamine AC',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 108,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.II.2',
    item_name_raw: 'Ghế chủ tịch',
    description_raw: 'Ghế chủ tịch',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 109,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.II.3',
    item_name_raw: 'Ghế khách',
    description_raw: 'Ghế khách',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '2',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 110,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.II.4',
    item_name_raw: 'Bàn sofa',
    description_raw: 'Bàn sofa',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 111,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.II.5',
    item_name_raw: 'Ghế sofa đơn',
    description_raw: 'Ghế sofa đơn',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '2',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 112,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.II.6',
    item_name_raw: 'Ghế sofa đôi',
    description_raw: 'Ghế sofa đôi',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 113,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.II.7',
    item_name_raw: 'Bàn pha trà',
    description_raw: 'Bàn pha trà',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 114,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.II.8',
    item_name_raw: 'Bàn họp',
    description_raw: 'Bàn họp\nKT: 3000*1200*750mm',
    material_raw: '',
    dimension_raw: '3000*1200*750mm',
    uom_raw: 'cái',
    quantity_raw: '1',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },
  {
    source_row: 115,
    source_page: 'Sheet NT',
    section_code: 'E',
    section_name: 'PHÒNG CHỦ TỊCH',
    item_no: 'E.II.9',
    item_name_raw: 'Ghế họp',
    description_raw: 'Ghế họp',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'cái',
    quantity_raw: '9',
    client_supplied: true,
    not_execute: false,
    source_note: 'CĐT cấp',
    price_raw: '',
    amount_raw: '0',
    price_status: 'CLIENT_SUPPLIED',
    confidence: 'HIGH',
  },

  // ── F. HÀNH LANG ─────────────────────────────────────────────────────────
  {
    source_row: 117,
    source_page: 'Sheet NT',
    section_code: 'F',
    section_name: 'HÀNH LANG',
    item_no: 'F.1',
    item_name_raw: 'Thảm trải sàn',
    description_raw: 'Thảm trải sàn\nTheo mẫu được duyệt',
    material_raw: 'Thảm (theo mẫu được duyệt)',
    dimension_raw: '',
    uom_raw: 'm2',
    quantity_raw: '0',
    client_supplied: false,
    not_execute: true,
    source_note: 'không thực hiện',
    price_raw: '',
    amount_raw: '0',
    price_status: 'NOT_EXECUTED',
    confidence: 'HIGH',
  },
  {
    source_row: 119,
    source_page: 'Sheet NT',
    section_code: 'F',
    section_name: 'HÀNH LANG',
    item_no: 'F.2',
    item_name_raw: 'Len chân tường',
    description_raw: 'Len chân tường\nLen PVC H100mm',
    material_raw: 'PVC H100mm',
    dimension_raw: 'H100mm',
    uom_raw: 'md',
    quantity_raw: '',
    client_supplied: false,
    not_execute: true,
    source_note: 'không thực hiện',
    price_raw: '',
    amount_raw: '0',
    price_status: 'NOT_EXECUTED',
    confidence: 'HIGH',
  },

  // ── G. CHI PHÍ KHÁC ──────────────────────────────────────────────────────
  {
    source_row: 122,
    source_page: 'Sheet NT',
    section_code: 'G',
    section_name: 'CHI PHÍ KHÁC',
    item_no: 'G.1',
    item_name_raw: 'Chi phí vận chuyển nội thất lên tầng 15',
    description_raw: 'Chi phí vận chuyển nội thất lên tầng 15',
    material_raw: '',
    dimension_raw: '',
    uom_raw: 'Gói',
    quantity_raw: '1',
    client_supplied: false,
    not_execute: false,
    source_note: '',
    price_raw: '',
    amount_raw: '0',
    price_status: 'MISSING',
    confidence: 'HIGH',
  },
];

// ── PHASE 1C: CLASSIFY ────────────────────────────────────────────────────────

function classify(item) {
  if (item.not_execute) return CATEGORY.NOT_EXECUTED;
  if (item.client_supplied) return CATEGORY.CLIENT_SUPPLIED;

  const name = (item.item_name_raw + ' ' + item.description_raw).toLowerCase();

  if (name.includes('vận chuyển') || name.includes('chi phí vận')) return CATEGORY.TRANSPORT;
  if (name.includes('logo') || name.includes('bms')) return CATEGORY.LOGO;
  if (name.includes('biển') || name.includes('signage')) return CATEGORY.SIGNAGE;
  if (name.includes('thảm')) return CATEGORY.FLOOR_FINISH;
  if (name.includes('rèm')) return CATEGORY.CURTAIN;
  if (name.includes('len chân tường') || name.includes('nẹp t inox')) return CATEGORY.FINISHING;
  if (name.includes('vách ốp') || name.includes('ốp vách') || name.includes('ốp mặt')) return CATEGORY.WALL_FINISH;
  if (name.includes('vách ngăn')) return CATEGORY.PARTITION;
  if (name.includes('cửa bật') || name.includes('cửa ')) return CATEGORY.DOOR;
  if (name.includes('ghế') || name.includes('sofa') || name.includes('bàn ăn') || name.includes('bàn sofa') || name.includes('bàn pha trà') || name.includes('bàn họp\nkt') || name.includes('bàn tròn tiếp khách')) return CATEGORY.LOOSE_FURNITURE;
  if (name.includes('tủ di động') || name.includes('ghế lễ tân')) return CATEGORY.LOOSE_FURNITURE;
  if (name.includes('bàn làm việc') || name.includes('bàn họp\nmặt') || name.includes('quầy') || name.includes('tủ') || name.includes('hệ đợt') || name.includes('bồn trồng')) return CATEGORY.BUILT_IN_FURNITURE;
  if (name.includes('mặt đá')) return CATEGORY.WALL_FINISH;

  return CATEGORY.OTHER;
}

// ── PHASE 1D: MATERIAL NORMALIZATION ──────────────────────────────────────────

function normalizeMaterial(item) {
  const raw = item.material_raw || '';
  if (!raw) return { material_family: '', specification: '', finish: '', normalized: '' };

  const families = [];

  if (raw.toLowerCase().includes('mdf kháng ẩm')) {
    families.push({ family: 'MDF', specification: 'moisture_resistant', finish: raw.includes('melamine') ? 'melamine' : raw.includes('laminate') ? 'laminate' : '' });
  }
  if (raw.toLowerCase().includes('mfc kháng ẩm') || raw.toLowerCase().includes('ván mfc kháng ẩm')) {
    const finish = raw.includes('melamine AC') ? 'melamine_AC' : raw.includes('melamine') ? 'melamine' : '';
    families.push({ family: 'MFC', specification: 'moisture_resistant', finish });
  }
  if (raw.toLowerCase().includes('mfc phủ') && !raw.toLowerCase().includes('kháng ẩm')) {
    const finish = raw.includes('laminate') ? 'laminate' : 'melamine';
    families.push({ family: 'MFC', specification: 'standard', finish });
  }
  if (raw.toLowerCase().includes('pvc')) {
    const spec = raw.toLowerCase().includes('vân đá') ? 'stone_pattern' : raw.toLowerCase().includes('h100') ? 'H100mm_baseboard' : 'standard';
    families.push({ family: 'PVC', specification: spec, finish: '' });
  }
  if (raw.toLowerCase().includes('inox màu vàng gold')) {
    families.push({ family: 'stainless_steel', specification: 'grade_unknown', finish: 'gold' });
  } else if (raw.toLowerCase().includes('inox') || raw.toLowerCase().includes('nẹp t inox')) {
    families.push({ family: 'stainless_steel', specification: 'grade_unknown', finish: 'brushed' });
  }
  if (raw.toLowerCase().includes('sắt sơn tĩnh điện') || raw.toLowerCase().includes('chân sắt')) {
    families.push({ family: 'steel', specification: 'structural', finish: 'powder_coating' });
  }
  if (raw.toLowerCase().includes('da pu')) {
    families.push({ family: 'leather_PU', specification: 'standard', finish: '' });
  }
  if (raw.toLowerCase().includes('simili')) {
    families.push({ family: 'simili', specification: 'standard', finish: '' });
  }
  if (raw.toLowerCase().includes('mica')) {
    const finish = raw.toLowerCase().includes('đèn') ? 'backlit' : raw.toLowerCase().includes('trong') ? 'transparent' : 'opaque';
    families.push({ family: 'acrylic_mica', specification: 'standard', finish });
  }
  if (raw.toLowerCase().includes('đá marble nhân tạo') || raw.toLowerCase().includes('laminate vân đá')) {
    families.push({ family: 'engineered_stone', specification: 'marble_pattern', finish: 'polished' });
  }
  if (raw.toLowerCase().includes('thảm')) {
    families.push({ family: 'carpet', specification: 'per_approved_sample', finish: '' });
  }
  if (raw.toLowerCase().includes('rèm cuộn')) {
    families.push({ family: 'roller_blind', specification: 'white', finish: '' });
  }
  if (raw.toLowerCase().includes('ván nhựa')) {
    families.push({ family: 'plastic_board', specification: 'standard', finish: '' });
  }
  if (raw.toLowerCase().includes('khung gỗ') || (raw.toLowerCase().includes('gỗ') && !raw.toLowerCase().includes('mdf') && !raw.toLowerCase().includes('mfc'))) {
    families.push({ family: 'solid_wood_frame', specification: 'unspecified', finish: raw.includes('sơn PU') ? 'PU_lacquer' : 'unspecified' });
  }

  if (families.length === 0) return { material_family: raw, specification: 'NEEDS_REVIEW', finish: '', normalized: raw };

  return {
    material_family: families.map(f => f.family).join(', '),
    specification: families.map(f => f.specification).join(', '),
    finish: families.map(f => f.finish).filter(Boolean).join(', '),
    normalized: families.map(f => `${f.family}${f.specification !== 'standard' ? ' [' + f.specification + ']' : ''}${f.finish ? ' phủ ' + f.finish : ''}`).join(' + '),
  };
}

// ── PHASE 1E: DIMENSION NORMALIZATION ─────────────────────────────────────────

function normalizeDimension(raw) {
  if (!raw) return { length_mm: null, width_mm: null, height_mm: null, depth_mm: null, diameter_mm: null };

  // Patterns: D3200*R1400*C750mm, 1200*600*750mm, D800*H450mm, H100mm, 1700*1100mm
  const result = { length_mm: null, width_mm: null, height_mm: null, depth_mm: null, diameter_mm: null };

  // D (dài) * R (rộng) * C (cao)
  const drcMatch = raw.match(/D(\d+)\*R(\d+)\*C(\d+)/i);
  if (drcMatch) {
    result.length_mm = parseInt(drcMatch[1]);
    result.width_mm = parseInt(drcMatch[2]);
    result.height_mm = parseInt(drcMatch[3]);
    return result;
  }

  // D * H (diameter * height)
  const dhMatch = raw.match(/D(\d+)\*H(\d+)/i);
  if (dhMatch) {
    result.diameter_mm = parseInt(dhMatch[1]);
    result.height_mm = parseInt(dhMatch[2]);
    return result;
  }

  // R * C (rộng * cao)
  const rcMatch = raw.match(/R(\d+)\*C(\d+)/i);
  if (rcMatch) {
    result.width_mm = parseInt(rcMatch[1]);
    result.height_mm = parseInt(rcMatch[2]);
    return result;
  }

  // H (height only) e.g. H100mm
  const hMatch = raw.match(/^H(\d+)/i);
  if (hMatch) {
    result.height_mm = parseInt(hMatch[1]);
    return result;
  }

  // D (depth/dài only) e.g. D1000*C350
  const dcMatch = raw.match(/D(\d+)\*C(\d+)/i);
  if (dcMatch) {
    result.length_mm = parseInt(dcMatch[1]);
    result.depth_mm = parseInt(dcMatch[2]);
    return result;
  }

  // 3-value: L*W*H
  const lwh3 = raw.match(/(\d+)\*(\d+)\*(\d+)/);
  if (lwh3) {
    result.length_mm = parseInt(lwh3[1]);
    result.width_mm = parseInt(lwh3[2]);
    result.height_mm = parseInt(lwh3[3]);
    return result;
  }

  // 2-value: L*W or L*H
  const lw2 = raw.match(/(\d+)\*(\d+)/);
  if (lw2) {
    result.length_mm = parseInt(lw2[1]);
    result.width_mm = parseInt(lw2[2]);
    return result;
  }

  return result;
}

// ── PHASE 1H: STATUS DETERMINATION ────────────────────────────────────────────

function determineStatus(item) {
  if (item.not_execute) return STATUS.NOT_EXECUTED;
  if (item.client_supplied) return STATUS.CLIENT_SUPPLIED;
  if (!item.quantity_raw || item.quantity_raw === '0' || item.quantity_raw === '') {
    if (item.item_no === 'E.I.7') return STATUS.NEEDS_REVIEW; // Logo bộ qty=0, need clarification
    return STATUS.MISSING_QUANTITY;
  }
  if (!item.price_raw || item.price_raw === '') return STATUS.MISSING_PRICE;
  return STATUS.READY_FOR_REVIEW;
}

// ── BUILD NORMALIZED DATASET ──────────────────────────────────────────────────

const normalizedItems = SOURCE_ITEMS_RAW
  .filter(item => !item.item_type) // Skip header rows
  .map((item, idx) => {
    const matNorm = normalizeMaterial(item);
    const dimNorm = normalizeDimension(item.dimension_raw || '');
    const category = classify(item);
    const status = determineStatus(item);

    return {
      id: idx + 1,
      source_document: SOURCE_FILE,
      source_page: 'Sheet NT — ' + SOURCE_FILE,
      source_row: item.source_row,
      section_code: item.section_code,
      section_name: item.section_name,
      item_no: item.item_no,
      item_name_raw: item.item_name_raw,
      description_raw: item.description_raw,
      material_raw: item.material_raw || '',
      material_normalized: matNorm.normalized,
      material_family: matNorm.material_family,
      material_specification: matNorm.specification,
      material_finish: matNorm.finish,
      dimension_raw: item.dimension_raw || '',
      length_mm: dimNorm.length_mm,
      width_mm: dimNorm.width_mm,
      height_mm: dimNorm.height_mm,
      depth_mm: dimNorm.depth_mm,
      diameter_mm: dimNorm.diameter_mm,
      uom_raw: item.uom_raw || '',
      quantity_raw: item.quantity_raw || '',
      quantity_note: item.quantity_note || '',
      client_supplied: item.client_supplied || false,
      not_execute: item.not_execute || false,
      source_note: item.source_note || '',
      price_raw: item.price_raw || '',
      amount_raw: item.amount_raw || '0',
      price_status: item.price_status || 'MISSING',
      business_category: category,
      status: status,
      confidence: item.confidence || 'MEDIUM',
      review_required: item.review_required || false,
      review_reason: item.review_reason || '',
    };
  });

// ── PHASE 1J: DATA QUALITY CHECK ──────────────────────────────────────────────

function runQualityCheck(items) {
  const report = {
    source_rows: SOURCE_ITEMS_RAW.filter(i => !i.item_type).length,
    normalized_rows: items.length,
    client_supplied: items.filter(i => i.client_supplied).length,
    not_executed: items.filter(i => i.not_execute).length,
    ready_for_review: items.filter(i => i.status === STATUS.READY_FOR_REVIEW).length,
    missing_quantity: items.filter(i => i.status === STATUS.MISSING_QUANTITY).length,
    missing_price: items.filter(i => i.status === STATUS.MISSING_PRICE).length,
    needs_review: items.filter(i => i.status === STATUS.NEEDS_REVIEW || i.review_required).length,
    orphan: 0,
    duplicate: 0,
    fail: 0,
    blocker: 0,
    issues: [],
  };

  // Check 1: No rows lost
  if (report.source_rows !== report.normalized_rows) {
    report.fail++;
    report.blocker++;
    report.issues.push(`ROW LOSS: source=${report.source_rows} normalized=${report.normalized_rows}`);
  }

  // Check 2: No duplicate item_no
  const itemNos = items.map(i => i.item_no);
  const seenNos = new Set();
  const duplicates = [];
  for (const no of itemNos) {
    if (seenNos.has(no)) duplicates.push(no);
    seenNos.add(no);
  }
  if (duplicates.length > 0) {
    report.duplicate = duplicates.length;
    report.issues.push(`DUPLICATE item_no: ${duplicates.join(', ')}`);
  }

  // Check 3: No quantity invented (all quantities come from source)
  const inventedQty = items.filter(i => !i.quantity_raw && !i.not_execute && !i.client_supplied && i.status !== STATUS.MISSING_QUANTITY);
  if (inventedQty.length > 0) {
    report.fail++;
    report.blocker++;
    report.issues.push(`INVENTED QUANTITY for: ${inventedQty.map(i => i.item_no).join(', ')}`);
  }

  // Check 4: No price invented
  const inventedPrice = items.filter(i => i.price_raw && i.price_raw !== '' && parseFloat(i.price_raw) > 0);
  if (inventedPrice.length > 0) {
    report.fail++;
    report.blocker++;
    report.issues.push(`INVENTED PRICE for: ${inventedPrice.map(i => i.item_no).join(', ')}`);
  }

  // Check 5: CĐT cấp not in purchase chain
  const cdtItems = items.filter(i => i.client_supplied);
  const cdtInPurchase = cdtItems.filter(i => i.status !== STATUS.CLIENT_SUPPLIED);
  if (cdtInPurchase.length > 0) {
    report.fail++;
    report.issues.push(`CĐT CẤP in wrong status: ${cdtInPurchase.map(i => i.item_no).join(', ')}`);
  }

  // Check 6: Không thực hiện not in production
  const notExItems = items.filter(i => i.not_execute);
  const notExInProd = notExItems.filter(i => i.status !== STATUS.NOT_EXECUTED);
  if (notExInProd.length > 0) {
    report.fail++;
    report.issues.push(`NOT_EXECUTED in wrong status: ${notExInProd.map(i => i.item_no).join(', ')}`);
  }

  // Check 7: No dimension modified
  // All dimension_raw preserved as-is (structural check only)
  const dimModified = items.filter(i => i.dimension_raw && !i.dimension_raw.match(/[\d*a-zA-Z]/));
  if (dimModified.length > 0) {
    report.issues.push(`DIMENSION FORMAT ISSUE: ${dimModified.map(i => i.item_no).join(', ')}`);
  }

  // Check 8: No material guessed for blank material items
  const guessedMaterial = items.filter(i => !i.material_raw && i.material_normalized && i.material_normalized !== '');
  if (guessedMaterial.length > 0) {
    report.fail++;
    report.issues.push(`MATERIAL GUESSED (not from source): ${guessedMaterial.map(i => i.item_no).join(', ')}`);
  }

  return report;
}

const qcReport = runQualityCheck(normalizedItems);

// ── OUTPUT ─────────────────────────────────────────────────────────────────────

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 1. Export CSV
function buildCsv(items) {
  const header = [
    'STT', 'Khu vực', 'Hạng mục', 'Mô tả gốc', 'Vật liệu gốc', 'Vật liệu chuẩn hóa',
    'Quy cách vật liệu', 'Kích thước gốc', 'Dài(mm)', 'Rộng(mm)', 'Cao(mm)', 'Sâu(mm)', 'Đường kính(mm)',
    'ĐVT', 'Khối lượng', 'Ghi chú KL',
    'CĐT cấp', 'Không thực hiện', 'Ghi chú nguồn',
    'Đơn giá nguồn', 'Thành tiền nguồn',
    'Phân loại nghiệp vụ', 'Trạng thái', 'Confidence', 'Cần kiểm tra', 'Lý do kiểm tra',
  ];

  const rows = items.map(i => [
    i.id,
    i.section_name,
    i.item_name_raw,
    i.description_raw.replace(/\n/g, ' | '),
    i.material_raw,
    i.material_normalized,
    i.material_specification,
    i.dimension_raw,
    i.length_mm ?? '',
    i.width_mm ?? '',
    i.height_mm ?? '',
    i.depth_mm ?? '',
    i.diameter_mm ?? '',
    i.uom_raw,
    i.quantity_raw,
    i.quantity_note,
    i.client_supplied ? 'CÓ' : '',
    i.not_execute ? 'CÓ' : '',
    i.source_note,
    i.price_raw || '-',
    i.amount_raw || '-',
    i.business_category,
    i.status,
    i.confidence,
    i.review_required ? 'CÓ' : '',
    i.review_reason,
  ]);

  const escape = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  return [header, ...rows].map(row => row.map(escape).join(',')).join('\n');
}

const csvContent = buildCsv(normalizedItems);
fs.writeFileSync(path.join(OUTPUT_DIR, 'BAO-MINH-SOURCE-REVIEW.csv'), '\uFEFF' + csvContent, 'utf8');
console.log('✅ CSV exported:', path.join(OUTPUT_DIR, 'BAO-MINH-SOURCE-REVIEW.csv'));

// 2. Export Excel
function buildExcel(items) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Normalized Data
  const header = [
    'STT', 'Mã khu vực', 'Khu vực', 'Số hiệu hàng', 'Hạng mục',
    'Mô tả gốc', 'Vật liệu gốc', 'Vật liệu chuẩn hóa', 'Họ vật liệu', 'Quy cách', 'Bề mặt',
    'Kích thước gốc', 'Dài(mm)', 'Rộng(mm)', 'Cao(mm)', 'Sâu(mm)', 'ĐK(mm)',
    'ĐVT', 'Khối lượng', 'Ghi chú KL',
    'CĐT cấp', 'Không thực hiện', 'Ghi chú nguồn',
    'Đơn giá nguồn', 'Thành tiền nguồn',
    'Phân loại nghiệp vụ', 'Trạng thái', 'Confidence', 'Cần kiểm tra', 'Lý do',
    'Row nguồn',
  ];

  const rows = items.map(i => [
    i.id, i.section_code, i.section_name, i.item_no, i.item_name_raw,
    i.description_raw, i.material_raw, i.material_normalized, i.material_family, i.material_specification, i.material_finish,
    i.dimension_raw, i.length_mm, i.width_mm, i.height_mm, i.depth_mm, i.diameter_mm,
    i.uom_raw, i.quantity_raw, i.quantity_note,
    i.client_supplied ? 'CÓ' : '', i.not_execute ? 'CÓ' : '', i.source_note,
    i.price_raw || '-', i.amount_raw || '-',
    i.business_category, i.status, i.confidence, i.review_required ? 'CÓ' : '', i.review_reason,
    i.source_row,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws1['!cols'] = header.map((_, i) => ({ wch: i < 5 ? 8 : i < 10 ? 35 : 12 }));
  XLSX.utils.book_append_sheet(wb, ws1, 'BAO_MINH_SOURCE_ITEMS');

  // Sheet 2: CĐT Cấp
  const cdtItems = items.filter(i => i.client_supplied);
  const cdtHeader = ['STT', 'Khu vực', 'Hạng mục', 'Mô tả', 'ĐVT', 'Số lượng', 'Ghi chú'];
  const cdtRows = cdtItems.map(i => [i.id, i.section_name, i.item_name_raw, i.description_raw, i.uom_raw, i.quantity_raw, i.source_note]);
  const ws2 = XLSX.utils.aoa_to_sheet([cdtHeader, ...cdtRows]);
  XLSX.utils.book_append_sheet(wb, ws2, 'CĐT Cấp');

  // Sheet 3: Không thực hiện
  const notExItems = items.filter(i => i.not_execute);
  const notExHeader = ['STT', 'Khu vực', 'Hạng mục', 'Mô tả', 'ĐVT', 'Ghi chú'];
  const notExRows = notExItems.map(i => [i.id, i.section_name, i.item_name_raw, i.description_raw, i.uom_raw, i.source_note]);
  const ws3 = XLSX.utils.aoa_to_sheet([notExHeader, ...notExRows]);
  XLSX.utils.book_append_sheet(wb, ws3, 'Không Thực Hiện');

  // Sheet 4: Cần kiểm tra
  const reviewItems = items.filter(i => i.review_required);
  const reviewHeader = ['STT', 'Khu vực', 'Hạng mục', 'Lý do cần kiểm tra', 'Confidence'];
  const reviewRows = reviewItems.map(i => [i.id, i.section_name, i.item_name_raw, i.review_reason, i.confidence]);
  const ws4 = XLSX.utils.aoa_to_sheet([reviewHeader, ...reviewRows]);
  XLSX.utils.book_append_sheet(wb, ws4, 'Cần Kiểm Tra');

  // Sheet 5: QC Report
  const qcRows = [
    ['HẠNG MỤC', 'GIÁ TRỊ'],
    ['SOURCE FILE', SOURCE_FILE],
    ['SHEET', 'NT'],
    ['NGÀY AUDIT', new Date().toISOString().split('T')[0]],
    ['', ''],
    ['SOURCE ROWS', qcReport.source_rows],
    ['NORMALIZED ROWS', qcReport.normalized_rows],
    ['CLIENT SUPPLIED', qcReport.client_supplied],
    ['NOT EXECUTED', qcReport.not_executed],
    ['READY FOR REVIEW', qcReport.ready_for_review],
    ['MISSING QUANTITY', qcReport.missing_quantity],
    ['MISSING PRICE', qcReport.missing_price],
    ['NEEDS REVIEW', qcReport.needs_review],
    ['ORPHAN', qcReport.orphan],
    ['DUPLICATE', qcReport.duplicate],
    ['FAIL', qcReport.fail],
    ['BLOCKER', qcReport.blocker],
    ['', ''],
    ['ISSUES', ''],
    ...qcReport.issues.map(i => ['', i]),
  ];
  const ws5 = XLSX.utils.aoa_to_sheet(qcRows);
  XLSX.utils.book_append_sheet(wb, ws5, 'Data Quality Report');

  return wb;
}

const xlsxWb = buildExcel(normalizedItems);
XLSX.writeFile(xlsxWb, path.join(OUTPUT_DIR, 'BAO-MINH-SOURCE-REVIEW.xlsx'));
console.log('✅ Excel exported:', path.join(OUTPUT_DIR, 'BAO-MINH-SOURCE-REVIEW.xlsx'));

// 3. Print QC Summary
console.log('\n' + '═'.repeat(60));
console.log('  PHASE 1J — DATA QUALITY CHECK');
console.log('═'.repeat(60));
console.log(`  SOURCE ROWS       : ${qcReport.source_rows}`);
console.log(`  NORMALIZED ROWS   : ${qcReport.normalized_rows}`);
console.log(`  CLIENT SUPPLIED   : ${qcReport.client_supplied}`);
console.log(`  NOT EXECUTED      : ${qcReport.not_executed}`);
console.log(`  READY FOR REVIEW  : ${qcReport.ready_for_review}`);
console.log(`  MISSING QUANTITY  : ${qcReport.missing_quantity}`);
console.log(`  MISSING PRICE     : ${qcReport.missing_price}`);
console.log(`  NEEDS REVIEW      : ${qcReport.needs_review}`);
console.log(`  ORPHAN            : ${qcReport.orphan}`);
console.log(`  DUPLICATE         : ${qcReport.duplicate}`);
console.log(`  FAIL              : ${qcReport.fail}`);
console.log(`  BLOCKER           : ${qcReport.blocker}`);
if (qcReport.issues.length > 0) {
  console.log('\n  Issues:');
  qcReport.issues.forEach(i => console.log(`    - ${i}`));
}
console.log('═'.repeat(60));

if (qcReport.fail === 0 && qcReport.blocker === 0 && qcReport.orphan === 0 && qcReport.duplicate === 0 && qcReport.source_rows === qcReport.normalized_rows) {
  console.log('\n  ✅ PHASE 1 — SOURCE DATA READY FOR HUMAN REVIEW');
} else {
  console.log('\n  ❌ PHASE 1 — ISSUES FOUND, NOT READY FOR REVIEW');
}
console.log('═'.repeat(60));

// Write QC data to file for the markdown report
fs.writeFileSync(path.join(OUTPUT_DIR, 'qc-result.json'), JSON.stringify({ qcReport, itemCount: normalizedItems.length, sectionStats: buildSectionStats(normalizedItems) }, null, 2));

function buildSectionStats(items) {
  const stats = {};
  for (const item of items) {
    if (!stats[item.section_code]) {
      stats[item.section_code] = { name: item.section_name, count: 0, client_supplied: 0, not_executed: 0, missing_price: 0, missing_qty: 0 };
    }
    stats[item.section_code].count++;
    if (item.client_supplied) stats[item.section_code].client_supplied++;
    if (item.not_execute) stats[item.section_code].not_executed++;
    if (item.status === STATUS.MISSING_PRICE) stats[item.section_code].missing_price++;
    if (item.status === STATUS.MISSING_QUANTITY) stats[item.section_code].missing_quantity++;
  }
  return stats;
}

console.log('\n✅ All Phase 1 outputs written to:', OUTPUT_DIR);
