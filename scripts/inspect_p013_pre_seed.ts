import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function preSeedCheck() {
  console.log('=== P0.13 PRE-SEED CHECK (PRODUCTION) ===');
  
  const res = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = ((res as any).rows ? (res as any).rows[0].db_name : (res as any)[0].db_name) as string;
  console.log(`DATABASE: ${dbName}`);
  if (dbName !== 'neondb') throw new Error('Not connected to neondb!');

  const roles = await db.execute(sql`SELECT count(*) as c FROM roles`);
  const perms = await db.execute(sql`SELECT count(*) as c FROM permissions`);
  const rolePerms = await db.execute(sql`SELECT count(*) as c FROM role_permissions`);
  const users = await db.execute(sql`SELECT count(*) as c FROM users`);
  const payroll = await db.execute(sql`SELECT count(*) as c FROM monthly_payroll`);

  const getCount = (r: any) => Number(r.rows ? r.rows[0].c : r[0].c);

  console.log('--- COUNTS ---');
  console.log(`Roles: ${getCount(roles)}`);
  console.log(`Permissions: ${getCount(perms)}`);
  console.log(`Role_Permissions: ${getCount(rolePerms)}`);
  console.log(`Users: ${getCount(users)}`);
  console.log(`Monthly Payroll: ${getCount(payroll)}`);

  console.log('Pre-seed check complete.');
  process.exit(0);
}

preSeedCheck().catch(err => {
  console.error(err);
  process.exit(1);
});
