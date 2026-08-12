import { db } from './src/db';
import { sql } from 'drizzle-orm';
async function run() {
  const r = await db.execute(sql`SELECT * FROM roles`);
  console.log(r.rows);
  process.exit(0);
}
run();
