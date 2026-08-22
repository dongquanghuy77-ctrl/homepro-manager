import 'dotenv/config';
import { db } from './src/db';
import { pwrContacts } from './src/db/schema';

async function test() {
  try {
    const [contact] = await db.insert(pwrContacts).values({
      userId: 6,
      name: 'Test Huy',
    }).returning();
    console.log("Inserted:", contact);
  } catch (error) {
    console.error("Insert Error:", error);
  }
}
test().then(() => process.exit(0));
