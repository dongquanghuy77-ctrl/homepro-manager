import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { sql } from 'drizzle-orm';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { users, departments, managerDepartments } from '../src/db/schema';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const prodUrl = 'postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  const uatUrl = 'postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/uat_neondb?sslmode=require';

  const prodDb = drizzle(new Pool({ connectionString: prodUrl }));
  const uatDb = drizzle(new Pool({ connectionString: uatUrl }));

  console.log('Syncing users from PROD to UAT...');
  const prodUsers = await prodDb.select().from(users);
  for (const u of prodUsers) {
    const existing = await uatDb.select().from(users).where(sql`${users.id} = ${u.id}`);
    if (existing.length > 0) {
      await uatDb.update(users).set({
        employeeCode: u.employeeCode,
        position: u.position,
        officialSalary: u.officialSalary,
        employmentType: u.employmentType,
        managerId: u.managerId,
        departmentId: u.departmentId,
        joinDate: u.joinDate
      }).where(sql`${users.id} = ${u.id}`);
    } else {
      await uatDb.insert(users).values(u);
    }
  }

  console.log('Copying departments from PROD to UAT...');
  const prodDepts = await prodDb.select().from(departments);
  await uatDb.delete(departments);
  if (prodDepts.length > 0) await uatDb.insert(departments).values(prodDepts);

  console.log('Copying manager_departments from PROD to UAT...');
  const prodMd = await prodDb.select().from(managerDepartments);
  await uatDb.delete(managerDepartments);
  if (prodMd.length > 0) await uatDb.insert(managerDepartments).values(prodMd);

  console.log('UAT DB synced with PROD DB successfully.');
  process.exit(0);
}

main().catch(console.error);
