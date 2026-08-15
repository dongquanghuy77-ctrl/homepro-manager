const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function migrate() {
  console.log('Creating tables...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "inventory_counts" (
        "id" serial PRIMARY KEY NOT NULL,
        "code" text NOT NULL,
        "warehouse_id" integer NOT NULL,
        "status" text DEFAULT 'DRAFT' NOT NULL,
        "assigned_to" integer,
        "scheduled_date" timestamp,
        "completed_date" timestamp,
        "notes" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "inventory_counts_code_unique" UNIQUE("code")
      );
    `;
    console.log('inventory_counts created');

    await sql`
      CREATE TABLE IF NOT EXISTS "inventory_count_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "count_id" integer NOT NULL,
        "material_id" integer NOT NULL,
        "location_id" text,
        "system_quantity" numeric DEFAULT '0' NOT NULL,
        "counted_quantity" numeric,
        "variance" numeric,
        "status" text DEFAULT 'PENDING' NOT NULL,
        "notes" text
      );
    `;
    console.log('inventory_count_items created');

    await sql`DROP TABLE IF EXISTS "inventory_reservations" CASCADE`;
    await sql`
      CREATE TABLE IF NOT EXISTS "inventory_reservations" (
        "id" serial PRIMARY KEY NOT NULL,
        "material_id" integer NOT NULL,
        "warehouse_id" integer NOT NULL,
        "quantity" numeric(18, 4) NOT NULL,
        "status" text DEFAULT 'ACTIVE' NOT NULL,
        "reference_type" text NOT NULL,
        "reference_id" text NOT NULL,
        "reserved_at" timestamp DEFAULT now() NOT NULL,
        "expires_at" timestamp,
        "notes" text
      );
    `;
    console.log('inventory_reservations created');

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

migrate();
