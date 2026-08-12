import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { users, departments, managerDepartments, leaveRequests, leaveTypes, attendance, hrAuditLogs } from '../src/db/schema';

// Force checking the public schema to see what's in there
for (const table of [users, departments, managerDepartments, leaveRequests, leaveTypes, attendance, hrAuditLogs]) {
  (table as any)[Symbol.for('drizzle:Schema')] = 'public';
}

async function runAudit() {
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':***@');
  console.log('DATABASE_URL:', maskedUrl);
  console.log('SCHEMA: public (for audit)');
  
  const [usersCount] = await db.select({ count: sql`count(*)` }).from(users);
  const [deptsCount] = await db.select({ count: sql`count(*)` }).from(departments);
  const [leaveCount] = await db.select({ count: sql`count(*)` }).from(leaveRequests);
  const [attCount] = await db.select({ count: sql`count(*)` }).from(attendance);
  
  console.log('--- RECORD COUNTS IN PUBLIC SCHEMA ---');
  console.log('Users:', usersCount.count);
  console.log('Departments:', deptsCount.count);
  console.log('Leave Requests:', leaveCount.count);
  console.log('Attendance:', attCount.count);

  const allUsers = await db.select({ username: users.username, id: users.id }).from(users);
  console.log('Sample Users:', allUsers.slice(0, 10).map(u => u.username));
}

runAudit().catch(console.error);
