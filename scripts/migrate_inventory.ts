import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { Client } from 'pg';

async function migrateInventory() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const sql = `
    -- WAREHOUSES
    ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'MAIN_WAREHOUSE' NOT NULL;
    ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
    ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "address" text;

    -- WAREHOUSE ZONES
    CREATE TABLE IF NOT EXISTS "warehouse_zones" (
      "id" serial PRIMARY KEY NOT NULL,
      "code" text NOT NULL,
      "name" text NOT NULL,
      "warehouse_id" integer NOT NULL REFERENCES "warehouses"("id") ON DELETE cascade,
      "type" text DEFAULT 'STORAGE' NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "warehouse_zones_code_unique" UNIQUE("code")
    );

    -- WAREHOUSE LOCATIONS
    CREATE TABLE IF NOT EXISTS "warehouse_locations" (
      "id" serial PRIMARY KEY NOT NULL,
      "code" text NOT NULL,
      "name" text NOT NULL,
      "warehouse_id" integer NOT NULL REFERENCES "warehouses"("id") ON DELETE cascade,
      "zone_id" integer REFERENCES "warehouse_zones"("id") ON DELETE set null,
      "rack" text,
      "shelf" text,
      "bin" text,
      "type" text DEFAULT 'BIN' NOT NULL,
      "max_weight" numeric,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "warehouse_locations_code_unique" UNIQUE("code")
    );

    -- MATERIAL CATEGORIES
    CREATE TABLE IF NOT EXISTS "material_categories" (
      "id" serial PRIMARY KEY NOT NULL,
      "code" text NOT NULL,
      "name" text NOT NULL,
      "description" text,
      CONSTRAINT "material_categories_code_unique" UNIQUE("code")
    );

    -- MATERIALS
    ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "category_id" integer REFERENCES "material_categories"("id") ON DELETE set null;
    ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "specs" jsonb;
    ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'RAW_MATERIAL' NOT NULL;
    ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "brand" text;
    ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "stock_qty" numeric DEFAULT '0' NOT NULL;
    ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "min_stock" numeric DEFAULT '0';
    ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "reorder_point" numeric;
    ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "lead_time" integer;
    ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "default_supplier" text;

    -- INVENTORY BATCHES
    CREATE TABLE IF NOT EXISTS "inventory_batches" (
      "id" serial PRIMARY KEY NOT NULL,
      "batch_number" text NOT NULL,
      "material_id" integer NOT NULL REFERENCES "materials"("id"),
      "supplier" text,
      "manufacture_date" timestamp,
      "expiry_date" timestamp,
      "unit_cost" numeric,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "inventory_batches_batch_number_unique" UNIQUE("batch_number")
    );

    -- INVENTORY BALANCES
    CREATE TABLE IF NOT EXISTS "inventory_balances" (
      "id" serial PRIMARY KEY NOT NULL,
      "material_id" integer NOT NULL REFERENCES "materials"("id"),
      "warehouse_id" integer NOT NULL REFERENCES "warehouses"("id"),
      "location_id" integer REFERENCES "warehouse_locations"("id"),
      "batch_id" integer REFERENCES "inventory_batches"("id"),
      "quantity" numeric DEFAULT '0' NOT NULL,
      "available_quantity" numeric DEFAULT '0' NOT NULL,
      "unit_cost" numeric DEFAULT '0' NOT NULL,
      "last_counted_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    -- INVENTORY RESERVATIONS
    CREATE TABLE IF NOT EXISTS "inventory_reservations" (
      "id" serial PRIMARY KEY NOT NULL,
      "material_id" integer NOT NULL REFERENCES "materials"("id"),
      "warehouse_id" integer NOT NULL REFERENCES "warehouses"("id"),
      "project_id" integer REFERENCES "projects"("id"),
      "quantity" numeric NOT NULL,
      "status" text DEFAULT 'ACTIVE' NOT NULL,
      "user_id" integer REFERENCES "users"("id"),
      "notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    -- INVENTORY TRANSACTIONS
    CREATE TABLE IF NOT EXISTS "inventory_transactions" (
      "id" serial PRIMARY KEY NOT NULL,
      "movement_type" text NOT NULL,
      "movement_number" text NOT NULL,
      "material_id" integer NOT NULL REFERENCES "materials"("id"),
      "warehouse_id" integer NOT NULL REFERENCES "warehouses"("id"),
      "location_id" integer REFERENCES "warehouse_locations"("id"),
      "batch_id" integer REFERENCES "inventory_batches"("id"),
      "quantity" numeric NOT NULL,
      "unit_cost" numeric DEFAULT '0' NOT NULL,
      "total_cost" numeric DEFAULT '0' NOT NULL,
      "reference_type" text,
      "reference_id" integer,
      "project_id" integer REFERENCES "projects"("id"),
      "user_id" integer REFERENCES "users"("id"),
      "movement_date" timestamp DEFAULT now() NOT NULL,
      "notes" text,
      CONSTRAINT "inventory_transactions_movement_number_unique" UNIQUE("movement_number")
    );
  `;
  
  try {
    await client.query(sql);
    console.log('✅ Custom DB Schema applied for Inventory module!');
  } catch(e: any) {
    console.error('❌ Failed to apply DB schema:', e.message);
  } finally {
    await client.end();
  }
}

migrateInventory();
