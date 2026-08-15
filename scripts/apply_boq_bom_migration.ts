import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Applying manual migration 0011 for BOQ/BOM Submodule...");
  try {
    // 1. Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "boqs" (
        "id" serial PRIMARY KEY NOT NULL,
        "code" text NOT NULL UNIQUE,
        "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
        "version" text DEFAULT '1.0' NOT NULL,
        "status" text DEFAULT 'DRAFT' NOT NULL,
        "revision_reason" text,
        "total_amount" numeric(20, 2) DEFAULT 0,
        "created_by" integer REFERENCES "users"("id"),
        "approved_by" integer REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "boq_sections" (
        "id" serial PRIMARY KEY NOT NULL,
        "boq_id" integer NOT NULL REFERENCES "boqs"("id") ON DELETE cascade,
        "name" text NOT NULL,
        "description" text,
        "parent_section_id" integer,
        "sequence" integer DEFAULT 0 NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "material_conversions" (
        "id" serial PRIMARY KEY NOT NULL,
        "material_id" integer NOT NULL REFERENCES "materials"("id") ON DELETE cascade,
        "from_unit" text NOT NULL,
        "to_unit" text NOT NULL,
        "conversion_factor" numeric(18, 4) NOT NULL
      );
    `);

    // 2. Modify materials
    await db.execute(sql`ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'MATERIAL';`);

    // 3. Modify boq_items
    await db.execute(sql`ALTER TABLE "boq_items" ADD COLUMN IF NOT EXISTS "boq_id" integer REFERENCES "boqs"("id") ON DELETE cascade;`);
    await db.execute(sql`ALTER TABLE "boq_items" ADD COLUMN IF NOT EXISTS "section_id" integer REFERENCES "boq_sections"("id");`);
    await db.execute(sql`ALTER TABLE "boq_items" ADD COLUMN IF NOT EXISTS "product_id" integer REFERENCES "materials"("id");`);

    // 4. Modify boms
    await db.execute(sql`ALTER TABLE "boms" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE' NOT NULL;`);
    await db.execute(sql`ALTER TABLE "boms" ADD COLUMN IF NOT EXISTS "revision_reason" text;`);
    await db.execute(sql`ALTER TABLE "boms" ADD COLUMN IF NOT EXISTS "created_by" integer REFERENCES "users"("id");`);
    await db.execute(sql`ALTER TABLE "boms" ADD COLUMN IF NOT EXISTS "approved_by" integer REFERENCES "users"("id");`);
    
    // Drop is_active if it exists, or just leave it. We can leave it for safety.

    // 5. Modify bom_items
    await db.execute(sql`ALTER TABLE "bom_items" ADD COLUMN IF NOT EXISTS "scrap_percentage" numeric(18, 4) DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE "bom_items" ADD COLUMN IF NOT EXISTS "waste_percentage" numeric(18, 4) DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE "bom_items" ADD COLUMN IF NOT EXISTS "is_required" boolean DEFAULT true;`);
    await db.execute(sql`ALTER TABLE "bom_items" ADD COLUMN IF NOT EXISTS "position" text;`);
    await db.execute(sql`ALTER TABLE "bom_items" ADD COLUMN IF NOT EXISTS "notes" text;`);
    await db.execute(sql`ALTER TABLE "bom_items" ADD COLUMN IF NOT EXISTS "work_center_id" integer REFERENCES "work_centers"("id");`);

    // 6. Modify routing_steps
    await db.execute(sql`ALTER TABLE "routing_steps" ADD COLUMN IF NOT EXISTS "work_center_id" integer REFERENCES "work_centers"("id");`);

    // 7. Modify production_orders
    await db.execute(sql`ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "qc_status" text DEFAULT 'PENDING' NOT NULL;`);
    await db.execute(sql`ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "requires_qc" boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'NORMAL';`);

    // 8. Modify work_orders
    await db.execute(sql`ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "requires_qc" boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "work_center_id" integer REFERENCES "work_centers"("id");`);

    console.log("Migration 0011 applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit(0);
}

main();
