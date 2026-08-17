import { NextResponse } from 'next/server';
import { db } from '@/db';
import { opportunities } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: { id: string } }) {
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
  try {
    await db.delete(opportunities).where(eq(opportunities.id, Number(params.id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete opportunity error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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
