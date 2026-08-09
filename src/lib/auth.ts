// src/lib/auth.ts
// Server-side auth helper for API route-level RBAC checks
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, SessionPayload } from './session';

// Call at the top of any API handler that needs authentication.
// Returns { session } on success.
// Returns { error: NextResponse } if unauthorized — caller must return this response.
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: string[]
): Promise<{ session: SessionPayload; error: null } | { session: null; error: NextResponse }> {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { error: 'Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.' },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return {
      session: null,
      error: NextResponse.json(
        { error: `Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền: ${allowedRoles.join(', ')}` },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}

// Convenience RBAC helpers
export const ADMIN_ONLY = ['ADMIN'];
export const ADMIN_OR_MANAGER = ['ADMIN', 'MANAGER'];
export const ALL_STAFF = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'WORKER'];
export const ALL_ROLES = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'WORKER', 'VIEWER'];
