import 'dotenv/config';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function test() {
  const allUsers = await db.select().from(users);
  console.log("All Users:", allUsers.map(u => ({ id: u.id, username: u.username })));
}
test().then(() => process.exit(0));
