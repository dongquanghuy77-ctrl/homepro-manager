import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { sql } from "drizzle-orm";

async function run() {
  const t = await db.execute(sql`SELECT id, title, station_team, status, completed_at FROM pwr_tasks WHERE id IN (611, 612)`);
  console.log(t.rows);
  process.exit(0);
}
run();
