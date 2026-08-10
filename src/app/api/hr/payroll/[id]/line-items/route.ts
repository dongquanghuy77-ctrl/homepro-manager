// src/app/api/hr/payroll/[id]/line-items/route.ts
// GET /api/hr/payroll/:id/line-items
// Trả về lineItemsJson của 1 bản ghi — dùng khi expand row trong dashboard.
// Tách riêng để LIST API không cần trả payload nặng.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }      from 'next/server';
import { db }                             from '@/db';
import { monthlyPayroll }                 from '@/db/schema';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';
import { eq }                             from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  const id = parseInt(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const [row] = await db
    .select({
      lineItemsJson: monthlyPayroll.lineItemsJson,
      warningsJson:  monthlyPayroll.warningsJson,
    })
    .from(monthlyPayroll)
    .where(eq(monthlyPayroll.id, id));

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    lineItems: row.lineItemsJson ?? [],
    warnings:  row.warningsJson  ?? [],
  }, {
    headers: { 'Cache-Control': 'private, max-age=60' }, // Line items ít thay đổi sau khi tính
  });
}
