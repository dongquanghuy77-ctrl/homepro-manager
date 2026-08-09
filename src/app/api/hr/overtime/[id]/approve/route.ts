export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { overtimeRequests } from '@/db/schema';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import { writeHrAuditLog } from '@/lib/hr';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req, ADMIN_OR_MANAGER);
    if (error) return error;

    const id = Number(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [updated] = await db
      .update(overtimeRequests)
      .set({ 
        status: 'APPROVED', 
        approvedBy: session.id, 
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(overtimeRequests.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await writeHrAuditLog({
      action: 'OVERTIME_APPROVED',
      entityType: 'OVERTIME',
      entityId: id,
      actorId: session.id,
      newValue: { note: `Approved overtime request ${id}` }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
