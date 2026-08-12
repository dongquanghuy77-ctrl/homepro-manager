import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Force load .env.uat explicitly
dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { users, departments, managerDepartments, attendance, leaveRequests, leaveTypes, hrAuditLogs, monthlyPayroll } from '../src/db/schema';
import { sql, eq, like, and, isNotNull, count } from 'drizzle-orm';

const UAT_MARKER = 'uat_%';

async function runReconciliation() {
  console.log('=== UAT DATA RECONCILIATION ===');
  let anomalies = 0;
  
  const res = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = ((res as any).rows ? (res as any).rows[0].db_name : (res as any)[0].db_name) as string;
  if (dbName !== 'uat_neondb') {
    console.error(`[FATAL] Conneted to wrong database: ${dbName}.`);
    process.exit(1);
  }

  // 1. EMPLOYEES
  const allUsers = await db.select().from(users).where(like(users.username, UAT_MARKER));
  console.log(`\n1. EMPLOYEE STATS`);
  console.log(`Total UAT Employees: ${allUsers.length}`);
  if (allUsers.length !== 30) {
    console.log(`[ANOMALY] Expected 30 employees, got ${allUsers.length}`);
    anomalies++;
  }
  
  const noDeptUsers = allUsers.filter(u => !u.departmentId);
  if (noDeptUsers.length > 0) {
    console.log(`[ANOMALY] ${noDeptUsers.length} users have no departmentId`);
    anomalies += noDeptUsers.length;
  }
  
  const roleGroups = allUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`Role distribution:`, roleGroups);

  // 2. DEPARTMENTS
  const allDepts = await db.select().from(departments).where(like(departments.code, 'UAT_%'));
  console.log(`\n2. DEPARTMENT STATS`);
  console.log(`Total UAT Departments: ${allDepts.length}`);
  
  // 3. ATTENDANCE
  const allAtt = await db.execute(sql`
    SELECT status, COUNT(*) as c 
    FROM attendance a
    JOIN users u ON a.employee_id = u.id
    WHERE u.username LIKE 'uat_%'
    GROUP BY status
  `);
  console.log(`\n3. ATTENDANCE STATS`);
  const attRows = (allAtt as any).rows || allAtt;
  let totalAtt = 0;
  for (const row of attRows) {
    console.log(`- ${row.status}: ${row.c}`);
    totalAtt += parseInt(row.c);
  }
  console.log(`Total Attendance Records: ${totalAtt}`);
  if (totalAtt !== 810) {
    console.log(`[ANOMALY] Expected 810 attendance records, got ${totalAtt}`);
    anomalies++;
  }

  const wrongMonth = await db.execute(sql`
    SELECT COUNT(*) as c 
    FROM attendance a
    JOIN users u ON a.employee_id = u.id
    WHERE u.username LIKE 'uat_%' AND work_date NOT LIKE '2026-07-%'
  `);
  const wrongMonthCount = parseInt(((wrongMonth as any).rows || wrongMonth)[0].c);
  if (wrongMonthCount > 0) {
    console.log(`[ANOMALY] Found ${wrongMonthCount} attendance records not in July 2026`);
    anomalies += wrongMonthCount;
  }

  // 4. LEAVE
  const allLeave = await db.select().from(leaveRequests)
    .leftJoin(users, eq(leaveRequests.employeeId, users.id))
    .where(like(users.username, UAT_MARKER));
  
  console.log(`\n4. LEAVE STATS`);
  console.log(`Total UAT Leave Requests: ${allLeave.length}`);

  // 5. PAYROLL INPUT READINESS
  console.log(`\n5. PAYROLL INPUT READINESS`);
  const missingSalary = allUsers.filter(u => !u.officialSalary || !u.basicSalary);
  if (missingSalary.length > 0) {
    console.log(`[ANOMALY] ${missingSalary.length} users missing salary info`);
    anomalies += missingSalary.length;
  } else {
    console.log(`- Base Salary / Official Salary: SET for all 30 employees.`);
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`ANOMALIES: ${anomalies}`);
}

runReconciliation().catch(console.error);
