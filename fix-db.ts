import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`ALTER TABLE pwr_user_stats ADD COLUMN current_level INTEGER NOT NULL DEFAULT 1;`);
    console.log("SUCCESS!");
  } catch(e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}
run();
