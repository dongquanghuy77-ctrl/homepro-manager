import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const ALL_ROLES = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'WORKER', 'VIEWER'];

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return NextResponse.json({ user: null });

  // Lấy thêm employeeCode, department từ DB cho client-side role-based filtering
  const [user] = await db
    .select({
      id:           users.id,
      name:         users.name,
      role:         users.role,
      employeeCode: users.employeeCode,
      department:   users.department,
    })
    .from(users)
    .where(eq(users.id, session.id));

  const { hasPermissionCode } = await import('@/lib/permissions/checker');
  const canViewPayroll = await hasPermissionCode(session.role, 'payroll.view');

  return NextResponse.json({ 
    user: user ? {
      ...user,
      permissions: {
        'payroll.view': canViewPayroll
      }
    } : null 
  });
}
