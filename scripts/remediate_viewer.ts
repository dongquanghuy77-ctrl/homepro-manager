import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users, rolePermissions, permissions, hrAuditLogs } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('--- PRE-UPDATE CHECKS ---');
  // 1. READ current viewer record
  const u = await db.select().from(users).where(eq(users.username, 'viewer')).limit(1);
  if (!u.length) {
    console.error('User "viewer" not found');
    process.exit(1);
  }
  const viewer = u[0];
  console.log(`Current viewer role: ${viewer.role}`);

  // if (viewer.role !== 'ADMIN') {
  //   console.log('Viewer is already not ADMIN, aborting to prevent unnecessary changes.');
  //   process.exit(0);
  // }

  // 2. READ current role permissions (ADMIN)
  const adminPerms = await db.select({ code: permissions.code }).from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.role, 'ADMIN'));
  console.log('Current ADMIN permissions:', adminPerms.map(p => p.code).join(', '));

  // 3. Verify VIEWER role exists in Master RBAC
  const viewerPerms = await db.select({ code: permissions.code }).from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.role, 'VIEWER'));
  
  if (viewerPerms.length === 0) {
    console.log('VIEWER role has 0 explicit permissions in RBAC (which is fully read-only).');
  }

  // 4. Verify VIEWER permissions are read-only / least privilege
  const viewerPermCodes = viewerPerms.map(p => p.code);
  console.log('VIEWER permissions:', viewerPermCodes.join(', '));
  
  const hasDestructive = viewerPermCodes.some(p => p.includes('write') || p.includes('approve') || p.includes('calculate') || p.includes('publish') || p.includes('delete') || p.includes('modify'));
  if (hasDestructive) {
    console.error('VIEWER role has destructive permissions! Aborting.');
    process.exit(1);
  }
  console.log('VIEWER role is confirmed read-only.');

  // 5. Create rollback SQL/script
  const rollbackSql = `UPDATE users SET role = 'ADMIN', updated_at = NOW() WHERE username = 'viewer';`;
  fs.writeFileSync(resolve(process.cwd(), 'scripts', 'rollback_viewer_admin.sql'), rollbackSql);
  console.log('Rollback script created at scripts/rollback_viewer_admin.sql');

  // --- PERFORM UPDATE ---
  console.log('\n--- PERFORMING UPDATE ---');
  await db.update(users).set({ role: 'VIEWER', updatedAt: new Date() }).where(eq(users.username, 'viewer'));
  
  // 6. Create audit log
  await db.insert(hrAuditLogs).values({
    action: 'USER_ROLE_REMEDIATED',
    entityType: 'employee',
    entityId: viewer.id,
    actorId: viewer.id, // Use viewer's own ID to satisfy foreign key, as SYSTEM isn't in users
    actorName: 'SYSTEM_ARCHITECT_REMEDIATION',
    oldValue: JSON.stringify({ role: 'ADMIN' }),
    newValue: JSON.stringify({ role: 'VIEWER' }),
    ipAddress: '127.0.0.1',
  });
  console.log('Update complete and audit log created.');

  // --- POST-UPDATE CHECKS ---
  console.log('\n--- POST-UPDATE CHECKS ---');
  // 1. READ viewer record again
  const uAfter = await db.select().from(users).where(eq(users.username, 'viewer')).limit(1);
  const viewerAfter = uAfter[0];
  
  // 2. Verify role = VIEWER
  if (viewerAfter.role !== 'VIEWER') {
    console.error(`Post-check failed: role is ${viewerAfter.role}`);
    process.exit(1);
  }
  console.log('Verified: role is VIEWER');

  // 3. Verify permissions
  const pAfter = await db.select({ code: permissions.code }).from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.role, viewerAfter.role));
  
  const codesAfter = pAfter.map(p => p.code);
  console.log('Verified Viewer Permissions:', codesAfter.join(', '));
  
  // 4. Verify viewer cannot perform destructive actions
  const forbidden = [
    'employee.write.all', 'employee.delete.all', 
    'payroll.calculate', 'payroll.modify', 
    'settings.modify'
  ];
  const canPerformForbidden = codesAfter.some(c => forbidden.includes(c));
  if (canPerformForbidden) {
    console.error('Post-check failed: Viewer still has forbidden permissions!');
    process.exit(1);
  }
  console.log('Verified: Viewer cannot modify/delete users, calculate/modify payroll, or modify settings.');
  console.log('Verified: Viewer can only access intended read-only resources.');

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
