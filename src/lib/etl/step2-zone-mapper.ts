// src/lib/etl/step2-zone-mapper.ts
// ═══════════════════════════════════════════════════════════════════════════════
// BƯỚC 2: Zone Mapping Engine — Phân nhóm phân khu + Index Repair
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  CleanedLine, ZonedLine, Zone, ValidationResult, ValidationError,
} from './types';

// ── Từ điển mã phân khu ──────────────────────────────────────────────────────
// Pattern nhận diện tên phân khu → sinh zone_id code
const ZONE_CODE_MAP: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /phòng khách.*(bếp|ăn)|pkb/i,       code: 'PKB' },   // Phòng khách + bếp
  { pattern: /phòng khách|living/i,                code: 'PKH' },
  { pattern: /phòng bếp|bếp/i,                     code: 'BEP' },
  { pattern: /phòng ngủ.*master|ngủ.*chính|pnm/i, code: 'PNM' },   // Phòng ngủ master
  { pattern: /phòng ngủ.*1|ngủ.*01|pn01/i,         code: 'PN1' },
  { pattern: /phòng ngủ.*2|ngủ.*02|pn02/i,         code: 'PN2' },
  { pattern: /phòng ngủ.*3|ngủ.*03|pn03/i,         code: 'PN3' },
  { pattern: /phòng ngủ.*4|ngủ.*04|pn04/i,         code: 'PN4' },
  { pattern: /phòng ngủ|bedroom/i,                  code: 'PNG' },
  { pattern: /vệ sinh.*1|wc.*01|toilet.*1/i,        code: 'VS1' },
  { pattern: /vệ sinh.*2|wc.*02|toilet.*2/i,        code: 'VS2' },
  { pattern: /vệ sinh|toilet|wc|bathroom/i,          code: 'VSN' },
  { pattern: /phòng làm việc|làm việc|office/i,      code: 'PLV' },
  { pattern: /hành lang|hanlang|corridor/i,           code: 'HAL' },
  { pattern: /sảnh|lobby|lối vào/i,                  code: 'SAH' },
  { pattern: /balcon|ban công|sân thượng/i,           code: 'BCN' },
  { pattern: /kho|khoảng thông|storage/i,             code: 'KHO' },
  { pattern: /phòng trẻ em|trẻ em|child/i,            code: 'PTE' },
  { pattern: /phòng họp|meeting/i,                    code: 'PHO' },
  { pattern: /tổng thể|chung|general/i,               code: 'GEN' },
];

// Sinh zone_id từ tên phân khu
function generateZoneId(zoneName: string, index: number): string {
  const normalized = zoneName.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

  for (const { pattern, code } of ZONE_CODE_MAP) {
    if (pattern.test(normalized) || pattern.test(zoneName)) {
      const seq = String(index).padStart(2, '0');
      return `ZN-${code}-${seq}`;
    }
  }

  // Fallback: lấy 3 ký tự đầu viết hoa
  const fallbackCode = zoneName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3) || 'ZZZ';
  return `ZN-${fallbackCode}-${String(index).padStart(2, '0')}`;
}

// ── Detect STT duplicates ────────────────────────────────────────────────────
function detectDuplicateStt(lines: CleanedLine[]): Map<string, number[]> {
  const sttGroups = new Map<string, number[]>();
  for (const line of lines) {
    if (line.isZoneHeader || !line.rawStt.trim()) continue;
    const stt = line.rawStt.trim();
    const group = sttGroups.get(stt) ?? [];
    group.push(line.rowIndex);
    sttGroups.set(stt, group);
  }
  // Chỉ trả về những STT bị trùng
  const duplicates = new Map<string, number[]>();
  for (const [stt, rows] of sttGroups.entries()) {
    if (rows.length > 1) duplicates.set(stt, rows);
  }
  return duplicates;
}

// ════════════════════════════════════════════════════════════════════════════════
// CORE FUNCTION: Zone Mapping (Bước 2)
// ════════════════════════════════════════════════════════════════════════════════
export function mapZones(cleanedLines: CleanedLine[]): {
  zonedLines:      ZonedLine[];
  zones:           Zone[];
  duplicateSttMap: Map<string, number[]>;
  indexRepairCount: number;
} {
  const zonedLines: ZonedLine[] = [];
  const zones: Zone[] = [];

  let currentZoneId   = 'ZN-GEN-00';
  let currentZoneName = 'Tổng thể (chưa phân khu)';
  let zoneCounter     = 0;
  let indexRepairCount = 0;

  // ── Phát hiện STT trùng trước ────────────────────────────────────────────
  const duplicateSttMap = detectDuplicateStt(cleanedLines);
  if (duplicateSttMap.size > 0) {
    indexRepairCount = [...duplicateSttMap.values()].reduce((s, rows) => s + rows.length - 1, 0);
  }

  // ── Thêm default zone nếu file không bắt đầu bằng zone header ────────────
  zones.push({ zoneId: currentZoneId, zoneName: currentZoneName, zoneIndex: zoneCounter });

  for (const line of cleanedLines) {
    if (line.isZoneHeader) {
      // Tạo zone mới
      zoneCounter++;
      currentZoneId   = generateZoneId(line.name, zoneCounter);
      currentZoneName = line.name;

      // Tránh zone_id trùng
      const existingIds = zones.map(z => z.zoneId);
      if (existingIds.includes(currentZoneId)) {
        currentZoneId = `${currentZoneId}-${zoneCounter}`;
      }

      zones.push({
        zoneId:    currentZoneId,
        zoneName:  currentZoneName,
        zoneIndex: zoneCounter,
      });

      // Zone header không thêm vào zonedLines (chỉ dùng để tạo zone)
      continue;
    }

    zonedLines.push({
      ...line,
      zoneId:   currentZoneId,
      zoneName: currentZoneName,
    });
  }

  // Xóa default zone nếu không có item nào
  const usedZoneIds = new Set(zonedLines.map(l => l.zoneId));
  const filteredZones = zones.filter(z => usedZoneIds.has(z.zoneId));

  return {
    zonedLines,
    zones:           filteredZones,
    duplicateSttMap,
    indexRepairCount,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION HOOK — BƯỚC 2
// Điều kiện: 100% item phải có zone_id, không được có "orphan item"
// ════════════════════════════════════════════════════════════════════════════════
export function validateStep2(
  zonedLines:      ZonedLine[],
  zones:           Zone[],
  duplicateSttMap: Map<string, number[]>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Kiểm tra item mồ côi (không có zoneId)
  const orphans = zonedLines.filter(l => !l.zoneId || l.zoneId === '');
  for (const orphan of orphans) {
    errors.push({
      rowIndex: orphan.rowIndex,
      field:    'zoneId',
      message:  `Dòng ${orphan.rowIndex} — "${orphan.name}": ORPHAN ITEM — không được gán phân khu. BẮT BUỘC xử lý trước khi tiếp tục.`,
      value:    orphan.zoneId,
    });
  }

  // Cảnh báo STT trùng (đã được index repair)
  for (const [stt, rows] of duplicateSttMap.entries()) {
    warnings.push(
      `⚠ STT "${stt}" bị trùng tại ${rows.length} dòng (rowIndex: ${rows.join(', ')}) → systemIndex đã được tự động tính lại`
    );
  }

  // Cảnh báo zone không có item
  const usedZoneIds = new Set(zonedLines.map(l => l.zoneId));
  for (const zone of zones) {
    if (!usedZoneIds.has(zone.zoneId)) {
      warnings.push(`Zone "${zone.zoneName}" (${zone.zoneId}) không có item nào`);
    }
  }

  // Thống kê
  const zoneStats: Record<string, number> = {};
  for (const z of zones) {
    zoneStats[z.zoneId] = zonedLines.filter(l => l.zoneId === z.zoneId).length;
  }

  return {
    step:    2,
    passed:  errors.length === 0,
    errors,
    warnings,
    stats: {
      totalZones:          zones.length,
      totalItems:          zonedLines.length,
      orphanItems:         orphans.length,
      duplicateSttGroups:  duplicateSttMap.size,
      indexRepairs:        [...duplicateSttMap.values()].reduce((s, r) => s + r.length - 1, 0),
      zoneBreakdown:       JSON.stringify(zoneStats),
    },
  };
}
