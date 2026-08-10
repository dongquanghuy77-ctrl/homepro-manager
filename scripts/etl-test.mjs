// scripts/etl-test.mjs
// ═══════════════════════════════════════════════════════════════════════════════
// Unit Test thực tế — ETL Pipeline 4 bước với dữ liệu mô phỏng dự án Bảo Minh
// Chạy: node scripts/etl-test.mjs
// ═══════════════════════════════════════════════════════════════════════════════

// Load pipeline (compiled as ESM via tsx or directly in Node if TS available)
// Run with: npx tsx scripts/etl-test.mjs

import { levenshtein, autocorrectName, parseDimensions, parseQty, cleanLines, validateStep1 } from '../src/lib/etl/step1-cleaner.ts';
import { mapZones, validateStep2 } from '../src/lib/etl/step2-zone-mapper.ts';
import { routeSupplyChain, validateStep3, runStep3SimulationTest } from '../src/lib/etl/step3-supply-router.ts';
import { buildOutput, validateStep4 } from '../src/lib/etl/step4-schema-output.ts';

// ── ANSI colors ──────────────────────────────────────────────────────────────
const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m' };
const pass  = (s) => `${C.green}✅ ${s}${C.reset}`;
const fail  = (s) => `${C.red}❌ ${s}${C.reset}`;
const warn  = (s) => `${C.yellow}⚠  ${s}${C.reset}`;
const hdr   = (s) => `\n${C.bold}${C.cyan}${'═'.repeat(60)}\n${s}\n${'═'.repeat(60)}${C.reset}`;
const sub   = (s) => `${C.blue}── ${s} ──${C.reset}`;

let totalTests = 0, totalPass = 0;

function assert(condition, name, detail = '') {
  totalTests++;
  if (condition) {
    totalPass++;
    console.log(pass(`${name} ${detail ? `(${detail})` : ''}`));
  } else {
    console.log(fail(`${name} ${detail ? `→ ${detail}` : ''}`));
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// DỮ LIỆU TEST — Mô phỏng BOQ thô dự án Văn phòng Bảo Minh
// ════════════════════════════════════════════════════════════════════════════════
const rawTestData = [
  // === PHÂN KHU 1: Phòng họp ===
  {
    rowIndex: 1, rawStt: '', rawName: 'PHÒNG HỌP', rawUnit: '', rawQty: '', rawPrice: '', rawNote: '', rawMaterial: '', isZoneHeader: true,
  },
  {
    rowIndex: 2, rawStt: '1', rawName: 'Vách ngăn kính', rawUnit: 'm2', rawQty: '12.5', rawPrice: '850000', rawNote: '', rawMaterial: 'Kính cường lực 10mm',
  },
  {
    rowIndex: 3, rawStt: '2', rawName: 'Cira bật', rawUnit: 'cái', rawQty: '3', rawPrice: '1200000', rawNote: '', rawMaterial: 'MDF phủ Melamine',
  }, // Levenshtein: "Cira bật" → "Cửa bật"
  {
    rowIndex: 4, rawStt: '3', rawName: 'Giương thay giày', rawUnit: 'cái', rawQty: '1', rawPrice: '2500000', rawNote: '', rawMaterial: '',
  }, // Levenshtein: "Giương" → "Gương"
  {
    rowIndex: 5, rawStt: '4', rawName: 'Quạt trần Panasonic', rawUnit: 'cái', rawQty: '2', rawPrice: '3500000', rawNote: 'Mua ngoài thương mại', rawMaterial: '',
  },
  {
    rowIndex: 6, rawStt: '5', rawName: 'Tủ bếp trên MFC', rawUnit: 'md. 0.4 2.7 m2', rawQty: '6.5', rawPrice: '2800000', rawNote: '', rawMaterial: 'MFC Melamine trắng',
  }, // Mixed unit
  {
    rowIndex: 7, rawStt: '5', rawName: 'Lèn chân tường', rawUnit: 'md', rawQty: '28.5', rawPrice: '120000', rawNote: '', rawMaterial: '',
  }, // STT trùng với dòng 6!
  // === PHÂN KHU 2: Phòng làm việc ===
  {
    rowIndex: 8, rawStt: '', rawName: 'PHÒNG LÀM VIỆC', rawUnit: '', rawQty: '', rawPrice: '', rawNote: '', rawMaterial: '', isZoneHeader: true,
  },
  {
    rowIndex: 9, rawStt: '1', rawName: 'Bàn làm việc gỗ sồi', rawUnit: 'cái', rawQty: '5', rawPrice: '4200000', rawNote: '', rawMaterial: 'Gỗ tự nhiên sồi',
  },
  {
    rowIndex: 10, rawStt: '2', rawName: 'Kệ tường MDF', rawUnit: 'm2  1.2x2.4', rawQty: '3', rawPrice: '680000', rawNote: '', rawMaterial: 'MDF phủ Laminate',
  }, // Mixed unit với kích thước
  {
    rowIndex: 11, rawStt: '3', rawName: 'Sofa văng 3 chỗ', rawUnit: 'cái', rawQty: '1', rawPrice: '15000000', rawNote: '', rawMaterial: 'Vải nỉ',
  },
  {
    rowIndex: 12, rawStt: '4', rawName: 'Điều hòa 9000BTU', rawUnit: 'cái', rawQty: '3', rawPrice: '9500000', rawNote: 'CĐT cấp thiết bị', rawMaterial: '',
  },
  {
    rowIndex: 13, rawStt: '5', rawName: 'Vách op sau TV gia da', rawUnit: 'm2', rawQty: '4.8', rawPrice: '1850000', rawNote: '', rawMaterial: 'MDF phủ Acrylic',
  }, // Levenshtein: "Vách op sau TV gia da" → "Vách ốp sau TV giả đá"
  // === Item bị thiếu qty (lỗi) ===
  {
    rowIndex: 14, rawStt: '6', rawName: 'Tủ đầu giường', rawUnit: 'cái', rawQty: '', rawPrice: '1800000', rawNote: '', rawMaterial: 'MFC',
  }, // QTY TRỐNG — phải bị detect
];

// ════════════════════════════════════════════════════════════════════════════════
// CHẠY TEST TỪNG BƯỚC
// ════════════════════════════════════════════════════════════════════════════════

// ── PRE-TEST: Levenshtein Distance ───────────────────────────────────────────
console.log(hdr('PRE-TEST: Levenshtein Distance Algorithm'));
console.log(sub('Test khoảng cách giữa các cặp chuỗi'));

assert(levenshtein('Cira bật', 'Cửa bật') <= 3, 'Levenshtein("Cira bật","Cửa bật")', `d=${levenshtein('Cira bật','Cửa bật')}`);
assert(levenshtein('Giương', 'Gương') <= 2, 'Levenshtein("Giương","Gương")', `d=${levenshtein('Giương','Gương')}`);
assert(levenshtein('Bảng', 'Bàn') <= 2, 'Levenshtein("Bảng","Bàn")', `d=${levenshtein('Bảng','Bàn')}`);

// Test autocorrect
const corrResult = autocorrectName('Cira bật');
assert(corrResult.wasChanged, 'Autocorrect nhận ra "Cira bật" cần sửa');

// ── PRE-TEST: Dimension Parser ───────────────────────────────────────────────
console.log(hdr('PRE-TEST: Dimension & Unit Parser'));

const dim1 = parseDimensions('m2  1.2x2.4', '');
assert(dim1.unit === 'm2', 'Parse unit từ "m2  1.2x2.4"', `unit=${dim1.unit}`);
assert(dim1.dimensions.length === 1.2, 'Parse length=1.2 từ "1.2x2.4"', `length=${dim1.dimensions.length}`);
assert(dim1.dimensions.width  === 2.4, 'Parse width=2.4 từ "1.2x2.4"',  `width=${dim1.dimensions.width}`);

const dim2 = parseDimensions('md. 0.4 2.7 m2', '');
assert(dim2.unit === 'md', 'Parse unit=md từ mixed "md. 0.4 2.7 m2"', `unit=${dim2.unit}`);

assert(parseQty('1,5') === 1.5, 'parseQty("1,5") = 1.5');
assert(parseQty('') === 0, 'parseQty("") = 0');

// ════════════════════════════════════════════════════════════════════════════════
// BƯỚC 1: Text Cleaning & Validation
// ════════════════════════════════════════════════════════════════════════════════
console.log(hdr('BƯỚC 1: Text Cleaning & Levenshtein Autocorrect'));

const cleaned     = cleanLines(rawTestData);
const step1Result = validateStep1(cleaned);

const itemsCleaned    = cleaned.filter(l => !l.isZoneHeader);
const zoneHeaderCount = cleaned.filter(l => l.isZoneHeader).length;
const correctedItems  = itemsCleaned.filter(l => l.wasAutoCorrected);
const zeroQtyItems    = itemsCleaned.filter(l => l.qty <= 0);

console.log(sub('Kết quả làm sạch'));
console.log(`  Tổng dòng: ${cleaned.length}, Zone headers: ${zoneHeaderCount}, Items: ${itemsCleaned.length}`);
console.log(`  Tự động sửa tên: ${correctedItems.length} dòng`);
correctedItems.forEach(i => console.log(warn(`  "${i.nameOriginal}" → "${i.name}"`)));

assert(zoneHeaderCount >= 2, 'Nhận diện được ít nhất 2 zone header', `count=${zoneHeaderCount}`);
assert(itemsCleaned.length > 0, 'Có ít nhất 1 item data', `count=${itemsCleaned.length}`);
assert(zeroQtyItems.length > 0, 'Phát hiện được dòng qty=0 (dòng 14)', `count=${zeroQtyItems.length}`);
assert(!step1Result.passed, 'Validation Bước 1 thất bại đúng vì có qty=0', `errors=${step1Result.errors.length}`);
assert(step1Result.errors.some(e => e.field === 'qty'), 'Lỗi đúng field="qty"');

// systemIndex phải tăng dần không trùng
const indexes = itemsCleaned.map(i => i.systemIndex);
const uniqueIdx = new Set(indexes);
assert(uniqueIdx.size === indexes.length, 'systemIndex không trùng lặp (Index Repair sẵn sàng)', `unique=${uniqueIdx.size}`);

console.log(sub('Step 1 Validation Report'));
console.log(`  Passed: ${step1Result.passed} | Errors: ${step1Result.errors.length} | Warnings: ${step1Result.warnings.length}`);

// ════════════════════════════════════════════════════════════════════════════════
// BƯỚC 2: Zone Mapping + STT Duplicate Detection
// ════════════════════════════════════════════════════════════════════════════════
console.log(hdr('BƯỚC 2: Zone Mapping Engine + Index Repair'));

const { zonedLines, zones, duplicateSttMap, indexRepairCount } = mapZones(cleaned);
const step2Result = validateStep2(zonedLines, zones, duplicateSttMap);

console.log(sub('Zones đã tạo'));
zones.forEach(z => {
  const count = zonedLines.filter(l => l.zoneId === z.zoneId).length;
  console.log(`  ${z.zoneId} — "${z.zoneName}" (${count} items)`);
});

console.log(sub('STT Duplicates Detected'));
if (duplicateSttMap.size > 0) {
  for (const [stt, rows] of duplicateSttMap.entries()) {
    console.log(warn(`  STT "${stt}" trùng tại rowIndex: ${rows.join(', ')}`));
  }
} else {
  console.log('  Không có STT trùng');
}

assert(zones.length >= 2, 'Tạo được ít nhất 2 zone', `count=${zones.length}`);
assert(duplicateSttMap.size > 0, 'Phát hiện STT trùng (dòng 6 và 7 cùng STT=5)', `duplicates=${duplicateSttMap.size}`);
assert(indexRepairCount > 0, 'Index Repair đã được kích hoạt', `repaired=${indexRepairCount}`);

const orphanItems = zonedLines.filter(l => !l.zoneId);
assert(orphanItems.length === 0, '100% items được gán zone_id (không có orphan)', `orphans=${orphanItems.length}`);
assert(step2Result.passed, 'Validation Bước 2 PASS', `errors=${step2Result.errors.length}`);

console.log(`  Zones: ${step2Result.stats.totalZones}, Items: ${step2Result.stats.totalItems}, IndexRepairs: ${indexRepairCount}`);

// ════════════════════════════════════════════════════════════════════════════════
// BƯỚC 3: Supply Chain Routing Simulation Test
// ════════════════════════════════════════════════════════════════════════════════
console.log(hdr('BƯỚC 3: Supply Chain Routing Logic'));

console.log(sub('Unit Test Mô phỏng — Tủ bếp vs Quạt trần'));
const simTest = runStep3SimulationTest();
simTest.details.forEach(d => console.log(`  ${d}`));
assert(simTest.passed, 'Tất cả simulation test cases PASS', `${simTest.details.filter(d=>d.startsWith('✅')).length}/${simTest.details.length}`);

console.log(sub('Routing thực tế trên dữ liệu Bảo Minh'));
const routedLines = routeSupplyChain(zonedLines);

const hpLines      = routedLines.filter(l => l.supplyType === 'HomePro_Production');
const procLines    = routedLines.filter(l => l.supplyType === 'Procurement_Commercial');
const installLines = routedLines.filter(l => l.supplyType === 'Installation_Only');
const bomLines     = routedLines.filter(l => l.needsBomLayer);

routedLines.forEach(l =>
  console.log(`  ${l.supplyType === 'HomePro_Production' ? '🔵' : l.supplyType === 'Procurement_Commercial' ? '🛒' : '🔧'} [${l.zoneId}] "${l.name}" → ${l.supplyType} | BOM:${l.needsBomLayer} | ${l.routingEvidence}`)
);

const step3Result = validateStep3(routedLines);

assert(step3Result.passed, 'Validation Bước 3 PASS', `errors=${step3Result.errors.length}`);
assert(procLines.length > 0, 'Nhận diện đúng Procurement (quạt trần, sofa)', `count=${procLines.length}`);
assert(installLines.length > 0, 'Nhận diện đúng Installation_Only (CĐT cấp)', `count=${installLines.length}`);
assert(bomLines.every(l => l.supplyType === 'HomePro_Production'), 'Chỉ HP_Production mới có needsBomLayer=true', `bomItems=${bomLines.length}`);

console.log(`  HP_Production: ${hpLines.length} | Procurement: ${procLines.length} | Install_Only: ${installLines.length} | BOM Layer: ${bomLines.length}`);

// ════════════════════════════════════════════════════════════════════════════════
// BƯỚC 4: JSON Schema Output + Integrity Check
// ════════════════════════════════════════════════════════════════════════════════
console.log(hdr('BƯỚC 4: JSON Schema Output + Final Integrity Check'));

const output = buildOutput(routedLines, zones, {
  projectCode: 'HPM-BAO-MINH-2024',
  projectName: 'Văn phòng Bảo Minh Insurance',
  customer:    'Bảo Minh Insurance',
  sourceFile:  'BOQ_BaoMinh_2024.xlsx',
});
output.etl_summary.index_repairs = indexRepairCount;

// Kiểm tra cấu trúc JSON
assert(output.project_metadata.projectCode === 'HPM-BAO-MINH-2024', 'project_metadata.projectCode đúng');
assert(output.project_metadata.etlVersion  === '2.0.0',              'etlVersion = 2.0.0');
assert(Array.isArray(output.data_payload.zones),                      'data_payload.zones là mảng');
assert(output.data_payload.zones.length >= 2,                         'Có ít nhất 2 zones trong output');

const step4Result = validateStep4(output);

// In mẫu JSON output
console.log(sub('JSON Output Preview (first zone)'));
const firstZone = output.data_payload.zones[0];
if (firstZone) {
  console.log(JSON.stringify({
    zoneId:    firstZone.zoneId,
    zoneName:  firstZone.zoneName,
    zoneTotal: firstZone.zoneTotal,
    itemCount: firstZone.itemCount,
    items_preview: firstZone.items.slice(0, 2),
  }, null, 2));
}

assert(step4Result.passed, 'Final Integrity Check PASS', `errors=${step4Result.errors.length}`);
console.log(`  Schema compliance: ${step4Result.stats.schemaCompliant}`);
console.log(`  Grand Total: ${Number(output.project_metadata.grandTotal).toLocaleString('vi-VN')} VNĐ`);

if (step4Result.warnings.length > 0) {
  console.log(sub('Cảnh báo Bước 4'));
  step4Result.warnings.forEach(w => console.log(warn(`  ${w}`)));
}

// ════════════════════════════════════════════════════════════════════════════════
// KẾT QUẢ TỔNG HỢP
// ════════════════════════════════════════════════════════════════════════════════
console.log(hdr('KẾT QUẢ TỔNG HỢP'));
console.log(`\n  Tổng tests: ${totalTests} | Pass: ${totalPass} | Fail: ${totalTests - totalPass}`);
console.log(`  Tỷ lệ: ${Math.round(totalPass/totalTests*100)}%`);

const etlSummary = output.etl_summary;
console.log('\n  📊 ETL Summary:');
console.log(`     Bước 1 — Đã làm sạch:   ${etlSummary.step1_cleaned} dòng (${etlSummary.auto_corrected_names} tên tự sửa)`);
console.log(`     Bước 2 — Zones tạo:     ${etlSummary.step2_zones_created} (Index repairs: ${etlSummary.index_repairs})`);
console.log(`     Bước 3 — HP_Production: ${etlSummary.step3_hp_production} | Procurement: ${etlSummary.step3_procurement} | Install: ${etlSummary.step3_install_only}`);
console.log(`     Bước 4 — Integrity OK:  ${etlSummary.step4_integrity_ok}`);

if (totalPass === totalTests) {
  console.log(`\n${C.bold}${C.green}  🎉 TẤT CẢ ${totalTests} UNIT TESTS PASS — ETL PIPELINE SẴN SÀNG SẢN XUẤT${C.reset}\n`);
} else {
  console.log(`\n${C.red}  ❌ ${totalTests - totalPass} TESTS THẤT BẠI — CẦN XEM XÉT TRƯỚC KHI TRIỂN KHAI${C.reset}\n`);
  process.exitCode = 1;
}
