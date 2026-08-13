import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/requirePermission';
import { db } from '@/db';
import { accountingPeriods } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rbac = await requirePermission('SYSTEM_ADMIN'); 
    if (!rbac.allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await req.json();
    const status = body.status; // 'OPEN' | 'LOCKED' | 'CLOSED'

    if (!['OPEN', 'LOCKED', 'CLOSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const [updated] = await db.update(accountingPeriods)
      .set({ status, updatedAt: new Date() })
      .where(eq(accountingPeriods.id, parseInt(params.id)))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
