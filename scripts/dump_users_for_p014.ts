import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function dumpUsers() {
  const users = await db.execute(sql`
    SELECT id, username, name, email, department_id, position, role
    FROM users
    ORDER BY department_id, id;
  `);

  const departments = await db.execute(sql`
    SELECT id, name, code FROM departments;
  `);
  
  const mds = await db.execute(sql`
    SELECT manager_id, department_id FROM manager_departments;
  `);

  console.log(JSON.stringify({
    users: users.rows || users,
    departments: departments.rows || departments,
    manager_departments: mds.rows || mds
  }, null, 2));
  
  process.exit(0);
}

dumpUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
