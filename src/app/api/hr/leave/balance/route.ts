// src/app/api/hr/leave/balance/route.ts
// GET /api/hr/leave/balance?year=YYYY
// Trả về quỹ phép của nhân viên đang đăng nhập (hoặc ?employeeId= cho Admin)
// ─────────────────────────────────────────────────────────────────────────────
// THIẾT KẾ:
//   remainingDays = totalDays + carryOverDays - usedDays - pendingDays
//   Trả thêm: pendingDays (đang chờ duyệt) để widget có thể hiển thị trạng thái chờ
//   Nếu chưa có balance row → tự động khởi tạo từ leaveType.maxDaysPerYear
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }      from 'next/server';
import { db }                             from '@/db';
import { leaveBalances, leaveTypes }      from '@/db/schema';
import { requireAuth, ALL_ROLES }         from '@/lib/auth';
import { eq, and, sql }                   from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const url        = new URL(req.url);
  const yearParam  = url.searchParams.get('year');
  const empParam   = url.searchParams.get('employeeId');
  const year       = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  // Admin có thể xem balance của bất kỳ nhân viên nào
  const targetId = (session.role === 'ADMIN' && empParam)
    ? parseInt(empParam)
    : session.id;

  // ── Lấy tất cả balance của nhân viên trong năm ──
  const rows = await db
    .select({
      id:            leaveBalances.id,
      leaveTypeId:   leaveBalances.leaveTypeId,
      year:          leaveBalances.year,
      totalDays:     leaveBalances.totalDays,
      carryOverDays: leaveBalances.carryOverDays,
      usedDays:      leaveBalances.usedDays,
      pendingDays:   leaveBalances.pendingDays,
      // JOIN leaveTypes để lấy metadata hiển thị
      leaveTypeCode: leaveTypes.code,
      leaveTypeName: leaveTypes.name,
      isPaid:        leaveTypes.isPaid,
      payrollImpact: leaveTypes.payrollImpact,
      maxDaysPerYear: leaveTypes.maxDaysPerYear,
      sortOrder:     leaveTypes.sortOrder,
    })
    .from(leaveBalances)
    .innerJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
    .where(
      and(
        eq(leaveBalances.employeeId, targetId),
        eq(leaveBalances.year,       year),
        eq(leaveTypes.isActive,      true),
      )
    )
    .orderBy(leaveTypes.sortOrder);

  // ── Tính remainingDays cho mỗi loại ──────────────────────────────────────
  const balances = rows.map(r => {
    const entitlement  = r.totalDays + r.carryOverDays;
    const consumed     = r.usedDays + r.pendingDays;
    const remaining    = Math.max(0, entitlement - consumed);
    const usagePct     = entitlement > 0
      ? Math.min(100, Math.round((r.usedDays / entitlement) * 100))
      : 0;
    const pendingPct   = entitlement > 0
      ? Math.min(100 - usagePct, Math.round((r.pendingDays / entitlement) * 100))
      : 0;

    return {
      ...r,
      entitlement,   // totalDays + carryOverDays
      consumed,      // usedDays + pendingDays (tổng đã dùng + chờ)
      remaining,
      usagePct,      // % đã dùng (APPROVED) → vẽ arc đỏ/vàng
      pendingPct,    // % đang chờ → vẽ arc xanh nhạt
    };
  });

  // ── Tổng hợp (summary cho header widget) ─────────────────────────────────
  const annualBalance = balances.find(b => b.leaveTypeCode === 'ANNUAL');
  const summary = {
    year,
    totalAnnualDays:     annualBalance?.entitlement ?? 0,
    usedAnnualDays:      annualBalance?.usedDays    ?? 0,
    pendingAnnualDays:   annualBalance?.pendingDays ?? 0,
    remainingAnnualDays: annualBalance?.remaining   ?? 0,
  };

  return NextResponse.json({
    employeeId: targetId,
    year,
    summary,
    balances,
    generatedAt: new Date().toISOString(),
  });
}
