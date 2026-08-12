import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

const envFile = process.argv.includes('--production') ? '.env.local' : '.env.uat';
dotenv.config({ path: resolve(process.cwd(), envFile) });

async function rollbackRbac() {
  console.log(`[ROLLBACK] Using env: ${envFile}`);
  try {
    // Delete role_permissions first to handle FK
    await db.execute(sql`DELETE FROM "role_permissions"`);
    console.log('[OK] Cleared role_permissions.');

    // Delete system roles
    const systemRoles = ['BOD', 'HR', 'MANAGER', 'ACCOUNTANT', 'WORKER', 'DESIGNER', 'STAFF'];
    for (const role of systemRoles) {
      await db.execute(sql`DELETE FROM "roles" WHERE code = ${role}`);
    }
    console.log('[OK] Cleared system roles.');

    // Delete permissions
    await db.execute(sql`DELETE FROM "permissions"`);
    console.log('[OK] Cleared permissions.');

    console.log('Rollback completed successfully.');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

rollbackRbac();
