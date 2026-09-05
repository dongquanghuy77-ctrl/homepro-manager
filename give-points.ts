import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      INSERT INTO pwr_user_stats (user_id, total_points, tasks_completed, current_level)
      VALUES (6, 45, 3, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        total_points = pwr_user_stats.total_points + 45,
        tasks_completed = pwr_user_stats.tasks_completed + 3,
        current_level = 1
    `);
    console.log("Points added!");
  } catch(e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}
run();
