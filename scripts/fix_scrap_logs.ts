import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Applying manual fix to scrap_logs...");
  try {
    await db.execute(sql`ALTER TABLE "scrap_logs" ADD COLUMN IF NOT EXISTS "work_order_id" integer;`);
    await db.execute(sql`ALTER TABLE "scrap_logs" ADD COLUMN IF NOT EXISTS "employee_id" integer;`);
    await db.execute(sql`ALTER TABLE "scrap_logs" ADD COLUMN IF NOT EXISTS "product_id" integer;`);
    
    // We update existing records to point to a dummy work order if any, or just ignore since E2E will run.
    console.log("Manual fix applied successfully!");
  } catch (error) {
    console.error("Failed:", error);
  }
  process.exit(0);
}

main();
