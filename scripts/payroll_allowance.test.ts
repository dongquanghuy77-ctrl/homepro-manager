// scripts/payroll.test.ts — Updated for attendance allowance
import { calculateMonthlyPayroll, formatPayrollSummary, calcAttendanceAllowance, DEFAULT_ALLOWANCE_TIERS, AllowanceTier } from '../src/lib/payroll';
const OFFICIAL = 12_000_000;
const BASIC    =  8_400_000;
const BASE = { employeeId:1, employeeCode:'NV001', employeeName:'Tran Van A', month:8, year:2026, officialSalary:OFFICIAL, basicSalary:BASIC, isPaidBhxh:true, regularWorkedDays:0, paidLeaveDays:0, eveningOtHours:0, nightOtHours:0, sundayHours:0, sundayNightHours:0, holidayDaysOff:0, holidayWorkedWeekdayDays:0, holidayWorkedSundayDays:0, unpaidLeaveDays:0, absentDays:0, advanceDeduction:0, otherDeductions:0 };
let passed=0,failed=0;
function assert(name:string, actual:number, expected:number, tol=500){
  const ok=Math.abs(actual-expected)<=tol;
  if(ok){ console.log(`  OK ${name}: ${actual.toLocaleString('vi-VN')} (~${expected.toLocaleString('vi-VN')})`); passed++; }
  else { console.error(`  FAIL ${name}: actual=${actual} expected=${expected}`); failed++; }
}
// T1: 0 vi pham -> 100%
const t1=calcAttendanceAllowance(500_000,0);
assert('Allowance 0 vi pham (100%)', t1.amount, 500_000, 1);
// T2: 15 phut -> 50%
const t2=calcAttendanceAllowance(500_000,15);
assert('Allowance 15 phut (50%)', t2.amount, 250_000, 1);
// T3: 45 phut -> 0%
const t3=calcAttendanceAllowance(500_000,45);
assert('Allowance 45 phut (0%)', t3.amount, 0, 1);
// T4: 30 phut dung moc -> 50%
const t4=calcAttendanceAllowance(500_000,30);
assert('Allowance 30 phut dung moc (50%)', t4.amount, 250_000, 1);
// T5: Custom tier (3 muc)
const customTiers: AllowanceTier[] = [
  {maxViolationMins:0,  pct:1.0, label:'Full'},
  {maxViolationMins:60, pct:0.5, label:'Half'},
  {maxViolationMins:9999,pct:0.0,label:'None'}
];
const t5=calcAttendanceAllowance(500_000,59,customTiers);
assert('Custom tier 59phut (50%)', t5.amount, 250_000, 1);
// T6: Full payroll with allowance
const result=calculateMonthlyPayroll({...BASE, regularWorkedDays:22, attendanceAllowance:500_000, totalLateEarlyMins:0, advanceDeduction:0, otherDeductions:0});
assert('Full payroll: allowance 100%', result.lineItems.find(l=>l.code==='ALLOWANCE_ATTENDANCE')!.amount, 500_000, 1);
assert('Full payroll: NO DEDUCT_LATE', result.lineItems.filter(l=>l.code==='DEDUCT_LATE').length, 0, 0);
// T7: Late 20 phut -> allowance giam 50%
const result2=calculateMonthlyPayroll({...BASE, regularWorkedDays:22, attendanceAllowance:500_000, totalLateEarlyMins:20, advanceDeduction:0, otherDeductions:0});
assert('Late 20phut: allowance 50%', result2.lineItems.find(l=>l.code==='ALLOWANCE_ATTENDANCE')!.amount, 250_000, 1);
// T8: Late 50 phut -> allowance = 0
const result3=calculateMonthlyPayroll({...BASE, regularWorkedDays:22, attendanceAllowance:500_000, totalLateEarlyMins:50, advanceDeduction:0, otherDeductions:0});
assert('Late 50phut: allowance 0', result3.lineItems.find(l=>l.code==='ALLOWANCE_ATTENDANCE')!.amount, 0, 1);
assert('Late 50phut: luong chinh bao toan', result3.lineItems.find(l=>l.code==='REGULAR')!.amount, Math.round(OFFICIAL/26*22), 5);
// T9: Formula cuoi day du
const full=calculateMonthlyPayroll({...BASE, regularWorkedDays:20, paidLeaveDays:2, eveningOtHours:8, nightOtHours:3, sundayHours:16, sundayNightHours:0, holidayDaysOff:1, holidayWorkedWeekdayDays:0, holidayWorkedSundayDays:0, unpaidLeaveDays:0, absentDays:1, attendanceAllowance:500_000, totalLateEarlyMins:25, advanceDeduction:1_000_000, otherDeductions:0});
console.log('\n' + formatPayrollSummary(full));
assert('netSalary > 0', full.netSalary, full.grossEarnings-full.totalDeductions, 10);
console.log(`\nKET QUA: ${passed} passed | ${failed} failed`);
if(failed>0) process.exit(1);
