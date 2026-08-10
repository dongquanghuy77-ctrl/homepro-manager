// src/app/api/bom/route.ts
// API CRUD cho Production BOM Lines (ph\u00e2n t\u00edch c\u1ea5u ki\u1ec7n theo Zone BOQ)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { productionBomLines } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';

// GET /api/bom?projectId=1 — L\u1ea5y danh s\u00e1ch BOM theo d\u1ef1 \u00e1n
export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;
  void session;

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId l\u00e0 b\u1eaft bu\u1ed9c' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(productionBomLines)
    .where(eq(productionBomLines.projectId, parseInt(projectId)))
    .orderBy(productionBomLines.zoneId, productionBomLines.sttInZone);

  return NextResponse.json({ data: rows, total: rows.length });
}

// POST /api/bom — T\u1ea1o m\u1edbi BOM line (ch\u1ec9 ADMIN/MANAGER)
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  const body = await req.json();
  const { projectId, zoneId, zoneName, productName, unit, qty, unitPrice, supplyType, note, sttInZone, materialCode } = body;

  if (!projectId || !zoneId || !productName || !unit) {
    return NextResponse.json({ error: 'Thi\u1ebfu tr\u01b0\u1eddng b\u1eaft bu\u1ed9c' }, { status: 400 });
  }

  const total = (qty ?? 0) * (unitPrice ?? 0);

  const [created] = await db.insert(productionBomLines).values({
    projectId:   parseInt(projectId),
    zoneId,
    zoneName:    zoneName ?? '',
    productName,
    unit,
    qty:         parseFloat(qty ?? 0),
    unitPrice:   parseFloat(unitPrice ?? 0),
    total,
    supplyType:  supplyType ?? 'HOMEPRO_PRODUCTION',
    note:        note ?? null,
    sttInZone:   sttInZone ? parseInt(sttInZone) : null,
    materialCode: materialCode ?? null,
  }).returning();

  return NextResponse.json({ data: created }, { status: 201 });
}

// PATCH /api/bom — C\u1eadp nh\u1eadt BOM line
export async function PATCH(req: NextRequest) {
  const { error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  const body = await req.json();
  const { id, qty, unitPrice, note, supplyType } = body;
  if (!id) return NextResponse.json({ error: 'id l\u00e0 b\u1eaft bu\u1ed9c' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (qty      !== undefined) { updates.qty = parseFloat(qty); }
  if (unitPrice !== undefined) { updates.unitPrice = parseFloat(unitPrice); }
  if (note     !== undefined) updates.note = note;
  if (supplyType !== undefined) updates.supplyType = supplyType;

  if (updates.qty !== undefined || updates.unitPrice !== undefined) {
    const current = await db.select({ qty: productionBomLines.qty, unitPrice: productionBomLines.unitPrice })
      .from(productionBomLines).where(eq(productionBomLines.id, parseInt(id)));
    if (current[0]) {
      const newQty  = (updates.qty  as number) ?? current[0].qty  ?? 0;
      const newUp   = (updates.unitPrice as number) ?? current[0].unitPrice ?? 0;
      updates.total = newQty * newUp;
    }
  }
  updates.updatedAt = new Date();

  const [updated] = await db.update(productionBomLines)
    .set(updates as Partial<typeof productionBomLines.$inferInsert>)
    .where(eq(productionBomLines.id, parseInt(id)))
    .returning();

  return NextResponse.json({ data: updated });
}

// DELETE /api/bom?id=1
export async function DELETE(req: NextRequest) {
  const { error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id l\u00e0 b\u1eaft bu\u1ed9c' }, { status: 400 });

  await db.delete(productionBomLines).where(eq(productionBomLines.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
