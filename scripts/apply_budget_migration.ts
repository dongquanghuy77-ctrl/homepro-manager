import * as dotenv from 'dotenv';
dotenv.config();
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🚀 Starting Budget Transactions database migration...');

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS budget_transactions (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        budget_line_id INTEGER REFERENCES budget_lines(id),
        type TEXT NOT NULL, -- COMMITTED, ACTUAL
        category TEXT NOT NULL,
        amount NUMERIC(20, 2) NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ budget_transactions table created or verified.');
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
