import { db } from './src/db';
import { sql } from 'drizzle-orm';
async function run() {
  const r = await db.execute(sql`SELECT id, username, name, role, department, active FROM users`);
  console.log(JSON.stringify(r.rows, null, 2));
  process.exit(0);
}
run();
