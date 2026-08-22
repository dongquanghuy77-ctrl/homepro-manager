import { db } from './src/db/index.js';
import { pwrContacts } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function test() {
  try {
    const contacts = await db.query.pwrContacts.findMany({
      where: eq(pwrContacts.userId, 1)
    });
    console.log("Contacts:", contacts);
  } catch (err) {
    console.error("Drizzle Query Error:", err);
  }
}
test().then(() => process.exit(0));
