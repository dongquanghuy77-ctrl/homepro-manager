export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests, users } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { writeHrAuditLog } from '@/lib/hr';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req, ALL_ROLES);
    if (error || !session) return error;

    const id = Number(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [request] = await db
      .select({
        leave: leaveRequests,
        user: { name: users.name }
      })
      .from(leaveRequests)
      .leftJoin(users, eq(leaveRequests.employeeId, users.id))
      .where(eq(leaveRequests.id, id));

    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.role !== 'ADMIN' && session.role !== 'MANAGER' && request.leave.employeeId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handleCancel(req, params.id);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return handleCancel(req, params.id);
}

async function handleCancel(req: NextRequest, paramsId: string) {
  try {
    const { session, error } = await requireAuth(req, ALL_ROLES);
    if (error || !session) return error;

    const id = Number(paramsId);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (request.employeeId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Cannot cancel processed request' }, { status: 400 });
    }

    const [updated] = await db
      .update(leaveRequests)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    
    await writeHrAuditLog({
      action: 'LEAVE_CANCELLED',
      entityType: 'LEAVE',
      entityId: id,
      actorId: session.id
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
