import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { desc, like, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const all = await db.select().from(materials).orderBy(materials.category, materials.name);
    return NextResponse.json(all);
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code) {
      const count = await db.select().from(materials);
      body.code = `VT-${String(count.length + 1).padStart(3, '0')}`;
    }
    const result = await db.insert(materials).values({
      code: body.code,
      name: body.name,
      unit: body.unit || 'cái',
      unitPrice: body.unitPrice || 0,
      stockQty: body.stockQty || 0,
      minStock: body.minStock || 0,
      category: body.category || null,
      supplier: body.supplier || null,
      notes: body.notes || null,
    }).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
