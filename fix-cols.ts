import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`ALTER TABLE pwr_user_stats ADD COLUMN last_active_at TIMESTAMP DEFAULT NOW();`);
    await db.execute(sql`ALTER TABLE pwr_user_stats ADD COLUMN created_at TIMESTAMP DEFAULT NOW();`);
    console.log("Columns added!");
  } catch(e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}
run();
