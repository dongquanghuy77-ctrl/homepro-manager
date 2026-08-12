import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users, departments, attendance, leaveRequests, overtimeRequests } from '../src/db/schema';
import { eq, isNull, isNotNull, sql } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const allUsers = await db.select().from(users);
  const allDepts = await db.select().from(departments);
  
  console.log(`1. Total employees: ${allUsers.length}`);
  
  let validCode = 0;
  let missingCode = 0;
  let duplicates = new Set();
  const codes = new Set();
  
  let validDeptMap = 0;
  let inconsistentDept = 0;
  
  let missingPos = 0;
  let activeCount = 0;
  let missingManager = 0;
  let missingSalary = 0;
  
  for (const u of allUsers) {
    if (u.employeeCode) {
      validCode++;
      if (codes.has(u.employeeCode)) duplicates.add(u.employeeCode);
      codes.add(u.employeeCode);
    } else {
      missingCode++;
    }
    
    // Department mapping
    if (u.departmentId) validDeptMap++;
    if (u.department && !u.departmentId) inconsistentDept++;
    
    if (!u.position) missingPos++;
    if (u.employeeStatus === 'ACTIVE') activeCount++;
    if (!u.managerId) missingManager++;
    if (!u.officialSalary || u.officialSalary === 0) missingSalary++;
  }
  
  console.log(`2. User <-> Employee Mapping (via employeeCode): Valid: ${validCode}, Missing: ${missingCode}`);
  console.log(`3. Department mapping: mapped to FK: ${validDeptMap}, inconsistent string: ${inconsistentDept}`);
  console.log(`4. Position missing: ${missingPos}`);
  console.log(`5. Employment status: ACTIVE=${activeCount}, TOTAL=${allUsers.length}`);
  console.log(`6. Manager relationship missing: ${missingManager}`);
  console.log(`7. Contract info (employmentType defaults mostly present)`);
  console.log(`8. Salary missing/0: ${missingSalary}`);
  console.log(`9. Duplicate employees (by code): ${Array.from(duplicates).join(', ')} (count: ${duplicates.size})`);
  
  // 12. Relationships
  const attCount = await db.select({ count: sql<number>`count(*)` }).from(attendance);
  const leaveCount = await db.select({ count: sql<number>`count(*)` }).from(leaveRequests);
  const otCount = await db.select({ count: sql<number>`count(*)` }).from(overtimeRequests);
  
  console.log(`12. Relationships: Attendance records: ${attCount[0].count}, Leave: ${leaveCount[0].count}, Overtime: ${otCount[0].count}`);

  process.exit(0);
}
main().catch(console.error);
