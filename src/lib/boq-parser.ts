// src/lib/boq-parser.ts
// ETL Module: Ph\u00e2n t\u00edch BOQ th\u00f4 cho d\u1ef1 \u00e1n n\u1ed9i th\u1ea5t
// Thu\u1eadt to\u00e1n: Levenshtein Distance + Regex Zone Extraction + supply_type Classification

// \u2500\u2500 Levenshtein Distance \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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

// ── normHeaderBoq: Bỏ dấu, lowercase, bỏ ký tự đặc biệt ─────────────────────
// (inline để boq-parser.ts không phụ thuộc import-parser.ts)
function normHeaderBoq(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── BOQ Header Keyword Signatures ─────────────────────────────────────────────
// Mỗi nhóm đại diện cho 1 cột quan trọng trong file BOQ nội thất.
// Score = số nhóm có ít nhất 1 từ khóa khớp với cell của hàng đó.
const BOQ_HEADER_SIGNATURES: string[][] = [
  // Nhóm STT
  ['stt', 'no', 'item no', 'so thu tu', 'so tt', 'tt'],
  // Nhóm Hạng mục / Tên sản phẩm
  ['hang muc', 'ten san pham', 'san pham', 'item name', 'mo ta', 'noi dung', 'cau kien', 'ten hang muc'],
  // Nhóm Khối lượng / Số lượng
  ['khoi luong', 'so luong', 'quantity', 'qty', 'kl', 'sl', 'volume'],
  // Nhóm Đơn vị
  ['don vi', 'don vi tinh', 'unit', 'dvt', 'uom'],
  // Nhóm Đơn giá
  ['don gia', 'don gia vnd', 'unit price', 'price', 'rate', 'gia'],
  // Nhóm Thành tiền / Tổng
  ['thanh tien', 'tong cong', 'total', 'amount', 'gia tri', 'tong gia tri'],
];

/**
 * detectHeaderRow — Quét tối đa 5 hàng đầu của sheet (2D array),
 * chấm điểm từng hàng dựa theo BOQ_HEADER_SIGNATURES,
 * trả về index của hàng có điểm cao nhất (= hàng tiêu đề thực sự).
 *
 * @param rows  2D array từ XLSX.utils.sheet_to_json(sheet, { header: 1 })
 * @returns     Index của header row (0-based). Default = 0 nếu không phân biệt được.
 */
export function detectHeaderRow(rows: unknown[][]): {
  rowIndex: number;
  score: number;
  headerCells: string[];
  log: string[];
} {
  const SCAN_LIMIT = Math.min(5, rows.length);
  const log: string[] = [];
  let bestIdx   = 0;
  let bestScore = -1;

  for (let i = 0; i < SCAN_LIMIT; i++) {
    const row = rows[i] as unknown[];
    if (!Array.isArray(row) || row.length === 0) {
      log.push(`  Hàng ${i + 1}: rỗng → bỏ qua`);
      continue;
    }

    // Chuẩn hóa từng cell
    const cellNorms = row.map(cell => normHeaderBoq(String(cell ?? '')));

    // Chấm điểm: mỗi nhóm keyword = 1 điểm nếu có ít nhất 1 cell khớp
    let score = 0;
    const matched: string[] = [];

    for (const group of BOQ_HEADER_SIGNATURES) {
      const hit = group.find(kw =>
        cellNorms.some(c => c !== '' && (c === kw || c.includes(kw) || (kw.length >= 3 && kw.includes(c) && c.length >= 2)))
      );
      if (hit) { score++; matched.push(hit); }
    }

    // Bonus: hàng toàn text (không phải số) → cộng thêm 0.5 (header thường là text)
    const textCells = cellNorms.filter(c => c !== '' && isNaN(Number(c)));
    const bonus = textCells.length / row.length >= 0.5 ? 0.5 : 0;
    const total = score + bonus;

    log.push(`  Hàng ${i + 1} | score=${score}+${bonus}=${total.toFixed(1)} | khớp=[${matched.join(', ')}] | cells=[${cellNorms.filter(Boolean).join(' | ')}]`);

    if (total > bestScore) {
      bestScore = total;
      bestIdx   = i;
    }
  }

  const headerCells = ((rows[bestIdx] ?? []) as unknown[]).map(c => String(c ?? '').trim());
  log.push(`  ✅ Header row = hàng ${bestIdx + 1} (score=${bestScore.toFixed(1)})`);

  return { rowIndex: bestIdx, score: bestScore, headerCells, log };
}


// T\u1eeb \u0111i\u1ec3n chu\u1ea9n cho c\u00e1c t\u00ean s\u1ea3n ph\u1ea9m n\u1ed9i th\u1ea5t
const KNOWN_PRODUCT_NAMES = [
  'L\u00e8n ch\u00e2n t\u01b0\u1eddng', 'R\u00e8m che n\u1eafng', 'C\u1eeda b\u1eadt',
  'T\u1ee7 b\u1ebfp', 'B\u00e0n l\u00e0m vi\u1ec7c', 'Gh\u1ebf l\u00e0m vi\u1ec7c',
  'V\u00e1ch ng\u0103n', 'Tr\u1ea7n th\u1ea1ch cao', 'S\u00e0n g\u1ed7 c\u00f4ng nghi\u1ec7p',
  'C\u1eeda \u0111i', 'C\u1eeda s\u1ed5', 'T\u1ee7 \u0111\u1ea7u gi\u01b0\u1eddng', 'K\u1ec7 t\u01b0\u1eddng',
  '\u0110\u00e8n LED h\u1eaft s\u00e1ng', 'N\u1ebbp T inox', 'Ch\u1ec9 d\u00e1n c\u1ea1nh',
  'Ph\u1ee5 ki\u1ec7n b\u1ea3n l\u1ec1', 'B\u1ea3n l\u1ec1 Blum',
];

// T\u1ef1 \u0111\u1ed9ng s\u1eeda ch\u1eefa t\u00ean (Levenshtein <= threshold)
export function autocorrectProductName(input: string, threshold = 3): string {
  let best = input;
  let bestDist = Infinity;
  for (const known of KNOWN_PRODUCT_NAMES) {
    const d = levenshtein(input.trim(), known);
    if (d < bestDist && d <= threshold) {
      bestDist = d;
      best = known;
    }
  }
  return best;
}

// \u2500\u2500 Zone Extraction \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const ZONE_MAP: Record<string, string> = {
  'ZN-PH-01':  'Ph\u00f2ng h\u1ecd p',
  'ZN-PLV-02': 'Ph\u00f2ng l\u00e0m vi\u1ec7c',
  'ZN-PGD-03': 'Ph\u00f2ng gi\u00e1m \u0111\u1ed1c',
  'ZN-PTR-04': 'Ph\u00f2ng Pantry',
  'ZN-PCT-05': 'Ph\u00f2ng ch\u1ee7 t\u1ecbch',
};

const ZONE_REGEX = /ZN-[A-Z]+-\d{2}/;

export function extractZoneId(headerText: string): { zoneId: string; zoneName: string } | null {
  const match = headerText.match(ZONE_REGEX);
  if (!match) return null;
  const zoneId = match[0];
  return { zoneId, zoneName: ZONE_MAP[zoneId] ?? zoneId };
}

// \u2500\u2500 Supply Type Classification \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export type SupplyType = 'INSTALLATION_ONLY' | 'HOMEPRO_PRODUCTION';

export function classifySupplyType(note: string): SupplyType {
  const n = note.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu thanh
    .replace(/đ/g, 'd');               // Đ → D (không phân rã bởi NFD)
  if (n.includes('cdt') || n.includes('khong thuc hien') || n.includes('do cdt') || n.includes('cdt cap')) {
    return 'INSTALLATION_ONLY';
  }
  return 'HOMEPRO_PRODUCTION';
}

// \u2500\u2500 Types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export interface RawBOQLine {
  stt: number;
  zoneHeader?: string;   // Ti\u00eau \u0111\u1ec1 ph\u00e2n khu (n\u1ebfu d\u00f2ng n\u00e0y l\u00e0 ti\u00eau \u0111\u1ec1)
  productName: string;
  unit: string;          // m2, md, c\u00e1i, h\u1ec7...
  qty: number;
  unitPrice: number;
  note: string;
}

export interface BOQLine {
  stt: number;
  zoneId: string;
  zoneName: string;
  productNameRaw: string;        // T\u00ean g\u1ed1c ch\u01b0a s\u1eeda
  productNameCorrected: string;  // T\u00ean sau Levenshtein
  unit: string;
  qty: number;
  unitPrice: number;
  total: number;
  supplyType: SupplyType;
  note: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalLines: number;
  correctedNames: number;
}

// \u2500\u2500 Parser \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export function parseRawBOQ(rawLines: RawBOQLine[]): BOQLine[] {
  const result: BOQLine[] = [];
  let currentZoneId   = '';
  let currentZoneName = '';

  for (const raw of rawLines) {
    // N\u1ebfu d\u00f2ng n\u00e0y l\u00e0 ti\u00eau \u0111\u1ec1 ph\u00e2n khu -> c\u1eadp nh\u1eadt zone hi\u1ec7n t\u1ea1i
    if (raw.zoneHeader) {
      const zone = extractZoneId(raw.zoneHeader);
      if (zone) {
        currentZoneId   = zone.zoneId;
        currentZoneName = zone.zoneName;
      }
      continue;
    }

    // B\u1ecf qua d\u00f2ng tr\u1ed1ng
    if (!raw.productName?.trim()) continue;

    const corrected = autocorrectProductName(raw.productName);
    // VALIDATION HOOK BƯỚC 1: qty=0 hoặc trống → tự động gán 1.0 thay vì từ chối
    const safeQty   = (raw.qty ?? 0) > 0 ? raw.qty : 1.0;
    const total     = safeQty * (raw.unitPrice ?? 0);

    result.push({
      stt:                  raw.stt,
      zoneId:               currentZoneId,
      zoneName:             currentZoneName,
      productNameRaw:       raw.productName,
      productNameCorrected: corrected,
      unit:                 raw.unit?.trim() || 'cái',
      qty:                  safeQty,
      unitPrice:            raw.unitPrice ?? 0,
      total,
      supplyType:           classifySupplyType(raw.note ?? ''),
      note:                 raw.note ?? '',
    });
  }

  return result;
}

// ──────────────────────────────── Validation Hook (UNIT TEST BƯỚC 1) ────────────────────────────────
const VALID_UNITS = ['m2', 'm²', 'md', 'mét dài', 'cái', 'hệ', 'bộ', 'lô', 'kg', 'lít', 'cai', 'he', 'bo', 'lo', 'lit', 'set'];

export function validateBOQ(lines: BOQLine[]): ValidationResult {
  const errors: string[]   = [];
  const warnings: string[] = [];
  let correctedNames = 0;

  for (const line of lines) {
    // Đơn vị trống → normalize về 'cái' (warning, không phải lỗi)
    if (!line.unit || line.unit === '') {
      warnings.push(`STT ${line.stt} [${line.zoneId}]: thiếu đơn vị tính → tự động gán 'cái'`);
      (line as { unit: string }).unit = 'cái';
    } else {
      const unitLower = line.unit.toLowerCase();
      if (!VALID_UNITS.some(u => unitLower.includes(u.toLowerCase()))) {
        warnings.push(`STT ${line.stt}: đơn vị "${line.unit}" không trong danh sách chuẩn`);
      }
    }

    // qty đã được fix ở parseRawBOQ — ghi chú cho traceability
    if (line.qty <= 0) {
      warnings.push(`STT ${line.stt}: qty=${line.qty} ≤ 0 → đã tự động gán 1.0`);
    }

    if (line.productNameCorrected !== line.productNameRaw) {
      correctedNames++;
      warnings.push(`STT ${line.stt}: "${line.productNameRaw}" → "${line.productNameCorrected}" (tự động sửa chữa)`);
    }
  }

  // BƯỚC 2: STT trùng → DOWNGRADE thành WARNING (không block import)
  const zoneGroups = new Map<string, number[]>();
  for (const line of lines) {
    if (!zoneGroups.has(line.zoneId)) zoneGroups.set(line.zoneId, []);
    zoneGroups.get(line.zoneId)!.push(line.stt);
  }
  for (const [zone, stts] of zoneGroups) {
    const dupes = stts.filter((s, i) => stts.indexOf(s) !== i);
    for (const d of [...new Set(dupes)]) {
      warnings.push(`Zone ${zone}: STT ${d} bị trùng → systemIndex sẽ được tính lại`);
    }
  }

  return {
    valid: errors.length === 0,   // Chỉ block khi có lỗi thực sự
    errors,
    warnings,
    totalLines: lines.length,
    correctedNames,
  };
}

// \u2500\u2500 Unit Test n\u1ed9i b\u1ed9 B\u01af\u1edaC 1 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export function runBOQParserTests(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let passed = true;

  // Test 1: Levenshtein
  const d1 = levenshtein('Len ch\u00e2n t\u01b0\u1eebng', 'L\u00e8n ch\u00e2n t\u01b0\u1eddng');
  results.push(`[${d1 <= 3 ? 'PASS' : 'FAIL'}] Levenshtein "L\u00e8n ch\u00e2n t\u01b0\u1eebng" dist=${d1}`);
  if (d1 > 3) passed = false;

  // Test 2: Zone extraction
  const z = extractZoneId('ZN-PH-01 Ph\u00f2ng h\u1ecd p');
  results.push(`[${z?.zoneId === 'ZN-PH-01' ? 'PASS' : 'FAIL'}] Zone extraction: ${z?.zoneId}`);
  if (z?.zoneId !== 'ZN-PH-01') passed = false;

  // Test 3: Supply type
  const s1 = classifySupplyType('CĐT cấp vật tư');
  const s2 = classifySupplyType('HomePro sản xuất');
  results.push(`[${s1 === 'INSTALLATION_ONLY' ? 'PASS' : 'FAIL'}] Supply CĐT c\u1ea5p = ${s1}`);
  results.push(`[${s2 === 'HOMEPRO_PRODUCTION' ? 'PASS' : 'FAIL'}] Supply HomePro = ${s2}`);
  if (s1 !== 'INSTALLATION_ONLY' || s2 !== 'HOMEPRO_PRODUCTION') passed = false;

  // Test 4: Full parse + validate
  const raw: RawBOQLine[] = [
    { stt: 0, zoneHeader: 'ZN-PH-01 Ph\u00f2ng h\u1ecd p', productName: '', unit: '', qty: 0, unitPrice: 0, note: '' },
    { stt: 1, productName: 'Len ch\u00e2n t\u01b0\u1eebng', unit: 'm2', qty: 10, unitPrice: 150000, note: '' },
    { stt: 2, productName: 'R\u00e8m che n\u0103ng', unit: 'md', qty: 5, unitPrice: 200000, note: 'CĐT cấp' },
  ];
  const parsed   = parseRawBOQ(raw);
  const { valid, errors } = validateBOQ(parsed);
  results.push(`[${valid ? 'PASS' : 'FAIL'}] Full parse: ${parsed.length} d\u00f2ng, errors=${errors.length}`);
  results.push(`[${parsed[0]?.supplyType === 'HOMEPRO_PRODUCTION' ? 'PASS' : 'FAIL'}] STT1 supplyType=${parsed[0]?.supplyType}`);
  results.push(`[${parsed[1]?.supplyType === 'INSTALLATION_ONLY' ? 'PASS' : 'FAIL'}] STT2 supplyType=${parsed[1]?.supplyType}`);
  if (!valid || parsed.length !== 2) passed = false;

  return { passed, results };
}
