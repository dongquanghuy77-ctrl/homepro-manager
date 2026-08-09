// src/lib/session.ts
// JWT-signed session management using jose (Node.js runtime)
// For Edge Runtime (middleware), use verifySessionEdge() below
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

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

// Verify session from a raw NextRequest using native Web Crypto API
// (Edge Runtime compatible — does NOT import jose)
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET || 'homepro-manager-default-secret-change-in-prod-2026';
    const encoder = new TextEncoder();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    // Import HMAC-SHA256 key using Web Crypto (available in Edge Runtime)
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode base64url signature
    const sigBuffer = Uint8Array.from(
      atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );

    // Verify HMAC signature
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify('HMAC', key, sigBuffer, data);
    if (!valid) return null;

    // Decode & parse payload
    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    );

    // Check token expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload as SessionPayload;
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
