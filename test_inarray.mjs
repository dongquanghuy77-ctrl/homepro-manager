import { inArray } from 'drizzle-orm';
import { pwrTasks } from './src/db/schema.js';
import { db } from './src/db/index.js';

async function test() {
  try {
    const taskIds = [];
    const res = await db.select().from(pwrTasks).where(inArray(pwrTasks.id, taskIds));
    console.log("RES:", res.length);
  } catch (e) {
    console.log("ERR:", e.message);
  }
}
test();
