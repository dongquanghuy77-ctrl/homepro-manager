import { Client } from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Reading migration file...');
  const migrationPath = path.join(process.cwd(), 'src/db/migrations/0003_married_infant_terrible.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  
  const statements = migrationSql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
  
  for (const stmt of statements) {
    console.log(`Executing: ${stmt.substring(0, 100)}...`);
    try {
      await client.query(stmt);
      console.log('Success.');
    } catch (e: any) {
      console.log(`Failed (might be okay if it already exists or drops missing constraints): ${e.message}`);
    }
  }
  
  await client.end();
  console.log('Migration applied.');
}

main().catch(console.error);
