import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function addMissingColumns() {
  console.log("Adding missing columns...");
  
  const tables = [
    'purchase_orders', 
    'attendance', 
    'monthly_payroll', 
    'leave_requests', 
    'inventory_transactions'
  ];

  for (const table of tables) {
    try {
      await db.execute(sql.raw(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "idempotency_key" text UNIQUE;`));
      console.log(`Added idempotency_key to ${table}`);
    } catch (e: any) {
      if (e.message.includes('does not exist')) {
        console.log(`Table ${table} does not exist, skipping...`);
      } else {
        console.error(e.message);
      }
    }
  }

  // Create new tables that were missing
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" serial PRIMARY KEY,
        "code" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "tax_code" text,
        "phone" text,
        "email" text,
        "address" text,
        "payment_terms" text,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "inventory_balances" (
        "id" serial PRIMARY KEY,
        "material_id" integer NOT NULL,
        "warehouse_id" integer NOT NULL,
        "location_id" text,
        "quantity" real NOT NULL DEFAULT 0,
        "reserved_quantity" real NOT NULL DEFAULT 0,
        "available_quantity" real NOT NULL DEFAULT 0,
        "unit_cost" real NOT NULL DEFAULT 0,
        "last_updated" timestamp DEFAULT now()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "inventory_transactions" (
        "id" serial PRIMARY KEY,
        "movement_number" text NOT NULL UNIQUE,
        "movement_type" text NOT NULL,
        "material_id" integer NOT NULL,
        "warehouse_id" integer NOT NULL,
        "location_id" text,
        "quantity" real NOT NULL,
        "unit_cost" real NOT NULL DEFAULT 0,
        "total_cost" real NOT NULL DEFAULT 0,
        "reference_type" text,
        "reference_id" integer,
        "project_id" integer,
        "created_by" integer,
        "movement_date" timestamp NOT NULL DEFAULT now(),
        "idempotency_key" text UNIQUE,
        "created_at" timestamp DEFAULT now(),
        "notes" text
      );
    `);
    
    console.log("Created missing tables.");
  } catch (e) {
    console.error(e);
  }
}

addMissingColumns().catch(console.error).then(() => process.exit(0));
