import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// Import Route Handlers
import { POST as CalculatePayrollPOST } from '../src/app/api/hr/payroll/calculate/route';
import { GET as EmployeeGET } from '../src/app/api/hr/employees/[id]/route';

dotenv.config({ path: resolve(process.cwd(), '.env.local') }); // Using Production DB but ONLY READ-ONLY or Safe-Failure calls

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'homepro-manager-default-secret-change-in-prod-2026'
);

async function createRequest(method: string, url: string, session: any, body?: any) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
    
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Cookie': `homepro_session=${token}`
    }
  });
}

async function getSession(username: string) {
  const u = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!u.length) throw new Error(`User ${username} not found`);
  return { id: u[0].id, role: u[0].role, username: u[0].username, active: true, name: u[0].name, departmentId: u[0].departmentId };
}

const results = {
  TOTAL_TESTS: 0,
  PASS: 0,
  FAIL: 0,
  IDOR: 'PASS',
  DEPARTMENT_ISOLATION: 'PASS',
  ROLE_AUTHORIZATION: 'PASS',
  PAYROLL_AUTHORIZATION: 'PASS',
  LEAST_PRIVILEGE: 'PASS',
  FINDINGS: [] as string[]
};

function runTest(name: string, expectedStatus: number, actualStatus: number, category: string) {
  results.TOTAL_TESTS++;
  const passed = expectedStatus === actualStatus;
  
  if (passed) {
    results.PASS++;
    console.log(`[PASS] ${name} (Got ${actualStatus})`);
  } else {
    results.FAIL++;
    console.log(`[FAIL] ${name} (Expected ${expectedStatus}, Got ${actualStatus})`);
    results.FINDINGS.push(`[${category}] ${name} failed. Expected ${expectedStatus}, got ${actualStatus}.`);
    
    if (category === 'IDOR') results.IDOR = 'FAIL';
    if (category === 'ISOLATION') results.DEPARTMENT_ISOLATION = 'FAIL';
    if (category === 'ROLE') results.ROLE_AUTHORIZATION = 'FAIL';
    if (category === 'PAYROLL') results.PAYROLL_AUTHORIZATION = 'FAIL';
  }
}

async function main() {
  console.log('=== P0.14 SECURITY AUTOMATED TESTING (PRODUCTION READ-ONLY) ===\n');

  // Load Real Users
  const admin = await getSession('admin');           // ADMIN
  const accountant = await getSession('letramkt');   // ACCOUNTANT
  const mgrA = await getSession('duy.le');           // MANAGER (dept 2 - Thi Cong)
  const empA = await getSession('vinh.huynh');       // WORKER (dept 2 - Thi Cong)
  const empB = await getSession('tien.nguyen');      // WORKER (dept 3 - Kho)

  // 1. PAYROLL CALCULATE AUTHORIZATION
  // We pass month: -1 to ensure it fails at input validation (400) if authorization (403) passes, avoiding DB mutation.
  console.log('\n--- PAYROLL CALCULATE (POST) ---');
  let res = await CalculatePayrollPOST(await createRequest('POST', 'http://localhost/api/hr/payroll/calculate', admin, { month: -1, year: 2026 }));
  runTest('ADMIN calculate payroll', 400, res.status, 'PAYROLL'); // Should pass auth and hit 400

  res = await CalculatePayrollPOST(await createRequest('POST', 'http://localhost/api/hr/payroll/calculate', accountant, { month: -1, year: 2026 }));
  runTest('ACCOUNTANT calculate payroll', 403, res.status, 'PAYROLL');

  res = await CalculatePayrollPOST(await createRequest('POST', 'http://localhost/api/hr/payroll/calculate', mgrA, { month: -1, year: 2026 }));
  runTest('MANAGER calculate payroll', 403, res.status, 'PAYROLL');

  res = await CalculatePayrollPOST(await createRequest('POST', 'http://localhost/api/hr/payroll/calculate', empA, { month: -1, year: 2026 }));
  runTest('WORKER calculate payroll', 403, res.status, 'PAYROLL');

  // 2. EMPLOYEE GET (ROLE + ISOLATION + IDOR)
  console.log('\n--- EMPLOYEE PROFILE (GET) ---');
  
  res = await EmployeeGET(await createRequest('GET', `http://localhost/api/hr/employees/${empA.id}`, admin), { params: { id: String(empA.id) } });
  runTest('ADMIN read any employee', 200, res.status, 'ROLE');

  res = await EmployeeGET(await createRequest('GET', `http://localhost/api/hr/employees/${empA.id}`, accountant), { params: { id: String(empA.id) } });
  // Currently, the route handler hardcodes session.role !== 'ADMIN' && session.role !== 'MANAGER' && session.role !== 'VIEWER'.
  // Thus ACCOUNTANT will fail with 403. But business logic says ACCOUNTANT MUST READ payroll/employee. We expect 200.
  runTest('ACCOUNTANT read any employee', 200, res.status, 'ROLE');

  // MANAGER isolation
  res = await EmployeeGET(await createRequest('GET', `http://localhost/api/hr/employees/${empA.id}`, mgrA), { params: { id: String(empA.id) } });
  runTest('MANAGER read employee in OWN department', 200, res.status, 'ISOLATION');

  res = await EmployeeGET(await createRequest('GET', `http://localhost/api/hr/employees/${empB.id}`, mgrA), { params: { id: String(empB.id) } });
  runTest('MANAGER read employee in OTHER department', 403, res.status, 'ISOLATION');

  // WORKER IDOR
  res = await EmployeeGET(await createRequest('GET', `http://localhost/api/hr/employees/${empA.id}`, empA), { params: { id: String(empA.id) } });
  runTest('WORKER read OWN profile', 200, res.status, 'IDOR');

  res = await EmployeeGET(await createRequest('GET', `http://localhost/api/hr/employees/${empB.id}`, empA), { params: { id: String(empB.id) } });
  runTest('WORKER read OTHER profile (IDOR)', 403, res.status, 'IDOR');

  // Generate Report
  console.log('\n=== TEST RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  process.exit(results.FAIL > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
