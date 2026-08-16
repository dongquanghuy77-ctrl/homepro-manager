import 'dotenv/config';
import { db } from '../src/db';
import { users, attendance, monthlyPayroll } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding Phase 10 Golden Data (HR - Chấm công & Lương)...');

  // Find users
  const userList = await db.select().from(users).limit(2);
  if (userList.length === 0) {
    console.error('No users found! Please run Phase 1 seeding first.');
    process.exit(1);
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const targetMonth = lastMonth.getMonth() + 1;
  const targetYear = lastMonth.getFullYear();

  for (const user of userList) {
    // 1. Create Attendance (Today)
    await db.insert(attendance).values({
      employeeId: user.id,
      workDate: todayStr,
      checkIn: new Date(new Date().setHours(8, 0, 0, 0)),
      checkOut: new Date(new Date().setHours(17, 0, 0, 0)),
      status: 'PRESENT',
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      totalHours: 8,
      clockInSource: 'WEB_GPS',
      clockOutSource: 'WEB_GPS'
    });
    console.log(`✅ Attendance (Check-in/out) created for user: ${user.fullName}`);

    // 2. Create Monthly Payroll (Last Month)
    await db.insert(monthlyPayroll).values({
      employeeId: user.id,
      month: targetMonth,
      year: targetYear,
      officialSalary: 15000000,
      basicSalary: 15000000,
      regularWorkedDays: 22,
      paidLeaveDays: 1,
      attendanceAllowance: 500000,
      grossEarnings: 15500000,
      totalDeductions: 1000000,
      netSalary: 14500000,
      bhxhEmployee: 1000000,
      status: 'PUBLISHED',
      lineItemsJson: [
        { name: 'Lương cơ bản', amount: 15000000, type: 'EARNING' },
        { name: 'Phụ cấp chuyên cần', amount: 500000, type: 'ALLOWANCE' },
        { name: 'Khấu trừ BHXH', amount: 1000000, type: 'DEDUCTION' }
      ]
    });
    console.log(`✅ Monthly Payroll created for user: ${user.fullName}`);
  }

  console.log('🎉 Phase 10 Golden Data Seeding Completed!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
