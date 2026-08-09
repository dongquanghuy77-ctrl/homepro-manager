import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const body = await req.json();
  const updated = await db.update(materials).set({
    name: body.name, unit: body.unit, unitPrice: body.unitPrice,
    stockQty: body.stockQty, minStock: body.minStock,
    category: body.category, supplier: body.supplier, notes: body.notes,
    updatedAt: new Date(),
  }).where(eq(materials.id, id)).returning();
  if (!updated.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.delete(materials).where(eq(materials.id, parseInt(params.id)));
  return NextResponse.json({ success: true });
}
