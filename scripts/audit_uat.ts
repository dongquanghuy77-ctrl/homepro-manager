import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { sql } from 'drizzle-orm';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { users, employees, positions, employmentContracts, salaryProfiles, salaryComponents, employeeSalaryComponents } from '../src/db/schema';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const uatUrl = 'postgresql://neondb_owner:npg_dbPWisDQA8F6@ep-floral-union-az31v0st.c-3.ap-southeast-1.aws.neon.tech/uat_neondb?sslmode=require';
  const uatDb = drizzle(new Pool({ connectionString: uatUrl }));

  console.log('--- UAT AUDIT ---');
  const u = await uatDb.select({ count: sql<number>`count(*)` }).from(users);
  const e = await uatDb.select({ count: sql<number>`count(*)` }).from(employees);
  const p = await uatDb.select({ count: sql<number>`count(*)` }).from(positions);
  const c = await uatDb.select({ count: sql<number>`count(*)` }).from(employmentContracts);
  const s = await uatDb.select({ count: sql<number>`count(*)` }).from(salaryProfiles);
  const sc = await uatDb.select({ count: sql<number>`count(*)` }).from(salaryComponents);
  const esc = await uatDb.select({ count: sql<number>`count(*)` }).from(employeeSalaryComponents);

  console.log(`users: ${u[0].count}`);
  console.log(`employees: ${e[0].count}`);
  console.log(`positions: ${p[0].count}`);
  console.log(`contracts: ${c[0].count}`);
  console.log(`salary_profiles: ${s[0].count}`);
  console.log(`salary_components: ${sc[0].count}`);
  console.log(`employee_salary_components: ${esc[0].count}`);

  process.exit(0);
}

main().catch(console.error);
