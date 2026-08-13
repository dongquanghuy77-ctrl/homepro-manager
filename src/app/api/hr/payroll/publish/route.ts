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
import { getSessionFromRequest }          from '@/lib/session';
import { DefaultAuthorizationService }    from '@/lib/permissions/service';
import { DbPermissionRepository }         from '@/lib/permissions/repository';
import { eq, and, inArray }               from 'drizzle-orm';
import { writeHrAuditLog }                from '@/lib/hr';

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
  }

  const { canPublishPayroll } = await import('@/lib/permissions/checker');
  if (!(await canPublishPayroll(session))) {
    return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 });
  }

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
  let updated: any[]; // fetch full records needed for accounting

  const publishQuery = db
    .update(monthlyPayroll)
    .set({
      status:      'PUBLISHED',
      publishedBy: session.id,
      publishedAt: new Date(),
      updatedAt:   new Date(),
    });

  if (ids === 'all') {
    updated = await publishQuery
      .where(
        and(
          eq(monthlyPayroll.month,  month),
          eq(monthlyPayroll.year,   year),
          eq(monthlyPayroll.status, 'DRAFT'),
        )
      )
      .returning();
  } else {
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids phải là mảng ID hoặc "all"' }, { status: 400 });
    }
    updated = await publishQuery
      .where(
        and(
          inArray(monthlyPayroll.id, ids),
          eq(monthlyPayroll.month,   month),
          eq(monthlyPayroll.year,    year),
          eq(monthlyPayroll.status,  'DRAFT'),
        )
      )
      .returning();
  }

  if (updated.length > 0) {
    await writeHrAuditLog({
      actorId: session.id,
      action: 'PAYROLL_PUBLISH',
      entityType: 'monthly_payroll',
      entityId: -1,
      newValue: { message: `Công bố ${updated.length} bảng lương tháng ${month}/${year}` }
    });

    // --- ACCOUNTING BRIDGE INTEGRATION ---
    // Aggregate values for Journal Entry
    try {
      const { AccountingService } = await import('@/lib/accounting/services');
      const { accountingPeriods, accounts } = await import('@/db/schema');
      
      // Get Period ID for the month/year
      const periodName = `${String(month).padStart(2, '0')}-${year}`;
      const period = await db.query.accountingPeriods.findFirst({
        where: eq(accountingPeriods.name, periodName)
      });

      if (period) {
        let totalNet = 0;
        let totalBHXH = 0; // employee deduction
        let totalPIT = 0;
        let totalGross = 0;
        
        for (const p of updated) {
          totalNet += p.netSalary || 0;
          totalBHXH += p.insuranceDeduction || 0; 
          totalPIT += p.taxDeduction || 0;
          totalGross += p.grossSalary || 0;
        }

        // Get Account IDs
        const acc334 = await db.query.accounts.findFirst({ where: eq(accounts.code, '3341') });
        const acc3383 = await db.query.accounts.findFirst({ where: eq(accounts.code, '3383') });
        const acc3335 = await db.query.accounts.findFirst({ where: eq(accounts.code, '3335') });
        const acc642 = await db.query.accounts.findFirst({ where: eq(accounts.code, '6421') });

        if (acc334 && acc3383 && acc3335 && acc642) {
          // Adjust gross to match debits/credits if they differ (Accounting requires exact match)
          // Simple model: 
          // Debit 642: Gross Salary
          // Credit 3383: Insurance (Employee portion)
          // Credit 3335: PIT
          // Credit 3341: Net Salary
          
          await AccountingService.createJournalEntry({
            entryNo: `JV-PR-${periodName}-${Date.now().toString().slice(-4)}`,
            postingDate: new Date().toISOString().split('T')[0],
            periodId: period.id,
            referenceType: 'PAYROLL',
            description: `Hạch toán lương tháng ${month}/${year}`,
            lines: [
              { accountId: acc642.id, debit: totalGross, credit: 0 },
              { accountId: acc3383.id, debit: 0, credit: totalBHXH },
              { accountId: acc3335.id, debit: 0, credit: totalPIT },
              { accountId: acc334.id, debit: 0, credit: totalNet }
            ]
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to create Journal Entry for Payroll:', err);
      // We don't block the API response if Accounting Bridge fails, 
      // but in a strict system we might.
    }
  }

  return NextResponse.json({
    success: true,
    message: `Đã công bố thành công ${updated.length} bảng lương`,
    updatedCount: updated.length,
    publishedIds: updated.map(r => r.id),
    publishedBy:  session.id,
    publishedAt:  new Date().toISOString(),
  });
}
