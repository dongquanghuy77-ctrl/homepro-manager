import { db } from '../src/db';
import { departments } from '../src/db/schema';

async function run() {
  const d = await db.select().from(departments);
  console.log(d);
  process.exit(0);
}
run();
