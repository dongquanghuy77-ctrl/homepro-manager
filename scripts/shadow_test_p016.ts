import 'dotenv/config';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { getEmployeeList, getEmployeeProfile } from '../src/lib/repositories/hr-core';

async function main() {
  console.log('--- P0.16 SHADOW READ TEST ---');

  // Fetch from legacy
  const legacyUsers = await db.select().from(users).where(eq(users.active, true)).orderBy(users.id);
  
  // Fetch from new HR Core Repository
  const newEmployees = await getEmployeeList();

  console.log(`Legacy Users (Active): ${legacyUsers.length}`);
  console.log(`New HR Core Employees: ${newEmployees.length}`);

  let mismatches = 0;
  let matches = 0;

  for (const newEmp of newEmployees) {
    const legacy = legacyUsers.find(u => u.id === newEmp.id);
    if (!legacy) {
      console.error(`[MISMATCH] HR Core employee ${newEmp.id} not found in legacy active users.`);
      mismatches++;
      continue;
    }

    // Compare fields
    const checks = [
      { field: 'employeeCode', legacy: legacy.employeeCode, new: newEmp.employeeCode },
      { field: 'managerId', legacy: legacy.managerId, new: newEmp.managerId },
    ];

    let empMismatch = false;
    for (const check of checks) {
      if (check.legacy != check.new) {
        console.error(`[MISMATCH] Emp ${legacy.id} - ${check.field}: Legacy='${check.legacy}', New='${check.new}'`);
        empMismatch = true;
      }
    }

    if (empMismatch) mismatches++;
    else matches++;
  }

  console.log(`\n--- RESULTS ---`);
  console.log(`Matches: ${matches}`);
  console.log(`Mismatches: ${mismatches}`);

  if (mismatches > 0) {
    console.error('SHADOW TEST FAILED!');
    process.exit(1);
  } else {
    console.log('SHADOW TEST PASSED! All mapped identities are compatible.');
    process.exit(0);
  }
}

main().catch(console.error);
