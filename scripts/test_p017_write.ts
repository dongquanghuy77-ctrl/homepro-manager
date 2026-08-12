import { db } from '../src/db';
import { users, employees, employmentContracts, salaryProfiles, departments, positions } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { createEmployeeTransaction, updateEmployeeTransaction, changeEmployeeStatusTransaction } from '../src/lib/services/hr-core';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('=== P017-C WRITE PATH AUTOMATED TESTING ===\n');

  let results = { total: 0, pass: 0, fail: 0 };
  const logTest = (name: string, status: boolean, error?: any) => {
    results.total++;
    if (status) {
      results.pass++;
      console.log(`[PASS] ${name}`);
    } else {
      results.fail++;
      console.error(`[FAIL] ${name}`, error);
    }
  };

  try {
    // PREPARE TEST DATA
    const timestamp = Date.now();
    const testUsername = `testuser_${timestamp}`;
    const testEmployeeCode = `EMP_${timestamp}`;
    const departmentName = 'Ke Toan';
    let createdUserId: number = 0;

    // 1. CREATE EMPLOYEE
    try {
      const result = await createEmployeeTransaction({
        name: 'Test Employee',
        username: testUsername,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'WORKER',
        department: departmentName,
        employeeCode: testEmployeeCode,
        officialSalary: 10000000,
        actorId: 1,
        actorName: 'admin',
        ipAddress: '127.0.0.1'
      });
      createdUserId = result.id;
      
      const [u] = await db.select().from(users).where(eq(users.id, result.id));
      const [e] = await db.select().from(employees).where(eq(employees.userId, result.id));
      const [c] = await db.select().from(employmentContracts).where(eq(employmentContracts.employeeId, e.id));
      const [s] = await db.select().from(salaryProfiles).where(eq(salaryProfiles.employeeId, e.id));

      if (u && e && c && s && u.department === departmentName && e.employeeCode === testEmployeeCode && s.baseSalary === 10000000) {
        logTest('1. Create Employee (4 rows created)', true);
      } else {
        logTest('1. Create Employee (4 rows created)', false, 'Data mismatch');
      }
    } catch (e) {
      logTest('1. Create Employee (4 rows created)', false, e);
    }

    // 2. DUPLICATE EMPLOYEE CODE (ROLLBACK SIMULATION)
    try {
      await createEmployeeTransaction({
        name: 'Duplicate Employee',
        username: `testuser2_${timestamp}`,
        passwordHash: 'hash',
        role: 'WORKER',
        department: departmentName,
        employeeCode: testEmployeeCode, // DUPLICATE
        actorId: 1,
        actorName: 'admin',
        ipAddress: '127.0.0.1'
      });
      logTest('2. Duplicate employee_code Rollback', false, 'Should have thrown error');
    } catch (e: any) {
      const msg = e.message || e.cause?.message || String(e) || '';
      if (msg.includes('unique constraint') || msg.includes('duplicate') || e.cause?.toString().includes('duplicate')) {
        const [u] = await db.select().from(users).where(eq(users.username, `testuser2_${timestamp}`));
        if (!u) {
          logTest('2. Duplicate employee_code Rollback (No orphaned user)', true);
        } else {
          logTest('2. Duplicate employee_code Rollback (No orphaned user)', false, 'User was orphaned');
        }
      } else {
        logTest('2. Duplicate employee_code Rollback', false, msg);
      }
    }

    // 3. UPDATE PROFILE
    try {
      await updateEmployeeTransaction(createdUserId, {
        name: 'Updated Employee Name',
        phone: '0123456789',
        actorId: 1,
        actorName: 'admin',
        ipAddress: '127.0.0.1'
      });
      const [u] = await db.select().from(users).where(eq(users.id, createdUserId));
      const [e] = await db.select().from(employees).where(eq(employees.userId, createdUserId));
      if (u.name === 'Updated Employee Name' && e.fullName === 'Updated Employee Name' && u.phone === '0123456789') {
        logTest('3. Update Profile (users & employees sync)', true);
      } else {
        logTest('3. Update Profile (users & employees sync)', false);
      }
    } catch (e) {
      logTest('3. Update Profile (users & employees sync)', false, e);
    }

    // 4. SALARY HISTORY OVERLAP
    try {
      const [e] = await db.select().from(employees).where(eq(employees.userId, createdUserId));
      await updateEmployeeTransaction(createdUserId, {
        officialSalary: 12000000,
        actorId: 1,
        actorName: 'admin',
        ipAddress: '127.0.0.1'
      });
      
      const s = await db.select().from(salaryProfiles).where(eq(salaryProfiles.employeeId, e.id));
      const active = s.filter(s => s.status === 'ACTIVE');
      const archived = s.filter(s => s.status === 'ARCHIVED');

      if (active.length === 1 && archived.length === 1 && active[0].baseSalary === 12000000) {
        logTest('4. Salary Update (Closes old, opens new)', true);
      } else {
        logTest('4. Salary Update (Closes old, opens new)', false, `Active: ${active.length}, Archived: ${archived.length}`);
      }
    } catch (e) {
      logTest('4. Salary Update (Closes old, opens new)', false, e);
    }

    // 5. TERMINATION
    try {
      await changeEmployeeStatusTransaction(createdUserId, {
        active: false,
        employeeStatus: 'TERMINATED',
        actorId: 1,
        actorName: 'admin',
        ipAddress: '127.0.0.1'
      });
      const [u] = await db.select().from(users).where(eq(users.id, createdUserId));
      const [e] = await db.select().from(employees).where(eq(employees.userId, createdUserId));
      const [c] = await db.select().from(employmentContracts).where(eq(employmentContracts.employeeId, e.id));
      const s = await db.select().from(salaryProfiles).where(eq(salaryProfiles.employeeId, e.id));
      const hasActiveSalary = s.some(s => s.status === 'ACTIVE');

      if (!u.active && u.employeeStatus === 'TERMINATED' && e.employmentStatus === 'TERMINATED' && c.endDate !== null && !hasActiveSalary) {
        logTest('5. Termination (Soft Delete + Contract/Salary Close)', true);
      } else {
        logTest('5. Termination (Soft Delete + Contract/Salary Close)', false, 'State mismatch');
      }
    } catch (e) {
      logTest('5. Termination (Soft Delete + Contract/Salary Close)', false, e);
    }

    // 6. SYSTEM ACCOUNT PROTECTION (Fails due to promotion rules)
    try {
      // Insert a bare minimum legacy user (simulating legacy data)
      const [legacyUser] = await db.insert(users).values({
        username: `legacy_${timestamp}`,
        password: 'hash',
        name: 'Legacy User',
        role: 'WORKER',
        active: true,
        employeeStatus: 'ACTIVE',
      }).returning({ id: users.id });

      // Attempt to update it via HR Core (which triggers promotion)
      await updateEmployeeTransaction(legacyUser.id, {
        name: 'Updated Name', // not enough to promote
        actorId: 1, actorName: 'admin', ipAddress: '127.0.0.1'
      });
      logTest('6. System Account Update (Fails due to promotion rules)', false, 'Should have thrown');
    } catch (e: any) {
      if (e.message.includes('MANUAL_INPUT') || e.message.includes('promotion') || e.message.includes('Cần: mã nhân viên, phòng ban')) {
        logTest('6. System Account Update (Fails due to promotion rules)', true);
      } else {
        logTest('6. System Account Update (Fails due to promotion rules)', false, e);
      }
    }

    console.log(`\n=== RESULTS: ${results.pass}/${results.total} PASSED ===`);
  } catch (error) {
    console.error('Fatal Test Error:', error);
  } finally {
    process.exit(0);
  }
}

runTests();
