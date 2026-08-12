export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests, users } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { writeHrAuditLog } from '@/lib/hr';

// ── GET: Chi tiết một đơn nghỉ ────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    const [row] = await db
      .select({
        id:          leaveRequests.id,
        employeeId:  leaveRequests.employeeId,
        leaveType:   leaveRequests.leaveType,
        startDate:   leaveRequests.startDate,
        endDate:     leaveRequests.endDate,
        totalDays:   leaveRequests.totalDays,
        reason:      leaveRequests.reason,
        status:      leaveRequests.status,
        reviewedBy:  leaveRequests.reviewedBy,
        reviewedAt:  leaveRequests.reviewedAt,
        reviewNote:  leaveRequests.reviewNote,
        createdAt:   leaveRequests.createdAt,
        employeeName: users.name,
        department:   users.department,
        departmentId: users.departmentId,
      })
      .from(leaveRequests)
      .leftJoin(users, eq(leaveRequests.employeeId, users.id))
      .where(eq(leaveRequests.id, id));

    if (!row) return NextResponse.json({ error: 'Không tìm thấy đơn nghỉ phép' }, { status: 404 });

    const { canReadLeave } = await import('@/lib/permissions/checker');
    if (!(await canReadLeave(session, row.employeeId, row.departmentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(row);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── PATCH: Hủy đơn (chỉ chủ đơn, chỉ khi PENDING) ───────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    if (!request) return NextResponse.json({ error: 'Không tìm thấy đơn nghỉ phép' }, { status: 404 });

    // Chỉ chủ đơn mới được hủy (ADMIN không thể hủy thay)
    if (request.employeeId !== session.id) {
      return NextResponse.json({ error: 'Bạn không có quyền hủy đơn này' }, { status: 403 });
    }
    // Chỉ hủy được khi còn PENDING
    if (request.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Không thể hủy đơn đang ở trạng thái "${request.status}"` },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(leaveRequests)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();

    await writeHrAuditLog({
      action:     'LEAVE_CANCELLED',
      entityType: 'leave',
      entityId:   id,
      actorId:    session.id,
      actorName:  session.name,
      oldValue:   { status: 'PENDING' },
      newValue:   { status: 'CANCELLED' },
      ipAddress:  req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
