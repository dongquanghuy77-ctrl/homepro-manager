import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function auditProd() {
  console.log('[PROD AUDIT] Start detailed audit...');

  // 1. Tables missing
  const tables = await db.execute(sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `);
  const existingTables = ((tables as any).rows || tables).map((t: any) => t.tablename);
  
  const expectedTables = [
    'users', 'departments', 'manager_departments', 'roles', 'permissions', 'role_permissions',
    'monthly_payroll', 'attendance', 'leave_requests', 'tasks', 'projects', 'materials'
  ];

  const missingTables = expectedTables.filter(t => !existingTables.includes(t));
  console.log('[PROD AUDIT] Missing tables:', missingTables);

  // 2. monthly_payroll constraints
  if (existingTables.includes('monthly_payroll')) {
    const payrollConstraints = await db.execute(sql`
      SELECT c.conname, c.contype, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'monthly_payroll'
    `);
    console.log('[PROD AUDIT] monthly_payroll constraints:');
    console.table((payrollConstraints as any).rows || payrollConstraints);
  }

  process.exit(0);
}

auditProd().catch(console.error);
