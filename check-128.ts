import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { sql } from "drizzle-orm";

async function run() {
  const t = await db.execute(sql`SELECT * FROM pwr_user_stats WHERE user_id = 128`);
  console.log(t.rows);
  process.exit(0);
}
run();
