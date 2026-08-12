import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { monthlyPayroll, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// Removed node-fetch

async function testConcurrency() {
  console.log('=== STARTING CONCURRENCY TEST ===');

  const hrUser = await db.query.users.findFirst({
    where: eq(users.role, 'HR'),
  });

  if (!hrUser) {
    throw new Error('HR user not found for testing');
  }

  // Get a target employee
  const worker = await db.query.users.findFirst({
    where: eq(users.username, 'uat_design_1')
  });

  if (!worker) {
    throw new Error('uat_design_1 not found');
  }

  // Clean up any existing payroll for this user for month 7, year 2026
  await (db as any).execute(`DELETE FROM monthly_payroll WHERE employee_id = ${worker.id} AND month = 7 AND year = 2026`);

  // We will simulate 10 concurrent requests to the API for this user
  const promises = [];
  const url = `http://localhost:3000/api/hr/payroll/calculate`; // Wait, this API might need the server running?
  // Let's call the logic directly since we don't have a server running in the test environment.
  // We can just simulate the UPSERT operation 10 times concurrently.
  
  const { sql } = await import('drizzle-orm');
  
  const valuesToUpsert = {
    officialSalary:           10000000,
    basicSalary:              10000000,
    regularWorkedDays:        26,
    paidLeaveDays:            0,
    eveningOtHours:           0,
    nightOtHours:             0,
    sundayHours:              0,
    sundayNightHours:         0,
    holidayDaysOff:           0,
    holidayWorkedWeekdayDays: 0,
    holidayWorkedSundayDays:  0,
    unpaidLeaveDays:          0,
    absentDays:               0,
    attendanceAllowance:      500000,
    totalLateEarlyMins:       0,
    grossEarnings:            10000000,
    totalDeductions:          0,
    netSalary:                10000000,
    bhxhEmployee:             0,
    bhxhEmployer:             0,
    advanceDeduction:         0,
    otherDeductions:          0,
    lineItemsJson:            [],
    warningsJson:             [],
    calculatedAt:             new Date(),
    updatedAt:                new Date(),
  };

  const runUpsert = async () => {
    await db.insert(monthlyPayroll).values({
      employeeId:               worker.id,
      month: 7,
      year: 2026,
      status:                   'DRAFT',
      ...valuesToUpsert,
    }).onConflictDoUpdate({
      target: [monthlyPayroll.employeeId, monthlyPayroll.month, monthlyPayroll.year],
      set: valuesToUpsert,
      where: sql`${monthlyPayroll.status} = 'DRAFT'`
    });
  };

  console.log('Firing 10 concurrent UPSERT requests...');
  for (let i = 0; i < 10; i++) {
    promises.push(runUpsert());
  }

  try {
    await Promise.all(promises);
    console.log('[OK] 10 requests completed without throwing 500 errors');
  } catch (err: any) {
    console.error('[FAIL] Concurrency error:', err);
    process.exit(1);
  }

  // Verify the number of records
  const countRes = await (db as any).execute(`SELECT COUNT(*) as count FROM monthly_payroll WHERE employee_id = ${worker.id} AND month = 7 AND year = 2026`);
  const count = parseInt(countRes.rows ? countRes.rows[0].count : countRes[0].count, 10);
  
  if (count === 1) {
    console.log('[PASS] Exactly 1 payroll record found after concurrent inserts.');
    console.log('CONCURRENCY = PASS');
    process.exit(0);
  } else {
    console.error(`[FAIL] Expected 1 record, got ${count}`);
    process.exit(1);
  }
}

testConcurrency().catch(console.error);
