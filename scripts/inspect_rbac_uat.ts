import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function inspectRBAC() {
  console.log('[UAT] Inspecting RBAC and Org Tree data...');

  const roles = await db.execute(sql`SELECT * FROM roles`);
  console.log('\n--- ROLES ---');
  console.table((roles as any).rows || roles);

  const permissions = await db.execute(sql`SELECT * FROM permissions`);
  console.log('\n--- PERMISSIONS ---');
  console.table((permissions as any).rows || permissions);

  const rolePerms = await db.execute(sql`SELECT * FROM role_permissions`);
  console.log('\n--- ROLE_PERMISSIONS ---');
  console.table((rolePerms as any).rows || rolePerms);

  const depts = await db.execute(sql`SELECT * FROM departments`);
  console.log('\n--- DEPARTMENTS ---');
  console.table((depts as any).rows || depts);

  const mgrDepts = await db.execute(sql`SELECT * FROM manager_departments`);
  console.log('\n--- MANAGER_DEPARTMENTS ---');
  console.table((mgrDepts as any).rows || mgrDepts);

  const users = await db.execute(sql`SELECT id, username, role, department, department_id, manager_id FROM users LIMIT 10`);
  console.log('\n--- USERS (Sample) ---');
  console.table((users as any).rows || users);

  process.exit(0);
}

inspectRBAC().catch(console.error);
