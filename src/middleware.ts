import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session.edge';

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
    pathname === '/change-password' ||
    pathname.startsWith('/api')
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

  const { role, lastAttendanceDate } = session;
  const isDemoPwrOnly = session.username === 'quan.mai' || session.username === 'duy.le' || session.username === 'alan';

  // GET TODAY VN (Edge compatible)
  const offset = 7 * 60 * 60 * 1000;
  const now = new Date(Date.now() + offset);
  const todayVN = now.toISOString().split('T')[0];

  // Enforce Attendance Gate
  if (lastAttendanceDate !== todayVN && pathname !== '/attendance-gate') {
    return NextResponse.redirect(new URL('/attendance-gate', req.url));
  }
  
  if (lastAttendanceDate === todayVN && pathname === '/attendance-gate') {
    if (isDemoPwrOnly) return NextResponse.redirect(new URL('/pwr/dashboard', req.url));
    // Redirect away from gate if already checked in
    if (role === 'WORKER' || role === 'STAFF' || role === 'DESIGNER') return NextResponse.redirect(new URL('/nhan-vien', req.url));
    if (role === 'HR') return NextResponse.redirect(new URL('/hr', req.url));
    if (role === 'ACCOUNTANT') return NextResponse.redirect(new URL('/payroll', req.url));
    if (role === 'MANAGER') return NextResponse.redirect(new URL('/projects', req.url));
    return NextResponse.redirect(new URL('/', req.url));
  }

  // DEMO ISOLATION: quan.mai and duy.le can ONLY access /pwr
  if (isDemoPwrOnly && !pathname.startsWith('/pwr') && pathname !== '/attendance-gate') {
    return NextResponse.redirect(new URL('/pwr/dashboard', req.url));
  }

  // Restrict access to root dashboard (/)
  if (pathname === '/') {
    if (role === 'WORKER' || role === 'STAFF' || role === 'DESIGNER') return NextResponse.redirect(new URL('/nhan-vien', req.url));
    if (role === 'HR') return NextResponse.redirect(new URL('/hr', req.url));
    if (role === 'ACCOUNTANT') return NextResponse.redirect(new URL('/payroll', req.url));
    if (role === 'MANAGER') return NextResponse.redirect(new URL('/projects', req.url));
    // ADMIN and VIEWER are allowed on /
  }

  // WORKER/STAFF/DESIGNER role: strictly restricted to /nhan-vien
  if ((role === 'WORKER' || role === 'STAFF' || role === 'DESIGNER') && !pathname.startsWith('/nhan-vien') && !pathname.startsWith('/api') && !pathname.startsWith('/payslip') && pathname !== '/attendance-gate') {
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
