import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

const UAT_MARKER = 'uat_%';

async function runCleanup() {
  console.log('--- STARTING UAT CLEANUP ---');
  
  // 1. ISOLATION CHECK
  const res = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = ((res as any).rows ? (res as any).rows[0].db_name : (res as any)[0].db_name) as string;
  if (dbName !== 'uat_neondb') {
    console.error(`[FATAL] Conneted to wrong database: ${dbName}. Expected uat_neondb.`);
    process.exit(1);
  }
  
  // Actually, since we're using raw db delete with LIKE, we need to import schema tables:
  const schema = require('../src/db/schema');
  
  console.log('[...] Deleting UAT records...');
  
  const uatUsers = await db.select({ id: schema.users.id }).from(schema.users).where(sql`${schema.users.username} LIKE ${UAT_MARKER}`);
  
  if (uatUsers.length > 0) {
    const userIds = uatUsers.map((u: any) => u.id);
    await db.delete(schema.managerDepartments).where(sql`${schema.managerDepartments.managerId} IN (${sql.join(userIds, sql`, `)})`);
    // Attendance and LeaveRequests have ON DELETE CASCADE so they will be deleted automatically when user is deleted
    await db.delete(schema.users).where(sql`${schema.users.username} LIKE ${UAT_MARKER}`);
  }
  
  await db.delete(schema.departments).where(sql`${schema.departments.code} LIKE 'UAT_%'`);
  await db.delete(schema.leaveTypes).where(sql`${schema.leaveTypes.code} LIKE 'UAT_%'`);
  
  console.log('--- UAT CLEANUP COMPLETED ---');
  process.exit(0);
}

runCleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
