// src/app/api/hr/payroll/calculate/route.ts
// POST /api/hr/payroll/calculate
// Body: { month: number, year: number }
// ──────────────────────────────────────────────────────────────────────────────
// Chạy calculateMonthlyPayroll() cho TẤT CẢ nhân viên ACTIVE của tháng.
// Kết quả lưu vào monthly_payroll với status = 'DRAFT' (chưa công bố).
// ──────────────────────────────────────────────────────────────────────────────
// THIẾT KẾ:
// 1. Lấy danh sách nhân viên ACTIVE có lương > 0
// 2. Aggregate attendance trong tháng (GROUP BY employee_id)
// 3. Aggregate leave requests đã duyệt (PAID LEAVE days)
// 4. Gọi calculateMonthlyPayroll() → PayrollResult
// 5. UPSERT vào monthly_payroll (ON CONFLICT employee+month+year → UPDATE)
//    → Cho phép chạy lại nhiều lần, mỗi lần ghi đè DRAFT cũ
// ──────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }      from 'next/server';
import { db }                             from '@/db';
import { users, attendance, leaveRequests, monthlyPayroll } from '@/db/schema';
import { requireAuth, ADMIN_ONLY }        from '@/lib/auth';
import { eq, and, sql, inArray }          from 'drizzle-orm';
import { calculateMonthlyPayroll, PayrollInput, DEFAULT_ALLOWANCE_TIERS } from '@/lib/payroll';

// Danh sách ngày Lễ Quốc gia VN (YYYY-MM-DD) — caller có thể override via settings
const VN_HOLIDAYS_2026: string[] = [
  '2026-01-01', // Tết Dương lịch
  '2026-01-28', '2026-01-29', '2026-01-30', '2026-01-31', '2026-02-01',
  '2026-02-02', // Tết Âm lịch (Bính Ngọ)
  '2026-04-16', // Giỗ Tổ Hùng Vương
  '2026-04-30', // Giải phóng miền Nam
  '2026-05-01', // Quốc tế Lao động
  '2026-09-02', // Quốc khánh
];

/** Kiểm tra ngày có phải Chủ Nhật không */
function isSunday(dateStr: string): boolean {
  return new Date(dateStr).getDay() === 0;
}

/** Kiểm tra ngày có phải ngày lễ không */
function isHoliday(dateStr: string, holidays: string[]): boolean {
  return holidays.includes(dateStr);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ADMIN_ONLY);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const month = parseInt(body.month ?? new Date().getMonth() + 1);
  const year  = parseInt(body.year  ?? new Date().getFullYear());

  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json({ error: 'month/year không hợp lệ' }, { status: 400 });
  }

  // Month date range
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd   = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  // ── 1. Lấy tất cả nhân viên ACTIVE ────────────────────────────────────────
  const employees = await db
    .select({
      id:                  users.id,
      name:                users.name,
      employeeCode:        users.employeeCode,
      officialSalary:      users.officialSalary,
      basicSalary:         users.basicSalary,
      // Phụ cấp chuyên cần: lấy từ settings hoặc default 500.000
      // TODO Sprint 3 N3: lấy từ salary_contracts; tạm dùng fixed 500.000
    })
    .from(users)
    .where(
      and(
        eq(users.active, true),
        eq(users.employeeStatus, 'ACTIVE'),
        sql`${users.officialSalary} > 0`,
      )
    );

  if (employees.length === 0) {
    return NextResponse.json({ error: 'Không có nhân viên nào có lương đã cấu hình' }, { status: 400 });
  }

  const employeeIds = employees.map(e => e.id);

  // ── 2. Aggregate attendance theo tháng ────────────────────────────────────
  const attRows = await db
    .select({
      employeeId:            attendance.employeeId,
      // Đếm ngày đi làm T2-T7 (không phải CN, không phải Lễ)
      regularWorkedDays: sql<number>`
        COUNT(*) FILTER (
          WHERE ${attendance.approvalStatus} = 'APPROVED'
          AND ${attendance.status} IN ('PRESENT','LATE','EARLY_LEAVE','LATE_EARLY_LEAVE')
          AND EXTRACT(DOW FROM ${attendance.workDate}::date) BETWEEN 1 AND 6
          AND ${attendance.workDate} NOT IN (${sql.raw(VN_HOLIDAYS_2026.map(d => `'${d}'`).join(',') || "'9999-01-01'")})
        )`,
      // Ngày vắng không phép (T2-T7, APPROVED, status=ABSENT, không phải ON_LEAVE)
      absentDays: sql<number>`
        COUNT(*) FILTER (
          WHERE ${attendance.approvalStatus} = 'APPROVED'
          AND ${attendance.status} = 'ABSENT'
          AND EXTRACT(DOW FROM ${attendance.workDate}::date) BETWEEN 1 AND 6
        )`,
      // Tổng phút muộn + về sớm
      totalLateEarlyMins: sql<number>`
        COALESCE(SUM(${attendance.lateMinutes} + ${attendance.earlyLeaveMinutes}), 0)`,
      // Tổng giờ làm CN
      sundayHours: sql<number>`
        COALESCE(SUM(
          CASE WHEN EXTRACT(DOW FROM ${attendance.workDate}::date) = 0
               AND ${attendance.status} IN ('PRESENT','LATE','EARLY_LEAVE','LATE_EARLY_LEAVE')
               AND ${attendance.approvalStatus} = 'APPROVED'
          THEN COALESCE(${attendance.totalHours}, 0) ELSE 0 END
        ), 0)`,
      // Ngày Lễ có đi làm (T2-T7)
      holidayWorkedWeekdayDays: sql<number>`
        COUNT(*) FILTER (
          WHERE ${attendance.workDate} IN (${sql.raw(VN_HOLIDAYS_2026.map(d => `'${d}'`).join(',') || "'9999-01-01'")})
          AND ${attendance.approvalStatus} = 'APPROVED'
          AND ${attendance.status} IN ('PRESENT','LATE','EARLY_LEAVE','LATE_EARLY_LEAVE')
          AND EXTRACT(DOW FROM ${attendance.workDate}::date) BETWEEN 1 AND 6
        )`,
      // Ngày Lễ có đi làm (CN)
      holidayWorkedSundayDays: sql<number>`
        COUNT(*) FILTER (
          WHERE ${attendance.workDate} IN (${sql.raw(VN_HOLIDAYS_2026.map(d => `'${d}'`).join(',') || "'9999-01-01'")})
          AND ${attendance.approvalStatus} = 'APPROVED'
          AND ${attendance.status} IN ('PRESENT','LATE','EARLY_LEAVE','LATE_EARLY_LEAVE')
          AND EXTRACT(DOW FROM ${attendance.workDate}::date) = 0
        )`,
      // OT (chiều/đêm) — từ evening_ot_minutes/night_ot_minutes (Sprint 3 migration)
      eveningOtMins: sql<number>`COALESCE(SUM(evening_ot_minutes), 0)`,
      nightOtMins:   sql<number>`COALESCE(SUM(night_ot_minutes), 0)`,
    })
    .from(attendance)
    .where(
      and(
        inArray(attendance.employeeId, employeeIds),
        sql`${attendance.workDate} >= ${monthStart}`,
        sql`${attendance.workDate} <= ${monthEnd}`,
      )
    )
    .groupBy(attendance.employeeId);

  const attMap = new Map(attRows.map(r => [r.employeeId, r]));

  // ── 3. Aggregate phép năm đã duyệt trong tháng ───────────────────────────
  const leaveRows = await db
    .select({
      employeeId: leaveRequests.employeeId,
      paidLeaveDays: sql<number>`
        COALESCE(SUM(
          CASE WHEN leave_type IN ('ANNUAL','SICK','MATERNITY','PATERNITY')
               AND status = 'APPROVED'
          THEN days_requested ELSE 0 END
        ), 0)`,
      unpaidLeaveDays: sql<number>`
        COALESCE(SUM(
          CASE WHEN leave_type = 'UNPAID'
               AND status = 'APPROVED'
          THEN days_requested ELSE 0 END
        ), 0)`,
    })
    .from(leaveRequests)
    .where(
      and(
        inArray(leaveRequests.employeeId, employeeIds),
        sql`EXTRACT(MONTH FROM start_date::date) = ${month}`,
        sql`EXTRACT(YEAR FROM start_date::date) = ${year}`,
        sql`status IN ('APPROVED')`,
      )
    )
    .groupBy(leaveRequests.employeeId);

  const leaveMap = new Map(leaveRows.map(r => [r.employeeId, r]));

  // Ngày Lễ trong tháng (không đi làm)
  const holidayDaysOff = VN_HOLIDAYS_2026.filter(d =>
    d.startsWith(`${year}-${String(month).padStart(2, '0')}`)
  ).length;

  // ── 4. Tính lương cho từng nhân viên ──────────────────────────────────────
  const ATTENDANCE_ALLOWANCE_DEFAULT = 500_000; // VND — sẽ thay bằng salary_contracts ở N3
  const processed: number[] = [];
  const errors: Array<{ employeeId: number; message: string }> = [];

  for (const emp of employees) {
    try {
      const att   = attMap.get(emp.id);
      const leave = leaveMap.get(emp.id);

      const input: PayrollInput = {
        employeeId:     emp.id,
        employeeCode:   emp.employeeCode ?? `EMP${emp.id}`,
        employeeName:   emp.name,
        month,
        year,
        officialSalary: emp.officialSalary ?? 0,
        basicSalary:    emp.basicSalary    ?? 0,

        regularWorkedDays:        Number(att?.regularWorkedDays    ?? 0),
        paidLeaveDays:            Number(leave?.paidLeaveDays      ?? 0),
        eveningOtHours:           Number(att?.eveningOtMins        ?? 0) / 60,
        nightOtHours:             Number(att?.nightOtMins          ?? 0) / 60,
        sundayHours:              Number(att?.sundayHours          ?? 0),
        sundayNightHours:         0,  // TODO: tách từ is_sunday + after 22h
        holidayDaysOff,
        holidayWorkedWeekdayDays: Number(att?.holidayWorkedWeekdayDays ?? 0),
        holidayWorkedSundayDays:  Number(att?.holidayWorkedSundayDays  ?? 0),
        unpaidLeaveDays:          Number(leave?.unpaidLeaveDays         ?? 0),
        absentDays:               Number(att?.absentDays                ?? 0),

        attendanceAllowance: ATTENDANCE_ALLOWANCE_DEFAULT,
        totalLateEarlyMins:  Number(att?.totalLateEarlyMins ?? 0),
        allowanceTiers:      DEFAULT_ALLOWANCE_TIERS,

        advanceDeduction: 0,  // TODO: từ payroll_advances table
        otherDeductions:  0,
        isPaidBhxh:       true,
      };

      const result = calculateMonthlyPayroll(input);

      // UPSERT — chạy lại nhiều lần ghi đè DRAFT cũ (ON CONFLICT DO UPDATE)
      await db
        .insert(monthlyPayroll)
        .values({
          employeeId:               emp.id,
          month,
          year,
          officialSalary:           result.input.officialSalary,
          basicSalary:              result.input.basicSalary,
          regularWorkedDays:        result.input.regularWorkedDays,
          paidLeaveDays:            result.input.paidLeaveDays,
          eveningOtHours:           result.input.eveningOtHours,
          nightOtHours:             result.input.nightOtHours,
          sundayHours:              result.input.sundayHours,
          sundayNightHours:         result.input.sundayNightHours,
          holidayDaysOff:           result.input.holidayDaysOff,
          holidayWorkedWeekdayDays: result.input.holidayWorkedWeekdayDays,
          holidayWorkedSundayDays:  result.input.holidayWorkedSundayDays,
          unpaidLeaveDays:          result.input.unpaidLeaveDays,
          absentDays:               result.input.absentDays,
          attendanceAllowance:      result.input.attendanceAllowance,
          totalLateEarlyMins:       result.input.totalLateEarlyMins,
          grossEarnings:            result.grossEarnings,
          totalDeductions:          result.totalDeductions,
          netSalary:                result.netSalary,
          bhxhEmployee:             result.bhxhEmployee,
          bhxhEmployer:             result.bhxhEmployer,
          advanceDeduction:         result.input.advanceDeduction,
          otherDeductions:          result.input.otherDeductions,
          lineItemsJson:            result.lineItems as unknown as Record<string, unknown>[],
          warningsJson:             result.warnings as unknown as string[],
          status:                   'DRAFT',
          calculatedAt:             new Date(),
        })
        .onConflictDoUpdate({
          target: [monthlyPayroll.employeeId, monthlyPayroll.month, monthlyPayroll.year],
          set: {
            // Chỉ update nếu hiện tại đang là DRAFT (không ghi đè PUBLISHED)
            grossEarnings:    sql`CASE WHEN monthly_payroll.status = 'DRAFT' THEN EXCLUDED.gross_earnings ELSE monthly_payroll.gross_earnings END`,
            netSalary:        sql`CASE WHEN monthly_payroll.status = 'DRAFT' THEN EXCLUDED.net_salary ELSE monthly_payroll.net_salary END`,
            totalDeductions:  sql`CASE WHEN monthly_payroll.status = 'DRAFT' THEN EXCLUDED.total_deductions ELSE monthly_payroll.total_deductions END`,
            lineItemsJson:    sql`CASE WHEN monthly_payroll.status = 'DRAFT' THEN EXCLUDED.line_items_json ELSE monthly_payroll.line_items_json END`,
            warningsJson:     sql`CASE WHEN monthly_payroll.status = 'DRAFT' THEN EXCLUDED.warnings_json ELSE monthly_payroll.warnings_json END`,
            regularWorkedDays: sql`CASE WHEN monthly_payroll.status = 'DRAFT' THEN EXCLUDED.regular_worked_days ELSE monthly_payroll.regular_worked_days END`,
            eveningOtHours:   sql`CASE WHEN monthly_payroll.status = 'DRAFT' THEN EXCLUDED.evening_ot_hours ELSE monthly_payroll.evening_ot_hours END`,
            absentDays:       sql`CASE WHEN monthly_payroll.status = 'DRAFT' THEN EXCLUDED.absent_days ELSE monthly_payroll.absent_days END`,
            totalLateEarlyMins: sql`CASE WHEN monthly_payroll.status = 'DRAFT' THEN EXCLUDED.total_late_early_mins ELSE monthly_payroll.total_late_early_mins END`,
            calculatedAt:     sql`CASE WHEN monthly_payroll.status = 'DRAFT' THEN NOW() ELSE monthly_payroll.calculated_at END`,
            updatedAt:        sql`NOW()`,
          },
        });

      processed.push(emp.id);
    } catch (e) {
      errors.push({ employeeId: emp.id, message: String(e) });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Đã tính lương ${processed.length}/${employees.length} nhân viên → DRAFT`,
    processed: processed.length,
    skipped:   errors.length,
    errors:    errors.slice(0, 10), // Chỉ trả 10 lỗi đầu
    month,
    year,
  });
}
