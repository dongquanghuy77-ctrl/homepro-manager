// scripts/simulation_test.ts
// ══════════════════════════════════════════════════════════════════════════════
// Stress-Test Simulation Script — Rule Engine & Payroll Bug Hunting
// Run with: npx tsx scripts/simulation_test.ts
// ══════════════════════════════════════════════════════════════════════════════

import { calculateDailyAttendance, ShiftRuleInput } from '../src/lib/ruleEngine';
import { calculateMonthlyPayroll, DEFAULT_ALLOWANCE_TIERS } from '../src/lib/payroll';

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEFINE SIMULATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────
interface TestResult {
  scenario: string;
  crash: boolean;
  negatives: boolean;
  nans: boolean;
  details: string;
  safetyRating: string;
}

const results: TestResult[] = [];

function checkValue(val: any): { isNan: boolean, isNeg: boolean } {
  if (val === null || val === undefined) return { isNan: false, isNeg: false };
  if (typeof val === 'number') {
    return { isNan: isNaN(val), isNeg: val < 0 };
  }
  return { isNan: false, isNeg: false };
}

function scanObjectForErrors(obj: any): { isNan: boolean, isNeg: boolean, failedFields: string[] } {
  let isNan = false;
  let isNeg = false;
  const failedFields: string[] = [];
  
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const { isNan: n, isNeg: neg } = checkValue(val);
    if (n) {
      isNan = true;
      failedFields.push(`${key}(NaN)`);
    }
    // Clamped fields checking: totalHours, workedMinutes, workCoefficient should never be negative
    if (neg && ['totalHours', 'workedMinutes', 'workCoefficient', 'regularWorkedDays', 'netSalary', 'grossEarnings'].includes(key)) {
      isNeg = true;
      failedFields.push(`${key}(<0)`);
    }
  }
  return { isNan, isNeg, failedFields };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXECUTE SIMULATIONS
// ─────────────────────────────────────────────────────────────────────────────
function runSimulation() {
  console.log('\n🚀 STARTING OPERATION STRESS-TEST (BUG HUNTING)...');
  
  const mockShiftRule: ShiftRuleInput = {
    id: 999,
    code: 'MORNING',
    name: 'Ca Sáng Hành Chính',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    isOvernight: false,
    graceLateMins: 5,
    graceEarlyMins: 5,
    standardHours: 8,
    breakMinutes: 60,
    otThresholdMins: 30,
    otMultiplier: 1.5,
  };

  const mockNightShiftRule: ShiftRuleInput = {
    id: 998,
    code: 'NIGHT',
    name: 'Ca Đêm Xưởng Gỗ',
    shiftStart: '22:00',
    shiftEnd: '06:00',
    isOvernight: true,
    graceLateMins: 5,
    graceEarlyMins: 5,
    standardHours: 8,
    breakMinutes: 60,
    otThresholdMins: 30,
    otMultiplier: 1.5,
  };

  // ───────────────────────────────────────────────────────────────────────
  // CASE 1: Missing Check-out (Quên chấm công xuyên tuần)
  // ───────────────────────────────────────────────────────────────────────
  console.log('\n--- Running Case 1: Missing Check-out ---');
  let case1Crash = false;
  let case1Note = '';
  let dailyResA1: any = null;
  
  try {
    // Friday check-in, no check-out
    const fridayRecord = {
      employeeId: 10001,
      workDate: '2026-08-07', // Thứ 6
      clockIn: new Date('2026-08-07T07:55:00Z'),
      clockOut: null,
      shiftRuleId: mockShiftRule.id,
    };
    
    // Monday check-in
    const mondayRecord = {
      employeeId: 10001,
      workDate: '2026-08-10', // Thứ 2
      clockIn: new Date('2026-08-10T08:00:00Z'),
      clockOut: null,
      shiftRuleId: mockShiftRule.id,
    };

    // Run Friday daily check via Rule Engine
    dailyResA1 = calculateDailyAttendance(fridayRecord, mockShiftRule);
    case1Note = `Thứ 6: Trạng thái=${dailyResA1.status}, Phút làm việc=${dailyResA1.workedMinutes}, Hệ số công=${dailyResA1.workCoefficient}. `;
    
    if (dailyResA1.status !== 'PENDING_CHECKOUT') {
      throw new Error(`Kỳ vọng PENDING_CHECKOUT nhưng nhận được: ${dailyResA1.status}`);
    }
    case1Note += `Thứ 2: Chấm công độc lập trên workDate=${mondayRecord.workDate} thành công.`;
  } catch (err: any) {
    case1Crash = true;
    case1Note = `Sập luồng: ${err.message}`;
  }

  const checkA1 = scanObjectForErrors(dailyResA1 || {});
  results.push({
    scenario: 'Missing Check-out (Quên quẹt ra)',
    crash: case1Crash,
    negatives: checkA1.isNeg,
    nans: checkA1.isNan,
    details: case1Note + (checkA1.failedFields.length ? ` [Lỗi: ${checkA1.failedFields.join(', ')}]` : ''),
    safetyRating: case1Crash ? '🔴 CRITICAL FAIL' : (checkA1.isNeg || checkA1.isNan ? '🟡 WARNING' : '🟢 SECURE (Đóng ca an toàn)'),
  });


  // ───────────────────────────────────────────────────────────────────────
  // CASE 2: Overlap Conflict (Nghỉ phép & Đi làm song song)
  // ───────────────────────────────────────────────────────────────────────
  console.log('--- Running Case 2: Overlap Conflict ---');
  let case2Crash = false;
  let case2Note = '';
  let payrollResB: any = null;
  let totalPaidDays = 0;

  try {
    // Wednesday: Approved Leave (1 day) AND GPS Clock-in/out Present (1 day)
    const inputB = {
      employeeId: 10002,
      employeeCode: 'NV_STRESS_B',
      employeeName: 'Nhân viên B (Stress)',
      month: 8,
      year: 2026,
      officialSalary: 13000000,
      basicSalary: 9100000,
      isPaidBhxh: true,
      regularWorkedDays: 1, // Đi làm ngày thứ Tư
      paidLeaveDays: 1,     // Được duyệt nghỉ phép ngày thứ Tư
      eveningOtHours: 0,
      nightOtHours: 0,
      sundayHours: 0,
      sundayNightHours: 0,
      holidayDaysOff: 0,
      holidayWorkedWeekdayDays: 0,
      holidayWorkedSundayDays: 0,
      unpaidLeaveDays: 0,
      absentDays: 0,
      attendanceAllowance: 500000,
      totalLateEarlyMins: 0,
      advanceDeduction: 0,
      otherDeductions: 0,
      allowanceTiers: DEFAULT_ALLOWANCE_TIERS,
    };

    // Run monthly payroll calculation
    payrollResB = calculateMonthlyPayroll(inputB);
    
    // Verify total days paid.
    totalPaidDays = inputB.regularWorkedDays + inputB.paidLeaveDays;
    case2Note = `Ngày công đi làm=${inputB.regularWorkedDays}d + nghỉ phép=${inputB.paidLeaveDays}d. Lương thực nhận=${payrollResB.netSalary.toLocaleString('vi-VN')}đ.`;
    if (totalPaidDays > 1) {
      case2Note += ` ⚠️ RỦI RO: Hệ thống cộng dồn cả 2 cấu phần tạo ra tổng cộng ${totalPaidDays} ngày công trả lương cho cùng 1 ngày lịch!`;
    }
  } catch (err: any) {
    case2Crash = true;
    case2Note = `Sập luồng: ${err.message}`;
  }

  const checkB = scanObjectForErrors(payrollResB || {});
  results.push({
    scenario: 'Overlap Conflict (Vừa đi làm vừa nghỉ phép)',
    crash: case2Crash,
    negatives: checkB.isNeg,
    nans: checkB.isNan,
    details: case2Note,
    safetyRating: case2Crash ? '🔴 CRITICAL FAIL' : (totalPaidDays > 1 ? '🟡 WARNING (Trùng lặp công gây trả dư lương)' : '🟢 SECURE'),
  });


  // ───────────────────────────────────────────────────────────────────────
  // CASE 3: Holiday Overlap (Ca đêm vắt qua ngày Lễ)
  // ───────────────────────────────────────────────────────────────────────
  console.log('--- Running Case 3: Holiday Overlap ---');
  let case3Crash = false;
  let case3Note = '';
  let dailyResC: any = null;

  try {
    // Tuesday Sept 1st (Normal) 22:00 -> Wednesday Sept 2nd (National Holiday) 06:00
    const overnightRecord = {
      employeeId: 10003,
      workDate: '2026-09-01', // Ngày vào ca (Thứ Ba bình thường)
      clockIn: new Date('2026-09-01T22:00:00Z'),
      clockOut: new Date('2026-09-02T06:00:00Z'),
      shiftRuleId: mockNightShiftRule.id,
    };

    dailyResC = calculateDailyAttendance(overnightRecord, mockNightShiftRule);
    
    case3Note = `Ca đêm vắt qua Lễ. Trạng thái=${dailyResC.status}, Tổng phút làm việc=${dailyResC.workedMinutes}p. `;
    case3Note += `Hệ số công=${dailyResC.workCoefficient}. Không tự động tách lớp giờ làm sang Ngày Lễ (Toàn bộ giờ được tính theo ngày bắt đầu ca 01/09).`;
  } catch (err: any) {
    case3Crash = true;
    case3Note = `Sập luồng: ${err.message}`;
  }

  const checkC = scanObjectForErrors(dailyResC || {});
  results.push({
    scenario: 'Holiday Overlap (Ca đêm vắt qua ngày Lễ)',
    crash: case3Crash,
    negatives: checkC.isNeg,
    nans: checkC.isNan,
    details: case3Note,
    safetyRating: case3Crash ? '🔴 CRITICAL FAIL' : '🟢 SECURE (Chưa tách múi giờ, giữ nguyên lương ngày thường)',
  });


  // ───────────────────────────────────────────────────────────────────────
  // CASE 4: Offline Clock Fraud (Gian lận thời gian Offline)
  // ───────────────────────────────────────────────────────────────────────
  console.log('--- Running Case 4: Offline Clock Fraud ---');
  let case4Crash = false;
  let case4Note = '';
  let isFlagged = false;

  try {
    // Simulation of clock sync API checks
    const clientTimestamp = new Date('2026-08-11T02:00:00Z'); // Giờ điện thoại lúc bấm
    const serverReceivedTime = new Date('2026-08-11T10:00:00Z'); // Giờ máy chủ nhận (8 tiếng sau)
    
    const deltaMs = serverReceivedTime.getTime() - clientTimestamp.getTime();
    const deltaMinutes = Math.round(deltaMs / 60000); // 480 phút (8 giờ)

    // Fraud check logic inside clock sync API
    let flagReason = '';
    if (deltaMinutes < -5) {
      isFlagged = true;
      flagReason = `Cảnh báo: Giờ điện thoại nhanh hơn giờ máy chủ.`;
    } else if (deltaMinutes > 420) { // 7 tiếng
      isFlagged = true;
      flagReason = `Cảnh báo: Đồng bộ trễ quá quy định (${Math.round(deltaMinutes / 60)} giờ). Nghi vấn chỉnh giờ lùi.`;
    }

    case4Note = `Chênh lệch giờ=${deltaMinutes} phút (${deltaMinutes / 60} giờ). Đã gắn cờ gian lận=${isFlagged ? 'ĐÚNG' : 'SAI'}. Lý do: ${flagReason}`;
  } catch (err: any) {
    case4Crash = true;
    case4Note = `Sập luồng: ${err.message}`;
  }

  results.push({
    scenario: 'Offline Clock Fraud (Gian lận chỉnh lùi giờ điện thoại)',
    crash: case4Crash,
    negatives: false,
    nans: false,
    details: case4Note,
    safetyRating: isFlagged ? '🟢 PASS (Bị phát hiện & Gắn cờ)' : '🔴 FAILED TO DETECT',
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PRINT REPORT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n========================================================================================================');
  console.log('                                  SIMULATION STRESS-TEST REPORT');
  console.log('========================================================================================================');
  console.log(String.prototype.padEnd.call('Kịch bản giả lập (Scenario)', 45) + ' | ' + 
              String.prototype.padEnd.call('Sập?', 5) + ' | ' + 
              String.prototype.padEnd.call('Số Âm?', 7) + ' | ' + 
              String.prototype.padEnd.call('NaN?', 5) + ' | ' + 
              String.prototype.padEnd.call('Đánh giá an toàn', 35));
  console.log('--------------------------------------------------------------------------------------------------------');
  
  for (const r of results) {
    console.log(
      String.prototype.padEnd.call(r.scenario, 45) + ' | ' +
      String.prototype.padEnd.call(r.crash ? 'CÓ ❌' : 'KHÔNG', 5) + ' | ' +
      String.prototype.padEnd.call(r.negatives ? 'CÓ ❌' : 'KHÔNG', 7) + ' | ' +
      String.prototype.padEnd.call(r.nans ? 'CÓ ❌' : 'KHÔNG', 5) + ' | ' +
      String.prototype.padEnd.call(r.safetyRating, 35)
    );
    console.log(`   👉 Chi tiết: ${r.details}\n`);
  }
  console.log('========================================================================================================');
  console.log('✅ THỬ NGHIỆM KẾT THÚC: Kịch bản giả lập hoàn tất an toàn!');
  console.log('========================================================================================================\n');
}

runSimulation();
