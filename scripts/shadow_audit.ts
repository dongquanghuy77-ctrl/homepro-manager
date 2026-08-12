import 'dotenv/config';
import { db } from '../src/db';
import { users, employees } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { getEmployeeList } from '../src/lib/repositories/hr-core';

async function main() {
  const legacyUsers = await db.select().from(users).orderBy(users.id);
  const newEmployees = await getEmployeeList();
  const rawEmployees = await db.select().from(employees);

  console.log(`=== P016-D SHADOW READ AUDIT ===`);
  console.log(`Legacy Users Total: ${legacyUsers.length}`);
  console.log(`HR Core (Raw Employees Table): ${rawEmployees.length}`);
  console.log(`HR Core (getEmployeeList DTOs): ${newEmployees.length}`);

  let mapped = 0;
  let manual = 0;
  let system = 0;

  let errors = 0;

  for (const u of legacyUsers) {
    if (u.username === 'viewer' || u.username === 'admin') {
      system++;
      const hrRecord = rawEmployees.find(e => e.userId === u.id);
      if (hrRecord) {
        console.error(`[ERROR] System user ${u.username} has an HR employee record!`);
        errors++;
      }
      continue;
    }

    const hrRecord = rawEmployees.find(e => e.userId === u.id);
    const dtoRecord = newEmployees.find(e => e.id === u.id);

    if (!hrRecord) {
      manual++;
      continue;
    }
    
    mapped++;

    // Field verification
    if (!dtoRecord) {
      console.error(`[ERROR] User ${u.id} has raw employee but no DTO!`);
      errors++;
      continue;
    }

    // Verify managerId is users.id
    if (u.managerId !== null && dtoRecord.managerId !== u.managerId) {
      console.error(`[ERROR] managerId mismatch for user ${u.id}. Legacy: ${u.managerId}, DTO: ${dtoRecord.managerId}`);
      errors++;
    }

    // Verify employeeCode
    if (u.employeeCode !== dtoRecord.employeeCode) {
      console.error(`[ERROR] code mismatch for user ${u.id}`);
      errors++;
    }

    // Verify name
    if (u.name !== dtoRecord.name) {
      console.error(`[ERROR] name mismatch for user ${u.id}`);
      errors++;
    }
  }

  console.log(`\n--- CLASSIFICATION ---`);
  console.log(`MIGRATED / MAPPED (SAFE + REVIEW): ${mapped}`);
  console.log(`MANUAL_INPUT (Unmapped): ${manual}`);
  console.log(`SYSTEM (Unmapped): ${system}`);
  
  if (mapped + manual + system !== legacyUsers.length) {
    console.error(`[ERROR] Classification sum does not match total users!`);
    errors++;
  }

  // Duplicate checks
  const userIds = rawEmployees.map(e => e.userId).filter(Boolean);
  const uniqueUserIds = new Set(userIds);
  if (uniqueUserIds.size !== userIds.length) {
    console.error(`[ERROR] Duplicate userId detected in employees table!`);
    errors++;
  }

  const codes = rawEmployees.map(e => e.employeeCode);
  const uniqueCodes = new Set(codes);
  if (uniqueCodes.size !== codes.length) {
    console.error(`[ERROR] Duplicate employeeCode detected in employees table!`);
    errors++;
  }

  // Orphan checks
  for (const hr of rawEmployees) {
    if (!legacyUsers.find(u => u.id === hr.userId)) {
      console.error(`[ERROR] Orphan employee record detected! ID: ${hr.id}`);
      errors++;
    }
  }

  console.log(`\nTotal Validation Errors: ${errors}`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(console.error);
