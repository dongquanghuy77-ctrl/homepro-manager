import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from './src/db';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const u1 = await db.select().from(users).where(eq(users.username, 'letramkt')).limit(1);
  console.log('letramkt role:', u1[0]?.role);
  
  const u2 = await db.select().from(users).where(eq(users.username, 'viewer')).limit(1);
  console.log('viewer role:', u2[0]?.role);
  
  process.exit(0);
}

main().catch(console.error);
