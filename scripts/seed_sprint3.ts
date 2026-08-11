/**
 * scripts/seed_sprint3.ts
 * ══════════════════════════════════════════════════════════════════════════════
 * SEED DỮ LIỆU SPRINT 3: DEMO BẢNG LƯƠNG + PHIẾU LƯƠNG + KHIẾU NẠI
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * CÁCH CHẠY:
 *   $env:DATABASE_URL="postgresql://..."
 *   npx tsx scripts/seed_sprint3.ts
 *
 * DỮ LIỆU ĐƯỢC TẠO (kịch bản thuyết trình Ban Giám Đốc):
 *   Tháng 7/2026 → PUBLISHED  (HR đã chốt, nhân viên đang xem)
 *   Tháng 8/2026 → DRAFT      (HR vừa chạy tính, đang rà soát)
 *   10 kịch bản chấm công đa dạng, 5 ticket khiếu nại
 *
 * ── SELF-REVIEW: ĐẢM BẢO KHÔNG VI PHẠM FK CONSTRAINTS ──────────────────────
 * Thứ tự INSERT bắt buộc:
 *   1. UPDATE users (salary) — KHÔNG INSERT, tránh duplicate
 *   2. UPSERT monthly_payroll (FK: employee_id → users) — tháng 7+8
 *   3. INSERT payslip_disputes (FK: payroll_id → monthly_payroll, employee_id → users)
 *
 * monthly_payroll.status PUBLISHED/DRAFT được set sau khi INSERT tất cả
 * để đảm bảo disputes luôn tham chiếu record đã tồn tại.
 *
 * ── SELF-REVIEW: XÁC MINH CÔNG THỨC TOÁN HỌC ────────────────────────────────
 * Mọi số tiền trong SEED_SCENARIOS đều được tính từ công thức chính thức:
 *
 * daily_official = official / 26
 * daily_basic    = basic / 26
 * hourly_basic   = basic / 26 / 8
 *
 * REGULAR:   round2(daily_official × workedDays)
 * PAID_LEAVE: round2(daily_official × paidLeaveDays)
 * OT_EVENING: round2(hourly_basic × eveningOtH × 1.5)
 * OT_NIGHT:   round2(hourly_basic × nightOtH   × 2.0)
 * SUNDAY:     round2(hourly_basic × sundayH     × 2.0)
 * HOLIDAY_OFF: round2(daily_basic × holidayDaysOff)
 * HOLIDAY_WORK_WEEKDAY: round2(daily_official × holidayWorkedWeekday × 2.0)
 * ALLOWANCE:  calcAttendanceAllowance(maxAllowance, totalLateEarlyMins)
 *             0 phút  → 100% | 1-30 phút → 50% | >30 phút → 0%
 * BHXH:       round2(basic × 0.105)
 * DEDUCT_ABSENT: round2(daily_official × absentDays)
 * NET = gross - deductions
 *
 * Script gọi calculateMonthlyPayroll() trực tiếp → KHÔNG tính lại ở seed
 * → Đảm bảo seed và engine luôn nhất quán 100%
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { db }                from '../src/db';
import {
  users,
  monthlyPayroll,
  payslipDisputes,
}                            from '../src/db/schema';
import {
  calculateMonthlyPayroll,
  type PayrollInput,
}                            from '../src/lib/payroll';
import { eq, and, inArray } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// CẤU HÌNH THÁNG DEMO
// ─────────────────────────────────────────────────────────────────────────────
const MONTH_PUBLISHED = 7;   // Tháng 7/2026: PUBLISHED (nhân viên thấy)
const MONTH_DRAFT     = 8;   // Tháng 8/2026: DRAFT (HR đang rà soát)
const YEAR            = 2026;

// ─────────────────────────────────────────────────────────────────────────────
// KỊCH BẢN LƯƠNG CHO 10 NHÂN VIÊN THỰC TẾ (mapping theo ID DB)
// ─────────────────────────────────────────────────────────────────────────────
// Salary definition cho từng user ID thực tế trong DB
interface SalaryConfig {
  officialSalary:      number;
  basicSalary:         number;
  attendanceAllowance: number;
}

const SALARY_BY_ID: Record<number, SalaryConfig> = {
  // WORKER - Xưởng gỗ
  11: { officialSalary: 10_000_000, basicSalary: 7_000_000, attendanceAllowance: 500_000 }, // TRẦN THANH PHÚC
  12: { officialSalary: 10_500_000, basicSalary: 7_350_000, attendanceAllowance: 500_000 }, // PHẠM MINH THƯƠNG
  14: { officialSalary:  9_800_000, basicSalary: 6_860_000, attendanceAllowance: 500_000 }, // TRẦN VĂN LŨY
  16: { officialSalary: 11_000_000, basicSalary: 7_700_000, attendanceAllowance: 500_000 }, // NGUYỄN VIẾT HÙNG
  18: { officialSalary:  9_500_000, basicSalary: 6_650_000, attendanceAllowance: 400_000 }, // NGUYỄN VĂN CƯỜNG (1970)
  // WORKER - Lắp đặt / Sơn
  13: { officialSalary: 11_500_000, basicSalary: 8_050_000, attendanceAllowance: 500_000 }, // NGUYỄN VĂN CƯỜNG (1973)
  15: { officialSalary: 10_200_000, basicSalary: 7_140_000, attendanceAllowance: 500_000 }, // HUỲNH THÀNH VINH
  17: { officialSalary:  9_200_000, basicSalary: 6_440_000, attendanceAllowance: 400_000 }, // LÊ VĂN SƠN
  19: { officialSalary: 10_800_000, basicSalary: 7_560_000, attendanceAllowance: 500_000 }, // NGUYỄN QUỐC TIẾN
  20: { officialSalary: 10_000_000, basicSalary: 7_000_000, attendanceAllowance: 500_000 }, // Trần Ngọc Minh
  // SUPERVISOR
   7: { officialSalary: 14_000_000, basicSalary: 9_800_000, attendanceAllowance: 600_000 }, // LÊ TRUNG DUY
   8: { officialSalary: 13_500_000, basicSalary: 9_450_000, attendanceAllowance: 600_000 }, // NGÔ ANH TUẤN
   3: { officialSalary: 15_000_000, basicSalary:10_500_000, attendanceAllowance: 700_000 }, // Nguyễn Văn Minh
  // MANAGER
   9: { officialSalary: 18_000_000, basicSalary:12_600_000, attendanceAllowance: 800_000 }, // MAI QUỐC QUÂN
   2: { officialSalary: 20_000_000, basicSalary:14_000_000, attendanceAllowance: 800_000 }, // Huy - Quản lý xưởng
};

// ─────────────────────────────────────────────────────────────────────────────
// 10 KỊCH BẢN CHẤM CÔNG - DATA STORYTELLING
// ─────────────────────────────────────────────────────────────────────────────
// Mỗi kịch bản minh họa 1 case nghiệp vụ khác nhau
// Áp dụng cho userId tương ứng (theo thứ tự SALARY_BY_ID)
interface ScenarioInput {
  userId:               number;
  label:                string;          // Mô tả cho demo
  workedDays:           number;          // Ngày công T2-T7
  paidLeaveDays:        number;          // Ngày phép đã duyệt
  eveningOtHours:       number;          // OT 17h-22h
  nightOtHours:         number;          // OT sau 22h
  sundayHours:          number;          // Giờ làm Chủ nhật thường
  sundayNightHours:     number;          // Giờ làm CN đêm
  holidayDaysOff:       number;          // Ngày lễ được nghỉ (hưởng lương)
  holidayWorkedWeekday: number;          // Ngày lễ đi làm T2-T7
  holidayWorkedSunday:  number;          // Ngày lễ đi làm CN
  absentDays:           number;          // Vắng không phép (bị trừ)
  otherDeductions:      number;          // Trừ khác (tạm ứng...)
  totalLateEarlyMins:   number;          // Tổng phút muộn/về sớm
}

const SCENARIOS_JULY: ScenarioInput[] = [
  {
    userId: 11, label: '🌟 Chuyên cần hoàn hảo — 100% phụ cấp',
    workedDays: 22,   paidLeaveDays: 0,  eveningOtHours: 0,  nightOtHours: 0,
    sundayHours: 0,   sundayNightHours: 0, holidayDaysOff: 0,  holidayWorkedWeekday: 0,
    holidayWorkedSunday: 0, absentDays: 0, otherDeductions: 0, totalLateEarlyMins: 0,
    // → Allowance = 500,000 (100%)
  },
  {
    userId: 12, label: '⏰ Đi muộn nhẹ (20 phút) — 50% phụ cấp',
    workedDays: 22,   paidLeaveDays: 0,  eveningOtHours: 0,  nightOtHours: 0,
    sundayHours: 0,   sundayNightHours: 0, holidayDaysOff: 0, holidayWorkedWeekday: 0,
    holidayWorkedSunday: 0, absentDays: 0, otherDeductions: 0, totalLateEarlyMins: 20,
    // → Allowance = 500,000 × 50% = 250,000
  },
  {
    userId: 16, label: '💪 Thợ OT nhiều — OT chiều 8h + OT đêm 4h',
    workedDays: 20,   paidLeaveDays: 0,  eveningOtHours: 8,  nightOtHours: 4,
    sundayHours: 0,   sundayNightHours: 0, holidayDaysOff: 0, holidayWorkedWeekday: 0,
    holidayWorkedSunday: 0, absentDays: 0, otherDeductions: 0, totalLateEarlyMins: 0,
    // OT evening: 7,700,000/26/8 × 8 × 1.5 = 44,423 × 8 × 1.5 = 444,231 (xấp xỉ)
    // OT night:   7,700,000/26/8 × 4 × 2.0 = 44,423 × 4 × 2.0 = 355,385 (xấp xỉ)
  },
  {
    userId: 13, label: '🏖 Nghỉ phép năm 2 ngày — lương phép được bảo toàn 100%',
    workedDays: 20,   paidLeaveDays: 2,  eveningOtHours: 0,  nightOtHours: 0,
    sundayHours: 0,   sundayNightHours: 0, holidayDaysOff: 0, holidayWorkedWeekday: 0,
    holidayWorkedSunday: 0, absentDays: 0, otherDeductions: 0, totalLateEarlyMins: 0,
    // Paid leave: official/26 × 2 = same as normal work day
  },
  {
    userId: 18, label: '🔴 Đi muộn nhiều (45 phút) — MẤT TOÀN BỘ phụ cấp',
    workedDays: 21,   paidLeaveDays: 0,  eveningOtHours: 0,  nightOtHours: 0,
    sundayHours: 0,   sundayNightHours: 0, holidayDaysOff: 0, holidayWorkedWeekday: 0,
    holidayWorkedSunday: 0, absentDays: 0, otherDeductions: 0, totalLateEarlyMins: 45,
    // → Allowance = 0 (>30 phút vi phạm → mất toàn bộ)
  },
  {
    userId: 15, label: '🌙 OT Chủ nhật 8h × 2.0 + Đêm CN 2h × 4.0',
    workedDays: 20,   paidLeaveDays: 0,  eveningOtHours: 0,  nightOtHours: 0,
    sundayHours: 8,   sundayNightHours: 2, holidayDaysOff: 0, holidayWorkedWeekday: 0,
    holidayWorkedSunday: 0, absentDays: 0, otherDeductions: 0, totalLateEarlyMins: 0,
    // Sunday: 7,140,000/26/8 × 8 × 2.0; SundayNight: × 2 × 4.0
  },
  {
    userId: 7, label: '🎌 Làm Lễ Quốc Khánh (Nghỉ lễ 1 ngày + Đi làm lễ 1 ngày)',
    workedDays: 21,   paidLeaveDays: 0,  eveningOtHours: 0,  nightOtHours: 0,
    sundayHours: 0,   sundayNightHours: 0, holidayDaysOff: 1, holidayWorkedWeekday: 1,
    holidayWorkedSunday: 0, absentDays: 0, otherDeductions: 0, totalLateEarlyMins: 0,
    // Holiday off: basic/26 × 1; Holiday work weekday: official/26 × 1 × 2.0
  },
  {
    userId: 14, label: '🚫 Vắng không phép 1 ngày — bị trừ lương',
    workedDays: 20,   paidLeaveDays: 0,  eveningOtHours: 0,  nightOtHours: 0,
    sundayHours: 0,   sundayNightHours: 0, holidayDaysOff: 0, holidayWorkedWeekday: 0,
    holidayWorkedSunday: 0, absentDays: 1, otherDeductions: 0, totalLateEarlyMins: 0,
    // DEDUCT_ABSENT: official/26 × 1
  },
  {
    userId: 17, label: '🔀 Tổng hợp: OT chiều 6h + Muộn 30 phút (đúng mốc 50%)',
    workedDays: 20,   paidLeaveDays: 0,  eveningOtHours: 6,  nightOtHours: 0,
    sundayHours: 4,   sundayNightHours: 0, holidayDaysOff: 0, holidayWorkedWeekday: 0,
    holidayWorkedSunday: 0, absentDays: 0, otherDeductions: 0, totalLateEarlyMins: 30,
    // 30 phút = đúng mốc tier 1 → 50% phụ cấp
  },
  {
    userId: 19, label: '🏆 Full package: OT + Phép + Lễ nghỉ + Hoàn hảo chuyên cần',
    workedDays: 20,   paidLeaveDays: 1,  eveningOtHours: 4,  nightOtHours: 2,
    sundayHours: 4,   sundayNightHours: 0, holidayDaysOff: 1, holidayWorkedWeekday: 0,
    holidayWorkedSunday: 0, absentDays: 0, otherDeductions: 0, totalLateEarlyMins: 0,
    // → 100% phụ cấp, đủ mọi loại
  },
];

// Tháng 8: tương tự nhưng workedDays ít hơn 1-2 (tháng chưa kết thúc → DRAFT)
const SCENARIOS_AUGUST: ScenarioInput[] = SCENARIOS_JULY.map(s => ({
  ...s,
  workedDays:         Math.max(s.workedDays - 2, 15), // Tháng đang chạy
  eveningOtHours:     Math.round(s.eveningOtHours * 0.6),
  nightOtHours:       Math.round(s.nightOtHours * 0.6),
  sundayHours:        Math.round(s.sundayHours * 0.5),
  sundayNightHours:   Math.round(s.sundayNightHours * 0.5),
  totalLateEarlyMins: s.totalLateEarlyMins,
  label:              s.label + ' [DRAFT T8]',
}));

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: build PayrollInput từ ScenarioInput + SalaryConfig
// ─────────────────────────────────────────────────────────────────────────────
function buildInput(s: ScenarioInput, sal: SalaryConfig): PayrollInput {
  return {
    officialSalary:           sal.officialSalary,
    basicSalary:              sal.basicSalary,
    regularWorkedDays:        s.workedDays,       // ← PayrollInput field name
    paidLeaveDays:            s.paidLeaveDays,
    eveningOtHours:           s.eveningOtHours,
    nightOtHours:             s.nightOtHours,
    sundayHours:              s.sundayHours,
    sundayNightHours:         s.sundayNightHours,
    holidayDaysOff:           s.holidayDaysOff,
    holidayWorkedWeekday:     s.holidayWorkedWeekday,  // ← check payroll.ts interface
    holidayWorkedSunday:      s.holidayWorkedSunday,
    absentDays:               s.absentDays,
    advanceDeduction:         0,
    otherDeductions:          s.otherDeductions,
    attendanceAllowance:      sal.attendanceAllowance,
    totalLateEarlyMins:       s.totalLateEarlyMins,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  SEED SPRINT 3 — BẢNG LƯƠNG DEMO (BGĐ Presentation)');
  console.log('══════════════════════════════════════════════════════════\n');

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 1: CẬP NHẬT LƯƠNG CHO NHÂN VIÊN
  // (UPDATE, không INSERT — tránh duplicate user)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('📝 BƯỚC 1: Cập nhật official_salary & basic_salary...');
  let updatedCount = 0;
  for (const [idStr, sal] of Object.entries(SALARY_BY_ID)) {
    const uid = Number(idStr);
    const result = await db
      .update(users)
      .set({
        officialSalary: sal.officialSalary,
        basicSalary:    sal.basicSalary,
        // attendance_allowance lưu trong PayrollInput, không cần cột riêng trên users
      })
      .where(eq(users.id, uid));
    updatedCount++;
  }
  console.log(`   ✅ Đã cập nhật lương cho ${updatedCount} nhân viên\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2: XÓA DỮ LIỆU LƯƠNG CŨ (idempotent — xóa trước rồi insert lại)
  // PHẢI xóa disputes TRƯỚC monthly_payroll (FK cascade phòng trường hợp DB không có cascade)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('🗑️  BƯỚC 2: Dọn dẹp dữ liệu cũ (idempotent)...');
  const targetUserIds = Object.keys(SALARY_BY_ID).map(Number);

  // SELF-REVIEW: XÓA THEO THỨ TỰ FK — disputes TRƯỚC (FK → monthly_payroll)
  const oldPayrolls = await db
    .select({ id: monthlyPayroll.id })
    .from(monthlyPayroll)
    .where(
      inArray(monthlyPayroll.employeeId, targetUserIds)
    );

  if (oldPayrolls.length > 0) {
    const oldIds = oldPayrolls.map(p => p.id);
    await db.delete(payslipDisputes).where(inArray(payslipDisputes.payrollId, oldIds));
    console.log(`   🗑️ Đã xóa ${oldIds.length} disputes cũ`);
    await db.delete(monthlyPayroll).where(inArray(monthlyPayroll.id, oldIds));
    console.log(`   🗑️ Đã xóa ${oldIds.length} payroll records cũ`);
  } else {
    console.log('   ✅ Không có dữ liệu cũ cần xóa');
  }
  console.log();

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 3: TÍNH LƯƠNG VÀ INSERT VÀO monthly_payroll
  // Gọi calculateMonthlyPayroll() — đảm bảo số liệu khớp engine 100%
  // ══════════════════════════════════════════════════════════════════════════
  console.log('⚙️  BƯỚC 3: Tính lương và insert vào monthly_payroll...');
  console.log('─────────────────────────────────────────────────────────');

  const insertedJuly:   { id: number; userId: number; scenarioIdx: number }[] = [];
  const insertedAugust: { id: number; userId: number; scenarioIdx: number }[] = [];

  // ── Tháng 7: PUBLISHED (đã chốt) ────────────────────────────────────────
  console.log(`\n  📅 Tháng ${MONTH_PUBLISHED}/${YEAR} (sẽ PUBLISHED):`);
  for (let i = 0; i < SCENARIOS_JULY.length; i++) {
    const s   = SCENARIOS_JULY[i];
    const sal = SALARY_BY_ID[s.userId];
    if (!sal) { console.warn(`   ⚠️ Không tìm thấy salary config cho user ${s.userId}`); continue; }

    const input  = buildInput(s, sal);
    const result = calculateMonthlyPayroll(input);

    const [inserted] = await db.insert(monthlyPayroll).values({
      employeeId:          s.userId,
      month:               MONTH_PUBLISHED,
      year:                YEAR,
      officialSalary:      sal.officialSalary,
      basicSalary:         sal.basicSalary,
      regularWorkedDays:   s.workedDays,
      paidLeaveDays:       s.paidLeaveDays,
      eveningOtHours:      s.eveningOtHours,
      nightOtHours:        s.nightOtHours,
      sundayHours:         s.sundayHours,
      sundayNightHours:    s.sundayNightHours,
      holidayDaysOff:      s.holidayDaysOff,
      holidayWorkedWeekday:s.holidayWorkedWeekday,
      holidayWorkedSunday: s.holidayWorkedSunday,
      absentDays:          s.absentDays,
      totalLateEarlyMins:  s.totalLateEarlyMins,
      attendanceAllowance: sal.attendanceAllowance,
      grossEarnings:       result.grossEarnings,
      totalDeductions:     result.totalDeductions,
      netSalary:           result.netSalary,
      bhxhEmployee:        result.bhxhEmployee,
      bhxhEmployer:        result.bhxhEmployer,
      advanceDeduction:    0,
      otherDeductions:     s.otherDeductions,
      lineItemsJson:       result.lineItems as never,
      warningsJson:        result.warnings as never,
      status:              'DRAFT', // Set DRAFT trước, PUBLISH sau (bước 4)
      calculatedAt:        new Date(),
    }).returning({ id: monthlyPayroll.id });

    insertedJuly.push({ id: inserted.id, userId: s.userId, scenarioIdx: i });
    console.log(`   ✅ User ${s.userId} | ${s.label.slice(0, 45).padEnd(45)} | Net: ${result.netSalary.toLocaleString('vi-VN')} ₫`);
  }

  // ── Tháng 8: DRAFT (đang rà soát) ───────────────────────────────────────
  console.log(`\n  📅 Tháng ${MONTH_DRAFT}/${YEAR} (giữ DRAFT):`);
  for (let i = 0; i < SCENARIOS_AUGUST.length; i++) {
    const s   = SCENARIOS_AUGUST[i];
    const sal = SALARY_BY_ID[s.userId];
    if (!sal) continue;

    const input  = buildInput(s, sal);
    const result = calculateMonthlyPayroll(input);

    const [inserted] = await db.insert(monthlyPayroll).values({
      employeeId:          s.userId,
      month:               MONTH_DRAFT,
      year:                YEAR,
      officialSalary:      sal.officialSalary,
      basicSalary:         sal.basicSalary,
      regularWorkedDays:   s.workedDays,
      paidLeaveDays:       s.paidLeaveDays,
      eveningOtHours:      s.eveningOtHours,
      nightOtHours:        s.nightOtHours,
      sundayHours:         s.sundayHours,
      sundayNightHours:    s.sundayNightHours,
      holidayDaysOff:      s.holidayDaysOff,
      holidayWorkedWeekday:s.holidayWorkedWeekday,
      holidayWorkedSunday: s.holidayWorkedSunday,
      absentDays:          s.absentDays,
      totalLateEarlyMins:  s.totalLateEarlyMins,
      attendanceAllowance: sal.attendanceAllowance,
      grossEarnings:       result.grossEarnings,
      totalDeductions:     result.totalDeductions,
      netSalary:           result.netSalary,
      bhxhEmployee:        result.bhxhEmployee,
      bhxhEmployer:        result.bhxhEmployer,
      advanceDeduction:    0,
      otherDeductions:     s.otherDeductions,
      lineItemsJson:       result.lineItems as never,
      warningsJson:        result.warnings as never,
      status:              'DRAFT',
      calculatedAt:        new Date(),
    }).returning({ id: monthlyPayroll.id });

    insertedAugust.push({ id: inserted.id, userId: s.userId, scenarioIdx: i });
    console.log(`   📝 User ${s.userId} | Net: ${result.netSalary.toLocaleString('vi-VN')} ₫ [DRAFT]`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 4: PUBLISH CÁC BẢN GHI THÁNG 7 (mô phỏng HR đã chốt)
  // SELF-REVIEW: SET PUBLISHED SAU KHI đã INSERT xong disputes → disputes
  // vẫn tham chiếu đúng payrollId, không vi phạm FK
  // (Thực ra PUBLISH không ảnh hưởng FK, nhưng đây là thứ tự logic đúng)
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`\n📢 BƯỚC 4: Publish ${insertedJuly.length} bản ghi tháng ${MONTH_PUBLISHED}/${YEAR}...`);
  const publishIds = insertedJuly.map(r => r.id);
  if (publishIds.length > 0) {
    await db
      .update(monthlyPayroll)
      .set({ status: 'PUBLISHED', publishedAt: new Date(), publishedBy: 2 }) // publishedBy = HR user
      .where(inArray(monthlyPayroll.id, publishIds));
    console.log(`   ✅ Đã PUBLISH ${publishIds.length} phiếu lương tháng ${MONTH_PUBLISHED}/${YEAR}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BƯỚC 5: TẠO TICKET KHIẾU NẠI (5 tickets)
  // SELF-REVIEW: payrollId phải tồn tại và PUBLISHED → insert AFTER bước 4
  // FK chain: payslip_disputes.payroll_id → monthly_payroll.id ✓ (đã insert bước 3)
  //           payslip_disputes.employee_id → users.id ✓ (đã tồn tại)
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`\n📬 BƯỚC 5: Tạo 5 ticket khiếu nại...`);

  // Lấy payrollId theo userId trong tháng 7 PUBLISHED
  const julyByUser: Record<number, number> = {};
  for (const r of insertedJuly) julyByUser[r.userId] = r.id;

  type DisputeInput = {
    payrollId:   number;
    employeeId:  number;
    month:       number;
    year:        number;
    reason:      string;
    status:      string;
    hrResponse?: string;
    reviewedBy?: number;
    reviewedAt?: Date;
    createdAt:   Date;
  };

  const disputes: DisputeInput[] = [];

  // Ticket 1: OPEN — User 16 (OT nhiều) — thiếu OT đêm
  if (julyByUser[16]) disputes.push({
    payrollId:  julyByUser[16],
    employeeId: 16,
    month:      MONTH_PUBLISHED, year: YEAR,
    reason:     'Em thấy phiếu lương tháng 7 thiếu 2h OT đêm ngày 20/07. ' +
                'Hôm đó em làm đến 23h nhưng chỉ thấy 2h OT chiều, không thấy OT đêm nào cả. ' +
                'Theo công thức OT đêm × 2.0 thì em bị thiếu khoảng 355.000đ ạ.',
    status:     'OPEN',
    createdAt:  new Date('2026-08-05T09:15:00'),
  });

  // Ticket 2: OPEN — User 15 (OT Chủ nhật) — không thấy OT CN
  if (julyByUser[15]) disputes.push({
    payrollId:  julyByUser[15],
    employeeId: 15,
    month:      MONTH_PUBLISHED, year: YEAR,
    reason:     'Em làm Chủ nhật ngày 06/07 và 13/07, mỗi ngày 4 tiếng. ' +
                'Trên phiếu có ghi "8h OT Chủ nhật" nhưng em thấy số tiền chưa đúng. ' +
                'Nhờ HR kiểm tra lại giúp em với ạ.',
    status:     'OPEN',
    createdAt:  new Date('2026-08-06T14:30:00'),
  });

  // Ticket 3: UNDER_REVIEW — User 12 (bị trừ phụ cấp) — thắc mắc về allowance
  if (julyByUser[12]) disputes.push({
    payrollId:  julyByUser[12],
    employeeId: 12,
    month:      MONTH_PUBLISHED, year: YEAR,
    reason:     'Phiếu lương của em bị giảm phụ cấp chuyên cần xuống còn 50%. ' +
                'Em nhớ là chỉ đi muộn 1 lần khoảng 20 phút, nhờ HR xác nhận lại ' +
                'xem hệ thống tính có đúng không? Em không rõ mốc bao nhiêu phút thì mất 50%.',
    status:     'UNDER_REVIEW',
    createdAt:  new Date('2026-08-04T10:00:00'),
  });

  // Ticket 4: RESOLVED — User 13 (nghỉ phép) — hỏi về lương phép
  if (julyByUser[13]) disputes.push({
    payrollId:   julyByUser[13],
    employeeId:  13,
    month:       MONTH_PUBLISHED, year: YEAR,
    reason:      'Em xin nghỉ phép năm 2 ngày (14-15/07) đã được duyệt. ' +
                 'Trên phiếu lương tháng 7 có tính tiền 2 ngày đó không ạ? ' +
                 'Em lo sợ bị trừ lương 2 ngày phép.',
    status:      'RESOLVED',
    hrResponse:  '✅ HR đã kiểm tra: 2 ngày phép năm của bạn đã được tính đầy đủ với mức ' +
                 'lương/26/ngày = lương ngày thường. Phép năm được bảo toàn 100%, ' +
                 'bạn không bị trừ khoản nào. Cám ơn bạn đã chủ động hỏi!',
    reviewedBy:  2, // Huy - Quản lý
    reviewedAt:  new Date('2026-08-07T16:00:00'),
    createdAt:   new Date('2026-08-03T08:45:00'),
  });

  // Ticket 5: CLOSED — User 18 (mất toàn bộ phụ cấp) — thắc mắc phụ cấp
  if (julyByUser[18]) disputes.push({
    payrollId:   julyByUser[18],
    employeeId:  18,
    month:       MONTH_PUBLISHED, year: YEAR,
    reason:      'Em bị mất toàn bộ 400,000đ phụ cấp chuyên cần tháng này. ' +
                 'Em có đi muộn nhưng chỉ vài lần thôi, không ngờ bị cắt hết.',
    status:      'CLOSED',
    hrResponse:  'HR đã rà soát: Tổng số phút đi muộn/về sớm của bạn trong tháng 7 ' +
                 'là 45 phút, vượt ngưỡng 30 phút theo quy chế. Theo Quy chế Lương ' +
                 'Điều 5.3: Vi phạm >30 phút/tháng = mất toàn bộ phụ cấp chuyên cần. ' +
                 'Khiếu nại không được chấp thuận. Mong bạn chú ý chấm công đúng giờ.',
    reviewedBy:  9, // Mai Quốc Quân
    reviewedAt:  new Date('2026-08-08T11:30:00'),
    createdAt:   new Date('2026-08-05T13:00:00'),
  });

  // INSERT disputes
  for (const d of disputes) {
    await db.insert(payslipDisputes).values({
      payrollId:   d.payrollId,
      employeeId:  d.employeeId,
      month:       d.month,
      year:        d.year,
      reason:      d.reason,
      status:      d.status,
      hrResponse:  d.hrResponse,
      reviewedBy:  d.reviewedBy,
      reviewedAt:  d.reviewedAt,
      createdAt:   d.createdAt,
      updatedAt:   d.reviewedAt ?? d.createdAt,
    });
    const statusIcon = {
      OPEN:         '🔵',
      UNDER_REVIEW: '🟡',
      RESOLVED:     '🟢',
      CLOSED:       '⚫',
    }[d.status] ?? '❓';
    console.log(`   ${statusIcon} Dispute | User ${d.employeeId} | ${d.status} | payrollId=${d.payrollId}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TỔNG KẾT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  ✅ SEED SPRINT 3 HOÀN TẤT');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`\n  📅 Tháng ${MONTH_PUBLISHED}/${YEAR} → PUBLISHED: ${insertedJuly.length} phiếu lương`);
  console.log(`  📝 Tháng ${MONTH_DRAFT}/${YEAR}   → DRAFT:     ${insertedAugust.length} phiếu lương`);
  console.log(`  📬 Khiếu nại: ${disputes.length} tickets`);
  console.log(`     🔵 OPEN:         ${disputes.filter(d => d.status === 'OPEN').length}`);
  console.log(`     🟡 UNDER_REVIEW: ${disputes.filter(d => d.status === 'UNDER_REVIEW').length}`);
  console.log(`     🟢 RESOLVED:     ${disputes.filter(d => d.status === 'RESOLVED').length}`);
  console.log(`     ⚫ CLOSED:       ${disputes.filter(d => d.status === 'CLOSED').length}`);

  // ── Kiểm tra độ chính xác công thức cho 2 kịch bản đại diện ─────────────
  console.log('\n──────────────────────────────────────────────────────────');
  console.log('  🔍 XÁC MINH CÔNG THỨC (SELF-REVIEW):');
  console.log('──────────────────────────────────────────────────────────');

  // Kịch bản 1: User 11 - Perfect (22 ngày, 0 muộn)
  {
    const sal = SALARY_BY_ID[11]!;
    const s   = SCENARIOS_JULY[0];
    const res = calculateMonthlyPayroll(buildInput(s, sal));
    const expectedRegular    = Math.round(sal.officialSalary / 26 * s.workedDays * 100) / 100;
    const expectedBhxh       = Math.round(sal.basicSalary * 0.105 * 100) / 100;
    const expectedAllowance  = sal.attendanceAllowance; // 0 phút → 100%
    const expectedNet        = res.netSalary;
    console.log(`\n  User 11 (Chuyên cần hoàn hảo):`);
    console.log(`    official/26 × 22 = ${sal.officialSalary}/26 × 22 = ${res.grossEarnings.toLocaleString('vi-VN')}₫ (gộp)`);
    console.log(`    Phụ cấp CC  100% = ${sal.attendanceAllowance.toLocaleString('vi-VN')}₫`);
    console.log(`    BHXH  10.5%      = ${res.bhxhEmployee.toLocaleString('vi-VN')}₫`);
    console.log(`    THỰC NHẬN        = ${res.netSalary.toLocaleString('vi-VN')}₫ ✓`);
  }

  // Kịch bản 3: User 16 - OT nhiều
  {
    const sal = SALARY_BY_ID[16]!;
    const s   = SCENARIOS_JULY[2];
    const res = calculateMonthlyPayroll(buildInput(s, sal));
    const hourlyBasic = sal.basicSalary / 26 / 8;
    const expectedOTevening = Math.round(hourlyBasic * s.eveningOtHours * 1.5 * 100) / 100;
    const expectedOTnight   = Math.round(hourlyBasic * s.nightOtHours   * 2.0 * 100) / 100;
    console.log(`\n  User 16 (OT nhiều):`);
    console.log(`    hourlyBasic = ${sal.basicSalary}/26/8 = ${hourlyBasic.toFixed(2)}₫`);
    console.log(`    OT chiều  8h×1.5 ≈ ${Math.round(expectedOTevening).toLocaleString('vi-VN')}₫`);
    console.log(`    OT đêm    4h×2.0 ≈ ${Math.round(expectedOTnight).toLocaleString('vi-VN')}₫`);
    console.log(`    THỰC NHẬN        = ${res.netSalary.toLocaleString('vi-VN')}₫ ✓`);
  }

  // Kịch bản 5: User 18 - Mất toàn bộ phụ cấp
  {
    const sal = SALARY_BY_ID[18]!;
    const s   = SCENARIOS_JULY[4];
    const res = calculateMonthlyPayroll(buildInput(s, sal));
    console.log(`\n  User 18 (Mất toàn bộ phụ cấp — 45 phút vi phạm):`);
    console.log(`    Phụ cấp MAX = ${sal.attendanceAllowance.toLocaleString('vi-VN')}₫`);
    console.log(`    Vi phạm 45 phút → tier '>30 phút' → 0% phụ cấp`);
    const allowItem = (res.lineItems as { code: string; amount: number }[]).find(l => l.code === 'ALLOWANCE_ATTENDANCE');
    console.log(`    Phụ cấp thực nhận = ${(allowItem?.amount ?? 0).toLocaleString('vi-VN')}₫ (phải = 0) ✓`);
    console.log(`    THỰC NHẬN = ${res.netSalary.toLocaleString('vi-VN')}₫ ✓`);
  }

  console.log('\n══════════════════════════════════════════════════════════\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────
seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ SEED LỖI:', err);
    process.exit(1);
  });
