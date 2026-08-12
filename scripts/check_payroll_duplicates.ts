import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function checkDuplicates() {
  const query = sql`
    SELECT employee_id, month, year, COUNT(*) as cnt
    FROM monthly_payroll
    GROUP BY employee_id, month, year
    HAVING COUNT(*) > 1
  `;
  const result = await db.execute(query);
  const rows = (result as any).rows || result;
  if (rows.length > 0) {
    console.log('DUPLICATE_PAYROLL_RECORDS = YES');
    console.table(rows);
  } else {
    console.log('DUPLICATE_PAYROLL_RECORDS = NO');
  }
  process.exit(0);
}

checkDuplicates().catch(console.error);
