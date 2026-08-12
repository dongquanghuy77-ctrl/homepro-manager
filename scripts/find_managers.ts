import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users, departments } from '../src/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const m = await db.select({
    username: users.username,
    dept: departments.name
  }).from(users)
    .innerJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.role, 'MANAGER'));
  console.log('Managers:', m);
  process.exit(0);
}
main().catch(console.error);
