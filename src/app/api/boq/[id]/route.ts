import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { boqItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  const id = parseInt(params.id);
  const body = await req.json();
  const updated = await db.update(boqItems).set({
    materialName: body.materialName,
    unit: body.unit,
    unitPrice: body.unitPrice,
    qtyRequired: body.qtyRequired,
    qtyOrdered: body.qtyOrdered,
    qtyReceived: body.qtyReceived,
    category: body.category,
    notes: body.notes,
    updatedAt: new Date(),
  }).where(eq(boqItems.id, id)).returning();
  if (!updated.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(_req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  await db.delete(boqItems).where(eq(boqItems.id, parseInt(params.id)));
  return NextResponse.json({ success: true });
}
