// scripts/payroll.test.ts
// ══════════════════════════════════════════════════════════════════════════════
// Unit Test Fixture — calculateMonthlyPayroll()
// Chạy: npx tsx scripts/payroll.test.ts
//
// Mục đích: Kiểm tra từng công thức bằng số cụ thể để cross-check với
//           bảng tính Excel của phòng Kế toán trước khi production.
// ══════════════════════════════════════════════════════════════════════════════

import { calculateMonthlyPayroll, formatPayrollSummary, hourlyBasicRate, dailyOfficialRate } from '../src/lib/payroll';

// ─────────────────────────────────────────────────────────────────────────────
// Dữ liệu mẫu — nhân viên Trần Văn A, tháng 8/2026
// official_salary = 12.000.000 VND
// basic_salary    = 8.400.000  VND (70% official)
// ─────────────────────────────────────────────────────────────────────────────
const OFFICIAL = 12_000_000;
const BASIC    =  8_400_000;

// Derived rates (để cross-check thủ công)
// dailyOfficialRate = 12.000.000 / 26 = 461.538,46 VND/ngày
// dailyBasicRate    =  8.400.000 / 26 = 323.076,92 VND/ngày
// hourlyBasicRate   =  8.400.000 / 26 / 8 = 40.384,62 VND/giờ

const BASE_INPUT = {
  employeeId:   1,
  employeeCode: 'NV001',
  employeeName: 'Trần Văn A',
  month: 8, year: 2026,
  officialSalary: OFFICIAL,
  basicSalary:    BASIC,
  isPaidBhxh:     true,
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(testName: string, actual: number, expected: number, tolerance = 500) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`  ✅ ${testName}: ${actual.toLocaleString('vi-VN')} (expected ~${expected.toLocaleString('vi-VN')})`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     actual:   ${actual.toLocaleString('vi-VN')}`);
    console.error(`     expected: ${expected.toLocaleString('vi-VN')}`);
    console.error(`     diff:     ${diff.toLocaleString('vi-VN')} (tolerance: ${tolerance})`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Đơn giá gốc (derived rates)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TEST 1: Derived Rates ══');
assert('dailyOfficialRate = 12M/26',
  dailyOfficialRate(OFFICIAL), 461_538, 1);
assert('hourlyBasicRate = 8.4M/26/8',
  hourlyBasicRate(BASIC), 40_384, 1);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Lương ngày thường (T2-T7)
// 22 ngày công × (12.000.000 / 26) = 22 × 461.538 = 10.153.846
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TEST 2: Lương T2-T7 thuần ══');
const t2 = calculateMonthlyPayroll({
  ...BASE_INPUT,
  regularWorkedDays: 22, paidLeaveDays: 0,
  eveningOtHours: 0, nightOtHours: 0,
  sundayHours: 0, sundayNightHours: 0,
  holidayDaysOff: 0, holidayWorkedWeekdayDays: 0, holidayWorkedSundayDays: 0,
  unpaidLeaveDays: 0, absentDays: 0,
  attendanceAllowance: 500_000, totalLateEarlyMins: 0, advanceDeduction: 0, otherDeductions: 0,
});
// grossEarnings trước BHXH = 22 × 461.538 = 10.153.846
// BHXH NV = 8.400.000 × 10.5% = 882.000
// netSalary = 10.153.846 - 882.000 = 9.271.846
assert('gross = 22 × 461.538', t2.grossEarnings, 10_153_846, 5);
assert('BHXH NV = 8.4M × 10.5%', t2.bhxhEmployee, 882_000, 5);
assert('net = gross - bhxh', t2.netSalary, 9_271_846, 10);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: OT chiều (17h-22h)
// 10h OT evening × (8.400.000/26/8) × 1.5 = 10 × 40.384 × 1.5 = 605.769
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TEST 3: OT chiều/tối (17h-22h) ══');
const t3 = calculateMonthlyPayroll({
  ...BASE_INPUT,
  regularWorkedDays: 0, paidLeaveDays: 0,
  eveningOtHours: 10, nightOtHours: 0,
  sundayHours: 0, sundayNightHours: 0,
  holidayDaysOff: 0, holidayWorkedWeekdayDays: 0, holidayWorkedSundayDays: 0,
  unpaidLeaveDays: 0, absentDays: 0,
  attendanceAllowance: 500_000, totalLateEarlyMins: 0, advanceDeduction: 0, otherDeductions: 0,
});
// 10 × 40.384 × 1.5 = 605.769
const expectedOtEvening = Math.round(10 * hourlyBasicRate(BASIC) * 1.5);
assert('OT evening 10h', t3.grossEarnings, expectedOtEvening, 5);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: OT đêm (sau 22h)
// 5h OT night × (8.400.000/26/8) × 2.0 = 5 × 40.384 × 2.0 = 403.846
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TEST 4: OT đêm (sau 22h) ══');
const t4 = calculateMonthlyPayroll({
  ...BASE_INPUT,
  regularWorkedDays: 0, paidLeaveDays: 0,
  eveningOtHours: 0, nightOtHours: 5,
  sundayHours: 0, sundayNightHours: 0,
  holidayDaysOff: 0, holidayWorkedWeekdayDays: 0, holidayWorkedSundayDays: 0,
  unpaidLeaveDays: 0, absentDays: 0,
  attendanceAllowance: 500_000, totalLateEarlyMins: 0, advanceDeduction: 0, otherDeductions: 0,
});
const expectedOtNight = Math.round(5 * hourlyBasicRate(BASIC) * 2.0);
assert('OT night 5h', t4.grossEarnings, expectedOtNight, 5);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Chủ nhật đêm (sau 22h) × 4.0
// 4h CN đêm × (8.400.000/26/8) × 4.0 = 4 × 40.384 × 4.0 = 645.384
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TEST 5: Chủ Nhật đêm × 4.0 ══');
const t5 = calculateMonthlyPayroll({
  ...BASE_INPUT,
  regularWorkedDays: 0, paidLeaveDays: 0,
  eveningOtHours: 0, nightOtHours: 0,
  sundayHours: 0, sundayNightHours: 4,
  holidayDaysOff: 0, holidayWorkedWeekdayDays: 0, holidayWorkedSundayDays: 0,
  unpaidLeaveDays: 0, absentDays: 0,
  attendanceAllowance: 500_000, totalLateEarlyMins: 0, advanceDeduction: 0, otherDeductions: 0,
});
const expectedSundayNight = Math.round(4 * hourlyBasicRate(BASIC) * 4.0);
assert('Sunday night 4h × 4.0', t5.grossEarnings, expectedSundayNight, 5);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: Ngày Lễ nghỉ (không đi làm) — basic_salary / 26
// 2 ngày Lễ nghỉ × (8.400.000/26) = 2 × 323.076 = 646.153
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TEST 6: Lễ không đi làm ══');
const t6 = calculateMonthlyPayroll({
  ...BASE_INPUT,
  regularWorkedDays: 0, paidLeaveDays: 0,
  eveningOtHours: 0, nightOtHours: 0,
  sundayHours: 0, sundayNightHours: 0,
  holidayDaysOff: 2, holidayWorkedWeekdayDays: 0, holidayWorkedSundayDays: 0,
  unpaidLeaveDays: 0, absentDays: 0,
  attendanceAllowance: 500_000, totalLateEarlyMins: 0, advanceDeduction: 0, otherDeductions: 0,
});
const expectedHolidayOff = Math.round((BASIC / 26) * 2);
assert('Lễ nghỉ 2 ngày (basic/26)', t6.grossEarnings, expectedHolidayOff, 5);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7: Lễ có đi làm (T2-T7) × official × 2.0
// 1 ngày × (12.000.000/26) × 2.0 = 461.538 × 2.0 = 923.076
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TEST 7: Lễ đi làm T2-T7 × 2.0 ══');
const t7 = calculateMonthlyPayroll({
  ...BASE_INPUT,
  regularWorkedDays: 0, paidLeaveDays: 0,
  eveningOtHours: 0, nightOtHours: 0,
  sundayHours: 0, sundayNightHours: 0,
  holidayDaysOff: 0, holidayWorkedWeekdayDays: 1, holidayWorkedSundayDays: 0,
  unpaidLeaveDays: 0, absentDays: 0,
  attendanceAllowance: 500_000, totalLateEarlyMins: 0, advanceDeduction: 0, otherDeductions: 0,
});
const expectedHolidayWeekday = Math.round((OFFICIAL / 26) * 1 * 2.0);
assert('Lễ T2-T7 1 ngày (official/26×2)', t7.grossEarnings, expectedHolidayWeekday, 5);

// ─────────────────────────────────────────────────────────────────────────────
// TEST 8: Kịch bản TỔNG HỢP — tháng đầy đủ nhất
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══ TEST 8: Kịch bản tổng hợp ══');
const t8 = calculateMonthlyPayroll({
  ...BASE_INPUT,
  regularWorkedDays: 20, paidLeaveDays: 2,
  eveningOtHours: 8, nightOtHours: 3,
  sundayHours: 16, sundayNightHours: 0,
  holidayDaysOff: 1, holidayWorkedWeekdayDays: 0, holidayWorkedSundayDays: 0,
  unpaidLeaveDays: 0, absentDays: 1,
  attendanceAllowance: 500_000, totalLateEarlyMins: 0, advanceDeduction: 1_000_000, otherDeductions: 0,
});

console.log('\n' + formatPayrollSummary(t8));
console.log('\nLine items:');
t8.lineItems.forEach(l => {
  const sign = l.isDeduction ? '-' : '+';
  console.log(`  [${sign}] ${l.code.padEnd(25)} ${l.formula}`);
  console.log(`      Amount: ${l.amount.toLocaleString('vi-VN')} VND`);
});

assert('netSalary > 0', t8.netSalary, t8.grossEarnings - t8.totalDeductions, 10);
assert('warnings OT check (không vượt)', t8.warnings.length, 0, 0);

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`);
console.log(`KẾT QUẢ: ${passed} passed | ${failed} failed`);
console.log('═'.repeat(60));

if (failed > 0) process.exit(1);
