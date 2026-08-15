import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Starting MRP database migration...');

  try {
    // material_requirements table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS material_requirements (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        boq_id INTEGER REFERENCES boqs(id) ON DELETE CASCADE,
        production_order_id INTEGER REFERENCES production_orders(id) ON DELETE CASCADE,
        material_id INTEGER NOT NULL REFERENCES materials(id),
        required_qty NUMERIC(18,4) NOT NULL,
        stock_at_calculation NUMERIC(18,4) DEFAULT 0,
        shortage_qty NUMERIC(18,4) NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ material_requirements table created or verified.');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
