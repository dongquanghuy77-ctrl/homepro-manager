import { inArray } from 'drizzle-orm';
import { pwrTasks } from './src/db/schema.js';
import { db } from './src/db/index.js';

async function test() {
  try {
    const taskIds = [];
    await db.delete(pwrTasks).where(inArray(pwrTasks.id, taskIds));
    console.log("SUCCESS");
  } catch (e) {
    console.log("ERR NAME:", e.name);
    console.log("ERR STACK:", e.stack);
  }
}
test();
