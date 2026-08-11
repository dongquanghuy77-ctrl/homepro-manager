// src/app/api/payroll/my/history/route.ts
// GET /api/payroll/my/history
// Trả danh sách các tháng có phiếu lương PUBLISHED của nhân viên đang đăng nhập.
// Dùng để render dropdown chọn tháng trên giao diện EmployeePayslip.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }      from 'next/server';
import { db }                             from '@/db';
import { monthlyPayroll }                 from '@/db/schema';
import { requireAuth, ALL_ROLES }         from '@/lib/auth';
import { eq, and, desc }                  from 'drizzle-orm';

export async function GET(req: NextRequest) {
  // SECURITY: employeeId luôn lấy từ JWT session — không từ URL
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const empId = session.id;

  const rows = await db
    .select({
      month:        monthlyPayroll.month,
      year:         monthlyPayroll.year,
      netSalary:    monthlyPayroll.netSalary,
      grossEarnings: monthlyPayroll.grossEarnings,
      publishedAt:  monthlyPayroll.publishedAt,
    })
    .from(monthlyPayroll)
    .where(
      and(
        eq(monthlyPayroll.employeeId, empId),   // ← SECURITY: session only
        eq(monthlyPayroll.status,     'PUBLISHED'),
      )
    )
    .orderBy(desc(monthlyPayroll.year), desc(monthlyPayroll.month));

  return NextResponse.json({ history: rows }, {
    headers: { 'Cache-Control': 'private, max-age=120' },
  });
}
