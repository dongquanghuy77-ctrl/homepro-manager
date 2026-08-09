export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { overtimeRequests, users } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { writeHrAuditLog } from '@/lib/hr';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req, ALL_ROLES);
    if (error) return error;

    const id = Number(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [request] = await db
      .select({
        overtime: overtimeRequests,
        user: { name: users.name }
      })
      .from(overtimeRequests)
      .leftJoin(users, eq(overtimeRequests.employeeId, users.id))
      .where(eq(overtimeRequests.id, id));

    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.role !== 'ADMIN' && session.role !== 'MANAGER' && request.overtime.employeeId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req, ALL_ROLES);
    if (error) return error;

    const id = Number(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [request] = await db.select().from(overtimeRequests).where(eq(overtimeRequests.id, id));
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (request.employeeId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Cannot cancel processed request' }, { status: 400 });
    }

    const [updated] = await db
      .update(overtimeRequests)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(overtimeRequests.id, id))
      .returning();
    
    await writeHrAuditLog({
      action: 'OVERTIME_CANCELLED',
      entityType: 'OVERTIME',
      entityId: id,
      actorId: session.id,
      newValue: { note: `Cancelled overtime request ${id}` }
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
