import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// API Routes to test
import { POST as CalculatePOST } from '../src/app/api/hr/payroll/calculate/route';

const isProd = process.argv.includes('--production');
dotenv.config({ path: resolve(process.cwd(), isProd ? '.env.local' : '.env.uat') });

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'homepro-manager-default-secret-change-in-prod-2026'
);

async function createRequest(body: any, session: any, endpoint: string = 'http://localhost:3000/api') {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
    
  return new NextRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Cookie': `homepro_session=${token}`
    }
  });
}

async function getSession(username: string) {
  const u = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!u.length) throw new Error(`User ${username} not found`);
  return { id: u[0].id, role: u[0].role, username: u[0].username, active: true };
}

function ASSERT(condition: boolean, msg: string) {
  if (condition) console.log(`[PASS] ${msg}`);
  else {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
}

async function testPilot() {
  console.log(`=== P0.14-E/F PILOT TESTING (${isProd ? 'PRODUCTION' : 'UAT'}) ===`);

  const worker = await getSession('vinh.huynh'); // WORKER
  const mgr = await getSession('duy.le');       // MANAGER
  const acc = await getSession('letramkt');     // ACCOUNTANT
  const admin = await getSession('huy.dong');   // ADMIN

  console.log('--- TEST: payroll.calculate ---');
  // Worker -> 403
  const wCalc = await CalculatePOST(await createRequest({ month: 7, year: 2026 }, worker));
  ASSERT(wCalc.status === 403, 'WORKER gets 403 on payroll calculate');

  // Manager -> 403 (Manager cannot calculate payroll)
  const mCalc = await CalculatePOST(await createRequest({ month: 7, year: 2026 }, mgr));
  ASSERT(mCalc.status === 403, 'MANAGER gets 403 on payroll calculate');

  // Accountant -> 403 (Accountant only reads payroll, cannot calculate)
  // Let me verify if Accountant has calculate. Our seed script for ACCOUNTANT: payroll.read.all, expense.*.all.
  // Wait, let's see.
  const aCalc = await CalculatePOST(await createRequest({ month: 7, year: 2026 }, acc));
  ASSERT(aCalc.status === 403, 'ACCOUNTANT gets 403 on payroll calculate');

  // Admin -> 200 (or if it crashes, it's because it tries to calculate, but we just check if it's NOT 403)
  const adCalc = await CalculatePOST(await createRequest({ month: 7, year: 2026 }, admin));
  ASSERT(adCalc.status !== 403, `ADMIN gets ${adCalc.status} on payroll calculate (not 403)`);

  console.log('[OK] All pilot authorization checks passed.');
  process.exit(0);
}

testPilot().catch(err => {
  console.error(err);
  process.exit(1);
});
