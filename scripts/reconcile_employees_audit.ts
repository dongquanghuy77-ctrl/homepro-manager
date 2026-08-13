import 'dotenv/config';
import { db } from '../src/db/index';
import { users, employees, employmentContracts, salaryProfiles } from '../src/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('--- PRODUCTION DATA RECONCILIATION ---');
  
  // 1. Total users
  const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(users);
  const totalUsers = totalUsersResult[0].count;
  console.log(`Total Users: ${totalUsers}`);
  
  // 2. Total employees
  const totalEmployeesResult = await db.select({ count: sql<number>`count(*)` }).from(employees);
  const totalEmployees = totalEmployeesResult[0].count;
  console.log(`Total Employees (P0.15 table): ${totalEmployees}`);
  
  // 3. Users without employee
  const usersWithoutEmployee = await db.execute(sql`
    SELECT count(*) FROM users u
    LEFT JOIN employees e ON u.id = e.user_id
    WHERE e.id IS NULL
  `);
  console.log(`Users without employee record: ${usersWithoutEmployee.rows[0].count}`);
  
  // 4. Employees without user
  const employeesWithoutUser = await db.execute(sql`
    SELECT count(*) FROM employees e
    WHERE e.user_id IS NULL
  `);
  console.log(`Employees without user record: ${employeesWithoutUser.rows[0].count}`);
  
  // 5. Duplicate employee-user mapping
  const duplicateUserMappings = await db.execute(sql`
    SELECT user_id, count(*) as c FROM employees
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING count(*) > 1
  `);
  console.log(`Duplicate employee-user mappings: ${duplicateUserMappings.rows.length}`);
  
  // 6. Contracts without employee
  const contractsWithoutEmployee = await db.execute(sql`
    SELECT count(*) FROM employment_contracts c
    LEFT JOIN employees e ON c.employee_id = e.id
    WHERE e.id IS NULL
  `);
  console.log(`Contracts without employee: ${contractsWithoutEmployee.rows[0].count}`);
  
  // 7. Salary Profiles without employee
  const profilesWithoutEmployee = await db.execute(sql`
    SELECT count(*) FROM salary_profiles p
    LEFT JOIN employees e ON p.employee_id = e.id
    WHERE e.id IS NULL
  `);
  console.log(`Salary Profiles without employee: ${profilesWithoutEmployee.rows[0].count}`);
  
  // 8. Department Mismatch (user.departmentId vs employee.departmentId)
  const deptMismatch = await db.execute(sql`
    SELECT count(*) FROM users u
    JOIN employees e ON u.id = e.user_id
    WHERE u.department_id IS DISTINCT FROM e.department_id
  `);
  console.log(`Department Mismatch (users vs employees): ${deptMismatch.rows[0].count}`);
  
  // 9. Active/Inactive mismatch
  const statusMismatch = await db.execute(sql`
    SELECT count(*) FROM users u
    JOIN employees e ON u.id = e.user_id
    WHERE u.employee_status IS DISTINCT FROM e.employment_status
  `);
  console.log(`Status Mismatch (users vs employees): ${statusMismatch.rows[0].count}`);

  process.exit(0);
}

main().catch(console.error);
