import { db } from '../src/db/index';
import { attendance } from '../src/db/schema';
import { eq } from 'drizzle-orm';
async function run() {
  const all = await db.select().from(attendance).where(eq(attendance.workDate, '2026-08-13'));
  console.log('Today attendance count:', all.length);
  process.exit(0);
}
run();
