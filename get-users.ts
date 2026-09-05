import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { sql } from "drizzle-orm";

async function run() {
  const t = await db.execute(sql`SELECT id, name, username, phone, role FROM users LIMIT 10`);
  console.log(t.rows);
  process.exit(0);
}
run();
