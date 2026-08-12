import 'dotenv/config';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getEmployeeList, getEmployeeProfile } from '../src/lib/repositories/hr-core';

async function main() {
  console.log('=== P016-E: COMPATIBILITY REGRESSION TEST ===');
  let errors = 0;

  // 1. Fetch Legacy API Response Shape
  const legacyResponse = await db.select({
    id:             users.id,
    username:       users.username,
    name:           users.name,
    position:       users.position,
    role:           users.role,
    phone:          users.phone,
    email:          users.email,
    active:         users.active,
    employeeCode:   users.employeeCode,
    department:     users.department,
    employmentType: users.employmentType,
    joinDate:       users.joinDate,
    managerId:      users.managerId,
    employeeStatus: users.employeeStatus,
    birthDate:      users.birthDate,
    note:           users.note,
    createdAt:      users.createdAt,
    updatedAt:      users.updatedAt,
  })
    .from(users)
    .orderBy(desc(users.createdAt));

  // 2. Fetch HR Core Read Layer Response Shape
  const newResponse = await getEmployeeList();

  console.log(`Legacy API returned ${legacyResponse.length} records.`);
  console.log(`HR Core API returned ${newResponse.length} records.`);

  for (const legacy of legacyResponse) {
    const isSystem = legacy.username === 'admin' || legacy.username === 'viewer';
    const isMapped = newResponse.some(n => n.id === legacy.id);

    // Assert Unmapped Logic
    if (isSystem || (!isMapped && legacy.employeeCode && legacy.employeeCode.startsWith('NV'))) {
      if (isMapped) {
        console.error(`[ERROR] System or MANUAL_INPUT user ${legacy.username} leaked into HR Core output!`);
        errors++;
      }
      continue;
    }

    if (!isMapped) {
      // Must be MANUAL_INPUT or DO_NOT_MIGRATE
      continue;
    }

    // Mapped Record Assertions
    const newRecord = newResponse.find(n => n.id === legacy.id)!;

    // A. ID Consistency
    if (newRecord.id !== legacy.id) {
      console.error(`[ERROR] ID mismatch: expected ${legacy.id}, got ${newRecord.id}`);
      errors++;
    }

    // B. Manager Consistency
    if (legacy.managerId !== null && newRecord.managerId !== legacy.managerId) {
      console.error(`[ERROR] Manager mismatch for user ${legacy.id}: expected ${legacy.managerId}, got ${newRecord.managerId}`);
      errors++;
    }

    // C. Null Handling
    if (legacy.phone === null && newRecord.phone !== null) {
      console.error(`[ERROR] Null handling failure for user ${legacy.id} phone field.`);
      errors++;
    }

    // D. Response Shape check (Keys must match Legacy)
    const legacyKeys = Object.keys(legacy).sort();
    const newKeys = Object.keys(newRecord).sort();
    
    if (JSON.stringify(legacyKeys) !== JSON.stringify(newKeys)) {
      console.error(`[ERROR] Shape mismatch for user ${legacy.id}`);
      console.error('Legacy keys:', legacyKeys);
      console.error('New keys:', newKeys);
      errors++;
    }
  }

  // 3. Single Profile Profile
  if (newResponse.length > 0) {
    const testId = newResponse[0].id;
    const profile = await getEmployeeProfile(testId);
    if (!profile || profile.id !== testId) {
      console.error(`[ERROR] getEmployeeProfile failed for ID ${testId}`);
      errors++;
    }
  }

  // 4. Empty Result Handling
  const emptyList = await getEmployeeList({ allowedUserId: -999 });
  if (emptyList.length !== 0) {
    console.error(`[ERROR] Empty list handling failed!`);
    errors++;
  }

  const emptyProfile = await getEmployeeProfile(-999);
  if (emptyProfile !== null) {
    console.error(`[ERROR] Empty profile handling failed!`);
    errors++;
  }

  if (errors > 0) {
    console.error(`\n[FAIL] Compatibility Regression detected ${errors} errors.`);
    process.exit(1);
  } else {
    console.log(`\n[PASS] 100% Contract Compatibility Asserted.`);
    process.exit(0);
  }
}

main().catch(console.error);
