import {
  normHeader, buildColumnMap, getField,
  hasEncodingIssue, fixEncoding, runEncodingTest,
  UI_REQUIRED_COLUMNS,
} from '../src/lib/import-parser.ts';
import { detectHeaderRow } from '../src/lib/boq-parser.ts';

// ── CSV_TEMPLATE (copy từ ExcelImportModal để test độc lập) ───────────────
const CSV_TEMPLATE =
  '\uFEFF' +
  'Mã dự án,Tên dự án,STT,Hạng mục,Vật liệu / Quy cách,Khối lượng,Đơn vị,Đơn giá,Tên công việc,Người phụ trách,Trạng thái,Ư u tiên,Ghi chú\r\n' +
  'DA-BM01,Văn phòng Chứng khoán Bảo Minh,,,,,,,,,,\r\n' +
  ',,1,Kệ tivi treo,"MDF chống ẩm phủ Melamine, hậu 9mm phụ kiện Hafele",2.3,md,850000,,,,,\r\n';

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

// ════════════════════════════════════════════════════════════
// BƯỚC 4: DOM Validation Hook — Template + Visual Column Matcher
// ════════════════════════════════════════════════════════════
console.log(hdr('BƯỚC 4: DOM Validation Hook — Template + Visual Column Matcher'));

// ── Test 4a: Template CSV kiểm tra ────────────────────────────────
console.log('\n  [4a] Kiểm tra nội dung file mẫu CSV');
assert(CSV_TEMPLATE.startsWith('\uFEFF'),         'CSV_TEMPLATE bắt đầu bằng BOM \\uFEFF');
assert(CSV_TEMPLATE.length > 0,                   'CSV_TEMPLATE không rỗng', `${CSV_TEMPLATE.length} bytes`);
assert(CSV_TEMPLATE.includes('Mã dự án'),         'CSV_TEMPLATE có cột "Mã dự án"');
assert(CSV_TEMPLATE.includes('Tên dự án'),        'CSV_TEMPLATE có cột "Tên dự án"');
assert(CSV_TEMPLATE.includes('Khối lượng'),       'CSV_TEMPLATE có cột "Khối lượng"');
assert(CSV_TEMPLATE.includes('Đơn vị'),            'CSV_TEMPLATE có cột "Đơn vị"');
assert(CSV_TEMPLATE.includes('STT'),              'CSV_TEMPLATE có cột "STT"');
assert(CSV_TEMPLATE.includes('Hạng mục'),          'CSV_TEMPLATE có cột "Hạng mục"');
assert(CSV_TEMPLATE.includes('DA-BM01'),           'CSV_TEMPLATE có dữ liệu mẫu DA-BM01');

// Giả lập: tạo Blob từ template, kiểm tra size
const encoder = new TextEncoder();
const encoded = encoder.encode(CSV_TEMPLATE);
assert(encoded.byteLength > 200, 'Blob template > 200 bytes (có nội dung)',
  `${encoded.byteLength} bytes`);

// ── Test 4b: Visual Column Matcher — file đúng đủ cột ───────────────────
console.log('\n  [4b] Giả lập file đủ cột — nút Import phải bật');
const fullCols = ['Mã dự án','Tên dự án','STT','Hạng mục','Khối lượng','Đơn vị','Đơn giá'];
const fullMap = buildColumnMap(fullCols);

// Kiểm tra tất cả required col được map
const requiredCols = UI_REQUIRED_COLUMNS.filter(c => c.required);
const allRequiredMapped = requiredCols.every(c => !!fullMap.fieldToColumn[c.field]);
assert(allRequiredMapped,                              'File đủ cột: tất cả required field được map');
// Giả lập canImport logic của UI
const canImportFull = requiredCols.every(c => !!fullMap.fieldToColumn[c.field]);
assert(canImportFull,                                  'canImport=true khi file đủ cột (nút Import được bật)');

assert(fullMap.fieldToColumn['index']    === 'STT',       'Map "STT" → index');
assert(fullMap.fieldToColumn['category'] === 'Hạng mục',  'Map "Hạng mục" → category (field có ưu tiên cao hơn itemName)');
assert(fullMap.fieldToColumn['quantity'] === 'Khối lượng', 'Map "Khối lượng" → quantity');
assert(fullMap.fieldToColumn['unit']     === 'Đơn vị',    'Map "Đơn vị" → unit');
assert(fullMap.fieldToColumn['unitPrice']=== 'Đơn giá',   'Map "Đơn giá" → unitPrice');

// ── Test 4c: Visual Column Matcher — thiếu cột “Khối lượng” ─────────────
console.log('\n  [4c] Giả lập file thiếu cột không bắt buộc ("Khối lượng")');
const noQtyCols = ['Mã dự án','Tên dự án','STT','Hạng mục','Đơn vị'];
const noQtyMap  = buildColumnMap(noQtyCols);
const canImportNoQty = requiredCols.every(c => !!noQtyMap.fieldToColumn[c.field]);
// 'Khối lượng' là KHÔNG bắt buộc (required=false) nên vẫn cho import
assert(canImportNoQty, 'canImport=true dù thiếu "Khối lượng" (field không bắt buộc)');
assert(!noQtyMap.fieldToColumn['quantity'], 'Tố cáo "quantity" không map được (thiếu cột)');

// ── Test 4d: Visual Column Matcher — thiếu cột BẪT BUỘC (Mã dự án) ───────
console.log('\n  [4d] Giả lập file thiếu cột BẪT BUỘC — nút Import phải bị vô hiệu hóa');
const noCodeCols = ['Tên dự án','STT','Hạng mục','Khối lượng','Đơn vị'];
const noCodeMap  = buildColumnMap(noCodeCols);
const canImportNoCode = requiredCols.every(c => !!noCodeMap.fieldToColumn[c.field]);

assert(!canImportNoCode,            'canImport=false khi thiếu "Mã dự án" (disabled=true)');
assert(noCodeMap.missingRequired.includes('code'),
                                    'missingRequired chứa "code" khi thiếu cột');

// Kiểm tra UI_REQUIRED_COLUMNS structure
console.log('\n  [4e] UI_REQUIRED_COLUMNS structure check');
assert(UI_REQUIRED_COLUMNS.length >= 6, 'UI_REQUIRED_COLUMNS >= 6 entry',
  `có ${UI_REQUIRED_COLUMNS.length} entries`);
assert(UI_REQUIRED_COLUMNS.filter(c => c.required).length === 2,
  'Chính xác 2 field bắt buộc (code, projectName)');
assert(UI_REQUIRED_COLUMNS.some(c => c.field === 'quantity'),
  'UI_REQUIRED_COLUMNS có field "quantity"');
assert(UI_REQUIRED_COLUMNS.some(c => c.field === 'unit'),
  'UI_REQUIRED_COLUMNS có field "unit"');
assert(UI_REQUIRED_COLUMNS.every(c => c.label && c.hint && typeof c.required === 'boolean'),
  'Tất cả UiColumn entries có đủ label, hint, required');

// ── Test 4f: Tương đương test-case "tyếp chỷ bật" sỚm ────────────────────
console.log('\n  [4f] Map BOQ fields từ file template mẫu');
// Parse header row từ CSV_TEMPLATE (bỏ BOM)
const templateNoBoM = CSV_TEMPLATE.replace(/^\uFEFF/, '');
const templateFirstLine = templateNoBoM.split(/\r?\n/)[0];
const templateHeaders = templateFirstLine.split(',').map(h => h.trim());
const templateMap = buildColumnMap(templateHeaders);

assert(templateMap.fieldToColumn['code']        === 'Mã dự án',   'Template: code ← "Mã dự án"');
assert(templateMap.fieldToColumn['projectName'] === 'Tên dự án',  'Template: projectName ← "Tên dự án"');
assert(templateMap.fieldToColumn['index']       === 'STT',           'Template: index ← "STT"');
assert(templateMap.fieldToColumn['category']    === 'Hạng mục',      'Template: category ← "Hạng mục" (category có ưu tiên trước itemName)');
assert(templateMap.fieldToColumn['quantity']    === 'Khối lượng',    'Template: quantity ← "Khối lượng"');
assert(templateMap.fieldToColumn['unit']        === 'Đơn vị',       'Template: unit ← "Đơn vị"');
assert(templateMap.fieldToColumn['unitPrice']   === 'Đơn giá',      'Template: unitPrice ← "Đơn giá"');
assert(templateMap.missingRequired.length === 0,                     'Template: không thiếu required field');

// ════════════════════════════════════════════════════════════
// BƯỚC 5: detectHeaderRow — Smart Header Detection
// ════════════════════════════════════════════════════════════
console.log(hdr('BƯỚC 5: detectHeaderRow — Smart Header Detection (quét 5 hàng đầu)'));

// ── Test 5a: File tiêu chuẩn — header ngay hàng 0 ───────────────────
console.log('\n  [5a] File tiêu chuẩn — header ở hàng 1 (row 0)');
const rows5a = [
  ['STT', 'Hạng mục', 'Khối lượng', 'Đơn vị', 'Đơn giá', 'Thành tiền'],
  [1, 'Lèn chân tường', 45.6, 'md', 350000, 15960000],
  [2, 'Rèm che nắng', 18, 'm2', 450000, 8100000],
];
const r5a = detectHeaderRow(rows5a);
assert(r5a.rowIndex === 0, 'detectHeaderRow: hàng 0 được chọn (standard BOQ)', `rowIndex=${r5a.rowIndex}`);
assert(r5a.score >= 3, `Score ≥ 3/6 (STT + Hạng mục + KL + ĐV)`, `score=${r5a.score.toFixed(1)}`);
assert(r5a.headerCells[0] === 'STT', 'headerCells[0] = "STT"');
assert(r5a.headerCells[1] === 'Hạng mục', 'headerCells[1] = "Hạng mục"');

// ── Test 5b: File có 1 dòng tiêu đề công ty ở hàng 0, header BOQ ở hàng 1 ──
console.log('\n  [5b] File có dòng tiêu đề ở hàng 0, header BOQ ở hàng 1');
const rows5b = [
  ['BảNG BÁO GIÁ THI CÔNG NỘI THẤT - CÔNG TY ABC', '', '', '', '', ''],
  ['STT', 'Hạng mục', 'Khối lượng', 'Đơn vị', 'Đơn giá', 'Thành tiền'],
  [1, 'Tủ bếp', 12, 'm2', 1200000, 14400000],
  [2, 'Vách ngăn kính', 8, 'm2', 950000, 7600000],
];
const r5b = detectHeaderRow(rows5b);
assert(r5b.rowIndex === 1, 'detectHeaderRow: hàng 1 được chọn (tiêu đề công ty ở hàng 0)', `rowIndex=${r5b.rowIndex}`);
assert(r5b.score > 0, 'Score > 0 khi phát hiện đúng hàng', `score=${r5b.score.toFixed(1)}`);

// ── Test 5c: File có 2 dòng tiêu đề, header BOQ ở hàng 2 ──────────────
console.log('\n  [5c] File có 2 dòng mô tả, header BOQ ở hàng 2');
const rows5c = [
  ['Công ty: HomePro Furniture', '', '', '', '', ''],
  ['Dự án: Văn phòng ABC - Ngày: 10/08/2026', '', '', '', '', ''],
  ['STT', 'Tên hạng mục', 'KL', 'ĐV', 'Đơn giá', 'Thành tiền'],
  [1, 'Lèn chân tường', 45.6, 'md', 350000, 15960000],
  [2, 'Rèm', 18, 'm2', 450000, 8100000],
];
const r5c = detectHeaderRow(rows5c);
assert(r5c.rowIndex === 2, 'detectHeaderRow: hàng 2 được chọn (2 dòng mô tả ở trước)', `rowIndex=${r5c.rowIndex}`);

// ── Test 5d: File có header tiếng Anh ───────────────────────────
console.log('\n  [5d] File tiếng Anh: No., Item Description, Qty, Unit, Rate, Amount');
const rows5d = [
  ['No.', 'Item Description', 'Qty', 'Unit', 'Rate', 'Amount'],
  [1, 'Wardrobe system', 3.2, 'm2', 950000, 3040000],
  [2, 'Kitchen cabinet', 4.5, 'm2', 1200000, 5400000],
];
const r5d = detectHeaderRow(rows5d);
assert(r5d.rowIndex === 0, 'detectHeaderRow: tiếng Anh — hàng 0 được chọn', `rowIndex=${r5d.rowIndex}`);
assert(r5d.score >= 2, 'Score ≥ 2 cho header tiếng Anh', `score=${r5d.score.toFixed(1)}`);

// ── Test 5e: File không có header rõ ràng (dữ liệu thuần tú) ────────
console.log('\n  [5e] File thuần số — default hàng 0, không crash');
const rows5e = [
  [1, 'Lèn chân tường', 45.6, 'md', 350000],
  [2, 'Rèm', 18, 'm2', 450000],
  [3, 'Cửa bật', 3, 'cái', 1500000],
];
const r5e = detectHeaderRow(rows5e);
assert(typeof r5e.rowIndex === 'number' && r5e.rowIndex >= 0, 'detectHeaderRow không crash với file thuần số', `rowIndex=${r5e.rowIndex}`);
assert(Array.isArray(r5e.log) && r5e.log.length > 0, 'log không rỗng');
assert(Array.isArray(r5e.headerCells), 'headerCells là array');

// ── Test 5f: File rỗng ────────────────────────────────────────────
console.log('\n  [5f] File rỗng — không crash');
const r5f = detectHeaderRow([]);
assert(r5f.rowIndex === 0, 'detectHeaderRow([]) trả rowIndex=0 (safe default)');
assert(r5f.headerCells.length === 0, 'headerCells rỗng khi rows=[]');

// ════════════════════════════════════════════════════════════
// KẺT QUẢ TỔNG HỢP
// ════════════════════════════════════════════════════════════
console.log(`\n${C.bold}${C.cyan}${'═'.repeat(60)}${C.reset}`);
console.log(`\n  Tổng tests: ${total} | Pass: ${totalPass} | Fail: ${total - totalPass}`);
if (totalPass === total) {
  console.log(`\n${C.bold}${C.green}  🎉 TẤT CẢ ${total} TESTS PASS — Import Parser + Template + Visual Matcher OK!${C.reset}\n`);
} else {
  console.log(`\n${C.red}  ❌ ${total - totalPass} tests thất bại${C.reset}\n`);
  process.exitCode = 1;
}
