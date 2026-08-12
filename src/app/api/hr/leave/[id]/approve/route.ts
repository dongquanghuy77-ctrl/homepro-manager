export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { writeHrAuditLog } from '@/lib/hr';
import { eq } from 'drizzle-orm';

import { canApproveRequest } from '@/lib/rbac';
import { users } from '@/db/schema';

// ── PATCH: Duyệt đơn (ADMIN, HR, MANAGER, chỉ khi PENDING) ───────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const { getLeaveApprovalLevel } = await import('@/lib/permissions/checker');
  const approvalLevel = await getLeaveApprovalLevel(session);
  if (approvalLevel === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    // Kiểm tra đơn tồn tại và đang PENDING
    const [request] = await db.select({
      id: leaveRequests.id,
      status: leaveRequests.status,
      employeeId: leaveRequests.employeeId,
      currentApprovalLevel: (leaveRequests as any).currentApprovalLevel
    }).from(leaveRequests).where(eq(leaveRequests.id, id));
    if (!request) return NextResponse.json({ error: 'Không tìm thấy đơn nghỉ phép' }, { status: 404 });
    if (request.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Chỉ có thể duyệt đơn ở trạng thái PENDING. Đơn này đang: ${request.status}` },
        { status: 400 }
      );
    }

    const [targetUser] = await db.select({ departmentId: users.departmentId }).from(users).where(eq(users.id, request.employeeId));
    if (!targetUser) return NextResponse.json({ error: 'Không tìm thấy thông tin nhân viên của đơn' }, { status: 404 });
    
    if (targetUser.departmentId === null) {
      return NextResponse.json({ error: 'Nhân viên chưa được phân bổ phòng ban, không thể duyệt đơn' }, { status: 403 });
    }

    let canApprove = false;
    if (approvalLevel === 2) {
      canApprove = true;
    } else if (approvalLevel === 1) {
      if (targetUser.departmentId === session.departmentId) {
        canApprove = true;
      }
    }

    if (!canApprove) {
      return NextResponse.json({ error: 'Bạn không có quyền duyệt đơn nghỉ phép này' }, { status: 403 });
    }

    const now = new Date();
    const [updated] = await db
      .update(leaveRequests)
      .set({
        status:      'APPROVED',
        reviewedBy:  session.id,
        reviewedAt:  now,
        updatedAt:   now,
      })
      .where(eq(leaveRequests.id, id))
      .returning({ id: leaveRequests.id, status: leaveRequests.status });

    await writeHrAuditLog({
      action:     'LEAVE_APPROVED',
      entityType: 'leave',
      entityId:   id,
      actorId:    session.id,
      actorName:  session.name,
      oldValue:   { status: 'PENDING' },
      newValue:   { status: 'APPROVED' },
      ipAddress:  req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
