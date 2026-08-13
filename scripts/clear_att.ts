import { db } from '../src/db/index';
import { attendance } from '../src/db/schema';
import { eq } from 'drizzle-orm';
async function run() {
  await db.delete(attendance).where(eq(attendance.workDate, '2026-08-13'));
  console.log('Cleared today attendance');
  process.exit(0);
}
run();
