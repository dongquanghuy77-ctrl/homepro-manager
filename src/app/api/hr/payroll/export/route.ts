// src/app/api/hr/payroll/export/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// GET /api/hr/payroll/export?month=&year=&status=
// Xuất toàn bộ bảng lương tháng ra file Excel (.xlsx) — HR/Admin only
// ══════════════════════════════════════════════════════════════════════════════
//
// ═══ SELF-REVIEW: XỬ LÝ TYPE CASTING SỐ LIỆU TRONG EXCEL ═══════════════════
//
// LỖI CỰC PHỔ BIẾN: "Con số nhưng Excel không SUM được"
// ─────────────────────────────────────────────────────────────────────────────
// Kế toán mở file → bôi đen cột "Thực Nhận" → nhấn AutoSum → kết quả = 0
// Nguyên nhân: Library đã ghi "12000000" thành cell Type TEXT, không phải NUMBER.
//
// CÁC ĐIỂM DỄ MẮC LỖI:
//
//   ❌ WRONG 1: Truyền string thay vì number vào cell
//     cell.value = row.netSalary.toLocaleString('vi-VN')    // "12.000.000" → TEXT
//     cell.value = vnd(row.netSalary)                       // "12.000.000 ₫" → TEXT
//     cell.value = `${row.netSalary}`                       // "12000000" → TEXT (vẫn là string!)
//
//   ❌ WRONG 2: JSON đi qua network → parse lại thành string
//     const data = await res.json();  // API trả { netSalary: "12000000" }
//     cell.value = data.netSalary;    // → TEXT vì JSON parsed as string
//
//   ❌ WRONG 3: Drizzle REAL column → JS number đúng nhưng JSONB string
//     lineItemsJson có thể chứa amount: "12000000" (string từ JSONB)
//
// GIẢI PHÁP VỚI exceljs:
//
//   ✅ RULE 1: Luôn dùng Number() để ép kiểu trước khi gán vào cell
//     cell.value = Number(row.netSalary)      // → exceljs ghi cell type="n" (NUMBER)
//     cell.value = Math.round(row.netSalary)  // → NUMBER, không có decimal noise
//
//   ✅ RULE 2: numFmt là FORMAT HIỂN THỊ, không ảnh hưởng type
//     cell.numFmt = '#,##0'          // Hiển thị: 12,000,000 — type vẫn NUMBER
//     cell.numFmt = '#,##0 "₫"'     // Hiển thị: 12,000,000 ₫ — SUM vẫn hoạt động!
//
//   ✅ RULE 3: Số 0 cũng phải là Number, không để null/undefined
//     cell.value = Number(row.eveningOtHours ?? 0)  // Tránh cell rỗng thành TEXT
//
//   ✅ RULE 4: Dùng SUM formula Excel thay vì tính ở JS
//     lastRow.getCell('N').value = { formula: `SUM(N5:N${dataEndRow})` }
//     → Excel tự tính, không sai dù data thay đổi
//
// KẾT QUẢ: Kế toán bôi đen → AutoSum → kết quả chính xác tuyệt đối.
// ══════════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }      from 'next/server';
import { db }                             from '@/db';
import { monthlyPayroll, users }          from '@/db/schema';
import { requireAuth }                    from '@/lib/auth';
import { eq, and, desc }                  from 'drizzle-orm';
import ExcelJS                            from 'exceljs';
import { writeHrAuditLog }                from '@/lib/hr';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** ép kiểu NUMBER an toàn — đây là hàm quan trọng nhất của toàn bộ export */
const num = (v: unknown): number => {
  const n = Number(v);
  return isNaN(n) ? 0 : Math.round(n); // Math.round: loại bỏ floating-point noise
};

const numFmt = {
  vnd:     '#,##0 "₫"',   // Currency: 12,000,000 ₫  (SUM-able)
  number:  '#,##0',        // Plain number: 12,000,000 (SUM-able)
  decimal: '#,##0.0',      // Số thập phân 1 chữ: 22.5
  date:    'dd/mm/yyyy',
};

type Cell = ExcelJS.Cell;

function styleHeaderCell(cell: Cell, bgColor = '4F46E5') {
  cell.font       = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.fill       = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bgColor}` } };
  cell.alignment  = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border     = { bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } } };
}

function styleDataCell(cell: Cell, isAlt: boolean) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'FFF8F7FF' : 'FFFFFFFF' } };
  cell.border    = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
  cell.alignment = { vertical: 'middle' };
}

function styleTotalCell(cell: Cell) {
  cell.font  = { bold: true, color: { argb: 'FF065F46' }, size: 11 };
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  cell.border = {
    top:    { style: 'medium', color: { argb: 'FF10B981' } },
    bottom: { style: 'medium', color: { argb: 'FF10B981' } },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { canExportPayroll } = await import('@/lib/permissions/checker');
  if (!(await canExportPayroll(session))) {
    return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
  }

  const url    = new URL(req.url);
  const month  = parseInt(url.searchParams.get('month') ?? String(new Date().getMonth() + 1));
  const year   = parseInt(url.searchParams.get('year')  ?? String(new Date().getFullYear()));
  const status = url.searchParams.get('status') ?? ''; // '' = all, 'PUBLISHED' = chỉ đã công bố

  // ── 1. Lấy toàn bộ dữ liệu (không phân trang) ────────────────────────────
  const conditions = [
    eq(monthlyPayroll.month, month),
    eq(monthlyPayroll.year,  year),
    ...(status ? [eq(monthlyPayroll.status, status)] : []),
  ];

  const rows = await db
    .select({
      id:                   monthlyPayroll.id,
      employeeCode:         users.employeeCode,
      employeeName:         users.name,
      department:           users.department,
      officialSalary:       monthlyPayroll.officialSalary,
      basicSalary:          monthlyPayroll.basicSalary,
      regularWorkedDays:    monthlyPayroll.regularWorkedDays,
      paidLeaveDays:        monthlyPayroll.paidLeaveDays,
      eveningOtHours:       monthlyPayroll.eveningOtHours,
      nightOtHours:         monthlyPayroll.nightOtHours,
      sundayHours:          monthlyPayroll.sundayHours,
      sundayNightHours:     monthlyPayroll.sundayNightHours,
      absentDays:           monthlyPayroll.absentDays,
      totalLateEarlyMins:   monthlyPayroll.totalLateEarlyMins,
      attendanceAllowance:  monthlyPayroll.attendanceAllowance,
      grossEarnings:        monthlyPayroll.grossEarnings,
      totalDeductions:      monthlyPayroll.totalDeductions,
      netSalary:            monthlyPayroll.netSalary,
      bhxhEmployee:         monthlyPayroll.bhxhEmployee,
      bhxhEmployer:         monthlyPayroll.bhxhEmployer,
      advanceDeduction:     monthlyPayroll.advanceDeduction,
      otherDeductions:      monthlyPayroll.otherDeductions,
      status:               monthlyPayroll.status,
      calculatedAt:         monthlyPayroll.calculatedAt,
    })
    .from(monthlyPayroll)
    .innerJoin(users, eq(monthlyPayroll.employeeId, users.id))
    .where(and(...conditions))
    .orderBy(users.department, users.name);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: `Không có dữ liệu lương tháng ${month}/${year}${status ? ` (${status})` : ''}` },
      { status: 404 }
    );
  }

  // ── 2. Tạo workbook ExcelJS ───────────────────────────────────────────────
  const wb      = new ExcelJS.Workbook();
  wb.creator    = 'HomePro Manager — Payroll System';
  wb.created    = new Date();
  wb.modified   = new Date();

  // ── SHEET 1: Bảng Lương Tổng Hợp ─────────────────────────────────────────
  const ws = wb.addWorksheet('Bảng Lương', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    properties: { defaultRowHeight: 18 },
  });

  // Cột (width tính bằng ký tự)
  ws.columns = [
    { key: 'stt',           width: 5  },  // A
    { key: 'code',          width: 12 },  // B
    { key: 'name',          width: 24 },  // C
    { key: 'dept',          width: 14 },  // D
    { key: 'official',      width: 16 },  // E
    { key: 'basic',         width: 16 },  // F
    { key: 'workedDays',    width: 12 },  // G
    { key: 'paidLeave',     width: 12 },  // H
    { key: 'totalWorkDays', width: 12 },  // I (= G + H)
    { key: 'otEveningH',    width: 10 },  // J
    { key: 'otNightH',      width: 10 },  // K
    { key: 'otSundayH',     width: 10 },  // L
    { key: 'totalOtH',      width: 10 },  // M (= J+K+L)
    { key: 'absent',        width: 10 },  // N
    { key: 'lateMins',      width: 12 },  // O
    { key: 'allowance',     width: 16 },  // P
    { key: 'gross',         width: 18 },  // Q
    { key: 'deductions',    width: 16 },  // R
    { key: 'bhxhEmp',       width: 14 },  // S
    { key: 'netSalary',     width: 18 },  // T
    { key: 'bhxhEmployer',  width: 16 },  // U
    { key: 'status',        width: 14 },  // V
  ];

  const DATA_START_ROW = 5; // Row 1-4: tiêu đề + header

  // ── Row 1: Tiêu đề file ───────────────────────────────────────────────────
  ws.mergeCells('A1:V1');
  const titleCell = ws.getCell('A1');
  titleCell.value     = `BẢNG LƯƠNG THÁNG ${month}/${year}${status === 'PUBLISHED' ? ' (ĐÃ CÔNG BỐ)' : ''}`;
  titleCell.font      = { bold: true, size: 14, color: { argb: 'FF1E1B4B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // ── Row 2: Metadata ───────────────────────────────────────────────────────
  ws.mergeCells('A2:V2');
  ws.getCell('A2').value     = `Xuất lúc: ${new Date().toLocaleString('vi-VN')} | Tổng: ${rows.length} nhân viên`;
  ws.getCell('A2').font      = { italic: true, color: { argb: 'FF6B7280' }, size: 10 };
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getRow(2).height = 16;

  // ── Row 3: Blank spacer ───────────────────────────────────────────────────
  ws.getRow(3).height = 4;

  // ── Row 4: Headers ───────────────────────────────────────────────────────
  const HEADERS = [
    'STT', 'Mã NV', 'Tên nhân viên', 'Phòng ban',
    'Lương chính thức', 'Lương cơ bản',
    'Ngày công TT', 'Ngày phép', 'Tổng công',
    'OT chiều (h)', 'OT đêm (h)', 'OT CN (h)', 'Tổng OT (h)',
    'Vắng (ngày)', 'Muộn/Sớm (phút)',
    'Phụ cấp CC',
    'Lương gộp', 'Khấu trừ', 'BHXH NV',
    'THỰC NHẬN', 'BHXH DN', 'Trạng thái',
  ];

  // Nhóm header màu sắc theo loại
  const headerColors: Record<number, string> = {
    0: '374151', 1: '374151', 2: '374151', 3: '374151', // Info
    4: '4338CA', 5: '4338CA',                              // Lương
    6: '065F46', 7: '065F46', 8: '065F46',                 // Công
    9: '92400E', 10: '92400E', 11: '92400E', 12: '92400E', // OT
    13: '991B1B', 14: '991B1B',                             // Vắng/Muộn
    15: '9D174D',                                           // Phụ cấp
    16: '1E3A5F', 17: '1E3A5F', 18: '1E3A5F',              // Gross/Deductions
    19: '065F46',                                           // Net Salary (highlight)
    20: '374151', 21: '374151',
  };

  const headerRow = ws.getRow(4);
  headerRow.height = 36;
  HEADERS.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    styleHeaderCell(cell, headerColors[i] ?? '374151');
    // Cột "THỰC NHẬN" đặc biệt — to hơn
    if (i === 19) {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
    }
  });

  // ── Rows 5+: Dữ liệu ────────────────────────────────────────────────────
  rows.forEach((row, idx) => {
    const r     = ws.addRow([]);
    const isAlt = idx % 2 === 1;
    r.height    = 20;

    // ── SELF-REVIEW ĐÃ ÁP DỤNG: num() ép kiểu NUMBER trước khi gán ──────
    // Mọi giá trị tiền tệ/số đều qua num() → exceljs ghi type='n' (NUMBER)
    // Kế toán bôi đen → SUM → kết quả đúng tuyệt đối

    const cells: [number, unknown, string?, boolean?][] = [
      [1,  idx + 1,                                 numFmt.number,  false],
      [2,  row.employeeCode ?? `EMP${row.id}`,      undefined,      false],  // Text: OK
      [3,  row.employeeName,                         undefined,      false],  // Text: OK
      [4,  row.department ?? '—',                   undefined,      false],  // Text: OK
      [5,  num(row.officialSalary),                  numFmt.vnd,     false],  // ← NUMBER
      [6,  num(row.basicSalary),                     numFmt.vnd,     false],  // ← NUMBER
      [7,  num(row.regularWorkedDays),               numFmt.decimal, false],  // ← NUMBER
      [8,  num(row.paidLeaveDays),                   numFmt.decimal, false],  // ← NUMBER
      [9,  num(row.regularWorkedDays) + num(row.paidLeaveDays), numFmt.decimal, false], // ← NUMBER
      [10, num(row.eveningOtHours),                  numFmt.decimal, false],  // ← NUMBER
      [11, num(row.nightOtHours),                    numFmt.decimal, false],  // ← NUMBER
      [12, num(row.sundayHours) + num(row.sundayNightHours), numFmt.decimal, false], // ← NUMBER
      [13, num(row.eveningOtHours) + num(row.nightOtHours) + num(row.sundayHours) + num(row.sundayNightHours), numFmt.decimal, false], // ← NUMBER
      [14, num(row.absentDays),                      numFmt.number,  false],  // ← NUMBER
      [15, num(row.totalLateEarlyMins),               numFmt.number,  false],  // ← NUMBER
      [16, num(row.attendanceAllowance),              numFmt.vnd,     false],  // ← NUMBER ✅
      [17, num(row.grossEarnings),                    numFmt.vnd,     false],  // ← NUMBER ✅
      [18, num(row.totalDeductions),                  numFmt.vnd,     false],  // ← NUMBER ✅
      [19, num(row.bhxhEmployee),                     numFmt.vnd,     false],  // ← NUMBER ✅
      [20, num(row.netSalary),                        numFmt.vnd,     true ],  // ← NUMBER ✅ HIGHLIGHT
      [21, num(row.bhxhEmployer),                     numFmt.vnd,     false],  // ← NUMBER ✅
      [22, row.status,                                undefined,      false],  // Text
    ];

    cells.forEach(([col, value, fmt, isNetSalary]) => {
      const cell      = r.getCell(col as number);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cell.value      = value as any;  // CellValue — runtime safe (string|number|formula)
      if (fmt) cell.numFmt = fmt as string;
      styleDataCell(cell, isAlt);
      // Cột Thực Nhận: highlight xanh lá
      if (isNetSalary) {
        cell.font = { bold: true, color: { argb: 'FF065F46' }, size: 12 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'FFD1FAE5' : 'FFE8FDF6' } };
      }
    });

    // Status cell: badge màu
    const statusCell = r.getCell(22);
    if (row.status === 'PUBLISHED') {
      statusCell.font = { bold: true, color: { argb: 'FF065F46' } };
    } else {
      statusCell.font = { bold: true, color: { argb: 'FF92400E' } };
    }
  });

  // ── Dòng tổng cộng (SUM formula) ────────────────────────────────────────
  const DATA_END_ROW = DATA_START_ROW + rows.length - 1;
  const totalRow     = ws.addRow([]);
  totalRow.height    = 24;

  ws.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
  const labelCell   = totalRow.getCell(1);
  labelCell.value   = `TỔNG CỘNG (${rows.length} nhân viên)`;
  labelCell.font    = { bold: true, size: 12, color: { argb: 'FF065F46' } };
  labelCell.fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  labelCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // ── SUM formulas: Excel tính không sai dù data thay đổi ─────────────────
  // Đây là "golden rule": không tính sum ở JS, để Excel tự tính
  const sumCols: [number, string][] = [
    [5,  'E'], [6,  'F'],             // Lương chính thức, cơ bản
    [7,  'G'], [8,  'H'], [9,  'I'],  // Ngày công
    [10, 'J'], [11, 'K'], [12, 'L'], [13, 'M'], // OT
    [14, 'N'], [15, 'O'],             // Vắng, Muộn
    [16, 'P'],                        // Phụ cấp
    [17, 'Q'], [18, 'R'], [19, 'S'],  // Gross, Deductions, BHXH
    [20, 'T'],                        // NET SALARY — đây là cột quan trọng nhất
    [21, 'U'],                        // BHXH DN
  ];

  sumCols.forEach(([col, letter]) => {
    const cell    = totalRow.getCell(col);
    // ExcelJS formula: { formula: 'SUM(T5:T25)' } → Excel ghi hàm SUM thật sự
    cell.value    = { formula: `SUM(${letter}${DATA_START_ROW}:${letter}${DATA_END_ROW})` };
    cell.numFmt   = col <= 9 ? numFmt.decimal : numFmt.vnd;
    styleTotalCell(cell);
    // Cột NET SALARY: extra highlight
    if (col === 20) {
      cell.font = { bold: true, size: 14, color: { argb: 'FF065F46' } };
    }
  });

  // ── Freeze panes: header cố định khi scroll ──────────────────────────────
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 4, topLeftCell: 'E5' }];

  // ── Auto filter ───────────────────────────────────────────────────────────
  ws.autoFilter = { from: 'A4', to: 'V4' };

  // ── SHEET 2: Ghi chú Công thức ───────────────────────────────────────────
  const wsNote = wb.addWorksheet('Ghi chú');
  wsNote.columns = [{ width: 30 }, { width: 70 }];
  const notes = [
    ['BẢNG LƯƠNG HOMEPRO MANAGER', `Tháng ${month}/${year}`],
    ['', ''],
    ['Lương chính thức (Official)', 'Lương bao gồm phụ cấp chức vụ — dùng để tính ngày công T2-T7'],
    ['Lương cơ bản (Basic)',        'Lương cơ bản đóng BHXH — dùng để tính OT/Lễ/CN × hệ số'],
    ['Ngày công thực tế',           'Số ngày đi làm T2-T7 đã được HR duyệt (approval=APPROVED)'],
    ['Ngày phép',                   'Số ngày phép năm/ốm đã được HR duyệt (ON_LEAVE)'],
    ['OT chiều (h)',                 '17h-22h T2-T7 × 1.5 — Nghị định 145/2020/NĐ-CP'],
    ['OT đêm (h)',                   'Sau 22h T2-T7 × 2.0'],
    ['OT CN (h)',                    'Chủ nhật × 2.0 (thường) / × 4.0 (đêm)'],
    ['Phụ cấp chuyên cần',           '0-30 phút vi phạm = 50% / 0 phút = 100% / >30 phút = 0%'],
    ['BHXH NV đóng',                 '10.5% lương cơ bản (BHXH 8% + BHYT 1.5% + BHTN 1%)'],
    ['BHXH DN đóng',                 '17.5% lương cơ bản (tham khảo — không trừ vào lương NV)'],
    ['Thực nhận',                    'Lương gộp - BHXH NV - Khấu trừ (tạm ứng, vắng, ...)'],
    ['', ''],
    ['Cơ sở pháp lý', ''],
    ['26 ngày/tháng', 'Thông tư 23/2015/TT-BLĐTBXH'],
    ['8 giờ/ngày',    'Điều 105 Bộ luật Lao động 2019'],
    ['OT tối đa',     '40 giờ/tháng — Điều 107 Bộ luật Lao động 2019'],
  ];
  notes.forEach(([key, val]) => {
    const r = wsNote.addRow([key, val]);
    if (!key && !val) return;
    r.getCell(1).font = { bold: !!key };
  });
  wsNote.getRow(1).font = { bold: true, size: 13 };

  // ── 3. Serialize workbook → Buffer ────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  await writeHrAuditLog(
    session.id,
    'PAYROLL_EXPORT',
    'monthly_payroll',
    -1,
    `Xuất file Excel bảng lương toàn công ty tháng ${month}/${year}`
  );

  const filename = `bang-luong-${String(month).padStart(2, '0')}-${year}${status === 'PUBLISHED' ? '-published' : ''}.xlsx`;

  return new NextResponse(buffer, {
    status:  200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length':      buffer.byteLength.toString(),
      'Cache-Control':       'no-store',
    },
  });
}
