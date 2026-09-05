import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { pwrTasks } from "./src/db/schema";
import { sql } from "drizzle-orm";

async function run() {
  const t = await db.execute(sql`SELECT id, title, station_team, status FROM pwr_tasks WHERE station_team IN ('DAN_CANH', 'KHOAN_CAM')`);
  console.log(t.rows);
  process.exit(0);
}
run();
