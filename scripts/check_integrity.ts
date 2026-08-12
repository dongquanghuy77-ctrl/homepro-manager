import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users, departments, monthlyPayroll, rolePermissions } from '../src/db/schema';
import { sql } from 'drizzle-orm';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('--- DATABASE INTEGRITY CHECK (READ-ONLY) ---');
  
  const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
  console.log(`User/Employee count: ${userCount[0].count}`);
  
  const deptCount = await db.select({ count: sql<number>`count(*)` }).from(departments);
  console.log(`Department count: ${deptCount[0].count}`);
  
  const payrollCount = await db.select({ count: sql<number>`count(*)` }).from(monthlyPayroll);
  console.log(`Payroll records count: ${payrollCount[0].count}`);
  
  const roles = await db.select({ 
    role: users.role, 
    count: sql<number>`count(*)` 
  }).from(users).groupBy(users.role);
  
  console.log('\nRole Distribution:');
  roles.forEach(r => console.log(`- ${r.role}: ${r.count}`));

  process.exit(0);
}
main().catch(console.error);
