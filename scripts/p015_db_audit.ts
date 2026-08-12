import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users, departments, managerDepartments, rolePermissions, permissions, attendance, leaveRequests, overtimeRequests, monthlyPayroll } from '../src/db/schema';
import { sql } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('--- DB AUDIT START ---');
  
  const tables = [
    { name: 'users', table: users },
    { name: 'departments', table: departments },
    { name: 'manager_departments', table: managerDepartments },
    { name: 'rolePermissions', table: rolePermissions },
    { name: 'permissions', table: permissions },
    { name: 'attendance', table: attendance },
    { name: 'leave', table: leaveRequests },
    { name: 'overtime', table: overtimeRequests },
    { name: 'payroll', table: monthlyPayroll }
  ];

  for (const t of tables) {
    try {
      const res = await db.select({ count: sql<number>`count(*)` }).from(t.table);
      console.log(`Table ${t.name}: ${res[0].count} rows`);
    } catch (e) {
      console.log(`Table ${t.name}: ERR`);
    }
  }

  const allUsers = await db.select().from(users);
  
  let safe = 0;
  let review = 0;
  let manual = 0;
  let doNotMigrate = 0;

  console.log('--- MANUAL REVIEW QUEUE RAW DATA ---');
  for (const u of allUsers) {
    if (u.role === 'ADMIN' && u.username === 'viewer') {
       doNotMigrate++;
       continue;
    }
    
    let isManual = false;
    let isReview = false;
    let reasons = [];
    
    if (!u.employeeCode) { isManual = true; reasons.push('Missing employeeCode'); }
    if (!u.position) { isManual = true; reasons.push('Missing position'); }
    if (!u.managerId) { isReview = true; reasons.push('Missing managerId'); }
    if (!u.officialSalary || u.officialSalary === 0) { isManual = true; reasons.push('Missing salary'); }
    
    if (isManual) {
      manual++;
      console.log(`MANUAL: ${u.username} (${u.name}) - ${reasons.join(', ')}`);
    } else if (isReview) {
      review++;
      console.log(`REVIEW: ${u.username} (${u.name}) - ${reasons.join(', ')}`);
    } else {
      safe++;
    }
  }

  console.log(`\nSUMMARY: SAFE: ${safe}, REVIEW: ${review}, MANUAL: ${manual}, DO_NOT_MIGRATE: ${doNotMigrate}`);

  process.exit(0);
}

main().catch(console.error);
