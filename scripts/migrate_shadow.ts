// scripts/migrate_shadow.ts
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { Client } from '@neondatabase/serverless';

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Create table leave_types
    await client.query(`
      CREATE TABLE shadow.leave_types (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        max_days_per_year REAL,
        is_paid BOOLEAN NOT NULL DEFAULT TRUE,
        is_carry_over BOOLEAN NOT NULL DEFAULT FALSE,
        max_carry_over_days INTEGER DEFAULT 5,
        requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
        approval_levels INTEGER NOT NULL DEFAULT 2,
        max_days_no_doc INTEGER DEFAULT 3,
        payroll_impact TEXT NOT NULL DEFAULT 'NONE',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
    
    // 2. Add columns to leave_requests
    await client.query(`
      ALTER TABLE shadow.leave_requests
      ADD COLUMN leave_type_id INTEGER REFERENCES shadow.leave_types(id) ON DELETE SET NULL,
      ADD COLUMN period TEXT NOT NULL DEFAULT 'FULL_DAY',
      ADD COLUMN attachment_url TEXT,
      ADD COLUMN approved_by_manager INTEGER REFERENCES shadow.users(id),
      ADD COLUMN approved_by_manager_at TIMESTAMP,
      ADD COLUMN manager_note TEXT,
      ADD COLUMN approved_by_hr INTEGER REFERENCES shadow.users(id),
      ADD COLUMN approved_by_hr_at TIMESTAMP,
      ADD COLUMN hr_note TEXT,
      ADD COLUMN cancelled_at TIMESTAMP,
      ADD COLUMN cancel_reason TEXT;
    `);
    
    // 3. Backfill Data
    await client.query(`
      INSERT INTO shadow.leave_types (code, name) VALUES 
      ('ANNUAL', 'Nghỉ phép năm'), 
      ('UNPAID', 'Nghỉ không lương'),
      ('SICK', 'Nghỉ ốm'),
      ('MATERNITY', 'Nghỉ thai sản'),
      ('COMPENSATORY', 'Nghỉ bù');
    `);
    
    await client.query(`
      UPDATE shadow.leave_requests lr 
      SET leave_type_id = lt.id 
      FROM shadow.leave_types lt 
      WHERE lr.leave_type = lt.code;
    `);
    
    await client.query('COMMIT');
    console.log("Shadow migration successful.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", e);
  } finally {
    await client.end();
  }
}

migrate();
