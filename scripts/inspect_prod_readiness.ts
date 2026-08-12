import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function auditProd() {
  const checkDb = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = (checkDb as any).rows ? (checkDb as any).rows[0].db_name : (checkDb as any)[0].db_name;
  
  console.log('[PROD AUDIT] Connected to Production Database:', dbName);

  // Check unique constraints on monthly_payroll
  const payrollConstraints = await db.execute(sql`
    SELECT conname, contype, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'monthly_payroll' AND c.contype = 'u'
  `);
  console.log('[PROD AUDIT] monthly_payroll unique constraints:', (payrollConstraints as any).rows || payrollConstraints);

  // Check if there are any duplicate payroll records in Prod
  const duplicates = await db.execute(sql`
    SELECT employee_id, month, year, COUNT(*) as cnt
    FROM monthly_payroll
    GROUP BY employee_id, month, year
    HAVING COUNT(*) > 1
  `);
  const dupRows = (duplicates as any).rows || duplicates;
  if (dupRows.length > 0) {
    console.warn('[PROD AUDIT] ⚠️ WARNING: Duplicates found in Production!');
    console.table(dupRows);
  } else {
    console.log('[PROD AUDIT] No duplicate payroll records found in Production.');
  }

  process.exit(0);
}

auditProd().catch(console.error);
