import { db } from './src/db';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    const result = await db.delete(users).where(eq(users.username, '0333419781')).returning();
    console.log('Deleted user:', result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
