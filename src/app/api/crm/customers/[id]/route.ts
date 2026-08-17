import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, Number(params.id))
    });
    
    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    console.error('Fetch customer detail error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    await db.delete(customers).where(eq(customers.id, Number(params.id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const body = await req.json();
    const updated = await db.update(customers).set(body).where(eq(customers.id, Number(params.id))).returning();
    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error('Update customer error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
