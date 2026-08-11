import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, api auth routes, login page, and public demo page
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/demo') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/demo' ||
    pathname === '/change-password'
  ) {
    return NextResponse.next();
  }

  // Verify the signed JWT session cookie
  const session = await getSessionFromRequest(req);

  // If no valid session, redirect to /login
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // FORCE PASSWORD CHANGE logic
  if (session.requirePasswordChange && pathname !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  const { role } = session;

  // WORKER role: auto-redirect to mobile portal /nhan-vien
  if (role === 'WORKER' && !pathname.startsWith('/nhan-vien') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/nhan-vien', req.url));
  }

  // ADMIN only for /admin routes
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
