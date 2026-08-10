// src/lib/etl/types.ts
// ═══════════════════════════════════════════════════════════════════════════════
// HomePro ETL Pipeline — Shared Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

// ── Đơn vị tính chuẩn hóa ────────────────────────────────────────────────────
export type UnitCode = 'md' | 'm2' | 'm3' | 'cai' | 'he' | 'bo' | 'lo' | 'kg' | 'lit' | 'set';

// ── Định tuyến chuỗi cung ứng ─────────────────────────────────────────────────
export type SupplyType =
  | 'HomePro_Production'       // Gia công ván tại xưởng → đẩy sang BOM/CNC
  | 'Procurement_Commercial'   // Mua ngoài thương mại (nội thất rời, decor)
  | 'Installation_Only';       // CĐT cấp vật tư, HomePro chỉ thi công

// ── Kích thước phân rã ───────────────────────────────────────────────────────
export interface Dimensions {
  length?: number;   // mm hoặc m (tuỳ context)
  width?:  number;
  height?: number;
  raw:     string;   // Chuỗi gốc trước khi parse
}

// ── Dòng BOQ thô từ Excel/CSV ─────────────────────────────────────────────────
export interface RawInputLine {
  rowIndex:    number;         // Số dòng trong file gốc (1-indexed)
  rawStt:      string;         // STT gốc (có thể là "5", "5a", "")
  rawName:     string;         // Tên vật tư / hạng mục (chưa sạch)
  rawUnit:     string;         // Đơn vị (có thể lẫn kích thước: "md. 0.2 2.7 m2")
  rawQty:      string;         // Số lượng (có thể là "1.5", "1,5", "")
  rawPrice:    string;         // Đơn giá
  rawNote:     string;         // Ghi chú (nguồn để phân loại supply_type)
  rawMaterial: string;         // Vật liệu (MDF, MFC, Acrylic...)
  isZoneHeader?: boolean;      // Gợi ý từ parser — dòng này có thể là tiêu đề phân khu
}

// ── Dòng đã làm sạch (sau Bước 1) ───────────────────────────────────────────
export interface CleanedLine {
  rowIndex:       number;
  systemIndex:    number;        // Index nội bộ, tăng dần, không trùng
  name:           string;        // Tên đã sửa lỗi Levenshtein
  nameOriginal:   string;        // Tên gốc trước sửa
  wasAutoCorrected: boolean;     // Có bị Levenshtein sửa không?
  unit:           UnitCode;      // Đơn vị đã chuẩn hóa
  dimensions:     Dimensions;    // Kích thước phân rã
  qty:            number;        // Số lượng (Float > 0)
  unitPrice:      number;        // Đơn giá
  total:          number;        // Thành tiền = qty × unitPrice
  note:           string;        // Ghi chú sạch
  material:       string;        // Vật liệu sạch
  isZoneHeader:   boolean;
  rawStt:         string;
}

// ── Zone sau Bước 2 ───────────────────────────────────────────────────────────
export interface Zone {
  zoneId:    string;    // Ví dụ: ZN-PKB-01
  zoneName:  string;    // Tên phân khu
  zoneIndex: number;    // Thứ tự phân khu trong file
}

// ── Dòng sau khi gán Zone (sau Bước 2) ───────────────────────────────────────
export interface ZonedLine extends CleanedLine {
  zoneId:   string;
  zoneName: string;
}

// ── Dòng đã định tuyến cung ứng (sau Bước 3) ─────────────────────────────────
export interface RoutedLine extends ZonedLine {
  supplyType:      SupplyType;
  needsBomLayer:   boolean;   // true → đẩy sang CNC/BOM module
  routingEvidence: string;    // Lý do phân loại (để audit)
}

// ── Kết quả Validation Hook ───────────────────────────────────────────────────
export interface ValidationResult {
  step:     number;
  passed:   boolean;
  errors:   ValidationError[];
  warnings: string[];
  stats:    Record<string, number | string>;
}

export interface ValidationError {
  rowIndex: number;
  field:    string;
  message:  string;
  value:    unknown;
}

// ── JSON Schema đầu ra (Bước 4) ───────────────────────────────────────────────
export interface ProjectMetadata {
  projectCode:      string;
  projectName:      string;
  customer:         string;
  etlVersion:       string;
  processedAt:      string;    // ISO 8601
  sourceFile:       string;
  totalZones:       number;
  totalItems:       number;
  grandTotal:       number;
}

export interface OutputItem {
  systemIndex:      number;
  zoneId:           string;
  name:             string;
  nameOriginal:     string;
  wasAutoCorrected: boolean;
  unit:             UnitCode;
  dimensions:       Dimensions;
  qty:              number;
  unitPrice:        number;
  total:            number;
  supplyType:       SupplyType;
  needsBomLayer:    boolean;
  routingEvidence:  string;
  material:         string;
  note:             string;
}

export interface OutputZone {
  zoneId:    string;
  zoneName:  string;
  zoneTotal: number;
  itemCount: number;
  items:     OutputItem[];
}

export interface ETLOutput {
  project_metadata: ProjectMetadata;
  data_payload: {
    zones: OutputZone[];
  };
  etl_summary: {
    step1_cleaned:         number;
    step2_zones_created:   number;
    step3_hp_production:   number;
    step3_procurement:     number;
    step3_install_only:    number;
    step4_integrity_ok:    boolean;
    auto_corrected_names:  number;
    index_repairs:         number;
  };
}
