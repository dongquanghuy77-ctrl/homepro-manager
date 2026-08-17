import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const item = await db.query.quotes.findFirst({
      where: eq(quotes.id, Number(params.id))
    });
    
    if (!item) {
      return NextResponse.json({ success: false, message: 'Quote not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Fetch quote detail error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    await db.delete(quotes).where(eq(quotes.id, Number(params.id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete quote error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const body = await req.json();
    const payload = { ...body };
    if (payload.validUntil) {
      payload.validUntil = new Date(payload.validUntil);
    }
    const updated = await db.update(quotes).set(payload).where(eq(quotes.id, Number(params.id))).returning();
    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error('Update quote error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
