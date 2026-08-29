import { eq } from 'drizzle-orm';
import { pwrProjects } from './src/db/schema.js';
import { db } from './src/db/index.js';

async function test() {
  try {
    const id = NaN;
    const res = await db.select().from(pwrProjects).where(eq(pwrProjects.id, id));
    console.log("RES:", res);
  } catch (e) {
    console.log("ERR:", e.message);
  }
}
test();
