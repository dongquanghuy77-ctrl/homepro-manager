import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('uat_neondb') === false) {
    if (!process.argv.includes('--confirm-production')) {
      console.error('NOT UAT DATABASE AND NO --confirm-production FLAG. ABORTING.');
      process.exit(1);
    } else {
      console.log('WARNING: EXECUTING MIGRATION ON PRODUCTION.');
    }
  }
  const migrationSql = fs.readFileSync('src/db/migrations/0001_strange_mikhail_rasputin.sql', 'utf-8');
  
  // Drizzle doesn't like running multiple statements with --> statement-breakpoint
  const statements = migrationSql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
  
  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 50) + '...');
    await db.execute(sql.raw(statement));
  }
  
  console.log('Migration applied to UAT successfully.');
  process.exit(0);
}

main().catch(console.error);
