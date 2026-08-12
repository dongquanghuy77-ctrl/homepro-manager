import { db } from '../src/db';
import { users, employees, employmentContracts, salaryProfiles } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const u = await db.select().from(users).where(eq(users.username, 'admin'));
  if (u[0]) {
    const e = await db.select().from(employees).where(eq(employees.userId, u[0].id));
    if (e[0]) {
      await db.delete(salaryProfiles).where(eq(salaryProfiles.employeeId, e[0].id));
      await db.delete(employmentContracts).where(eq(employmentContracts.employeeId, e[0].id));
      await db.delete(employees).where(eq(employees.id, e[0].id));
      console.log('Cleaned admin');
    } else {
      console.log('Admin not in employees');
    }
  }
  process.exit(0);
}
run();
