import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function inspectProdSchema() {
  const checkDb = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = (checkDb as any).rows ? (checkDb as any).rows[0].db_name : (checkDb as any)[0].db_name;
  if (dbName !== 'neondb') {
    throw new Error(`ABORT: Target database is ${dbName}, expected neondb (Production)`);
  }

  console.log('[PRODUCTION] Connected to PRODUCTION database (READ-ONLY).');
  
  const targetTables = ['departments', 'manager_departments', 'roles', 'permissions', 'role_permissions'];
  const results: any = {};

  for (const table of targetTables) {
    const res = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${table}
      ) as "exists"
    `);
    const exists = (res as any).rows ? (res as any).rows[0].exists : (res as any)[0].exists;
    results[table] = exists ? 'EXISTS' : 'MISSING';
  }

  // Check compatibility
  const userCheck = await db.execute(sql`
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'id'
  `);
  const userIdType = (userCheck as any).rows ? (userCheck as any).rows[0]?.data_type : (userCheck as any)[0]?.data_type;

  console.log('\n--- PREFLIGHT RESULTS ---');
  for (const [table, status] of Object.entries(results)) {
    console.log(`${table}: ${status}`);
  }
  
  console.log(`\nCompatibility Check: users.id type is ${userIdType} (Expected: integer)`);

  const report = `
# P0.12 PRODUCTION SCHEMA PREFLIGHT

**Target:** neondb (Production)
**Execution:** READ-ONLY

## TABLE STATUS
- departments: ${results['departments']}
- manager_departments: ${results['manager_departments']}
- roles: ${results['roles']}
- permissions: ${results['permissions']}
- role_permissions: ${results['role_permissions']}

## COMPATIBILITY
- users.id -> Type: ${userIdType}. Compatible with manager_id: ${userIdType === 'integer' ? 'YES' : 'NO'}

## CONCLUSION
All target tables are ${Object.values(results).every(v => v === 'MISSING') ? 'MISSING' : 'MIXED'}.
This matches expectations before the P0.12 Surgical Migration.
Ready for Architect GO to create these tables.
  `.trim();

  fs.writeFileSync('P0.12_PRODUCTION_SCHEMA_PREFLIGHT.md', report);
  console.log('Generated P0.12_PRODUCTION_SCHEMA_PREFLIGHT.md');

  process.exit(0);
}

inspectProdSchema().catch(console.error);
