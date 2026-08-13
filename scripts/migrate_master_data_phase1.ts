import 'dotenv/config';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('--- MIGRATION: ADDING USER_ID TO HR TABLES ---');
  
  try {
    // 1. Add user_id columns
    console.log('Adding user_id columns...');
    await db.execute(sql`
      ALTER TABLE employment_contracts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE salary_profiles ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE employee_salary_components ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    `);

    // 2. Backfill user_id from employees table
    console.log('Backfilling user_id data...');
    await db.execute(sql`
      UPDATE employment_contracts c
      SET user_id = e.user_id
      FROM employees e
      WHERE c.employee_id = e.id AND c.user_id IS NULL;
    `);
    
    await db.execute(sql`
      UPDATE salary_profiles p
      SET user_id = e.user_id
      FROM employees e
      WHERE p.employee_id = e.id AND p.user_id IS NULL;
    `);

    await db.execute(sql`
      UPDATE employee_salary_components c
      SET user_id = e.user_id
      FROM employees e
      WHERE c.employee_id = e.id AND c.user_id IS NULL;
    `);
    
    // 3. Make employee_id nullable to allow removing it later, and drop employees dependency eventually
    console.log('Relaxing employee_id NOT NULL constraint...');
    await db.execute(sql`
      ALTER TABLE employment_contracts ALTER COLUMN employee_id DROP NOT NULL;
      ALTER TABLE salary_profiles ALTER COLUMN employee_id DROP NOT NULL;
      ALTER TABLE employee_salary_components ALTER COLUMN employee_id DROP NOT NULL;
    `);

    console.log('Migration Phase 1 & 2 completed successfully.');
    
    // We will NOT drop the employees table yet (Phase 5 of Migration Plan)
    // We need to verify code works first.

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
