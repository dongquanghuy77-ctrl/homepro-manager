import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.uat') });

import { db } from '../src/db';
import { users, monthlyPayroll } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function check() {
  const targetUsernames = ['uat_design_1', 'uat_wood_1', 'uat_const_1'];
  const targetUsers = await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.username, targetUsernames));
  
  for (const user of targetUsers) {
    const pr = await db.select().from(monthlyPayroll).where(eq(monthlyPayroll.employeeId, user.id));
    if (pr.length > 0) {
      console.log(`\nUser: ${user.username}`);
      console.log(`regularWorkedDays: ${pr[0].regularWorkedDays}`);
      console.log(`absentDays: ${pr[0].absentDays}`);
      console.log(`totalLateEarlyMins: ${pr[0].totalLateEarlyMins}`);
      console.log(`attendanceAllowance: ${pr[0].attendanceAllowance}`);
      console.log(`paidLeaveDays: ${pr[0].paidLeaveDays}`);
    }
  }
  process.exit(0);
}

check().catch(console.error);
