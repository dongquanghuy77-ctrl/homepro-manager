import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function fix() {
  await db.execute(sql`UPDATE inventory_balances SET location_id = NULL WHERE location_id = 'KHO-VAT-TU'`);
  console.log('Fixed');
  process.exit(0);
}
fix();
