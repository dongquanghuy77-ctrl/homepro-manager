import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { boqItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    updatedAt: new Date().toISOString(),
  }).where(eq(boqItems.id, id)).returning();
  if (!updated.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.delete(boqItems).where(eq(boqItems.id, parseInt(params.id)));
  return NextResponse.json({ success: true });
}
