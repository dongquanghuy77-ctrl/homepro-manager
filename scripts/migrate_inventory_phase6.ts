import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { Client } from 'pg';

async function migrateInventoryPhase6() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const sql = `
    CREATE TABLE IF NOT EXISTS "inventory_counts" (
      "id" serial PRIMARY KEY NOT NULL,
      "code" text NOT NULL UNIQUE,
      "warehouse_id" integer NOT NULL REFERENCES "warehouses"("id"),
      "status" text DEFAULT 'DRAFT' NOT NULL,
      "assigned_to" integer REFERENCES "users"("id"),
      "scheduled_date" timestamp,
      "completed_date" timestamp,
      "notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "inventory_count_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "count_id" integer NOT NULL REFERENCES "inventory_counts"("id") ON DELETE cascade,
      "material_id" integer NOT NULL REFERENCES "materials"("id"),
      "location_id" integer REFERENCES "warehouse_locations"("id"),
      "system_quantity" numeric DEFAULT '0' NOT NULL,
      "counted_quantity" numeric,
      "variance" numeric,
      "status" text DEFAULT 'PENDING' NOT NULL,
      "notes" text
    );
  `;
  
  try {
    await client.query(sql);
    console.log('✅ Phase 6 Schema Additions applied!');
  } catch(e: any) {
    console.error('❌ Failed to apply DB schema fix:', e.message);
  } finally {
    await client.end();
  }
}

migrateInventoryPhase6();
