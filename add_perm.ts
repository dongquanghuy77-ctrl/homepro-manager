import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from './src/db';
import { rolePermissions, permissions } from './src/db/schema';
import { eq, and } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const perm = await db.select().from(permissions).where(eq(permissions.code, 'payroll.read.self')).limit(1);
  if (perm.length > 0) {
    const existing = await db.select().from(rolePermissions).where(and(eq(rolePermissions.role, 'WORKER'), eq(rolePermissions.permissionId, perm[0].id))).limit(1);
    if (existing.length === 0) {
      await db.insert(rolePermissions).values({
        role: 'WORKER',
        permissionId: perm[0].id,
        scope: 'SELF'
      });
      console.log('Inserted payroll.read.self for WORKER');
    } else {
      console.log('WORKER already has payroll.read.self');
    }
  } else {
    console.log('payroll.read.self permission not found');
  }
  process.exit(0);
}

main().catch(console.error);
