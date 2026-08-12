import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { users, attendance } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function fixAttendance() {
  const uatUsers = await db.select({ id: users.id }).from(users).where(inArray(users.role, ['WORKER', 'MANAGER', 'HR', 'DIRECTOR', 'ADMIN'])); // Just all users for UAT

  // Actually, wait, let's just update all attendance where employeeId in (all uat users)
  // or simply update all attendance since this is uat_neondb
  
  await (db as any).execute("UPDATE attendance SET approval_status = 'APPROVED'");
  console.log('[OK] Updated all attendance to APPROVED');
  
  process.exit(0);
}

fixAttendance().catch(console.error);
