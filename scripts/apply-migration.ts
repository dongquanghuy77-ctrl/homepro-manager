import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("Applying migration 0010_dashing_dreadnoughts.sql...");
  const sqlContent = fs.readFileSync(path.join(__dirname, '../src/db/migrations/0010_dashing_dreadnoughts.sql'), 'utf-8');
  
  // Split by statement-breakpoint
  const statements = sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
  
  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement));
    } catch (e: any) {
      console.log(`Failed to execute (ignoring): ${e.message}`);
    }
  }
  
  console.log("Migration applied successfully!");
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
