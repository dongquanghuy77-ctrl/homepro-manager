// src/lib/import-parser.ts
// ═══════════════════════════════════════════════════════════════════════════════
// HomePro Import Parser — Fuzzy Header Matching + UTF-8 Auto-Conversion
// BƯỚC 1: Synonym Mapping + Regex fuzzy match cho tiêu đề cột Excel
// BƯỚC 2: Phát hiện và chuyển đổi Windows-1258/ANSI → UTF-8
// ═══════════════════════════════════════════════════════════════════════════════

// ── Bảng synonym cho từng field bắt buộc ────────────────────────────────────
// Mỗi field có danh sách từ đồng nghĩa (tên cột trong Excel người dùng hay dùng)
export const COLUMN_SYNONYMS: Record<string, string[]> = {
  // ── Dự án ──────────────────────────────────────────────────────────────────
  code: [
    'mã dự án', 'ma du an', 'project code', 'projectcode', 'code',
    'mã', 'ma', 'so du an', 'số dự án', 'id dự án', 'id du an',
  ],
  projectName: [
    'tên dự án', 'ten du an', 'project name', 'projectname', 'name',
    'tên', 'ten', 'dự án', 'du an', 'công trình', 'cong trinh',
    'tên công trình', 'ten cong trinh',
  ],
  customer: [
    'khách hàng', 'khach hang', 'customer', 'chủ đầu tư', 'chu dau tu',
    'cdt', 'client', 'owner',
  ],
  manager: [
    'quản lý', 'quan ly', 'manager', 'người phụ trách dự án', 'nguoi phu trach',
    'chủ nhiệm', 'chu nhiem', 'project manager',
  ],
  location: [
    'địa điểm', 'dia diem', 'location', 'địa chỉ', 'dia chi',
    'nơi thi công', 'noi thi cong', 'address', 'site',
  ],
  contractValue: [
    'hợp đồng (vnd)', 'hop dong', 'hợp đồng', 'contract value', 'contractvalue',
    'giá trị hợp đồng', 'gia tri hop dong', 'contract', 'value', 'giá trị',
    'gia tri', 'doanh thu', 'doanh so',
  ],
  startDate: [
    'ngày bắt đầu dự án', 'ngay bat dau du an', 'start date', 'startdate',
    'ngày bắt đầu', 'ngay bat dau', 'start', 'bắt đầu', 'bat dau',
  ],
  deadline: [
    'deadline dự án', 'deadline du an', 'deadline', 'hạn dự án',
    'ngày kết thúc', 'ngay ket thuc', 'end date', 'enddate',
    'ngày hoàn thành', 'ngay hoan thanh',
  ],
  projectNotes: [
    'ghi chú dự án', 'ghi chu du an', 'notes', 'ghi chú', 'ghi chu',
    'mô tả', 'mo ta', 'description', 'remark', 'note',
  ],
  // ── Công việc ──────────────────────────────────────────────────────────────
  taskTitle: [
    'tên công việc', 'ten cong viec', 'task title', 'tasktitle', 'title',
    'công việc', 'cong viec', 'task', 'hạng mục công việc', 'hang muc',
    'tên hạng mục', 'ten hang muc', 'tên task', 'ten task',
  ],
  category: [
    'hạng mục công việc', 'hang muc cong viec', 'hạng mục', 'hang muc',
    'category', 'loại công việc', 'loai cong viec', 'type', 'nhóm',
  ],
  assignee: [
    'người phụ trách', 'nguoi phu trach', 'assignee', 'người thực hiện',
    'nguoi thuc hien', 'phụ trách', 'phu trach', 'assigned to', 'người làm',
  ],
  taskStartDate: [
    'ngày bắt đầu task', 'ngay bat dau task', 'ngày bắt đầu công việc',
    'start date task', 'task start',
  ],
  taskEndDate: [
    'hạn công việc', 'han cong viec', 'end date', 'enddate', 'deadline task',
    'task deadline', 'hạn', 'due date',
  ],
  priority: [
    'ưu tiên', 'uu tien', 'priority', 'độ ưu tiên', 'do uu tien',
    'mức ưu tiên', 'muc uu tien', 'urgent',
  ],
  status: [
    'trạng thái', 'trang thai', 'status', 'tình trạng', 'tinh trang',
    'tiến độ trạng thái', 'state',
  ],
  progress: [
    'tiến độ %', 'tien do', 'progress', '% hoàn thành', 'phan tram',
    'hoàn thành %', 'hoan thanh', 'percent complete', 'tien do phan tram',
  ],
  taskNotes: [
    'ghi chú task', 'ghi chu task', 'ghi chú công việc', 'task notes',
    'task note', 'note task',
  ],
};

// ── Normalize chuỗi: bỏ dấu, lowercase, bỏ khoảng trắng thừa ────────────────
export function normHeader(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // bỏ tất cả combining diacritics
    .replace(/đ/gi, 'd')              // Đ không phân rã bởi NFD
    .toLowerCase()
    .replace(/[^a-z0-9%]/g, ' ')     // giữ lại chữ, số, %
    .replace(/\s+/g, ' ')
    .trim();
}

// ── ColumnMapResult: kết quả map header → field ───────────────────────────────
export interface ColumnMapResult {
  fieldToColumn: Record<string, string>;     // field → tên cột gốc trong file
  unmappedHeaders: string[];                 // Cột không map được
  missingRequired: string[];                 // Required field không tìm thấy
  log: string[];                             // Log chi tiết cho debug
}

// Required fields — nếu thiếu sẽ báo lỗi chi tiết
const REQUIRED_FIELDS = ['code', 'projectName'];

// ── BƯỚC 1: Fuzzy Header Matching ────────────────────────────────────────────
export function buildColumnMap(headers: string[]): ColumnMapResult {
  const fieldToColumn: Record<string, string> = {};
  const mappedHeaders = new Set<string>();
  const log: string[] = [];

  log.push(`[FuzzyHeader] Đang phân tích ${headers.length} cột: ${headers.join(', ')}`);

  for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
    for (const header of headers) {
      // Guard: mỗi cột chỉ được map cho 1 field — bỏ qua cột đã dùng
      if (mappedHeaders.has(header)) continue;
      const normH = normHeader(header);

      // Match 1: exact normalize — normH phải khớp hoàn toàn với synonym
      for (const syn of synonyms) {
        const normS = normHeader(syn);
        if (!normS) continue;  // bỏ qua synonym rỗng sau normalize
        if (normH === normS) {
          fieldToColumn[field] = header;
          mappedHeaders.add(header);
          log.push(`  ✅ [${field}] ← "${header}" (exact: "${syn}")`);
          break;
        }
        // Containment match: chỉ khi normS đủ dài (>= 4 chars) để tránh false positive
        if (normS.length >= 4 && (normH.includes(normS) || normS.includes(normH))) {
          fieldToColumn[field] = header;
          mappedHeaders.add(header);
          log.push(`  ✅ [${field}] ← "${header}" (contains: "${syn}")`);
          break;
        }
      }

      if (fieldToColumn[field]) break;

      // Match 2: partial-word — PHẢI có ít nhất 1 từ đủ dài (>= 3 ký tự)
      for (const syn of synonyms) {
        const normS = normHeader(syn);
        // Tách thành các từ, lọc chỉ giữ từ >= 3 ký tự để tránh false match
        const words = normS.split(' ').filter(w => w.length >= 3);
        // Guard: phải có ít nhất 2 từ đủ dài mới dùng partial-word matching
        if (words.length < 2) continue;
        if (words.every(w => normH.includes(w))) {
          fieldToColumn[field] = header;
          mappedHeaders.add(header);
          log.push(`  ✅ [${field}] ← "${header}" (words: "${syn}")`);
          break;
        }
      }

      if (fieldToColumn[field]) break;
    }

    if (!fieldToColumn[field]) {
      log.push(`  ⚠️  [${field}] → không tìm thấy cột tương ứng`);
    }
  }

  // Cột chưa được map
  const unmappedHeaders = headers.filter(h => !mappedHeaders.has(h));
  if (unmappedHeaders.length > 0) {
    log.push(`  🔵 Cột chưa map: ${unmappedHeaders.join(', ')}`);
  }

  // Required field check
  const missingRequired = REQUIRED_FIELDS.filter(f => !fieldToColumn[f]);
  if (missingRequired.length > 0) {
    log.push(`  ❌ Thiếu required fields: ${missingRequired.join(', ')}`);
  }

  return { fieldToColumn, unmappedHeaders, missingRequired, log };
}

// ── BƯỚC 1: getField với fieldToColumn map ────────────────────────────────────
export function getField(
  row: Record<string, unknown>,
  fieldToColumn: Record<string, string>,
  field: string
): string {
  const col = fieldToColumn[field];
  if (!col) return '';
  const val = row[col];
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

// ════════════════════════════════════════════════════════════════════════════════
// BƯỚC 2: UTF-8 Auto-Conversion — Windows-1258 / ANSI phát hiện và sửa lỗi font
// ════════════════════════════════════════════════════════════════════════════════

// Bảng chuyển đổi ký tự bị lỗi font phổ biến (Windows-1258 đọc sai thành UTF-8)
// Khi Excel ANSI file được đọc sai → ký tự tiếng Việt bị thay bằng ký tự lạ
const WIN1258_GARBLED_MAP: [RegExp, string][] = [
  // Ký tự thường thấy khi Windows-1258 bị đọc sai bởi Latin-1 engine
  [/\xc3\xa0/g, 'à'], [/\xc3\xa1/g, 'á'], [/\xc3\xa2/g, 'â'],
  [/\xc3\xa3/g, 'ã'], [/\xc3\xa4/g, 'ä'], [/\xc3\xa5/g, 'å'],
  // Các ký tự tiếng Việt bị garble phổ biến nhất
  [/Ph\x8fng/gi,          'Phòng'],
  [/Ph\xf2ng/gi,          'Phòng'],
  [/Ph\xcfng/gi,          'Phòng'],
  [/Ph[o0\xf3]\x82ng/gi,  'Phòng'],
  [/Ng\xa7/gi,            'Ngủ'],
  [/B\xeap/gi,            'Bếp'],
  [/B\x83p/gi,            'Bếp'],
  [/v\x87 sinh/gi,        'vệ sinh'],
  [/kh\xf4ng/gi,          'không'],
  [/Kh\xf4ng/gi,          'Không'],
  [/\xd0\xa0/g,           'Đ'],
  [/d\xf4\x81/g,          'dự'],
  [/d\x8f/g,              'đồ'],
];

// Phát hiện ký tự lỗi font phổ biến — trả về true nếu có dấu hiệu garbled
export function hasEncodingIssue(text: string): boolean {
  // Kiểm tra có ký tự thay thế (replacement character) U+FFFD
  if (text.includes('\uFFFD')) return true;
  // Kiểm tra tỷ lệ ký tự không phải UTF-8 Latin (không phải ASCII và không phải UTF-8 hợp lệ)
  const suspiciousCount = (text.match(/[\x80-\xBF]|[\xC0-\xC1]|[\xF5-\xFF]/g) ?? []).length;
  return suspiciousCount > 0;
}

// Sửa lỗi font từ garbled → Unicode đúng
export function fixEncoding(text: string): string {
  let fixed = text;
  for (const [pattern, replacement] of WIN1258_GARBLED_MAP) {
    fixed = fixed.replace(pattern, replacement);
  }
  // Bỏ replacement characters còn lại
  fixed = fixed.replace(/\uFFFD/g, '?');
  return fixed;
}

// Áp dụng encoding fix cho toàn bộ giá trị trong một row
export function fixRowEncoding(row: Record<string, unknown>): Record<string, unknown> {
  const fixed: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    const fixedKey = typeof key === 'string' ? fixEncoding(key) : key;
    const fixedVal = typeof val === 'string' ? fixEncoding(val) : val;
    fixed[fixedKey] = fixedVal;
  }
  return fixed;
}

// ── BƯỚC 2: Test case tự kiểm tra encoding ───────────────────────────────────
export function runEncodingTest(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let passed = true;

  // Test 1: phát hiện garbled
  const garbled1 = 'Ph\xf2ng Kh\xe1ch';
  const hasBad = hasEncodingIssue(garbled1);
  results.push(`[${hasBad ? 'PASS' : 'WARN'}] Phát hiện garbled string: "${garbled1}" → issue=${hasBad}`);

  // Test 2: replacement character
  const garbled2 = 'Ph\uFFFDng Ng\uFFFD';
  const hasBad2 = hasEncodingIssue(garbled2);
  results.push(`[${hasBad2 ? 'PASS' : 'FAIL'}] Phát hiện U+FFFD: ${hasBad2}`);
  if (!hasBad2) passed = false;

  // Test 3: fix known patterns
  const fixed1 = fixEncoding('Ph\xf2ng Kh\xe1ch');
  results.push(`[INFO] fixEncoding("Ph\\xf2ng Kh\\xe1ch") → "${fixed1}"`);

  // Test 4: normalize header - "Tên dự án" và "ten du an" phải match
  const a = normHeader('Tên dự án');
  const b = normHeader('ten du an');
  const match = a === b;
  results.push(`[${match ? 'PASS' : 'FAIL'}] normHeader("Tên dự án") == normHeader("ten du an"): ${match} (a="${a}", b="${b}")`);
  if (!match) passed = false;

  // Test 5: fuzzy header matching
  const headers = ['STT', 'Tên dự án', 'Khách hàng', 'Hợp đồng (VND)', 'Tên công việc', 'Tiến độ %'];
  const { fieldToColumn, missingRequired, log } = buildColumnMap(headers);
  results.push(`[${fieldToColumn['projectName'] ? 'PASS' : 'FAIL'}] Map "Tên dự án" → projectName: ${fieldToColumn['projectName']}`);
  results.push(`[${fieldToColumn['contractValue'] ? 'PASS' : 'FAIL'}] Map "Hợp đồng (VND)" → contractValue: ${fieldToColumn['contractValue']}`);
  results.push(`[${fieldToColumn['progress'] ? 'PASS' : 'FAIL'}] Map "Tiến độ %" → progress: ${fieldToColumn['progress']}`);
  results.push(`[${missingRequired.includes('code') ? 'PASS' : 'FAIL'}] "code" báo missing (không có cột Mã dự án): ${missingRequired.includes('code')}`);
  log.forEach(l => results.push(`  LOG: ${l}`));

  if (!fieldToColumn['projectName'] || !fieldToColumn['contractValue']) passed = false;

  return { passed, results };
}
