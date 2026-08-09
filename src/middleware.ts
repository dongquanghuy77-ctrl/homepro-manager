import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, api auth, and login page
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get('homepro_user');

  // If no session cookie, redirect to /login
  if (!sessionCookie || !sessionCookie.value) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const userPayload = JSON.parse(sessionCookie.value);
    const { role } = userPayload;

    // WORKER role: auto-redirect to mobile portal /nhan-vien if trying to view admin pages
    if (role === 'WORKER' && !pathname.startsWith('/nhan-vien') && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/nhan-vien', req.url));
    }

    // ADMIN only for /admin/users
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  } catch (e) {
    // Malformed session, redirect to login
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
