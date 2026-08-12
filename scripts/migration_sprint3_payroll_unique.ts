import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  const checkDb = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = (checkDb as any).rows ? (checkDb as any).rows[0].db_name : (checkDb as any)[0].db_name;
  if (dbName !== 'uat_neondb') {
    throw new Error(`ABORT: Target database is ${dbName}, expected uat_neondb`);
  }

  console.log('[OK] Connected to UAT database.');

  try {
    await db.execute(sql`ALTER TABLE monthly_payroll ADD CONSTRAINT uq_payroll_emp_month_year UNIQUE (employee_id, month, year);`);
    console.log('[OK] Applied UNIQUE constraint uq_payroll_emp_month_year to monthly_payroll.');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('[OK] Constraint already exists.');
    } else {
      throw error;
    }
  }

  const verify = await db.execute(sql`
    SELECT conname, contype, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conname = 'uq_payroll_emp_month_year'
  `);
  const rows = (verify as any).rows || verify;
  if (rows.length > 0) {
    console.log('PAYROLL_UNIQUE_CONSTRAINT = VERIFIED');
    console.log(rows[0]);
  } else {
    console.error('PAYROLL_UNIQUE_CONSTRAINT = FAILED');
  }

  process.exit(0);
}

migrate().catch(console.error);
