// src/lib/session.edge.ts
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'homepro_session';

export interface SessionPayload {
  id: number;
  username: string;
  name: string;
  role: string;
  departmentId?: number | null;
  originalRole?: string;
  requirePasswordChange?: boolean;
  lastAttendanceDate?: string | null;
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
