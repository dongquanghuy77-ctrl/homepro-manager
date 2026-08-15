import 'dotenv/config';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function fixDb() {
  try {
    console.log('Adding target costs to projects...');
    await db.execute(sql`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS target_material_cost numeric(20, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS target_labor_cost numeric(20, 2) DEFAULT 0;
    `);
    console.log('Added target costs to projects successfully.');
    
    // Also add projectBudgets table if we need it later? We removed its usage.
    // Wait, are there other tables I added in schema.ts that aren't pushed?
    // budgets, budget_lines, budget_transactions ?
    console.log('Adding budget tables...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        total_budget NUMERIC(20,2) NOT NULL DEFAULT 0,
        committed_cost NUMERIC(20,2) NOT NULL DEFAULT 0,
        actual_cost NUMERIC(20,2) NOT NULL DEFAULT 0,
        variance NUMERIC(20,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        approved_by INTEGER,
        approved_at TIMESTAMP
      );
    `);
    
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixDb();
