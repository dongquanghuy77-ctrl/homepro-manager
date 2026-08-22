import 'dotenv/config';
import { db } from './src/db/index.js';
import { pwrContacts } from './src/db/schema.js';

async function test() {
  const contacts = await db.query.pwrContacts.findMany();
  console.log("All DB Contacts:", contacts);
}
test().then(() => process.exit(0));
