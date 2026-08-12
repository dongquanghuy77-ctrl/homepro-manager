import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const viewerUser = await db.select().from(users).where(eq(users.username, 'viewer')).limit(1);
  if (!viewerUser.length) {
    console.log('User "viewer" not found.');
    process.exit(1);
  }

  if (viewerUser[0].role === 'ADMIN') {
    await db.update(users).set({ role: 'VIEWER' }).where(eq(users.username, 'viewer'));
    console.log('Successfully downgraded "viewer" account from ADMIN to VIEWER.');
  } else {
    console.log(`"viewer" account already has role: ${viewerUser[0].role}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
