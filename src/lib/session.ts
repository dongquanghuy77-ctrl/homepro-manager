// src/lib/session.ts
// JWT-signed session management using jose
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'homepro_session';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'homepro-manager-default-secret-change-in-prod-2026'
);
const EXPIRY = '7d';

export interface SessionPayload {
  id: number;
  username: string;
  name: string;
  role: string;
}

// Create and set a signed JWT cookie
export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(JWT_SECRET);

  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return token;
}

// Verify and decode session from server context (uses next/headers cookies)
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Verify session from a raw NextRequest (used in middleware and API routes)
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Destroy session (logout)
export async function destroySession() {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
