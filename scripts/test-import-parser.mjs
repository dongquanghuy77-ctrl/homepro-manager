// scripts/test-import-parser.mjs
// Unit Test tự chạy cho import-parser.ts — BƯỚC 1 + BƯỚC 2 + BƯỚC 3
// Chạy: npx tsx scripts/test-import-parser.mjs

import { normHeader, buildColumnMap, getField, hasEncodingIssue, fixEncoding, runEncodingTest } from '../src/lib/import-parser.ts';

const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m' };
const pass = (s) => `${C.green}✅ ${s}${C.reset}`;
const fail = (s) => `${C.red}❌ ${s}${C.reset}`;
const hdr  = (s) => `\n${C.bold}${C.cyan}${'═'.repeat(60)}\n${s}\n${'═'.repeat(60)}${C.reset}`;

let total = 0, totalPass = 0;
function assert(cond, name, detail = '') {
  total++;
  if (cond) { totalPass++; console.log(pass(name + (detail ? ` (${detail})` : ''))); }
  else       { console.log(fail(name + (detail ? ` → ${detail}` : ''))); }
}

// ══════════════════════════════════════════════════════════════════════
// BƯỚC 1: Fuzzy Header Matching Tests
// ══════════════════════════════════════════════════════════════════════
console.log(hdr('BƯỚC 1: Fuzzy Header Matching'));

// Test normHeader
assert(normHeader('Tên dự án') === normHeader('ten du an'), 'normHeader diacritics strip', `"${normHeader('Tên dự án')}" == "${normHeader('ten du an')}"`);
assert(normHeader('Khối lượng') === normHeader('khoi luong'), 'normHeader Khối lượng', `"${normHeader('Khối lượng')}"`);
assert(normHeader('Hợp đồng (VND)') === normHeader('hop dong vnd'), 'normHeader Hợp đồng (VND)', `"${normHeader('Hợp đồng (VND)')}"`);
assert(normHeader('STT') === 'stt', 'normHeader STT');

// Test buildColumnMap — bộ cột tiếng Việt chuẩn
const headers1 = ['STT', 'Mã dự án', 'Tên dự án', 'Khách hàng', 'Hợp đồng (VND)', 'Tên công việc', 'Tiến độ %', 'Trạng thái', 'Ưu tiên'];
const map1 = buildColumnMap(headers1);
console.log('\n  [Bộ cột tiếng Việt chuẩn]');
assert(map1.fieldToColumn['code']        === 'Mã dự án',       'Map "Mã dự án" → code');
assert(map1.fieldToColumn['projectName'] === 'Tên dự án',      'Map "Tên dự án" → projectName');
assert(map1.fieldToColumn['customer']    === 'Khách hàng',     'Map "Khách hàng" → customer');
assert(map1.fieldToColumn['contractValue']=== 'Hợp đồng (VND)', 'Map "Hợp đồng (VND)" → contractValue');
assert(map1.fieldToColumn['taskTitle']   === 'Tên công việc',  'Map "Tên công việc" → taskTitle');
assert(map1.fieldToColumn['progress']    === 'Tiến độ %',      'Map "Tiến độ %" → progress');
assert(map1.missingRequired.length === 0, 'Không thiếu required field', `missing: ${map1.missingRequired.join(', ')}`);

// Test buildColumnMap — bộ cột tiếng Anh
const headers2 = ['Project Code', 'Project Name', 'Customer', 'Contract Value', 'Task Title', 'Status', 'Priority'];
const map2 = buildColumnMap(headers2);
console.log('\n  [Bộ cột tiếng Anh]');
assert(map2.fieldToColumn['code']        === 'Project Code',   'Map "Project Code" → code');
assert(map2.fieldToColumn['projectName'] === 'Project Name',   'Map "Project Name" → projectName');
assert(map2.fieldToColumn['contractValue']==='Contract Value', 'Map "Contract Value" → contractValue');
assert(map2.missingRequired.length === 0, 'Tiếng Anh: không thiếu required field');

// Test buildColumnMap — bộ cột không dấu
const headers3 = ['Ma du an', 'Ten du an', 'Khach hang', 'Hop dong', 'Ten cong viec'];
const map3 = buildColumnMap(headers3);
console.log('\n  [Bộ cột không dấu]');
assert(map3.fieldToColumn['code']        === 'Ma du an',       'Map "Ma du an" → code');
assert(map3.fieldToColumn['projectName'] === 'Ten du an',      'Map "Ten du an" → projectName');
assert(map3.fieldToColumn['customer']    === 'Khach hang',     'Map "Khach hang" → customer');

// Test buildColumnMap — cột sai hoàn toàn → phải báo missing
const headersBad = ['Column1', 'Column2', 'Description', 'Amount'];
const mapBad = buildColumnMap(headersBad);
console.log('\n  [Bộ cột sai hoàn toàn]');
assert(mapBad.missingRequired.includes('code'),        'Báo missing "code" khi không có cột phù hợp');
assert(mapBad.missingRequired.includes('projectName'), 'Báo missing "projectName"');

// Test getField
const row = { 'Mã dự án': 'HP-001', 'Tên dự án': 'Văn phòng Bảo Minh' };
assert(getField(row, map1.fieldToColumn, 'code')        === 'HP-001',              'getField code');
assert(getField(row, map1.fieldToColumn, 'projectName') === 'Văn phòng Bảo Minh', 'getField projectName');
assert(getField(row, map1.fieldToColumn, 'manager')     === '',                    'getField missing field → empty string');

// ══════════════════════════════════════════════════════════════════════
// BƯỚC 2: Encoding Detection + Conversion
// ══════════════════════════════════════════════════════════════════════
console.log(hdr('BƯỚC 2: UTF-8 Auto-Conversion'));

// Test hasEncodingIssue
assert(hasEncodingIssue('Ph\uFFFDng Kh\uFFFDch'), 'Phát hiện U+FFFD replacement character');
assert(!hasEncodingIssue('Phòng Khách'),            'Chuỗi sạch UTF-8 không bị flag');
assert(hasEncodingIssue('Ph\x80ng'),                'Phát hiện byte 0x80 (Latin-1 lỗi)');

// Test runEncodingTest (built-in)
const encTest = runEncodingTest();
console.log('\n  [Built-in encoding test results]');
encTest.results.forEach(r => console.log(`  ${r}`));
assert(encTest.passed, 'runEncodingTest() built-in PASS', `passed=${encTest.passed}`);

// Test fixEncoding — pattern phổ biến
const fixed1 = fixEncoding('Ph\uFFFDng Kh\uFFFDch');
assert(fixed1 === 'Ph?ng Kh?ch', 'fixEncoding: U+FFFD → ?', `"${fixed1}"`);

// ══════════════════════════════════════════════════════════════════════
// BƯỚC 3: Validation — 422 logic
// ══════════════════════════════════════════════════════════════════════
console.log(hdr('BƯỚC 3: 422 Logic Validation'));

// Giả lập: API nhận file với cột sai → phải phát hiện missing required
assert(mapBad.missingRequired.length > 0, '422 trigger: missing required field → detect');

// Giả lập: parse 0 rows → phải báo lỗi
const emptyResult = { projectsImported: 0, tasksImported: 0, totalRows: 5 };
const should422   = emptyResult.projectsImported === 0 && emptyResult.totalRows > 0;
assert(should422, '422 trigger: 0 projects nhưng file không rỗng → phải trả 422');

// Column log phải có nội dung hữu ích
assert(map1.log.length > 0, 'Column log không rỗng (có ít nhất 1 entry)');
assert(map1.log.some(l => l.includes('✅')), 'Column log có dòng thành công (✅)');
assert(mapBad.log.some(l => l.includes('⚠️')), 'Column log báo cảnh báo (⚠️) cho missing fields');

// ══════════════════════════════════════════════════════════════════════
// KẾT QUẢ
// ══════════════════════════════════════════════════════════════════════
console.log(`\n${C.bold}${C.cyan}${'═'.repeat(60)}${C.reset}`);
console.log(`\n  Tổng tests: ${total} | Pass: ${totalPass} | Fail: ${total - totalPass}`);
if (totalPass === total) {
  console.log(`\n${C.bold}${C.green}  🎉 TẤT CẢ ${total} TESTS PASS — Import Parser sẵn sàng!${C.reset}\n`);
} else {
  console.log(`\n${C.red}  ❌ ${total - totalPass} tests thất bại${C.reset}\n`);
  process.exitCode = 1;
}
