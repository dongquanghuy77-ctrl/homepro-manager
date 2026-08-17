import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { opportunities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const opp = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, Number(params.id))
    });
    
    if (!opp) {
      return NextResponse.json({ success: false, message: 'Opportunity not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: opp });
  } catch (error: any) {
    console.error('Fetch opportunity detail error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    await db.delete(opportunities).where(eq(opportunities.id, Number(params.id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete opportunity error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const body = await req.json();
    const payload = { ...body };
    if (payload.expectedCloseDate) {
      payload.expectedCloseDate = new Date(payload.expectedCloseDate);
    }
    if (payload.nextContactDate) {
      payload.nextContactDate = new Date(payload.nextContactDate);
    }
    const updated = await db.update(opportunities).set(payload).where(eq(opportunities.id, Number(params.id))).returning();
    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error('Update opportunity error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
