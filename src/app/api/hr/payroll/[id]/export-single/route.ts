// src/app/api/hr/payroll/[id]/export-single/route.ts
// GET /api/hr/payroll/:id/export-single
// Xuất phiếu lương cá nhân 1 nhân viên ra file Excel (.xlsx)
// Định dạng: Phiếu lương chi tiết có đầy đủ công thức, logo, ký tên
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }    from 'next/server';
import { db }                            from '@/db';
import { monthlyPayroll, users }         from '@/db/schema';
import { eq }                            from 'drizzle-orm';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';
import ExcelJS                           from 'exceljs';

// ─── Helper: ép kiểu number an toàn (tránh floating-point noise) ─────────────
const num = (v: unknown): number => Math.round(Number(v) || 0);
const vndStr = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

interface LineItem {
  code:        string;
  label:       string;
  formula:     string;
  amount:      number;
  isDeduction: boolean;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  // ── Lấy dữ liệu phiếu lương + thông tin nhân viên ───────────────────────
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
      bhxhEmployer:        monthlyPayroll.bhxhEmployer,
      advanceDeduction:    monthlyPayroll.advanceDeduction,
      otherDeductions:     monthlyPayroll.otherDeductions,
      lineItemsJson:       monthlyPayroll.lineItemsJson,
      publishedAt:         monthlyPayroll.publishedAt,
    })
    .from(monthlyPayroll)
    .innerJoin(users, eq(monthlyPayroll.employeeId, users.id))
    .where(eq(monthlyPayroll.id, id));

  if (!row) return NextResponse.json({ error: 'Không tìm thấy phiếu lương' }, { status: 404 });

  // ── Parse line items ─────────────────────────────────────────────────────
  let lineItems: LineItem[] = [];
  if (row.lineItemsJson) {
    try {
      lineItems = Array.isArray(row.lineItemsJson)
        ? (row.lineItemsJson as LineItem[])
        : JSON.parse(row.lineItemsJson as string);
    } catch { lineItems = []; }
  }

  const earnings   = lineItems.filter(li => !li.isDeduction);
  const deductions = lineItems.filter(li =>  li.isDeduction);

  // ══════════════════════════════════════════════════════════════════════════
  // XÂY DỰNG FILE EXCEL
  // ══════════════════════════════════════════════════════════════════════════
  const wb = new ExcelJS.Workbook();
  wb.creator     = 'HomePro Manager';
  wb.created     = new Date();
  wb.modified    = new Date();
  wb.properties.date1904 = false;

  const ws = wb.addWorksheet('Phiếu Lương', {
    pageSetup: {
      paperSize:   9,   // A4
      orientation: 'portrait',
      fitToPage:   true,
      fitToWidth:  1,
      fitToHeight: 0,
    },
  });

  // ── Column widths ────────────────────────────────────────────────────────
  ws.columns = [
    { key: 'A', width: 4  },   // STT / indent
    { key: 'B', width: 32 },   // Label
    { key: 'C', width: 24 },   // Công thức
    { key: 'D', width: 18 },   // Số tiền
  ];

  // ─── BORDER STYLES ────────────────────────────────────────────────────────
  const thinBorder: Partial<ExcelJS.Borders> = {
    top:    { style: 'thin', color: { argb: 'FFCCCCCC' } },
    left:   { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right:  { style: 'thin', color: { argb: 'FFCCCCCC' } },
  };

  let curRow = 1;

  // ── Helper: add section header ────────────────────────────────────────────
  const sectionHeader = (label: string, color: string) => {
    const r = ws.getRow(curRow++);
    ws.mergeCells(`A${r.number}:D${r.number}`);
    const cell = r.getCell(1);
    cell.value = label;
    cell.font  = { bold: true, color: { argb: 'FF' + color.replace('#','') }, size: 10 };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color.replace('#','') + '22' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    r.height = 18;
  };

  // ── Helper: add data row ──────────────────────────────────────────────────
  const dataRow = (
    stt: string | number,
    label: string,
    formula: string,
    amount: number,
    opts: { bold?: boolean; green?: boolean; red?: boolean; bg?: string } = {}
  ) => {
    const r = ws.getRow(curRow++);
    r.height = 16;

    const cA = r.getCell(1);
    cA.value = stt;
    cA.font  = { size: 9, color: { argb: 'FF888888' } };
    cA.alignment = { horizontal: 'center', vertical: 'middle' };

    const cB = r.getCell(2);
    cB.value = label;
    cB.font  = { size: 10, bold: opts.bold };
    cB.alignment = { vertical: 'middle', indent: 1 };

    const cC = r.getCell(3);
    cC.value = formula;
    cC.font  = { size: 9, color: { argb: 'FF666666' }, italic: true };
    cC.alignment = { vertical: 'middle', indent: 1 };

    const cD = r.getCell(4);
    cD.value = num(amount);   // ← JS number, không phải string!
    cD.numFmt = '#,##0 [$₫-42A]';
    cD.font  = {
      size:  opts.bold ? 11 : 10,
      bold:  opts.bold,
      color: { argb: opts.green ? 'FF059669' : opts.red ? 'FFEF4444' : 'FF1F2937' },
    };
    cD.alignment = { horizontal: 'right', vertical: 'middle' };

    if (opts.bg) {
      [cA, cB, cC, cD].forEach(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg! } };
      });
    }

    [cA, cB, cC, cD].forEach(c => { c.border = thinBorder; });
    return r;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER — Tiêu đề phiếu lương
  // ══════════════════════════════════════════════════════════════════════════
  // Row 1: Company name
  ws.mergeCells('A1:D1');
  const compCell = ws.getCell('A1');
  compCell.value = 'HOMEPRO MANAGER — PHIẾU LƯƠNG NHÂN VIÊN';
  compCell.font  = { bold: true, size: 13, color: { argb: 'FF6366F1' } };
  compCell.alignment = { horizontal: 'center', vertical: 'middle' };
  compCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
  ws.getRow(1).height = 28;
  curRow = 2;

  // Row 2: Tháng/Năm + Trạng thái
  ws.mergeCells('A2:D2');
  const periodCell = ws.getCell('A2');
  periodCell.value = `THÁNG ${row.month}/${row.year}  ·  ${row.status === 'PUBLISHED' ? '✅ ĐÃ CÔNG BỐ' : '📝 NHÁP'}`;
  periodCell.font  = { bold: true, size: 11, color: { argb: row.status === 'PUBLISHED' ? 'FF059669' : 'FFD97706' } };
  periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;
  curRow = 3;

  // Row 3: spacer
  ws.getRow(curRow++).height = 6;

  // ══════════════════════════════════════════════════════════════════════════
  // THÔNG TIN NHÂN VIÊN
  // ══════════════════════════════════════════════════════════════════════════
  sectionHeader('👤  THÔNG TIN NHÂN VIÊN', '6366F1');

  const empInfoRows: [string, string][] = [
    ['Họ và tên',        row.employeeName ?? '—'],
    ['Mã nhân viên',     row.employeeCode ?? '—'],
    ['Phòng ban',        row.department   ?? '—'],
    ['Chức vụ',          row.position     ?? '—'],
    ['Lương chính thức', vndStr(num(row.officialSalary))],
    ['Lương cơ bản (BHXH)', vndStr(num(row.basicSalary))],
  ];

  for (const [label, val] of empInfoRows) {
    const r = ws.getRow(curRow++);
    r.height = 15;
    ws.mergeCells(`A${r.number}:B${r.number}`);
    const cL = r.getCell(1);
    cL.value = label;
    cL.font  = { size: 10, color: { argb: 'FF555555' } };
    cL.alignment = { vertical: 'middle', indent: 2 };

    ws.mergeCells(`C${r.number}:D${r.number}`);
    const cV = r.getCell(3);
    cV.value = val;
    cV.font  = { size: 10, bold: true };
    cV.alignment = { vertical: 'middle', indent: 1 };

    [cL, cV].forEach(c => { c.border = thinBorder; });
  }

  // spacer
  ws.getRow(curRow++).height = 8;

  // ══════════════════════════════════════════════════════════════════════════
  // DỮ LIỆU CHẤM CÔNG
  // ══════════════════════════════════════════════════════════════════════════
  sectionHeader('📋  DỮ LIỆU CHẤM CÔNG', '0EA5E9');

  const attendRows: [string, string, string | number][] = [
    ['Ngày công thực tế',     'ngày làm việc',          num(row.regularWorkedDays)],
    ['Ngày nghỉ phép có lương','PAID_LEAVE',             num(row.paidLeaveDays)],
    ['OT chiều (giờ)',         '1.5× lương giờ',        num(row.eveningOtHours)],
    ['OT đêm (giờ)',           '2.0× lương giờ',        num(row.nightOtHours)],
    ['OT Chủ Nhật (giờ)',      '2.0× lương giờ',        num(row.sundayHours)],
    ['OT Chủ Nhật đêm (giờ)', '4.0× lương giờ',        num(row.sundayNightHours)],
    ['Ngày Lễ nghỉ',           'hưởng lương',           num(row.holidayDaysOff)],
    ['Ngày vắng không phép',   'trừ lương',             num(row.absentDays)],
    ['Phút muộn/về sớm',       'ảnh hưởng phụ cấp CC', num(row.totalLateEarlyMins)],
  ];

  for (const [label, formula, val] of attendRows) {
    const r = ws.getRow(curRow++);
    r.height = 15;

    const cA = r.getCell(1);
    const cB = r.getCell(2);
    const cC = r.getCell(3);
    const cD = r.getCell(4);

    cA.value = '';
    cB.value = label;      cB.font = { size: 10 }; cB.alignment = { vertical: 'middle', indent: 2 };
    cC.value = formula;    cC.font = { size: 9, italic: true, color: { argb: 'FF888888' } }; cC.alignment = { vertical: 'middle', indent: 1 };
    cD.value = typeof val === 'number' ? val : val;
    cD.font  = { size: 10, bold: true };
    cD.alignment = { horizontal: 'right', vertical: 'middle' };
    cD.numFmt = '#,##0';

    [cA, cB, cC, cD].forEach(c => { c.border = thinBorder; });
  }

  ws.getRow(curRow++).height = 8;

  // ══════════════════════════════════════════════════════════════════════════
  // THU NHẬP (earnings line items)
  // ══════════════════════════════════════════════════════════════════════════
  sectionHeader('💰  THU NHẬP', '10B981');

  // Header row
  {
    const r = ws.getRow(curRow++);
    r.height = 16;
    ['STT', 'Khoản mục', 'Công thức tính', 'Số tiền (₫)'].forEach((h, i) => {
      const c = r.getCell(i + 1);
      c.value = h;
      c.font  = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      c.alignment = { horizontal: i === 3 ? 'right' : 'center', vertical: 'middle' };
      c.border = thinBorder;
    });
  }

  let totalEarnings = 0;
  earnings.forEach((li, idx) => {
    const amt = num(li.amount);
    totalEarnings += amt;
    const bg = idx % 2 === 0 ? 'FFF0FDF4' : 'FFFFFFFF';
    dataRow(idx + 1, li.label, li.formula, amt, { bg });
  });

  // Tổng thu nhập
  dataRow('Σ', 'TỔNG THU NHẬP GỘP', '', num(row.grossEarnings), { bold: true, green: true, bg: 'FFD1FAE5' });

  ws.getRow(curRow++).height = 8;

  // ══════════════════════════════════════════════════════════════════════════
  // KHẤU TRỪ (deduction line items)
  // ══════════════════════════════════════════════════════════════════════════
  sectionHeader('📉  KHẤU TRỪ', 'EF4444');

  {
    const r = ws.getRow(curRow++);
    r.height = 16;
    ['STT', 'Khoản mục', 'Công thức tính', 'Số tiền (₫)'].forEach((h, i) => {
      const c = r.getCell(i + 1);
      c.value = h;
      c.font  = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
      c.alignment = { horizontal: i === 3 ? 'right' : 'center', vertical: 'middle' };
      c.border = thinBorder;
    });
  }

  deductions.forEach((li, idx) => {
    const amt = num(li.amount);
    const bg = idx % 2 === 0 ? 'FFFFF1F2' : 'FFFFFFFF';
    dataRow(idx + 1, li.label, li.formula, amt, { bg, red: true });
  });

  // Tổng khấu trừ
  dataRow('Σ', 'TỔNG KHẤU TRỪ', '', num(row.totalDeductions), { bold: true, red: true, bg: 'FFFEE2E2' });

  ws.getRow(curRow++).height = 8;

  // ══════════════════════════════════════════════════════════════════════════
  // THỰC NHẬN — highlighted row
  // ══════════════════════════════════════════════════════════════════════════
  {
    const r = ws.getRow(curRow++);
    r.height = 28;
    ws.mergeCells(`A${r.number}:C${r.number}`);
    const cL = r.getCell(1);
    cL.value = '💵  LƯƠNG THỰC NHẬN THÁNG ' + `${row.month}/${row.year}`;
    cL.font  = { bold: true, size: 13, color: { argb: 'FF065F46' } };
    cL.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    cL.alignment = { vertical: 'middle', horizontal: 'center' };
    cL.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'thin' } };

    const cD = r.getCell(4);
    cD.value  = num(row.netSalary);
    cD.numFmt = '#,##0 [$₫-42A]';
    cD.font   = { bold: true, size: 14, color: { argb: 'FF059669' } };
    cD.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    cD.alignment = { horizontal: 'right', vertical: 'middle' };
    cD.border = { top: { style: 'medium' }, right: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' } };
  }

  ws.getRow(curRow++).height = 12;

  // ══════════════════════════════════════════════════════════════════════════
  // GHI CHÚ + CHỮ KÝ
  // ══════════════════════════════════════════════════════════════════════════
  {
    const r = ws.getRow(curRow++);
    r.height = 14;
    ws.mergeCells(`A${r.number}:D${r.number}`);
    const c = r.getCell(1);
    c.value = `Ngày in: ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}  ·  Hệ thống: HomePro Manager`;
    c.font  = { italic: true, size: 9, color: { argb: 'FF9CA3AF' } };
    c.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  ws.getRow(curRow++).height = 8;

  // Chữ ký
  {
    const r = ws.getRow(curRow++);
    r.height = 14;
    const titles = ['', 'Nhân viên xác nhận', 'Kế toán trưởng', 'Giám đốc duyệt'];
    titles.forEach((t, i) => {
      const c = r.getCell(i + 1);
      c.value = t;
      c.font  = { bold: true, size: 10 };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  }

  for (let i = 0; i < 4; i++) {
    ws.getRow(curRow++).height = 40; // space ký tên
  }

  {
    const r = ws.getRow(curRow++);
    r.height = 14;
    const subs = ['', '(Ký và ghi rõ họ tên)', '(Ký và ghi rõ họ tên)', '(Ký và đóng dấu)'];
    subs.forEach((t, i) => {
      const c = r.getCell(i + 1);
      c.value = t;
      c.font  = { italic: true, size: 9, color: { argb: 'FF9CA3AF' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════════════════
  const buffer   = await wb.xlsx.writeBuffer();
  const empCode  = row.employeeCode ?? `EMP${row.employeeId}`;
  const filename = `phieu-luong-${empCode}-T${String(row.month).padStart(2,'0')}-${row.year}.xlsx`;

  // Dùng Uint8Array thay Buffer để tương thích NextResponse BodyInit type
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control':       'no-store',
    },
  });
}
