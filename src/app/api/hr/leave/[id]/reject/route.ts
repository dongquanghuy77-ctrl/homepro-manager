export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { writeHrAuditLog } from '@/lib/hr';
import { eq } from 'drizzle-orm';

// ── PATCH: Từ chối đơn (ADMIN hoặc MANAGER, chỉ khi PENDING) ─────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({})) as { reviewNote?: string };

    const { getLeaveApprovalLevel } = await import('@/lib/permissions/checker');
    const approvalLevel = await getLeaveApprovalLevel(session);
    if (approvalLevel === 0) return NextResponse.json({ error: 'Bạn không có quyền từ chối đơn' }, { status: 403 });

    // Kiểm tra đơn tồn tại và đang PENDING
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    if (!request) return NextResponse.json({ error: 'Không tìm thấy đơn nghỉ phép' }, { status: 404 });
    if (request.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Chỉ có thể từ chối đơn ở trạng thái PENDING. Đơn này đang: ${request.status}` },
        { status: 400 }
      );
    }

    if (approvalLevel === 1) {
      const { users } = await import('@/db/schema');
      const [targetUser] = await db.select({ departmentId: users.departmentId }).from(users).where(eq(users.id, request.employeeId));
      if (!targetUser || targetUser.departmentId !== session.departmentId) {
        return NextResponse.json({ error: 'Bạn không có quyền từ chối đơn của nhân viên này' }, { status: 403 });
      }
    }

    const now = new Date();
    const [updated] = await db
      .update(leaveRequests)
      .set({
        status:      'REJECTED',
        reviewedBy:  session.id,
        reviewedAt:  now,
        reviewNote:  body.reviewNote?.trim() || null,
        updatedAt:   now,
      })
      .where(eq(leaveRequests.id, id))
      .returning();

    await writeHrAuditLog({
      action:     'LEAVE_REJECTED',
      entityType: 'leave',
      entityId:   id,
      actorId:    session.id,
      actorName:  session.name,
      oldValue:   { status: 'PENDING' },
      newValue:   { status: 'REJECTED', reviewNote: body.reviewNote ?? null },
      ipAddress:  req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
