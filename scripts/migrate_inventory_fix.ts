import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { Client } from 'pg';

async function migrateInventoryFix() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const sql = `
    ALTER TABLE "inventory_reservations" RENAME COLUMN "user_id" TO "reserved_by";
    ALTER TABLE "inventory_reservations" RENAME COLUMN "created_at" TO "reserved_at";
    ALTER TABLE "inventory_reservations" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
    ALTER TABLE "inventory_reservations" ADD COLUMN IF NOT EXISTS "production_order_id" integer;
    ALTER TABLE "inventory_reservations" ADD COLUMN IF NOT EXISTS "boq_item_id" integer;
  `;
  
  try {
    await client.query(sql);
    console.log('✅ Custom DB Schema Fix 3 applied!');
  } catch(e: any) {
    console.error('❌ Failed to apply DB schema fix:', e.message);
  } finally {
    await client.end();
  }
}

migrateInventoryFix();
