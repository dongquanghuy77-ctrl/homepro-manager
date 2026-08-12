import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { users } from '../src/db/schema';
import { like } from 'drizzle-orm';

async function check() {
  const u = await db.select().from(users).where(like(users.username, '%uat_%'));
  console.log('Total uat users:', u.length);
  if (u.length > 0) {
    console.log('Sample user:', u[0].username, u[0].active, u[0].employeeStatus, u[0].officialSalary);
  }
  process.exit(0);
}

check().catch(console.error);
