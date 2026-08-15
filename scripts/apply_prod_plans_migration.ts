import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Starting Production Plans database migration...');

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS production_plans (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS production_plan_items (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES materials(id),
        bom_id INTEGER REFERENCES boms(id),
        planned_quantity NUMERIC(18, 4) NOT NULL,
        ordered_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
        completed_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
        priority TEXT DEFAULT 'NORMAL',
        planned_start TIMESTAMP,
        planned_end TIMESTAMP
      );
    `);

    // Alter production_orders to add plan_id
    try {
        await db.execute(sql`ALTER TABLE production_orders ADD COLUMN plan_id INTEGER REFERENCES production_plans(id);`);
        await db.execute(sql`ALTER TABLE production_orders ADD COLUMN plan_item_id INTEGER REFERENCES production_plan_items(id);`);
    } catch(e: any) {
        if (!e.message.includes('already exists')) {
             console.log("Column might exist or error:", e.message);
        }
    }

    console.log('✅ production_plans and production_plan_items tables created or verified.');
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
