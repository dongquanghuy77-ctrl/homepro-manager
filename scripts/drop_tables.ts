import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function dropOldTables() {
  console.log("Dropping old tables...");
  await db.execute(sql`DROP TABLE IF EXISTS stock_balances CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS stock_ledgers CASCADE;`);
  console.log("Old tables dropped.");
}

dropOldTables().catch(console.error).then(() => process.exit(0));
