import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Force load .env.uat explicitly
dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { users, departments, managerDepartments, attendance, leaveRequests, leaveTypes, leaveBalances, hrAuditLogs } from '../src/db/schema';
import { sql, eq, like } from 'drizzle-orm';

const UAT_MARKER = 'uat_';
const MONTH = '2026-07';

async function runSeed() {
  console.log('--- STARTING UAT SEED FOR JULY 2026 ---');
  
  // 1. ISOLATION CHECK
  const res = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = ((res as any).rows ? (res as any).rows[0].db_name : (res as any)[0].db_name) as string;
  if (dbName !== 'uat_neondb') {
    console.error(`[FATAL] Conneted to wrong database: ${dbName}. Expected uat_neondb.`);
    process.exit(1);
  }
  console.log(`[OK] Connected to isolated UAT database: ${dbName}`);

  // 2. CLEANUP PREVIOUS SEED IF EXISTS
  console.log('[...] Cleaning up existing UAT records...');
  const uatUsers = await db.select({ id: users.id }).from(users).where(like(users.username, `${UAT_MARKER}%`));
  if (uatUsers.length > 0) {
    const userIds = uatUsers.map(u => u.id);
    await db.delete(managerDepartments).where(sql`${managerDepartments.managerId} IN (${sql.join(userIds, sql`, `)})`);
    await db.delete(users).where(like(users.username, `${UAT_MARKER}%`));
  }
  await db.delete(departments).where(like(departments.code, `UAT_%`));
  await db.delete(leaveTypes).where(like(leaveTypes.code, `UAT_%`));

  // 3. SEED DEPARTMENTS
  const depts = [
    { code: 'UAT_BOD', name: 'Ban Giám Đốc', block: 'VAN_PHONG' },
    { code: 'UAT_HR', name: 'Nhân Sự & Kế Toán', block: 'VAN_PHONG' },
    { code: 'UAT_DESIGN', name: 'Thiết Kế', block: 'VAN_PHONG' },
    { code: 'UAT_WOOD', name: 'Xưởng Gỗ', block: 'SAN_XUAT' },
    { code: 'UAT_CONSTRUCT', name: 'Thi Công', block: 'SAN_XUAT' },
  ];
  
  const insertedDepts: Record<string, number> = {};
  for (const d of depts) {
    const [inserted] = await db.insert(departments).values(d).returning();
    insertedDepts[d.code] = inserted.id;
  }
  console.log(`[OK] Inserted ${Object.keys(insertedDepts).length} UAT departments.`);

  // 4. SEED LEAVE TYPES
  const [leaveTypeAnnual] = await db.insert(leaveTypes).values({
    code: 'UAT_ANNUAL', name: 'Phép năm UAT', payrollImpact: 'NONE'
  }).returning();

  // 5. SEED 30 EMPLOYEES
  const employeesToInsert = [];
  
  // Board of Directors (3)
  for(let i=0; i<3; i++) {
    employeesToInsert.push({
      username: `${UAT_MARKER}bod_${i+1}`, password: '123', name: `Director ${i+1}`, role: 'ADMIN', 
      departmentId: insertedDepts['UAT_BOD'], employeeCode: `UAT_BOD_${i+1}`, officialSalary: 50000000, basicSalary: 20000000
    });
  }
  
  // HR (2)
  for(let i=0; i<2; i++) {
    employeesToInsert.push({
      username: `${UAT_MARKER}hr_${i+1}`, password: '123', name: `HR ${i+1}`, role: 'HR', 
      departmentId: insertedDepts['UAT_HR'], employeeCode: `UAT_HR_${i+1}`, officialSalary: 15000000, basicSalary: 10000000
    });
  }

  // Design (5 - 1 Manager, 4 Workers)
  employeesToInsert.push({ username: `${UAT_MARKER}design_mgr`, password: '123', name: `Design Manager`, role: 'MANAGER', departmentId: insertedDepts['UAT_DESIGN'], employeeCode: `UAT_DES_MGR`, officialSalary: 25000000, basicSalary: 15000000});
  for(let i=0; i<4; i++) {
    employeesToInsert.push({ username: `${UAT_MARKER}design_${i+1}`, password: '123', name: `Designer ${i+1}`, role: 'WORKER', departmentId: insertedDepts['UAT_DESIGN'], employeeCode: `UAT_DES_${i+1}`, officialSalary: 12000000, basicSalary: 8000000});
  }

  // Wood (10 - 1 Manager, 9 Workers)
  employeesToInsert.push({ username: `${UAT_MARKER}wood_mgr`, password: '123', name: `Wood Manager`, role: 'MANAGER', departmentId: insertedDepts['UAT_WOOD'], employeeCode: `UAT_WOOD_MGR`, officialSalary: 22000000, basicSalary: 12000000});
  for(let i=0; i<9; i++) {
    employeesToInsert.push({ username: `${UAT_MARKER}wood_${i+1}`, password: '123', name: `Wood Worker ${i+1}`, role: 'WORKER', departmentId: insertedDepts['UAT_WOOD'], employeeCode: `UAT_WOOD_${i+1}`, officialSalary: 10000000, basicSalary: 6000000});
  }

  // Construct (10 - 1 Manager, 9 Workers)
  employeesToInsert.push({ username: `${UAT_MARKER}const_mgr`, password: '123', name: `Const Manager`, role: 'MANAGER', departmentId: insertedDepts['UAT_CONSTRUCT'], employeeCode: `UAT_CONS_MGR`, officialSalary: 23000000, basicSalary: 13000000});
  for(let i=0; i<9; i++) {
    employeesToInsert.push({ username: `${UAT_MARKER}const_${i+1}`, password: '123', name: `Const Worker ${i+1}`, role: 'WORKER', departmentId: insertedDepts['UAT_CONSTRUCT'], employeeCode: `UAT_CONS_${i+1}`, officialSalary: 11000000, basicSalary: 7000000});
  }

  const insertedUsers = await db.insert(users).values(employeesToInsert).returning();
  console.log(`[OK] Inserted ${insertedUsers.length} employees.`);

  // Setup Manager Departments
  const mgrDesign = insertedUsers.find(u => u.username === `${UAT_MARKER}design_mgr`);
  const mgrWood = insertedUsers.find(u => u.username === `${UAT_MARKER}wood_mgr`);
  const mgrConst = insertedUsers.find(u => u.username === `${UAT_MARKER}const_mgr`);
  
  await db.insert(managerDepartments).values([
    { managerId: mgrDesign!.id, departmentId: insertedDepts['UAT_DESIGN'], managementLevel: 1, canApprove: true, canView: true },
    { managerId: mgrWood!.id, departmentId: insertedDepts['UAT_WOOD'], managementLevel: 1, canApprove: true, canView: true },
    { managerId: mgrConst!.id, departmentId: insertedDepts['UAT_CONSTRUCT'], managementLevel: 1, canApprove: true, canView: true },
  ]);

  // 6. SEED ATTENDANCE & LEAVE FOR JULY 2026
  const attendanceRecords = [];
  const sundays = [5, 12, 19, 26];
  
  for (const user of insertedUsers) {
    await db.insert(leaveBalances).values({ employeeId: user.id, leaveTypeId: leaveTypeAnnual.id, year: 2026, totalDays: 12, usedDays: 0, pendingDays: 0 });

    for (let day = 1; day <= 31; day++) {
      if (sundays.includes(day)) continue; // skip sundays
      
      const dayStr = day.toString().padStart(2, '0');
      const dateStr = `2026-07-${dayStr}`;
      
      let status = 'PRESENT';
      let checkInStr = `2026-07-${dayStr}T07:55:00Z`;
      let checkOutStr = `2026-07-${dayStr}T17:05:00Z`;
      let totalHours = 8;
      
      if (user.username === `${UAT_MARKER}design_1`) {
        checkInStr = `2026-07-${dayStr}T08:30:00Z`;
        totalHours = 7.5;
        status = 'LATE';
      }
      
      if (user.username === `${UAT_MARKER}wood_1` && day === 15) {
        status = 'ABSENT';
        totalHours = 0;
        attendanceRecords.push({ employeeId: user.id, workDate: dateStr, status, totalHours, idempotencyKey: `uat_seed_${user.id}_${dateStr}` });
        continue;
      }

      if (user.username === `${UAT_MARKER}const_1` && day >= 20 && day <= 22) {
        status = 'ON_LEAVE';
        totalHours = 8;
        attendanceRecords.push({ employeeId: user.id, workDate: dateStr, status, totalHours, idempotencyKey: `uat_seed_${user.id}_${dateStr}` });
        continue;
      }

      attendanceRecords.push({
        employeeId: user.id,
        workDate: dateStr,
        checkIn: new Date(checkInStr),
        checkOut: new Date(checkOutStr),
        status,
        totalHours,
        idempotencyKey: `uat_seed_${user.id}_${dateStr}`
      });
    }
  }

  for (let i = 0; i < attendanceRecords.length; i += 100) {
    await db.insert(attendance).values(attendanceRecords.slice(i, i+100));
  }
  console.log(`[OK] Inserted ${attendanceRecords.length} attendance records.`);

  const const1 = insertedUsers.find(u => u.username === `${UAT_MARKER}const_1`);
  if (const1) {
    await db.insert(leaveRequests).values({
      employeeId: const1.id, leaveTypeId: leaveTypeAnnual.id,
      startDate: '2026-07-20', endDate: '2026-07-22',
      period: 'FULL_DAY', totalDays: 3, status: 'APPROVED',
      currentApprovalLevel: 2
    });
  }

  console.log('--- UAT SEED COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

runSeed().catch(err => {
  console.error(err);
  process.exit(1);
});
