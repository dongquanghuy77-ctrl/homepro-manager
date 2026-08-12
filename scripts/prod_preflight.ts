import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { sql } from 'drizzle-orm';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { users, attendance, leaveRequests, monthlyPayroll } from '../src/db/schema';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const prodUrl = process.env.DATABASE_URL || '';
  if (!prodUrl.includes('neon.tech') || prodUrl.includes('uat_neondb')) {
    console.error('NOT PRODUCTION DB');
    process.exit(1);
  }

  const db = drizzle(new Pool({ connectionString: prodUrl }));

  const allUsers = await db.select().from(users);
  
  const safe = [];
  const review = [];
  const manual = [];
  const system = [];
  const uniquePositions = new Set<string>();
  const duplicateCodes = new Set<string>();
  const codes = new Set<string>();

  for (const u of allUsers) {
    if (u.username === 'viewer' || u.username === 'admin') { system.push(u); continue; }

    if (u.employeeCode) {
      if (codes.has(u.employeeCode)) duplicateCodes.add(u.employeeCode);
      codes.add(u.employeeCode);
    }

    let isManual = false;
    let isReview = false;

    if (!u.employeeCode || !u.position || !u.officialSalary || !u.employmentType) { isManual = true; } 
    else if (!u.managerId) { isReview = true; }

    if (isManual) manual.push(u);
    else if (isReview) { review.push(u); uniquePositions.add(u.position!); }
    else { safe.push(u); uniquePositions.add(u.position!); }
  }

  console.log(`[PROD AUDIT] Total Users: ${allUsers.length}`);
  console.log(`[PROD AUDIT] SAFE: ${safe.length}`);
  console.log(`[PROD AUDIT] REVIEW: ${review.length}`);
  console.log(`[PROD AUDIT] MANUAL: ${manual.length}`);
  console.log(`[PROD AUDIT] SYSTEM: ${system.length}`);
  console.log(`[PROD AUDIT] Duplicate Employee Codes: ${duplicateCodes.size}`);

  const a = await db.select({ count: sql<number>`count(*)` }).from(attendance);
  const l = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests);
  const p = await db.select({ count: sql<number>`count(*)` }).from(monthlyPayroll);

  console.log(`[PROD COUNTS] Attendance: ${a[0].count}`);
  console.log(`[PROD COUNTS] Leave: ${l[0].count}`);
  console.log(`[PROD COUNTS] Payroll: ${p[0].count}`);

  process.exit(0);
}

main().catch(console.error);
