import { db } from '../src/db/index';
import { users } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_URL = 'http://localhost:3000';
const DEFAULT_PASS = '123456';
const DEFAULT_PIN = '123456';

async function fetchWithCookie(url: string, cookie: string, options: any = {}) {
  const headers = { ...options.headers, Cookie: cookie };
  return fetch(url, { ...options, headers });
}

async function runFinalAudit() {
  console.log('--- STARTING FINAL E2E LOGIN AUDIT ---');
  
  const allUsers = await db.select().from(users).where(eq(users.active, true)).orderBy(users.id);
  console.log(`Found ${allUsers.length} active users.`);
  
  let passCount = 0;
  let failCount = 0;

  for (const user of allUsers) {
    console.log(`\nAuditing user: ${user.username} (Role: ${user.role})`);
    
    try {
      const isPinLogin = /^\+?\d{8,15}$/.test(String(user.username).replace(/[\s\.-]/g, ''));
      let loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isPinLogin ? { identifier: user.username, pin: DEFAULT_PIN } : { identifier: user.username, password: DEFAULT_PASS })
      });
      let loginData = await loginRes.json();
      
      if (!loginRes.ok && !isPinLogin) {
        loginRes = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: user.username, password: '123' })
        });
        loginData = await loginRes.json();
      }

      if (!loginRes.ok) throw new Error(`Login API failed: ${loginData.error}`);
      
      const setCookie = loginRes.headers.get('set-cookie');
      if (!setCookie) throw new Error('No set-cookie header');
      const cookieVal = setCookie.split(';')[0];
      
      const meRes = await fetchWithCookie(`${API_URL}/api/auth/me`, cookieVal);
      if (!meRes.ok) throw new Error(`Auth/Me API failed: ${meRes.status}`);
      const meData = await meRes.json();
      
      if (!meData.user) throw new Error(`User object is null in /api/auth/me`);
      if (meData.user.username !== user.username) throw new Error(`Identity mismatch: Expected ${user.username}, got ${meData.user.username}`);
      if (meData.user.role !== user.role) throw new Error(`Role mismatch: Expected ${user.role}, got ${meData.user.role}`);

      // 1. Un-checked-in test
      // To simulate "Chưa chấm công", we need to hit dashboard without hitting checkin first!
      // However, if the user checked in PREVIOUSLY today in the database, their JWT from login ALREADY has `lastAttendanceDate`.
      // We check what the middleware does for `/`.
      const dashRes = await fetchWithCookie(`${API_URL}/`, cookieVal, { redirect: 'manual' });
      const alreadyCheckedIn = !!meData.user.lastAttendanceDate;
      
      if (dashRes.status === 307 || dashRes.status === 302) {
         const location = dashRes.headers.get('location') || '';

         if (!alreadyCheckedIn) {
            if (!location.includes('/attendance-gate')) {
               throw new Error(`User not checked in but redirected to ${location} instead of gate`);
            }
         } else {
            // Check correct routing if already checked in
            if (['WORKER', 'STAFF', 'DESIGNER'].includes(user.role!) && !location.includes('/nhan-vien')) throw new Error(`Worker not redirected to /nhan-vien`);
            if (user.role === 'HR' && !location.includes('/hr')) throw new Error(`HR not redirected to /hr`);
            if (user.role === 'ACCOUNTANT' && !location.includes('/payroll')) throw new Error(`Accountant not redirected to /payroll`);
            if (user.role === 'MANAGER' && !location.includes('/projects')) throw new Error(`Manager not redirected to /projects`);
         }
      } else if (dashRes.status === 200) {
         if (['WORKER', 'STAFF', 'DESIGNER', 'HR', 'ACCOUNTANT', 'MANAGER'].includes(user.role!)) {
            throw new Error(`Role ${user.role} should have been redirected away from root dashboard (status 200)`);
         }
         // ADMIN, VIEWER are allowed on root
      }

      // 2. Un-checked-in bypass test
      if (!alreadyCheckedIn) {
         let targetUrl = `${API_URL}/nhan-vien`;
         if (user.role === 'MANAGER') targetUrl = `${API_URL}/projects`;
         if (user.role === 'HR') targetUrl = `${API_URL}/hr`;
         if (user.role === 'ACCOUNTANT') targetUrl = `${API_URL}/payroll`;
         
         if (['WORKER', 'STAFF', 'DESIGNER', 'MANAGER', 'HR', 'ACCOUNTANT'].includes(user.role!)) {
            const bypassRes = await fetchWithCookie(targetUrl, cookieVal, { redirect: 'manual' });
            if (bypassRes.status === 307 || bypassRes.status === 302) {
               const loc = bypassRes.headers.get('location') || '';
               if (!loc.includes('/attendance-gate')) {
                  throw new Error(`Bypass failed: expected /attendance-gate, got ${loc}`);
               }
            } else {
               throw new Error(`Bypass failed: returned status ${bypassRes.status} instead of redirect`);
            }
         }
         
         // 3. Perform Check-in
         const checkinRes = await fetchWithCookie(`${API_URL}/api/hr/attendance/checkin`, cookieVal, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               lat: 10.762622,
               lng: 106.660172,
               deviceId: 'e2e-test-device'
            })
         });
         
         if (!checkinRes.ok) {
            const txt = await checkinRes.text();
            throw new Error(`Check-in API failed: ${checkinRes.status} ${txt}`);
         }
         
         // Re-fetch login to get updated JWT with lastAttendanceDate
         let reLoginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(isPinLogin ? { identifier: user.username, pin: DEFAULT_PIN } : { identifier: user.username, password: DEFAULT_PASS })
         });
         if (!reLoginRes.ok && !isPinLogin) {
            reLoginRes = await fetch(`${API_URL}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier: user.username, password: '123' })
            });
         }
         const reSetCookie = reLoginRes.headers.get('set-cookie');
         if (!reSetCookie) throw new Error('No set-cookie on re-login');
         const reCookieVal = reSetCookie.split(';')[0];
         
         // 4. Verify post-check-in redirect
         const postDashRes = await fetchWithCookie(`${API_URL}/`, reCookieVal, { redirect: 'manual' });
         if (postDashRes.status === 307 || postDashRes.status === 302) {
            const loc = postDashRes.headers.get('location') || '';
            if (['WORKER', 'STAFF', 'DESIGNER'].includes(user.role!) && !loc.includes('/nhan-vien')) throw new Error(`Worker not redirected to /nhan-vien after checkin, got ${loc}`);
            if (user.role === 'HR' && !loc.includes('/hr')) throw new Error(`HR not redirected to /hr after checkin`);
            if (user.role === 'ACCOUNTANT' && !loc.includes('/payroll')) throw new Error(`Accountant not redirected to /payroll after checkin`);
            if (user.role === 'MANAGER' && !loc.includes('/projects')) throw new Error(`Manager not redirected to /projects after checkin`);
         }
      }

      console.log('✅ PASS');
      passCount++;
      
    } catch (e: any) {
      console.log(`❌ FAIL: ${e.message}`);
      failCount++;
    }
  }

  console.log(`\nAudit completed! Pass: ${passCount}, Fail: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

runFinalAudit();
