import { db } from './src/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function runAudit() {
  console.log('Starting READ-ONLY audit...');

  // 1. Get all users
  const usersResult = await db.execute(sql`
    SELECT id, username, name, role, department, active 
    FROM users 
    ORDER BY id ASC
  `);
  const allUsers = usersResult.rows;

  // 2. Get all roles
  const rolesResult = await db.execute(sql`
    SELECT code, name, description 
    FROM roles
  `);
  const allRoles = rolesResult.rows;

  // 3. Get all role permissions
  const rolePermsResult = await db.execute(sql`
    SELECT rp.role, p.code as permission
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
  `);
  const allRolePerms = rolePermsResult.rows;

  // Aggregate permissions by role
  const roleToPerms: Record<string, string[]> = {};
  for (const rp of allRolePerms) {
    const r = rp.role as string;
    const p = rp.permission as string;
    if (!roleToPerms[r]) roleToPerms[r] = [];
    roleToPerms[r].push(p);
  }

  // Check login ability: For this script, we assume active=true means they can log in.
  // We can't test actual passwords safely here without knowing them, but we can verify
  // what the checker.ts logic would do.

  const auditData = {
    users: allUsers,
    roles: allRoles,
    roleToPerms
  };

  fs.writeFileSync('audit_data.json', JSON.stringify(auditData, null, 2));
  console.log('Audit data saved to audit_data.json');
  process.exit(0);
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
