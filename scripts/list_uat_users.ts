import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users } from '../src/db/schema';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

async function listUsers() {
  const u = await db.select({ id: users.id, username: users.username, role: users.role, dept: users.departmentId }).from(users);
  console.log(JSON.stringify(u, null, 2));
  process.exit(0);
}
listUsers();
