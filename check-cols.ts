import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { sql } from "drizzle-orm";

async function run() {
  const t = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'pwr_user_stats';
  `);
  console.log(t.rows.map(r => r.column_name));
  process.exit(0);
}
run();
