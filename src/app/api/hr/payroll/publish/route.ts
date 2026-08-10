// src/app/api/hr/payroll/publish/route.ts
// PATCH /api/hr/payroll/publish
// Body: { ids: number[] | 'all', month: number, year: number }
// ──────────────────────────────────────────────────────────────────────────────
// Đổi trạng thái từ DRAFT → PUBLISHED.
// "Published" = nhân viên có thể thấy phiếu lương của mình.
// Thao tác này là IRREVERSIBLE (không thể un-publish) để đảm bảo audit trail.
// ──────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }      from 'next/server';
import { db }                             from '@/db';
import { monthlyPayroll }                 from '@/db/schema';
import { requireAuth, ADMIN_ONLY }        from '@/lib/auth';
import { eq, and, inArray }               from 'drizzle-orm';

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth(req, ADMIN_ONLY);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { ids, month, year } = body as {
    ids:   number[] | 'all';
    month: number;
    year:  number;
  };

  if (!month || !year) {
    return NextResponse.json({ error: 'month và year là bắt buộc' }, { status: 400 });
  }

  // ── Chỉ publish các bản ghi đang DRAFT ────────────────────────────────────
  let updated: { id: number }[];

  if (ids === 'all') {
    // Publish TẤT CẢ DRAFT của tháng
    updated = await db
      .update(monthlyPayroll)
      .set({
        status:      'PUBLISHED',
        publishedBy: session.id,
        publishedAt: new Date(),
        updatedAt:   new Date(),
      })
      .where(
        and(
          eq(monthlyPayroll.month,  month),
          eq(monthlyPayroll.year,   year),
          eq(monthlyPayroll.status, 'DRAFT'),
        )
      )
      .returning({ id: monthlyPayroll.id });
  } else {
    // Publish từng ID được chọn (chỉ DRAFT)
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids phải là mảng ID hoặc "all"' }, { status: 400 });
    }

    updated = await db
      .update(monthlyPayroll)
      .set({
        status:      'PUBLISHED',
        publishedBy: session.id,
        publishedAt: new Date(),
        updatedAt:   new Date(),
      })
      .where(
        and(
          inArray(monthlyPayroll.id, ids),
          eq(monthlyPayroll.month,   month),
          eq(monthlyPayroll.year,    year),
          eq(monthlyPayroll.status,  'DRAFT'), // Bảo vệ: chỉ update DRAFT
        )
      )
      .returning({ id: monthlyPayroll.id });
  }

  return NextResponse.json({
    success: true,
    message: `Đã công bố ${updated.length} phiếu lương tháng ${month}/${year}`,
    publishedCount: updated.length,
    publishedIds:   updated.map(r => r.id),
    publishedBy:    session.id,
    publishedAt:    new Date().toISOString(),
  });
}
