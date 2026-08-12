import { db } from './src/db';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    const user = await db.select().from(users).where(eq(users.username, 'letramkt'));
    console.log("letramkt query:", JSON.stringify(user, null, 2));
    
    // Check Dong Quang Huy as well
    const admin = await db.select().from(users).where(eq(users.username, 'dongquanghuy'));
    console.log("admin query:", JSON.stringify(admin, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
