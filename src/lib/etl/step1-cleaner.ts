// src/lib/etl/step1-cleaner.ts
// ═══════════════════════════════════════════════════════════════════════════════
// BƯỚC 1: Text Cleaning & Regex Parser + Levenshtein Autocorrect
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  RawInputLine, CleanedLine, UnitCode, Dimensions, ValidationResult, ValidationError,
} from './types';

// ── Từ điển danh mục vật tư chuẩn xưởng HomePro ─────────────────────────────
const PRODUCT_DICTIONARY: string[] = [
  // Cửa & vách
  'Cửa bật', 'Cửa lùa', 'Cửa đi', 'Cửa sổ', 'Cửa kính cường lực',
  'Vách ngăn', 'Vách ốp sau TV', 'Vách ốp sau TV giả đá',
  'Vách kính', 'Vách nhôm kính',
  // Tủ & kệ
  'Tủ bếp trên', 'Tủ bếp dưới', 'Tủ bếp cao', 'Tủ quần áo',
  'Tủ đầu giường', 'Tủ giày', 'Tủ rượu', 'Tủ TV',
  'Kệ tường', 'Kệ sách', 'Kệ trang trí',
  // Bàn & ghế
  'Bàn làm việc', 'Bàn ăn', 'Bàn bếp', 'Bàn trang điểm',
  'Ghế làm việc', 'Ghế ăn',
  // Gương & trang trí
  'Gương thay giày', 'Gương phòng tắm', 'Gương trang điểm',
  'Tranh treo tường',
  // Ốp lát & hoàn thiện
  'Lèn chân tường', 'Len chân tường', 'Nẹp T inox',
  'Sàn gỗ công nghiệp', 'Trần thạch cao',
  'Ốp tường đá', 'Ốp tường gạch',
  // Phụ kiện & khác
  'Bản lề Blum', 'Ray trượt Blum', 'Tay nắm tủ',
  'Chỉ dán cạnh', 'Phụ kiện bản lề',
  'Giường thay giày', // sai → Gương
  // Nội thất rời (để phân loại Procurement)
  'Sofa văng', 'Ghế sofa', 'Giường ngủ',
];

// ── Thuật toán Levenshtein Distance ─────────────────────────────────────────
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1].toLowerCase() === b[j - 1].toLowerCase()
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Tự động sửa tên dựa trên từ điển (threshold = 3)
export function autocorrectName(
  input: string,
  threshold = 3
): { corrected: string; wasChanged: boolean; distance: number } {
  const trimmed = input.trim();
  let best      = trimmed;
  let bestDist  = Infinity;

  for (const known of PRODUCT_DICTIONARY) {
    const d = levenshtein(trimmed, known);
    if (d < bestDist && d <= threshold && d < trimmed.length * 0.4) {
      bestDist = d;
      best     = known;
    }
  }

  return {
    corrected:  best,
    wasChanged: best !== trimmed,
    distance:   bestDist === Infinity ? -1 : bestDist,
  };
}

// ── Regex Patterns ───────────────────────────────────────────────────────────
// Nhận diện chuỗi đơn vị lẫn kích thước như: "md. 0.2 2.7 m2", "m2  1.2x2.4"
const MIXED_UNIT_REGEX = /^(md|m2|m²|m3|cai|cái|hệ|he|bộ|bo|lô|lo|kg|lit|set)\.?\s*([\d.,x×*\s]+)?\s*(md|m2|m²|m3|cai|cái)?/i;

// Tách kích thước số học: "1.2x2.4", "0.2 × 2.7", "1200*2400"
const DIMENSION_REGEX = /(\d+[.,]?\d*)\s*[x×*]\s*(\d+[.,]?\d*)(?:\s*[x×*]\s*(\d+[.,]?\d*))?/i;

// Số duy nhất (chỉ là chiều dài hoặc md)
const SINGLE_NUMBER_REGEX = /^(\d+[.,]?\d*)$/;

// Chuẩn hóa đơn vị về mã chuẩn
const UNIT_NORMALIZE_MAP: Record<string, UnitCode> = {
  'md': 'md', 'mét dài': 'md', 'met dai': 'md',
  'm2': 'm2', 'm²': 'm2', 'mét vuông': 'm2', 'met vuong': 'm2',
  'm3': 'm3', 'mét khối': 'm3',
  'cai': 'cai', 'cái': 'cai', 'chiếc': 'cai', 'chiec': 'cai',
  'he': 'he', 'hệ': 'he',
  'bo': 'bo', 'bộ': 'bo',
  'lo': 'lo', 'lô': 'lo',
  'kg': 'kg',
  'lit': 'lit', 'lít': 'lit',
  'set': 'set',
};

export function normalizeUnit(raw: string): UnitCode {
  const key = raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  return UNIT_NORMALIZE_MAP[key] ?? UNIT_NORMALIZE_MAP[raw.trim().toLowerCase()] ?? 'cai';
}

// ── Parser kích thước ────────────────────────────────────────────────────────
export function parseDimensions(rawUnit: string, rawName: string): {
  unit: UnitCode;
  dimensions: Dimensions;
} {
  let unitStr  = rawUnit.trim();
  let dimStr   = '';
  let unit: UnitCode = 'cai';
  const dim: Dimensions = { raw: rawUnit };

  // Kiểm tra chuỗi lẫn đơn vị + kích thước
  const mixedMatch = unitStr.match(MIXED_UNIT_REGEX);
  if (mixedMatch) {
    unit   = normalizeUnit(mixedMatch[1]);
    dimStr = mixedMatch[2]?.trim() ?? '';
  } else {
    unit = normalizeUnit(unitStr);
  }

  // Thử tìm kích thước trong tên nếu không tìm được trong cột đơn vị
  if (!dimStr) {
    const nameMatch = rawName.match(DIMENSION_REGEX);
    if (nameMatch) dimStr = nameMatch[0];
  }

  // Parse kích thước 2D hoặc 3D
  const dimMatch = dimStr.match(DIMENSION_REGEX);
  if (dimMatch) {
    dim.length = parseFloat(dimMatch[1].replace(',', '.'));
    dim.width  = parseFloat(dimMatch[2].replace(',', '.'));
    if (dimMatch[3]) dim.height = parseFloat(dimMatch[3].replace(',', '.'));
  } else {
    const single = dimStr.match(SINGLE_NUMBER_REGEX);
    if (single) dim.length = parseFloat(single[1].replace(',', '.'));
  }

  return { unit, dimensions: dim };
}

// ── Parser số lượng ──────────────────────────────────────────────────────────
export function parseQty(raw: string): number {
  if (!raw || raw.trim() === '') return 0;
  // Xử lý dấu phẩy thập phân kiểu Việt: "1,5" → "1.5"
  const cleaned = raw.trim().replace(/[^\d.,]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// ── Parser đơn giá ───────────────────────────────────────────────────────────
export function parsePrice(raw: string): number {
  if (!raw || raw.trim() === '') return 0;
  // Bỏ dấu phân cách ngàn: "1.500.000" → 1500000, "1,500,000" → 1500000
  const cleaned = raw.trim().replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// ── Nhận diện dòng Zone Header ───────────────────────────────────────────────
// Dấu hiệu: không có STT số, toàn bộ tên chữ hoa hoặc khớp pattern phân khu
const ZONE_HEADER_PATTERNS = [
  /^[A-ZÀÁẢÃẠĂẮẶẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỆỂỄÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ\s\d\-\.]+$/u,
  /^(PHÒNG|PHONG|KHU|KHO|VỆ SINH|BEP|BẾP|NGỦ|KHÁCH|PHU|PHỤ|HÀNH|LANG|SAN THƯỢNG|MÁI)/iu,
  /^[A-Z]\.\s+/,   // Dạng "A. Phòng khách"
];

export function isZoneHeaderLine(line: RawInputLine): boolean {
  if (line.isZoneHeader === true) return true;
  const sttClean = line.rawStt.trim();
  const hasNumericStt = /^\d+$/.test(sttClean);
  if (hasNumericStt) return false; // Có STT số → là item

  const nameUp = line.rawName.trim().toUpperCase();
  if (nameUp.length === 0) return false;

  return ZONE_HEADER_PATTERNS.some(p => p.test(line.rawName.trim()))
    || (sttClean === '' && line.rawQty.trim() === '' && line.rawPrice.trim() === '');
}

// ════════════════════════════════════════════════════════════════════════════════
// CORE FUNCTION: Làm sạch toàn bộ dữ liệu (Bước 1)
// ════════════════════════════════════════════════════════════════════════════════
export function cleanLines(rawLines: RawInputLine[]): CleanedLine[] {
  const result: CleanedLine[] = [];
  let systemIndex = 1;

  for (const raw of rawLines) {
    const isHeader = isZoneHeaderLine(raw);

    if (isHeader) {
      // Zone header — đưa vào với qty=0, unit='cai', giữ tên gốc
      result.push({
        rowIndex:        raw.rowIndex,
        systemIndex:     systemIndex++,
        name:            raw.rawName.trim(),
        nameOriginal:    raw.rawName.trim(),
        wasAutoCorrected:false,
        unit:            'cai',
        dimensions:      { raw: '' },
        qty:             0,
        unitPrice:       0,
        total:           0,
        note:            raw.rawNote.trim(),
        material:        raw.rawMaterial.trim(),
        isZoneHeader:    true,
        rawStt:          raw.rawStt,
      });
      continue;
    }

    // ── Autocorrect tên ────────────────────────────────────────────────────
    const { corrected, wasChanged } = autocorrectName(raw.rawName);

    // ── Parse đơn vị + kích thước ──────────────────────────────────────────
    const { unit, dimensions } = parseDimensions(raw.rawUnit, raw.rawName);

    // ── Parse số lượng & đơn giá ───────────────────────────────────────────
    const qty      = parseQty(raw.rawQty);
    const price    = parsePrice(raw.rawPrice);
    const total    = Math.round(qty * price * 100) / 100;

    result.push({
      rowIndex:        raw.rowIndex,
      systemIndex:     systemIndex++,
      name:            corrected,
      nameOriginal:    raw.rawName.trim(),
      wasAutoCorrected:wasChanged,
      unit,
      dimensions,
      qty,
      unitPrice:       price,
      total,
      note:            raw.rawNote.trim(),
      material:        raw.rawMaterial.trim(),
      isZoneHeader:    false,
      rawStt:          raw.rawStt,
    });
  }

  return result;
}

// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION HOOK — BƯỚC 1
// Điều kiện: Tất cả item (non-header) phải có qty > 0
// ════════════════════════════════════════════════════════════════════════════════
export function validateStep1(lines: CleanedLine[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  let zeroQtyCount   = 0;
  let correctedCount = 0;

  for (const line of lines) {
    if (line.isZoneHeader) continue;

    // Lỗi nghiêm trọng: qty = 0 hoặc null
    if (!line.qty || line.qty <= 0) {
      zeroQtyCount++;
      errors.push({
        rowIndex: line.rowIndex,
        field:    'qty',
        message:  `Dòng ${line.rowIndex} — "${line.name}": Định lượng bằng 0 hoặc trống. Yêu cầu rà soát nguồn.`,
        value:    line.qty,
      });
    }

    // Cảnh báo: tên bị autocorrect
    if (line.wasAutoCorrected) {
      correctedCount++;
      warnings.push(
        `Dòng ${line.rowIndex}: "${line.nameOriginal}" → tự động sửa thành "${line.name}"`
      );
    }

    // Cảnh báo: không parse được đơn vị (fallback về 'cai')
    if (line.unit === 'cai' && line.dimensions.raw && !line.dimensions.raw.match(/cai|cái|chiếc/i)) {
      if (line.dimensions.length === undefined && line.dimensions.width === undefined) {
        warnings.push(`Dòng ${line.rowIndex} — "${line.name}": Không tách được kích thước từ "${line.dimensions.raw}"`);
      }
    }
  }

  const items      = lines.filter(l => !l.isZoneHeader);
  const zoneHeaders = lines.filter(l => l.isZoneHeader);

  return {
    step:    1,
    passed:  errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRows:       lines.length,
      itemRows:        items.length,
      zoneHeaders:     zoneHeaders.length,
      zeroQtyCount,
      correctedNames:  correctedCount,
      uniqueUnits:     [...new Set(items.map(l => l.unit))].join(', '),
    },
  };
}
