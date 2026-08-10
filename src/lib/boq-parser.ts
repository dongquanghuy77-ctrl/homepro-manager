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
  const n = note.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('cdt cap') || n.includes('khong thuc hien') || n.includes('do cdt')) {
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
    const total     = (raw.qty ?? 0) * (raw.unitPrice ?? 0);

    result.push({
      stt:                  raw.stt,
      zoneId:               currentZoneId,
      zoneName:             currentZoneName,
      productNameRaw:       raw.productName,
      productNameCorrected: corrected,
      unit:                 raw.unit?.trim() ?? '',
      qty:                  raw.qty   ?? 0,
      unitPrice:            raw.unitPrice ?? 0,
      total,
      supplyType:           classifySupplyType(raw.note ?? ''),
      note:                 raw.note ?? '',
    });
  }

  return result;
}

// \u2500\u2500 Validation Hook (UNIT TEST B\u01af\u1edaC 1) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const VALID_UNITS = ['m2', 'm\u00b2', 'md', 'm\u00e9t d\u00e0i', 'c\u00e1i', 'h\u1ec7', 'b\u1ed9', 'l\u00f4', 'kg', 'l\u00edt'];

export function validateBOQ(lines: BOQLine[]): ValidationResult {
  const errors: string[]   = [];
  const warnings: string[] = [];
  let correctedNames = 0;

  // Ki\u1ec3m tra thi\u1ebfu \u0111\u01a1n v\u1ecb t\u00ednh
  for (const line of lines) {
    if (!line.unit || line.unit === '') {
      errors.push(`STT ${line.stt} [${line.zoneId}] thi\u1ebfu \u0111\u01a1n v\u1ecb t\u00ednh`);
    } else {
      const unitLower = line.unit.toLowerCase();
      if (!VALID_UNITS.some(u => unitLower.includes(u.toLowerCase()))) {
        warnings.push(`STT ${line.stt}: \u0111\u01a1n v\u1ecb "${line.unit}" kh\u00f4ng n\u1eb1m trong danh s\u00e1ch chu\u1ea9n`);
      }
    }

    if (line.productNameCorrected !== line.productNameRaw) {
      correctedNames++;
      warnings.push(`STT ${line.stt}: \u201c${line.productNameRaw}\u201d \u2192 \u201c${line.productNameCorrected}\u201d (t\u1ef1 \u0111\u1ed9ng s\u1eeda ch\u1eefa)`);
    }
  }

  // Ki\u1ec3m tra tr\u00f9ng STT trong c\u00f9ng Zone
  const zoneGroups = new Map<string, number[]>();
  for (const line of lines) {
    if (!zoneGroups.has(line.zoneId)) zoneGroups.set(line.zoneId, []);
    zoneGroups.get(line.zoneId)!.push(line.stt);
  }
  for (const [zone, stts] of zoneGroups) {
    const dupes = stts.filter((s, i) => stts.indexOf(s) !== i);
    for (const d of [...new Set(dupes)]) {
      errors.push(`Zone ${zone}: STT ${d} b\u1ecb tr\u00f9ng l\u1eb7p`);
    }
  }

  return {
    valid: errors.length === 0,
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
