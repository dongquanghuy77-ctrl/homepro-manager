import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { users, departments, employees, positions, employmentContracts, salaryProfiles } from '../src/db/schema';
import { sql } from 'drizzle-orm';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const isProdConfirmed = args.includes('--confirm-production');
  const isUatConfirmed = args.includes('--confirm-uat');
  
  const dbUrl = process.env.DATABASE_URL || '';
  const isProd = dbUrl.includes('neon.tech') && !dbUrl.includes('uat_neondb');
  const isUat = dbUrl.includes('uat_neondb');

  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool);

  console.log(`ENVIRONMENT: ${isProd ? 'PRODUCTION' : isUat ? 'UAT' : 'LOCAL'}`);
  console.log(`DATABASE HOST: ${new URL(dbUrl).hostname}`);
  console.log(`DATABASE NAME: ${new URL(dbUrl).pathname.replace('/', '')}`);

  if (isProd && isExecute && !isProdConfirmed) {
    console.error('ERROR: Production environment detected. You MUST provide both --execute AND --confirm-production to run.');
    process.exit(1);
  }
  
  if (isUat && isExecute && !isUatConfirmed) {
    console.error('ERROR: UAT environment detected. You MUST provide both --execute AND --confirm-uat to run.');
    process.exit(1);
  }

  if (!isExecute) {
    console.log('--- DRY RUN MODE ---');
  } else {
    console.log('--- EXECUTION MODE ---');
  }

  try {
    await db.transaction(async (tx) => {
      console.log('Transaction started.');
      const allUsers = await tx.select().from(users);

      const safe = [];
      const review = [];
      const manual = [];
      const system = [];
      const uniquePositions = new Set<string>();

      for (const u of allUsers) {
        if (u.username === 'viewer' || u.username === 'admin') { system.push(u); continue; }

        let isManual = false;
        let isReview = false;

        if (!u.employeeCode || !u.position || !u.officialSalary || !u.employmentType) { isManual = true; } 
        else if (!u.managerId) { isReview = true; }

        if (isManual) manual.push(u);
        else if (isReview) { review.push(u); uniquePositions.add(u.position!); }
        else { safe.push(u); uniquePositions.add(u.position!); }
      }

      console.log(`Audited: ${allUsers.length} total. SAFE=${safe.length}, REVIEW=${review.length}, MANUAL=${manual.length}, SYSTEM=${system.length}`);

      if (!isExecute) {
        console.log('Dry run complete. Transaction rolled back.');
        tx.rollback();
        return;
      }

      console.log('Migrating Positions...');
      const positionMap = new Map();
      for (const p of Array.from(uniquePositions)) {
        const res = await tx.insert(positions).values({ name: p }).returning();
        positionMap.set(p, res[0].id);
      }

      console.log('Migrating Employees (SAFE & REVIEW)...');
      const employeeMap = new Map();
      const allToMigrate = [...safe, ...review];
      
      for (const u of allToMigrate) {
        const res = await tx.insert(employees).values({
          employeeCode: u.employeeCode!,
          userId: u.id,
          fullName: u.name,
          departmentId: u.departmentId!,
          positionId: positionMap.get(u.position!),
          employmentStatus: 'ACTIVE',
        }).returning();
        employeeMap.set(u.id, res[0].id);
      }

      // Update manager relations
      for (const u of safe) {
        if (u.managerId && employeeMap.has(u.managerId)) {
           await tx.update(employees).set({ managerId: employeeMap.get(u.managerId) }).where(sql`${employees.id} = ${employeeMap.get(u.id)}`);
        }
      }

      console.log('Migrating Contracts & Salaries...');
      for (const u of allToMigrate) {
        await tx.insert(employmentContracts).values({
          employeeId: employeeMap.get(u.id),
          contractType: u.employmentType || 'FULL_TIME',
          startDate: u.joinDate || '2020-01-01',
        });
        await tx.insert(salaryProfiles).values({
          employeeId: employeeMap.get(u.id),
          baseSalary: u.officialSalary || 0,
          effectiveFrom: '2020-01-01',
        });
      }

      console.log('Injecting controlled failure for UAT Rollback Test...');
      throw new Error('SIMULATED_FAILURE_FOR_ROLLBACK_TEST');

      console.log('All migrations executed successfully inside transaction.');
    });
  } catch (error: any) {
    if (error.message === 'Rollback') console.log('Transaction rolled back successfully.');
    else if (error.message === 'SIMULATED_FAILURE_FOR_ROLLBACK_TEST') {
      console.error('SIMULATED_FAILURE_CAUGHT. Rollback triggered.');
    }
    else { console.error('MIGRATION FAILED.'); console.error(error); process.exit(1); }
  }
}
main().catch(console.error);
