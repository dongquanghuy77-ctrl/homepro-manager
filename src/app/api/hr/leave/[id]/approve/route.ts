export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests } from '@/db/schema';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import { writeHrAuditLog } from '@/lib/hr';
import { eq } from 'drizzle-orm';

// ── PATCH: Duyệt đơn (ADMIN hoặc MANAGER, chỉ khi PENDING) ───────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    // Kiểm tra đơn tồn tại và đang PENDING
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    if (!request) return NextResponse.json({ error: 'Không tìm thấy đơn nghỉ phép' }, { status: 404 });
    if (request.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Chỉ có thể duyệt đơn ở trạng thái PENDING. Đơn này đang: ${request.status}` },
        { status: 400 }
      );
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
      .returning();

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
