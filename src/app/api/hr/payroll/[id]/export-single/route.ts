// src/app/api/hr/payroll/[id]/export-single/route.ts
// GET /api/hr/payroll/:id/export-single
// Xuất phiếu lương cá nhân với CÔNG THỨC EXCEL THỰC (không phải số cứng)
// Kiến trúc: Fixed-row layout → các ô tính toán tham chiếu ô dữ liệu bằng formula
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }     from 'next/server';
import { db }                             from '@/db';
import { monthlyPayroll, users }          from '@/db/schema';
import { eq }                             from 'drizzle-orm';
import { requireAuth }                    from '@/lib/auth';
import ExcelJS                            from 'exceljs';
import { writeHrAuditLog }                from '@/lib/hr';

const num = (v: unknown): number => Math.round(Number(v) || 0);

// ══════════════════════════════════════════════════════════════════════════
// LAYOUT CỐ ĐỊNH — Các ô dữ liệu có địa chỉ cố định để formula tham chiếu
// ══════════════════════════════════════════════════════════════════════════
//
//  D9  = Lương chính thức        → dùng tính lương ngày công + nghỉ phép
//  D10 = Lương cơ bản (BHXH)    → dùng tính OT, Lễ, BHXH
//  D13 = Ngày công thực tế
//  D14 = Ngày nghỉ phép có lương
//  D15 = OT chiều giờ
//  D16 = OT đêm giờ
//  D17 = OT Chủ Nhật giờ
//  D18 = OT Chủ Nhật đêm giờ
//  D19 = Ngày Lễ nghỉ có lương
//  D20 = Ngày vắng không phép
//  D21 = Phút muộn/về sớm
//  D25..D32 = Earnings rows       → công thức tính từ D9,D10,D13..D21
//  D33     = TỔNG THU NHẬP GỘP   → =SUM(D25:D32)
//  D37..   = Deductions rows      → BHXH dùng formula =ROUND(D10*0.105,0)
//  Dlast   = TỔNG KHẤU TRỪ       → =SUM(D37:D...)
//  Dnet    = THỰC NHẬN            → =D33-Dlast
// ══════════════════════════════════════════════════════════════════════════

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const { canExportPayroll } = await import('@/lib/permissions/checker');
  if (!(await canExportPayroll(session))) {
    return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
  }

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  const [row] = await db
    .select({
      id:                  monthlyPayroll.id,
      month:               monthlyPayroll.month,
      year:                monthlyPayroll.year,
      status:              monthlyPayroll.status,
      employeeId:          monthlyPayroll.employeeId,
      employeeName:        users.name,
      employeeCode:        users.employeeCode,
      department:          users.department,
      position:            users.position,
      officialSalary:      monthlyPayroll.officialSalary,
      basicSalary:         monthlyPayroll.basicSalary,
      regularWorkedDays:   monthlyPayroll.regularWorkedDays,
      paidLeaveDays:       monthlyPayroll.paidLeaveDays,
      eveningOtHours:      monthlyPayroll.eveningOtHours,
      nightOtHours:        monthlyPayroll.nightOtHours,
      sundayHours:         monthlyPayroll.sundayHours,
      sundayNightHours:    monthlyPayroll.sundayNightHours,
      holidayDaysOff:      monthlyPayroll.holidayDaysOff,
      absentDays:          monthlyPayroll.absentDays,
      totalLateEarlyMins:  monthlyPayroll.totalLateEarlyMins,
      attendanceAllowance: monthlyPayroll.attendanceAllowance,
      grossEarnings:       monthlyPayroll.grossEarnings,
      totalDeductions:     monthlyPayroll.totalDeductions,
      netSalary:           monthlyPayroll.netSalary,
      bhxhEmployee:        monthlyPayroll.bhxhEmployee,
      advanceDeduction:    monthlyPayroll.advanceDeduction,
      otherDeductions:     monthlyPayroll.otherDeductions,
      lineItemsJson:       monthlyPayroll.lineItemsJson,
    })
    .from(monthlyPayroll)
    .innerJoin(users, eq(monthlyPayroll.employeeId, users.id))
    .where(eq(monthlyPayroll.id, id));

  if (!row) return NextResponse.json({ error: 'Không tìm thấy phiếu lương' }, { status: 404 });

  // Parse các khoản khấu trừ NGOÀI BHXH (advance, other) từ lineItems
  interface LineItem { code: string; label: string; formula: string; amount: number; isDeduction: boolean }
  let lineItems: LineItem[] = [];
  if (row.lineItemsJson) {
    try {
      lineItems = Array.isArray(row.lineItemsJson)
        ? (row.lineItemsJson as LineItem[])
        : JSON.parse(row.lineItemsJson as string);
    } catch { lineItems = []; }
  }
  // Các khoản khấu trừ không phải BHXH (BHXH đã có formula riêng)
  const extraDeductions = lineItems.filter(li =>
    li.isDeduction && !li.code?.toLowerCase().includes('bhxh') && num(li.amount) !== 0
  );

  // ── BUILD WORKBOOK ────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HomePro Manager';
  wb.created = new Date();

  const ws = wb.addWorksheet('Phiếu Lương', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });

  ws.columns = [
    { key: 'A', width: 5  },
    { key: 'B', width: 34 },
    { key: 'C', width: 26 },
    { key: 'D', width: 20 },
  ];

  const thin: Partial<ExcelJS.Borders> = {
    top:    { style: 'thin', color: { argb: 'FFCCCCCC' } },
    left:   { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right:  { style: 'thin', color: { argb: 'FFCCCCCC' } },
  };
  const medium: Partial<ExcelJS.Borders> = {
    top:    { style: 'medium' },
    left:   { style: 'medium' },
    bottom: { style: 'medium' },
    right:  { style: 'medium' },
  };

  // ─── Helper: section header spanning A:D ─────────────────────────────────
  function sectionHeader(ws: ExcelJS.Worksheet, r: number, label: string, bg: string) {
    ws.mergeCells(`A${r}:D${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = label;
    c.font  = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    c.border = thin;
    ws.getRow(r).height = 18;
  }

  // ─── Helper: 2-col info row (B:C merged=label, D=value) ─────────────────
  // HÀNH VI: Ghi value vào ô C (merge anchor C:D). Dùng cho text fields.
  function infoRow(ws: ExcelJS.Worksheet, r: number, label: string, value: string | number, isCurrency = false) {
    ws.getRow(r).height = 15;
    const cA = ws.getCell(`A${r}`);
    cA.border = thin;

    ws.mergeCells(`B${r}:C${r}`);
    const cB = ws.getCell(`B${r}`);
    cB.value = label;
    cB.font  = { size: 10, color: { argb: 'FF4B5563' } };
    cB.alignment = { vertical: 'middle', indent: 2 };
    cB.border = thin;

    const cD = ws.getCell(`D${r}`);
    cD.value = value;
    cD.font  = { size: 10, bold: true };
    cD.alignment = { vertical: 'middle', indent: 1, horizontal: isCurrency ? 'right' : 'left' };
    cD.border = thin;
    if (isCurrency) cD.numFmt = '#,##0 "\u20ab"';
  }

  // ─── Helper: ANCHOR ROW — B=label, C=sublabel, D=number (KHÔNG merge) ────
  // QUAN TRỌNG: Value ghi thẳng vào D${r} để formula =D9/26*D13 hoạt động!
  function anchorRow(ws: ExcelJS.Worksheet, r: number, label: string, value: number) {
    ws.getRow(r).height = 15;
    const cA = ws.getCell(`A${r}`);
    cA.border = thin;

    const cB = ws.getCell(`B${r}`);
    cB.value = label;
    cB.font  = { size: 10, color: { argb: 'FF4B5563' } };
    cB.alignment = { vertical: 'middle', indent: 2 };
    cB.border = thin;

    const cC = ws.getCell(`C${r}`);
    cC.value = '← Dữ liệu anchor (formula tham chiếu ô này)';
    cC.font  = { size: 9, italic: true, color: { argb: 'FF9CA3AF' } };
    cC.alignment = { vertical: 'middle', indent: 1 };
    cC.border = thin;

    // ← GHI VÀO D${r} trực tiếp — KHÔNG merge — để =D9/26*D13 ra đúng số!
    const cD = ws.getCell(`D${r}`);
    cD.value  = value;          // JS number → Excel số (SUM được!)
    cD.numFmt = '#,##0 "\u20ab"';
    cD.font   = { size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
    cD.alignment = { horizontal: 'right', vertical: 'middle' };
    cD.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    cD.border = { ...thin, left: { style: 'medium', color: { argb: 'FF3B82F6' } } };
  }

  // ─── Helper: data-input row (B=label, C=sub-label, D=value number) ───────
  function dataRow(ws: ExcelJS.Worksheet, r: number, label: string, sub: string, value: number, fmt = '#,##0') {
    ws.getRow(r).height = 15;
    const cA = ws.getCell(`A${r}`);
    cA.border = thin;

    const cB = ws.getCell(`B${r}`);
    cB.value = label;
    cB.font  = { size: 10 };
    cB.alignment = { vertical: 'middle', indent: 2 };
    cB.border = thin;

    const cC = ws.getCell(`C${r}`);
    cC.value = sub;
    cC.font  = { size: 9, italic: true, color: { argb: 'FF6B7280' } };
    cC.alignment = { vertical: 'middle', indent: 1 };
    cC.border = thin;

    const cD = ws.getCell(`D${r}`);
    cD.value = value;
    cD.numFmt = fmt;
    cD.font   = { size: 10, bold: true };
    cD.alignment = { horizontal: 'right', vertical: 'middle' };
    cD.border = thin;
  }

  // ─── Helper: formula row ─────────────────────────────────────────────────
  function formulaRow(
    ws: ExcelJS.Worksheet,
    r: number,
    stt: string | number,
    label: string,
    formulaDisplay: string,   // Hiển thị ở cột C (dạng đọc được)
    excelFormula: string,     // Formula thực cho Excel
    cachedResult: number,     // Cached result để Excel không cần recalculate
    opts: { bold?: boolean; green?: boolean; red?: boolean; bg?: string } = {}
  ) {
    ws.getRow(r).height = 16;

    const cA = ws.getCell(`A${r}`);
    cA.value = stt;
    cA.font  = { size: 9, color: { argb: 'FF9CA3AF' } };
    cA.alignment = { horizontal: 'center', vertical: 'middle' };
    cA.border = thin;

    const cB = ws.getCell(`B${r}`);
    cB.value = label;
    cB.font  = { size: 10, bold: opts.bold };
    cB.alignment = { vertical: 'middle', indent: 1 };
    cB.border = thin;

    const cC = ws.getCell(`C${r}`);
    cC.value = formulaDisplay;
    cC.font  = { size: 9, italic: true, color: { argb: 'FF6366F1' } };  // indigo = công thức
    cC.alignment = { vertical: 'middle', indent: 1 };
    cC.border = thin;

    const cD = ws.getCell(`D${r}`);
    // Gán CÔNG THỨC THỰC — Excel sẽ tính khi mở file
    cD.value  = { formula: excelFormula, result: cachedResult };
    cD.numFmt = '#,##0 "₫"';
    cD.font   = {
      size:  opts.bold ? 11 : 10,
      bold:  opts.bold,
      color: { argb: opts.green ? 'FF059669' : opts.red ? 'FFEF4444' : 'FF111827' },
    };
    cD.alignment = { horizontal: 'right', vertical: 'middle' };
    cD.border = thin;

    if (opts.bg) {
      [cA, cB, cC, cD].forEach(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg! } };
      });
    }
  }

  // ─── Helper: value row (hardcoded number, no formula) ────────────────────
  function valueRow(
    ws: ExcelJS.Worksheet,
    r: number,
    stt: string | number,
    label: string,
    description: string,
    value: number,
    opts: { bold?: boolean; green?: boolean; red?: boolean; bg?: string } = {}
  ) {
    ws.getRow(r).height = 16;

    const cA = ws.getCell(`A${r}`);
    cA.value = stt;
    cA.font  = { size: 9, color: { argb: 'FF9CA3AF' } };
    cA.alignment = { horizontal: 'center', vertical: 'middle' };
    cA.border = thin;

    const cB = ws.getCell(`B${r}`);
    cB.value = label;
    cB.font  = { size: 10, bold: opts.bold };
    cB.alignment = { vertical: 'middle', indent: 1 };
    cB.border = thin;

    const cC = ws.getCell(`C${r}`);
    cC.value = description;
    cC.font  = { size: 9, italic: true, color: { argb: 'FF6B7280' } };
    cC.alignment = { vertical: 'middle', indent: 1 };
    cC.border = thin;

    const cD = ws.getCell(`D${r}`);
    cD.value  = value;
    cD.numFmt = '#,##0 "₫"';
    cD.font   = {
      size:  opts.bold ? 11 : 10,
      bold:  opts.bold,
      color: { argb: opts.green ? 'FF059669' : opts.red ? 'FFEF4444' : 'FF111827' },
    };
    cD.alignment = { horizontal: 'right', vertical: 'middle' };
    cD.border = thin;

    if (opts.bg) {
      [cA, cB, cC, cD].forEach(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg! } };
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ROW 1-2: TIÊU ĐỀ
  // ══════════════════════════════════════════════════════════════════════════
  ws.mergeCells('A1:D1');
  const h1 = ws.getCell('A1');
  h1.value = 'HOMEPRO MANAGER — PHIẾU LƯƠNG NHÂN VIÊN';
  h1.font  = { bold: true, size: 13, color: { argb: 'FF6366F1' } };
  h1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
  h1.alignment = { horizontal: 'center', vertical: 'middle' };
  h1.border = medium;
  ws.getRow(1).height = 26;

  ws.mergeCells('A2:D2');
  const h2 = ws.getCell('A2');
  h2.value = `THÁNG ${row.month}/${row.year}  ·  ${row.status === 'PUBLISHED' ? '✅ ĐÃ CÔNG BỐ' : '📝 NHÁP'}`;
  h2.font  = { bold: true, size: 11, color: { argb: row.status === 'PUBLISHED' ? 'FF059669' : 'FFD97706' } };
  h2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: row.status === 'PUBLISHED' ? 'FFF0FDF4' : 'FFFEFCE8' } };
  h2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  ws.getRow(3).height = 6;  // spacer

  // ══════════════════════════════════════════════════════════════════════════
  // ROW 4-10: THÔNG TIN NHÂN VIÊN (fixed rows — D9, D10 là anchor chính)
  // ══════════════════════════════════════════════════════════════════════════
  sectionHeader(ws, 4, '👤  THÔNG TIN NHÂN VIÊN', '4F46E5');
  infoRow(ws, 5,  'Họ và tên',               row.employeeName ?? '—');
  infoRow(ws, 6,  'Mã nhân viên',             row.employeeCode ?? '—');
  infoRow(ws, 7,  'Phòng ban',                row.department   ?? '—');
  infoRow(ws, 8,  'Chức vụ',                  row.position     ?? '—');
  anchorRow(ws, 9,  'Lương chính thức',        num(row.officialSalary));   // ← D9 anchor
  anchorRow(ws, 10, 'Lương cơ bản (BHXH)',     num(row.basicSalary));      // ← D10 anchor

  ws.getRow(11).height = 6;  // spacer

  // ══════════════════════════════════════════════════════════════════════════
  // ROW 12-21: DỮ LIỆU CHẤM CÔNG (D13..D21 — anchor cho earnings formulas)
  // ══════════════════════════════════════════════════════════════════════════
  sectionHeader(ws, 12, '📋  DỮ LIỆU CHẤM CÔNG', '0284C7');
  dataRow(ws, 13, 'Ngày công thực tế',          'ngày làm việc',               num(row.regularWorkedDays));    // D13
  dataRow(ws, 14, 'Ngày nghỉ phép có lương',     'PAID_LEAVE',                  num(row.paidLeaveDays));        // D14
  dataRow(ws, 15, 'OT chiều (giờ)',              '1.5× lương giờ',              num(row.eveningOtHours));       // D15
  dataRow(ws, 16, 'OT đêm (giờ)',               '2.0× lương giờ',              num(row.nightOtHours));         // D16
  dataRow(ws, 17, 'OT Chủ Nhật (giờ)',           '2.0× lương giờ',              num(row.sundayHours));          // D17
  dataRow(ws, 18, 'OT Chủ Nhật đêm (giờ)',       '4.0× lương giờ',              num(row.sundayNightHours));     // D18
  dataRow(ws, 19, 'Ngày Lễ nghỉ có lương',       'hưởng lương',                 num(row.holidayDaysOff));       // D19
  dataRow(ws, 20, 'Ngày vắng không phép',         'trừ lương',                   num(row.absentDays));           // D20
  dataRow(ws, 21, 'Phút muộn/về sớm',             'ảnh hưởng phụ cấp CC',       num(row.totalLateEarlyMins));  // D21

  ws.getRow(22).height = 6;  // spacer

  // ══════════════════════════════════════════════════════════════════════════
  // ROW 23-33: THU NHẬP — Earnings với CÔNG THỨC EXCEL THỰC
  // ══════════════════════════════════════════════════════════════════════════
  sectionHeader(ws, 23, '💰  THU NHẬP', '059669');

  // Column headers
  ws.getRow(24).height = 16;
  ['STT', 'Khoản mục', 'Công thức tính', 'Số tiền (đ)'].forEach((h, i) => {
    const c = ws.getCell(24, i + 1);
    c.value = h;
    c.font  = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    c.alignment = { horizontal: i === 3 ? 'right' : 'center', vertical: 'middle' };
    c.border = thin;
  });

  // Tính cached results để Excel không hiện #VALUE! khi mở
  const ofc = num(row.officialSalary);
  const bas = num(row.basicSalary);
  const wkd = num(row.regularWorkedDays);
  const plv = num(row.paidLeaveDays);
  const evt = num(row.eveningOtHours);
  const ngt = num(row.nightOtHours);
  const snt = num(row.sundayHours);
  const snd = num(row.sundayNightHours);
  const hol = num(row.holidayDaysOff);
  const abs = num(row.absentDays);
  const lat = num(row.totalLateEarlyMins);

  // ── Earnings rows (ROW 25-32) ────────────────────────────────────────────
  // ROW 25: Lương ngày công = officialSalary / 26 × workedDays
  formulaRow(ws, 25, 1,
    'Lương ngày công (T2-T7)',
    '=D9/26×D13 (ngày công × lương ngày)',
    '=ROUND(D9/26*D13,0)',
    Math.round(ofc / 26 * wkd),
    { bg: 'FFF0FDF4' }
  );

  // ROW 26: Lương phép năm = officialSalary / 26 × paidLeaveDays
  formulaRow(ws, 26, 2,
    'Lương phép năm (ON_LEAVE)',
    '=D9/26×D14 (ngày phép có hưởng lương)',
    '=ROUND(D9/26*D14,0)',
    Math.round(ofc / 26 * plv),
    { bg: 'FFFFFFFF' }
  );

  // ROW 27: OT chiều 1.5x = basicSalary / 26 / 8 × hours × 1.5
  formulaRow(ws, 27, 3,
    'Lương OT chiều/tối T2-T7 (17h-22h) × 1.5',
    '=D10/26/8×D15×1.5 (lương giờ OT chiều)',
    '=ROUND(D10/26/8*D15*1.5,0)',
    Math.round(bas / 26 / 8 * evt * 1.5),
    { bg: 'FFF0FDF4' }
  );

  // ROW 28: OT đêm 2.0x = basicSalary / 26 / 8 × hours × 2.0
  formulaRow(ws, 28, 4,
    'Lương OT đêm T2-T7 (sau 22h) × 2.0',
    '=D10/26/8×D16×2.0 (lương giờ OT đêm)',
    '=ROUND(D10/26/8*D16*2,0)',
    Math.round(bas / 26 / 8 * ngt * 2),
    { bg: 'FFFFFFFF' }
  );

  // ROW 29: OT Chủ Nhật 2.0x = basicSalary / 26 / 8 × hours × 2.0
  formulaRow(ws, 29, 5,
    'Lương Chủ Nhật (<22h) × 2.0',
    '=D10/26/8×D17×2.0 (lương giờ OT Chủ Nhật)',
    '=ROUND(D10/26/8*D17*2,0)',
    Math.round(bas / 26 / 8 * snt * 2),
    { bg: 'FFF0FDF4' }
  );

  // ROW 30: OT Chủ Nhật đêm 4.0x = basicSalary / 26 / 8 × hours × 4.0
  formulaRow(ws, 30, 6,
    'Lương Chủ Nhật đêm (≥22h) × 4.0',
    '=D10/26/8×D18×4.0 (lương giờ OT CN đêm)',
    '=ROUND(D10/26/8*D18*4,0)',
    Math.round(bas / 26 / 8 * snd * 4),
    { bg: 'FFFFFFFF' }
  );

  // ROW 31: Lương ngày Lễ = basicSalary / 26 × holidayDays (đã nghỉ có hưởng lương)
  formulaRow(ws, 31, 7,
    'Lương ngày Lễ (nghỉ có hưởng lương)',
    '=D10/26×D19 (ngày Lễ được hưởng lương)',
    '=ROUND(D10/26*D19,0)',
    Math.round(bas / 26 * hol),
    { bg: 'FFF0FDF4' }
  );

  // ROW 32: Phụ cấp chuyên cần — hardcode vì phụ thuộc cấu hình từng NV
  // (Max allowance không lưu riêng → dùng giá trị đã tính + mô tả quy tắc)
  valueRow(ws, 32, 8,
    `Phụ cấp chuyên cần (${lat === 0 ? '100%' : lat <= 15 ? '75%' : lat <= 30 ? '50%' : '0%'} — ${lat} phút vi phạm)`,
    lat === 0 ? 'Không vi phạm → 100% phụ cấp CC'
              : lat <= 15 ? `${lat} phút → 75% phụ cấp CC`
              : lat <= 30 ? `${lat} phút → 50% phụ cấp CC`
              : `${lat} phút >30 → MẤT phụ cấp CC`,
    num(row.attendanceAllowance),
    { bg: 'FFFFFFFF' }
  );

  // ROW 33: TỔNG THU NHẬP GỘP = SUM(D25:D32)
  formulaRow(ws, 33, 'Σ',
    'TỔNG THU NHẬP GỘP',
    '=SUM(D25:D32)',
    '=SUM(D25:D32)',
    num(row.grossEarnings),
    { bold: true, green: true, bg: 'FFD1FAE5' }
  );

  ws.getRow(34).height = 6;  // spacer

  // ══════════════════════════════════════════════════════════════════════════
  // ROW 35-...: KHẤU TRỪ — Deductions với CÔNG THỨC EXCEL THỰC
  // ══════════════════════════════════════════════════════════════════════════
  sectionHeader(ws, 35, '📉  KHẤU TRỪ', 'DC2626');

  // Column headers
  ws.getRow(36).height = 16;
  ['STT', 'Khoản mục', 'Công thức tính', 'Số tiền (đ)'].forEach((h, i) => {
    const c = ws.getCell(36, i + 1);
    c.value = h;
    c.font  = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
    c.alignment = { horizontal: i === 3 ? 'right' : 'center', vertical: 'middle' };
    c.border = thin;
  });

  // ROW 37: BHXH + BHYT + BHTN = basicSalary × 10.5%
  formulaRow(ws, 37, 1,
    'Trừ: BHXH + BHYT + BHTN nhân viên (10.5%)',
    '=D10×10.5% (BHXH 8% + BHYT 1.5% + BHTN 1%)',
    '=ROUND(D10*0.105,0)',
    num(row.bhxhEmployee),
    { red: true, bg: 'FFFFF1F2' }
  );

  // Extra deductions (vắng không phép, tạm ứng, v.v.) — hardcode từ lineItems
  let deductRow = 38;
  let extraIdx  = 2;

  // Vắng không phép tính bằng formula nếu absentDays > 0
  if (abs > 0) {
    formulaRow(ws, deductRow, extraIdx,
      `Trừ lương vắng không phép (${abs} ngày)`,
      '=D9/26×D20 (trừ ngày vắng không phép)',
      '=ROUND(D9/26*D20,0)',
      Math.round(ofc / 26 * abs),
      { red: true, bg: 'FFFFFFFF' }
    );
    deductRow++; extraIdx++;
  }

  // Các khoản khấu trừ khác từ lineItems (tạm ứng, phạt, v.v.)
  for (const li of extraDeductions) {
    if (li.code === 'DEDUCT_ABSENT') continue; // đã xử lý ở trên
    valueRow(ws, deductRow, extraIdx,
      li.label,
      li.formula || 'Theo quy định',
      num(li.amount),
      { red: true, bg: deductRow % 2 === 0 ? 'FFFFF1F2' : 'FFFFFFFF' }
    );
    deductRow++; extraIdx++;
  }

  // TỔNG KHẤU TRỪ = SUM(D37:D{deductRow-1})
  const totalDeductRowNum = deductRow;
  formulaRow(ws, totalDeductRowNum, 'Σ',
    'TỔNG KHẤU TRỪ',
    `=SUM(D37:D${deductRow - 1})`,
    `=SUM(D37:D${deductRow - 1})`,
    num(row.totalDeductions),
    { bold: true, red: true, bg: 'FFFEE2E2' }
  );

  ws.getRow(totalDeductRowNum + 1).height = 6;  // spacer

  // ══════════════════════════════════════════════════════════════════════════
  // THỰC NHẬN = D33 - D{totalDeductRowNum}  ← CÔNG THỨC LIÊN KẾT
  // ══════════════════════════════════════════════════════════════════════════
  const netRowNum = totalDeductRowNum + 2;
  ws.getRow(netRowNum).height = 28;
  ws.mergeCells(`A${netRowNum}:C${netRowNum}`);
  const cNetL = ws.getCell(`A${netRowNum}`);
  cNetL.value = `💵  LƯƠNG THỰC NHẬN THÁNG ${row.month}/${row.year}`;
  cNetL.font  = { bold: true, size: 13, color: { argb: 'FF065F46' } };
  cNetL.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  cNetL.alignment = { vertical: 'middle', horizontal: 'center' };
  cNetL.border = medium;

  const cNetR = ws.getCell(`D${netRowNum}`);
  // CÔNG THỨC: Thực nhận = Tổng thu nhập gộp - Tổng khấu trừ
  cNetR.value  = { formula: `=D33-D${totalDeductRowNum}`, result: num(row.netSalary) };
  cNetR.numFmt = '#,##0 "₫"';
  cNetR.font   = { bold: true, size: 14, color: { argb: 'FF059669' } };
  cNetR.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  cNetR.alignment = { horizontal: 'right', vertical: 'middle' };
  cNetR.border = medium;

  // Ghi chú công thức nhỏ
  const noteRow = netRowNum + 1;
  ws.getRow(noteRow).height = 12;
  ws.mergeCells(`A${noteRow}:D${noteRow}`);
  const cNote = ws.getCell(`A${noteRow}`);
  cNote.value = `Công thức: =D33 (Tổng gộp) − D${totalDeductRowNum} (Tổng khấu trừ)  ·  Ngày in: ${new Date().toLocaleString('vi-VN')}`;
  cNote.font  = { italic: true, size: 9, color: { argb: 'FF9CA3AF' } };
  cNote.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.getRow(noteRow + 1).height = 8;  // spacer

  // ─── Ký tên ──────────────────────────────────────────────────────────────
  const sigRow = noteRow + 2;
  ws.getRow(sigRow).height = 14;
  ['', 'Nhân viên xác nhận', 'Kế toán trưởng', 'Giám đốc duyệt'].forEach((t, i) => {
    const c = ws.getCell(sigRow, i + 1);
    c.value = t; c.font = { bold: true, size: 10 };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  [sigRow + 1, sigRow + 2, sigRow + 3, sigRow + 4].forEach(r => { ws.getRow(r).height = 36; });

  const subRow = sigRow + 5;
  ws.getRow(subRow).height = 12;
  ['', '(Ký và ghi rõ họ tên)', '(Ký và ghi rõ họ tên)', '(Ký và đóng dấu)'].forEach((t, i) => {
    const c = ws.getCell(subRow, i + 1);
    c.value = t; c.font = { italic: true, size: 9, color: { argb: 'FF9CA3AF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // ── EXPORT ────────────────────────────────────────────────────────────────
  const buffer   = await wb.xlsx.writeBuffer();
  const empCode  = row.employeeCode ?? `EMP${row.employeeId}`;
  
  await writeHrAuditLog(
    session.id,
    'PAYROLL_EXPORT',
    'monthly_payroll',
    row.id,
    `Xuất file Excel phiếu lương cá nhân cho nhân viên ${empCode} tháng ${row.month}/${row.year}`
  );
  const filename = `phieu-luong-${empCode}-T${String(row.month).padStart(2,'0')}-${row.year}.xlsx`;

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control':       'no-store',
    },
  });
}
