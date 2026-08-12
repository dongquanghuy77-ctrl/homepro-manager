import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users, rolePermissions, permissions, hrAuditLogs } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('--- 1. VIEWER ROLE ---');
  const u = await db.select().from(users).where(eq(users.username, 'viewer')).limit(1);
  if (u.length) {
    console.log(`viewer.role = ${u[0].role}`);
  } else {
    console.log('viewer account NOT FOUND');
  }

  console.log('\n--- 2. VIEWER PERMISSIONS ---');
  const perms = await db.select({code: permissions.code}).from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.role, 'VIEWER'));
  const permCodes = perms.map(p => p.code);
  console.log(`Permissions: ${permCodes.length ? permCodes.join(', ') : 'NONE'}`);

  console.log('\n--- 4. VIEWER ALLOW/DENY (Logical) ---');
  console.log(`employee read: ${permCodes.includes('employee.read.all') ? 'ALLOW' : 'DENY'}`);
  console.log(`employee write: ${permCodes.includes('employee.write.all') ? 'ALLOW' : 'DENY'}`);
  console.log(`payroll read: ${permCodes.includes('payroll.read.all') ? 'ALLOW' : 'DENY'}`);
  console.log(`payroll calculate: ${permCodes.includes('payroll.calculate') ? 'ALLOW' : 'DENY'}`);
  console.log(`user management: ${permCodes.includes('users.manage') || permCodes.includes('employee.write.all') ? 'ALLOW' : 'DENY'}`);
  console.log(`system settings: ${permCodes.includes('settings.modify') ? 'ALLOW' : 'DENY'}`);

  console.log('\n--- 5. AUDIT TRAIL ---');
  const logs = await db.select().from(hrAuditLogs)
    .where(eq(hrAuditLogs.action, 'USER_ROLE_REMEDIATED'))
    .orderBy(desc(hrAuditLogs.createdAt))
    .limit(1);
  
  if (logs.length) {
    const l = logs[0];
    console.log(`FOUND: [${l.createdAt}] Action=${l.action}, Actor=${l.actorName}, Old=${l.oldValue}, New=${l.newValue}`);
  } else {
    console.log('AUDIT_TRAIL = NOT_IMPLEMENTED');
  }

  process.exit(0);
}

main().catch(console.error);
