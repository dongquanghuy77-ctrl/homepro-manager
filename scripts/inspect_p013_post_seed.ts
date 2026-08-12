import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function postSeedCheck() {
  console.log('=== P0.13 POST-SEED CHECK (PRODUCTION) ===');
  
  const res = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = ((res as any).rows ? (res as any).rows[0].db_name : (res as any)[0].db_name) as string;
  if (dbName !== 'neondb') throw new Error('Not connected to neondb!');

  const roles = await db.execute(sql`SELECT count(*) as c FROM roles`);
  const perms = await db.execute(sql`SELECT count(*) as c FROM permissions`);
  const rolePerms = await db.execute(sql`SELECT count(*) as c FROM role_permissions`);
  const users = await db.execute(sql`SELECT count(*) as c FROM users`);
  const payroll = await db.execute(sql`SELECT count(*) as c FROM monthly_payroll`);

  const getCount = (r: any) => Number(r.rows ? r.rows[0].c : r[0].c);

  console.log('--- COUNTS ---');
  const rolesCount = getCount(roles);
  const permsCount = getCount(perms);
  const rolePermsCount = getCount(rolePerms);
  console.log(`Roles: ${rolesCount}`);
  console.log(`Permissions: ${permsCount}`);
  console.log(`Role_Permissions: ${rolePermsCount}`);
  console.log(`Users: ${getCount(users)}`);
  console.log(`Monthly Payroll: ${getCount(payroll)}`);

  if (rolesCount === 0 || permsCount === 0 || rolePermsCount === 0) {
    throw new Error('[FAIL] Master RBAC data is missing after seed!');
  }

  // FK check is implicitly passed if insertion succeeded, but let's query joining them
  const validMapping = await db.execute(sql`
    SELECT count(*) as c FROM role_permissions rp
    INNER JOIN roles r ON rp.role = r.code
    INNER JOIN permissions p ON rp.permission_id = p.id
  `);
  if (getCount(validMapping) !== rolePermsCount) {
    throw new Error('[FAIL] Foreign key integrity mismatch in role_permissions');
  }

  console.log('[PASS] Post-seed validation successful.');
  process.exit(0);
}

postSeedCheck().catch(err => {
  console.error(err);
  process.exit(1);
});
