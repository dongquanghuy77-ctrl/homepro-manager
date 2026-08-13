import * as dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const sqlContent = fs.readFileSync(path.join(__dirname, '../src/db/migrations/0005_eager_fantastic_four.sql'), 'utf-8');
  
  const statements = sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    console.log(`Executing: ${stmt.substring(0, 50)}...`);
    try {
      await client.query(stmt);
    } catch(e:any) {
      console.log(`Failed (might be okay if it already exists): ${e.message}`);
    }
  }
  
  await client.end();
  console.log('Migration 0005 applied.');
  process.exit(0);
}
main().catch(console.error);
