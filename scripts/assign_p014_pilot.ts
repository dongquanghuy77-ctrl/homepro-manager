import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { sql, eq } from 'drizzle-orm';
import { users, managerDepartments } from '../src/db/schema';

const isProd = process.argv.includes('--production');
dotenv.config({ path: resolve(process.cwd(), isProd ? '.env.local' : '.env.uat') });

async function assignPilot() {
  console.log(`=== P0.14-D PILOT ASSIGNMENT (${isProd ? 'PRODUCTION' : 'UAT'}) ===`);
  
  const res = await db.execute(sql`SELECT current_database() as db_name`);
  const dbName = ((res as any).rows ? (res as any).rows[0].db_name : (res as any)[0].db_name) as string;
  console.log(`Connected to: ${dbName}`);

  if (isProd && dbName !== 'neondb') throw new Error('Not connected to neondb!');

  const updates = [
    // ADMIN (Dept 6)
    { id: 1, dept: 6, role: 'ADMIN' },
    { id: 6, dept: 6, role: 'ADMIN' },
    { id: 5, dept: 6, role: 'ADMIN' },

    // ACCOUNTANT (Dept 5)
    { id: 23, dept: 5, role: 'ACCOUNTANT' },
    { id: 24, dept: 5, role: 'ACCOUNTANT' },

    // MANAGER
    { id: 2, dept: 1, role: 'MANAGER' },
    { id: 9, dept: 2, role: 'MANAGER' },
    { id: 3, dept: 2, role: 'MANAGER' },
    { id: 7, dept: 2, role: 'MANAGER' },
    { id: 8, dept: 2, role: 'MANAGER' },

    // WORKER
    { id: 19, dept: 3, role: 'WORKER' },
    { id: 4, dept: 1, role: 'WORKER' },
    { id: 11, dept: 1, role: 'WORKER' },
    { id: 12, dept: 1, role: 'WORKER' },
    { id: 14, dept: 1, role: 'WORKER' },
    { id: 16, dept: 1, role: 'WORKER' },
    { id: 17, dept: 1, role: 'WORKER' },
    { id: 18, dept: 1, role: 'WORKER' },
    { id: 13, dept: 2, role: 'WORKER' },
    { id: 15, dept: 2, role: 'WORKER' },
    { id: 20, dept: 2, role: 'WORKER' },

    // STAFF
    { id: 21, dept: 6, role: 'STAFF' },
  ];

  for (const u of updates) {
    await db.update(users)
      .set({ departmentId: u.dept, role: u.role })
      .where(eq(users.id, u.id));
  }
  console.log('[OK] Users table updated.');

  const managerLinks = [
    { managerId: 2, departmentId: 1 },
    { managerId: 9, departmentId: 2 },
    { managerId: 3, departmentId: 2 },
    { managerId: 7, departmentId: 2 },
    { managerId: 8, departmentId: 2 },
  ];

  for (const link of managerLinks) {
    await db.execute(sql`
      INSERT INTO manager_departments (manager_id, department_id)
      VALUES (${link.managerId}, ${link.departmentId})
      ON CONFLICT DO NOTHING
    `);
  }
  console.log('[OK] manager_departments updated.');

  console.log('[PASS] P0.14-D Pilot Assignment Completed.');
  process.exit(0);
}

assignPilot().catch(err => {
  console.error(err);
  process.exit(1);
});
