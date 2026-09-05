import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { pwrTasks } from "./src/db/schema";
import { isNull, sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      UPDATE pwr_tasks 
      SET station_team = 'DAN_CANH', status = 'TODO'
      WHERE station_team IS NULL AND title LIKE '%DÁN CẠNH%'
    `);
    await db.execute(sql`
      UPDATE pwr_tasks 
      SET station_team = 'KHOAN_CAM', status = 'TODO'
      WHERE station_team IS NULL AND title LIKE '%KHOAN CAM%'
    `);
    console.log("Fixed old tasks routing!");
  } catch(e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}
run();
