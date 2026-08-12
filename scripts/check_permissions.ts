import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { permissions, rolePermissions } from '../src/db/schema';

async function check() {
  const pCount = await db.select().from(permissions);
  console.log(`Permissions: ${pCount.length}`);
  const rpCount = await db.select().from(rolePermissions);
  console.log(`RolePermissions: ${rpCount.length}`);
  process.exit(0);
}

check().catch(console.error);
