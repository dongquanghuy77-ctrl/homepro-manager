import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function audit() {
  const users = await db.execute(sql`
    SELECT id, username, name, department_id, position, role
    FROM users
    ORDER BY id;
  `);

  const md = await db.execute(sql`
    SELECT manager_id, department_id FROM manager_departments;
  `);

  const output = {
    totalUsers: users.rows ? users.rows.length : (users as any).length,
    users: users.rows || users,
    managerDepartments: md.rows || md
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(0);
}

audit().catch(err => {
  console.error(err);
  process.exit(1);
});
