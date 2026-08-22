import 'dotenv/config';
import { db } from './src/db';
import { pwrContacts } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function test() {
  try {
    const contacts = await db.query.pwrContacts.findMany({
      where: eq(pwrContacts.userId, 1)
    });
    console.log("Contacts:", contacts);
    
    const [inserted] = await db.insert(pwrContacts).values({
      userId: 1,
      name: 'Test Contact'
    }).returning();
    console.log("Inserted:", inserted);
  } catch (err) {
    console.error("Drizzle Query Error:", err);
  }
}
test().then(() => process.exit(0));
