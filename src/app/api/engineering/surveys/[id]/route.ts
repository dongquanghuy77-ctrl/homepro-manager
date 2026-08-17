import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { surveys } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const [updatedItem] = await db.update(surveys)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(surveys.id, id))
      .returning();
    return NextResponse.json(updatedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const id = parseInt(params.id);
    await db.delete(surveys).where(eq(surveys.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
