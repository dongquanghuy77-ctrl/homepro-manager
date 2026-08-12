import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users, rolePermissions, permissions } from '../src/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const u = await db.select().from(users).where(eq(users.username, 'viewer')).limit(1);
  if (!u.length) return console.log('User not found');
  console.log('username =', u[0].username);
  console.log('current role =', u[0].role);
  console.log('department =', u[0].department);
  const perms = await db.select({code: permissions.code}).from(rolePermissions).innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id)).where(eq(rolePermissions.role, u[0].role));
  console.log('permissions =', perms.map(p => p.code).join(', '));
  process.exit(0);
}
main().catch(console.error);
