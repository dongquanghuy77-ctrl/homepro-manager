import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { permissions, rolePermissions } from '../src/db/schema';
import { sql } from 'drizzle-orm';

async function seedPermissions() {
  console.log('--- SEEDING PERMISSIONS ---');
  
  const res = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = ((res as any).rows ? (res as any).rows[0].db_name : (res as any)[0].db_name) as string;
  if (dbName !== 'uat_neondb') {
    throw new Error(`[FATAL] Connected to wrong database: ${dbName}. Expected uat_neondb.`);
  }

  // Insert permissions
  const permsToInsert = [
    { code: 'PAYROLL_VIEW', description: 'View payroll' },
    { code: 'PAYROLL_CALCULATE', description: 'Calculate payroll' },
    { code: 'PAYROLL_APPROVE', description: 'Approve payroll' },
    { code: 'PAYROLL_PUBLISH', description: 'Publish payroll' },
    { code: 'PAYROLL_CONFIG', description: 'Configure payroll' },
  ];

  await db.insert(permissions).values(permsToInsert).onConflictDoNothing();
  
  const allPerms = await db.select().from(permissions);
  const pMap = Object.fromEntries(allPerms.map(p => [p.code, p.id]));

  // Insert role_permissions
  const rpToInsert = [
    // WORKER
    { role: 'WORKER', permissionId: pMap['PAYROLL_VIEW'], scope: 'SELF' },
    // MANAGER
    { role: 'MANAGER', permissionId: pMap['PAYROLL_VIEW'], scope: 'DEPARTMENT' },
    // HR
    { role: 'HR', permissionId: pMap['PAYROLL_VIEW'], scope: 'COMPANY' },
    { role: 'HR', permissionId: pMap['PAYROLL_CALCULATE'], scope: 'COMPANY' },
    // DIRECTOR
    { role: 'DIRECTOR', permissionId: pMap['PAYROLL_VIEW'], scope: 'COMPANY' },
    { role: 'DIRECTOR', permissionId: pMap['PAYROLL_APPROVE'], scope: 'COMPANY' },
    { role: 'DIRECTOR', permissionId: pMap['PAYROLL_PUBLISH'], scope: 'COMPANY' },
    // ADMIN
    { role: 'ADMIN', permissionId: pMap['PAYROLL_VIEW'], scope: 'COMPANY' },
    { role: 'ADMIN', permissionId: pMap['PAYROLL_CALCULATE'], scope: 'COMPANY' },
    { role: 'ADMIN', permissionId: pMap['PAYROLL_APPROVE'], scope: 'COMPANY' },
    { role: 'ADMIN', permissionId: pMap['PAYROLL_PUBLISH'], scope: 'COMPANY' },
    { role: 'ADMIN', permissionId: pMap['PAYROLL_CONFIG'], scope: 'COMPANY' },
  ];

  for (const rp of rpToInsert) {
    await db.insert(rolePermissions).values(rp).onConflictDoNothing();
  }

  console.log('--- PERMISSIONS SEEDED ---');
  process.exit(0);
}

seedPermissions().catch(err => {
  console.error(err);
  process.exit(1);
});
