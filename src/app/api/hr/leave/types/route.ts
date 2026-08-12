// src/app/api/hr/leave/types/route.ts
// GET /api/hr/leave/types  — Danh sách loại phép (public cho tất cả NV)
// POST /api/hr/leave/types — Seed mặc định (chỉ ADMIN)

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }   from 'next/server';
import { db }                          from '@/db';
import { leaveTypes }                  from '@/db/schema';
import { requireAuth, ALL_ROLES, ADMIN_ONLY } from '@/lib/auth';
import { eq }                          from 'drizzle-orm';
import { seedLeaveTypes }              from '@/lib/leave';

// GET — tất cả loại phép đang active
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const types = await db
    .select()
    .from(leaveTypes)
    .where(eq(leaveTypes.isActive, true))
    .orderBy(leaveTypes.sortOrder);

  return NextResponse.json({ types });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const { hasPermissionCode } = await import('@/lib/permissions/checker');
  if (!(await hasPermissionCode(session.role, 'leave.write.all'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await seedLeaveTypes();
  return NextResponse.json({ message: '5 loại phép mặc định đã được khởi tạo' });
}
