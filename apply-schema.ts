import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "./src/db/index";
import { sql } from "drizzle-orm";

async function run() {
  try {
    // Add columns to pwr_tasks if not exist
    await db.execute(sql`ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS rework_ref_id INTEGER;`);
    await db.execute(sql`ALTER TABLE pwr_tasks ADD COLUMN IF NOT EXISTS defect_by INTEGER;`);

    // Create pwr_notifications
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pwr_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        station_team TEXT,
        title TEXT NOT NULL,
        content TEXT,
        priority TEXT NOT NULL DEFAULT 'INFO',
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        related_task_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create pwr_scrap_logs
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pwr_scrap_logs (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES pwr_tasks(id) ON DELETE CASCADE,
        reporter_id INTEGER REFERENCES users(id),
        material_id INTEGER,
        quantity INTEGER NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("DB Schema updated directly!");
  } catch(e) {
    console.error("ERROR:", e.message);
  }
  process.exit(0);
}
run();
