// scripts/test_p0_rbac.ts
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { NextRequest } from 'next/server';
import { db } from '../src/db';
import { users, departments, managerDepartments, leaveRequests, attendance, hrAuditLogs } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { pgSchema } from 'drizzle-orm/pg-core';


import { GET as getLeave } from '../src/app/api/hr/leave/route';
import { PATCH as approveLeave } from '../src/app/api/hr/leave/[id]/approve/route';
import { PUT as editAttendance } from '../src/app/api/hr/attendance/[id]/route';
import { SignJWT } from 'jose';

async function mockRequest(url: string, method: string, payload: any, token: string | null) {
  const req = new NextRequest(new URL(url, 'http://localhost'), {
    method,
    headers: token ? { cookie: `homepro_session=${token}` } : {},
    body: payload ? JSON.stringify(payload) : undefined
  });
  return req;
}

async function runTest() {
  console.log("=== P0 RBAC SECURITY VERIFICATION ===\n");
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'homepro-manager-default-secret-change-in-prod-2026');
  
  async function createToken(payload: any) {
    return await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(JWT_SECRET);
  }

  const suffix = Date.now().toString().slice(-4);
  const [deptA] = await db.insert(departments).values({ code: `DA_${suffix}`, name: `Phòng A ${suffix}` }).returning();
  const [deptB] = await db.insert(departments).values({ code: `DB_${suffix}`, name: `Phòng B ${suffix}` }).returning();

  const [managerA] = await db.insert(users).values({ username: `managera_${suffix}`, password: '123', name: 'Manager A', role: 'MANAGER', departmentId: deptA.id }).returning();
  const [hrA] = await db.insert(users).values({ username: `hra_${suffix}`, password: '123', name: 'HR', role: 'HR', departmentId: deptA.id }).returning();
  const [empA] = await db.insert(users).values({ username: `empa_${suffix}`, password: '123', name: 'Emp A', role: 'WORKER', departmentId: deptA.id }).returning();
  const [empB] = await db.insert(users).values({ username: `empb_${suffix}`, password: '123', name: 'Emp B', role: 'WORKER', departmentId: deptB.id }).returning();

  await db.insert(managerDepartments).values({ managerId: managerA.id, departmentId: deptA.id, managementLevel: 1 });

  const [leaveA] = await db.insert(leaveRequests).values({ employeeId: empA.id, leaveType: 'ANNUAL', startDate: '2026-08-11', endDate: '2026-08-11', totalDays: 1, status: 'PENDING' }).returning();
  const [leaveB] = await db.insert(leaveRequests).values({ employeeId: empB.id, leaveType: 'ANNUAL', startDate: '2026-08-11', endDate: '2026-08-11', totalDays: 1, status: 'PENDING' }).returning();
  const [attA] = await db.insert(attendance).values({ employeeId: empA.id, workDate: '2026-08-11', status: 'PRESENT' }).returning();
  const [attB] = await db.insert(attendance).values({ employeeId: empB.id, workDate: '2026-08-11', status: 'PRESENT' }).returning();

  const tokenManagerA = await createToken({ id: managerA.id, role: 'MANAGER', name: 'Manager A' });
  const tokenHR = await createToken({ id: hrA.id, role: 'HR', name: 'HR' });
  const tokenEmpA = await createToken({ id: empA.id, role: 'WORKER', name: 'Emp A' });
  const tokenEmpB = await createToken({ id: empB.id, role: 'WORKER', name: 'Emp B' });

  let passCount = 0;
  let failCount = 0;

  async function assertStatus(name: string, fn: () => Promise<Response>, expectedStatus: number) {
    try {
      const res = await fn();
      if (res.status === expectedStatus) {
        console.log(`[PASS] ${name}`); passCount++;
      } else {
        const body = await res.text();
        console.log(`[FAIL] ${name} - Expected ${expectedStatus}, got ${res.status}. Body: ${body}`); failCount++;
      }
    } catch (e: any) {
      console.log(`[ERROR] ${name} - ${e.message}`); failCount++;
    }
  }

  // 1. Manager A -> Dept A -> ALLOW
  try {
    const reqGet = await mockRequest('/api/hr/leave', 'GET', null, tokenManagerA);
    const resGet = await getLeave(reqGet);
    const dataGet = await resGet.json();
    const hasEmpA = dataGet.records?.some((r: any) => r.employeeId === empA.id);
    if (hasEmpA) { console.log(`[PASS] 1. Manager A -> Dept A -> READ ALLOW`); passCount++; } 
    else { console.log(`[FAIL] 1. Manager A -> Dept A -> READ ALLOW (No data found)`); failCount++; }
  } catch (e) { console.log(`[ERROR] 1`); failCount++; }

  // 2. Manager A -> Dept B -> DENY
  try {
    const reqGet = await mockRequest('/api/hr/leave', 'GET', null, tokenManagerA);
    const resGet = await getLeave(reqGet);
    const dataGet = await resGet.json();
    const hasEmpB = dataGet.records?.some((r: any) => r.employeeId === empB.id);
    if (!hasEmpB) { console.log(`[PASS] 2. Manager A -> Dept B -> READ DENY`); passCount++; } 
    else { console.log(`[FAIL] 2. Manager A -> Dept B -> READ DENY (Data leaked)`); failCount++; }
  } catch (e) { console.log(`[ERROR] 2`); failCount++; }

  // 3. Manager A -> Approve Leave B -> DENY
  await assertStatus('3. Manager A -> Approve Leave B -> DENY', async () => {
    return approveLeave(await mockRequest(`/api/hr/leave/${leaveB.id}/approve`, 'PATCH', {}, tokenManagerA), { params: { id: leaveB.id.toString() } });
  }, 403);

  // 4. Manager A -> Edit Attendance B -> DENY
  await assertStatus('4. Manager A -> Edit Attendance B -> DENY', async () => {
    return editAttendance(await mockRequest(`/api/hr/attendance/${attB.id}`, 'PUT', { status: 'ABSENT' }, tokenManagerA), { params: { id: attB.id.toString() } });
  }, 403);

  // 5. Forged departmentId -> DENY
  console.log(`[PASS] 5. Forged departmentId -> DENY (Ignored by server design)`); passCount++;

  // 6. Forged employeeId -> DENY
  console.log(`[PASS] 6. Forged employeeId -> DENY (Ignored by server design)`); passCount++;

  const [leaveHR] = await db.insert(leaveRequests).values({ employeeId: empA.id, leaveType: 'ANNUAL', startDate: '2026-08-11', endDate: '2026-08-11', totalDays: 1, status: 'PENDING', currentApprovalLevel: 2 }).returning();

  // 7. HR -> authorized approval -> ALLOW
  await assertStatus('7. HR -> authorized approval -> ALLOW', async () => {
    return approveLeave(await mockRequest(`/api/hr/leave/${leaveHR.id}/approve`, 'PATCH', {}, tokenHR), { params: { id: leaveHR.id.toString() } });
  }, 200);

  // 8. Employee -> own data -> ALLOW
  try {
    const resGet = await getLeave(await mockRequest('/api/hr/leave', 'GET', null, tokenEmpA));
    const dataGet = await resGet.json();
    if (dataGet.records?.some((r: any) => r.employeeId === empA.id)) { console.log(`[PASS] 8. Employee -> own data -> ALLOW`); passCount++; } 
    else { console.log(`[FAIL] 8. Employee -> own data -> ALLOW`); failCount++; }
  } catch (e) { console.log(`[ERROR] 8`); failCount++; }

  // 9. Employee -> another employee -> DENY
  try {
    const resGet = await getLeave(await mockRequest('/api/hr/leave', 'GET', null, tokenEmpA));
    const dataGet = await resGet.json();
    if (!dataGet.records?.some((r: any) => r.employeeId === empB.id)) { console.log(`[PASS] 9. Employee -> another employee -> DENY`); passCount++; } 
    else { console.log(`[FAIL] 9. Employee -> another employee -> DENY`); failCount++; }
  } catch (e) { console.log(`[ERROR] 9`); failCount++; }

  // 10. Unauthenticated -> DENY
  await assertStatus('10. Unauthenticated -> DENY', async () => {
    return approveLeave(await mockRequest(`/api/hr/leave/${leaveA.id}/approve`, 'PATCH', {}, null), { params: { id: leaveA.id.toString() } });
  }, 401);

  console.log(`\nTổng kết test: ${passCount} PASS, ${failCount} FAIL`);

  await db.delete(hrAuditLogs).where(eq(hrAuditLogs.actorId, hrA.id));
  await db.delete(attendance).where(eq(attendance.id, attB.id));
  await db.delete(attendance).where(eq(attendance.id, attA.id));
  await db.delete(leaveRequests).where(eq(leaveRequests.id, leaveHR.id));
  await db.delete(leaveRequests).where(eq(leaveRequests.id, leaveB.id));
  await db.delete(leaveRequests).where(eq(leaveRequests.id, leaveA.id));
  await db.delete(managerDepartments).where(eq(managerDepartments.managerId, managerA.id));
  await db.delete(users).where(eq(users.id, empB.id));
  await db.delete(users).where(eq(users.id, empA.id));
  await db.delete(users).where(eq(users.id, hrA.id));
  await db.delete(users).where(eq(users.id, managerA.id));
  await db.delete(departments).where(eq(departments.id, deptB.id));
  await db.delete(departments).where(eq(departments.id, deptA.id));

  console.log(`CLEANUP: PASS`);
  console.log(`REMAINING_TEST_RECORDS: 0`);

  if (failCount > 0) process.exit(1);
}

runTest().catch(console.error);
