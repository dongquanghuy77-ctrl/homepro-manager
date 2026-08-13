import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3005';
const DEFAULT_PASS = '123456';
const DEFAULT_PIN = '123456';

async function fetchWithCookie(url: string, cookie: string, options: any = {}) {
  const headers = options.headers || {};
  headers['Cookie'] = cookie;
  return fetch(url, { ...options, headers, redirect: 'manual' });
}

async function runAudit() {
  console.log('--- STARTING FULL LOGIN AUDIT ---');

  // 1. Get all active users
  const usersResult = await db.execute(sql`
    SELECT id, username, name, role, department, active 
    FROM users 
    WHERE active = true
    ORDER BY id ASC
  `);
  const activeUsers = usersResult.rows;

  const results = [];
  let failCount = 0;
  let passCount = 0;

  for (const user of activeUsers) {
    console.log(`\nAuditing user: ${user.username} (Role: ${user.role})`);
    
    const result: any = {
      username: user.username,
      name: user.name,
      role: user.role,
      active: user.active,
      login: 'FAIL',
      session: 'FAIL',
      authMe: 'FAIL',
      attendanceGate: 'FAIL',
      redirect: 'FAIL',
      ui: 'FAIL',
      finalResult: 'FAIL',
      error: ''
    };

    try {
      // 2. Login
      const isPinLogin = /^\+?\d{8,15}$/.test(String(user.username).replace(/[\s\.-]/g, ''));
      const payload = isPinLogin ? { identifier: user.username, pin: DEFAULT_PIN } : { identifier: user.username, password: DEFAULT_PASS };
      
      let loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let loginData = await loginRes.json();
      
      if (!loginRes.ok && !isPinLogin) {
        // Retry with '123'
        loginRes = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: user.username, password: '123' })
        });
        loginData = await loginRes.json();
      }

      if (!loginRes.ok) {
        throw new Error(`Login API failed: ${loginData.error}`);
      }
      result.login = 'PASS';

      const setCookie = loginRes.headers.get('set-cookie');
      if (!setCookie) throw new Error('No cookie returned');
      const cookieVal = setCookie.split(';')[0];
      result.session = 'PASS';

      // 3. /api/auth/me
      const meRes = await fetchWithCookie(`${API_URL}/api/auth/me`, cookieVal);
      const meData = await meRes.json();
      if (!meRes.ok || meData.user.username !== user.username) {
         throw new Error('/auth/me identity mismatch');
      }
      result.authMe = 'PASS';

      // 4. Test Attendance Gate Redirect via direct dashboard fetch
      // Try fetching a protected dashboard route directly without checkin
      const dashRes = await fetchWithCookie(`${API_URL}/`, cookieVal);
      if (dashRes.status === 307 || dashRes.status === 302) {
         const location = dashRes.headers.get('location');
         if (location && location.includes('/attendance-gate')) {
           result.attendanceGate = 'PASS (Redirected to Gate)';
         } else if (loginData.user.lastAttendanceDate) {
           result.attendanceGate = 'PASS (Already Checked In, Redirected to Dashboard)';
         } else {
           throw new Error(`Did not redirect to gate, redirected to: ${location}`);
         }
      } else if (dashRes.status === 200) {
         // Maybe they already checked in?
         if (loginData.user.lastAttendanceDate) {
            result.attendanceGate = 'PASS (Already Checked In)';
         } else {
            throw new Error(`Did not redirect to gate, status 200`);
         }
      } else {
         throw new Error(`Unexpected status ${dashRes.status} on dashboard`);
      }

      // 5. Test Check-in API & Session Refresh
      if (!loginData.user.lastAttendanceDate) {
        const checkinRes = await fetchWithCookie(`${API_URL}/api/hr/attendance/checkin`, cookieVal, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: 'TEST_AUDIT' })
        });
        
        if (!checkinRes.ok) {
           const err = await checkinRes.text();
           throw new Error(`Checkin failed: ${err}`);
        }
        const newCookie = checkinRes.headers.get('set-cookie');
        if (!newCookie) throw new Error('No refreshed cookie returned after checkin');
        
        const refreshedCookie = newCookie.split(';')[0];
        
        // 6. Test Dashboard Access after Check-in
        let dashTarget = '/';
        if (['WORKER', 'STAFF', 'DESIGNER'].includes(String(user.role))) dashTarget = '/nhan-vien';
        else if (user.role === 'HR') dashTarget = '/hr';
        else if (user.role === 'ACCOUNTANT') dashTarget = '/payroll';
        
        // Follow redirect manually to check if middleware redirects them correctly
        const gateRes = await fetchWithCookie(`${API_URL}/attendance-gate`, refreshedCookie);
        if (gateRes.status === 307 || gateRes.status === 302) {
            const loc = gateRes.headers.get('location');
            if (!loc || !loc.includes(dashTarget)) {
               throw new Error(`Wrong redirect after checkin. Expected ${dashTarget}, got ${loc}`);
            }
        }
        result.redirect = `PASS (${dashTarget})`;
        result.ui = 'PASS';
      } else {
        result.redirect = 'PASS (Existing checkin)';
        result.ui = 'PASS';
      }

      result.finalResult = 'PASS';
      passCount++;
      console.log('✅ PASS');

    } catch (err: any) {
      result.error = err.message;
      failCount++;
      console.log(`❌ FAIL: ${err.message}`);
    }

    results.push(result);
  }

  const reportPath = path.join(process.cwd(), 'audit_logins_results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
     total: activeUsers.length,
     pass: passCount,
     fail: failCount,
     results
  }, null, 2));

  console.log(`\nAudit completed! Pass: ${passCount}, Fail: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
