export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests } from '@/db/schema';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import { writeHrAuditLog } from '@/lib/hr';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req, ADMIN_OR_MANAGER);
    if (error || !session) return error;

    const id = Number(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    const body = await req.json().catch(() => ({}));

    const [updated] = await db
      .update(leaveRequests)
      .set({ 
        status: 'REJECTED', 
        reviewedBy: session.id, 
        reviewedAt: new Date(),
        reviewNote: body.reviewNote || null,
        updatedAt: new Date()
      })
      .where(eq(leaveRequests.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await writeHrAuditLog({
      action: 'LEAVE_REJECTED',
      entityType: 'LEAVE',
      entityId: id,
      actorId: session.id
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
