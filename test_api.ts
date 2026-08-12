import { loadEnvConfig } from '@next/env';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { db } from './src/db';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';

import { GET as EmployeeGET } from './src/app/api/hr/employees/[id]/route';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'homepro-manager-default-secret-change-in-prod-2026'
);

async function createRequest(method: string, url: string, session: any) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
    
  return new NextRequest(url, {
    method,
    headers: {
      'Cookie': `homepro_session=${token}`
    }
  });
}

async function main() {
  const u = await db.select().from(users).where(eq(users.username, 'letramkt')).limit(1);
  const accountant = { id: u[0].id, role: u[0].role, username: u[0].username, active: true, name: u[0].name, departmentId: u[0].departmentId };
  
  const target = await db.select().from(users).where(eq(users.username, 'vinh.huynh')).limit(1);
  
  console.log('Fetching target:', target[0].id);
  const req = await createRequest('GET', `http://localhost/api/hr/employees/${target[0].id}`, accountant);
  const res = await EmployeeGET(req, { params: { id: String(target[0].id) } });
  
  console.log('Status:', res.status);
  console.log('Body:', await res.json());
  process.exit(0);
}

main().catch(console.error);
