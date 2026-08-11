// src/app/api/hr/disputes/route.ts
// GET /api/hr/disputes?status=&month=&year=&page=&limit=
// Danh sách khiếu nại phiếu lương — HR/Admin only
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }     from 'next/server';
import { db }                            from '@/db';
import { payslipDisputes, users, monthlyPayroll } from '@/db/schema';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';
import { eq, and, desc, count }          from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  const url    = new URL(req.url);
  const status = url.searchParams.get('status') ?? '';     // '' = tất cả
  const month  = parseInt(url.searchParams.get('month') ?? '0');
  const year   = parseInt(url.searchParams.get('year')  ?? '0');
  const page   = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'));
  const limit  = Math.min(50, parseInt(url.searchParams.get('limit') ?? '20'));
  const offset = (page - 1) * limit;

  const conditions = [
    ...(status ? [eq(payslipDisputes.status, status)] : []),
    ...(month  ? [eq(payslipDisputes.month, month)]   : []),
    ...(year   ? [eq(payslipDisputes.year,  year)]    : []),
  ];

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id:          payslipDisputes.id,
        payrollId:   payslipDisputes.payrollId,
        employeeId:  payslipDisputes.employeeId,
        month:       payslipDisputes.month,
        year:        payslipDisputes.year,
        reason:      payslipDisputes.reason,
        status:      payslipDisputes.status,
        hrResponse:  payslipDisputes.hrResponse,
        reviewedBy:  payslipDisputes.reviewedBy,
        reviewedAt:  payslipDisputes.reviewedAt,
        createdAt:   payslipDisputes.createdAt,
        updatedAt:   payslipDisputes.updatedAt,
        // Denormalized từ JOIN
        employeeName:     users.name,
        employeeCode:     users.employeeCode,
        employeeDept:     users.department,
        // Net salary từ payroll
        netSalary:        monthlyPayroll.netSalary,
        payrollStatus:    monthlyPayroll.status,
      })
      .from(payslipDisputes)
      .innerJoin(users,          eq(payslipDisputes.employeeId, users.id))
      .innerJoin(monthlyPayroll, eq(payslipDisputes.payrollId,  monthlyPayroll.id))
      .where(whereClause)
      .orderBy(desc(payslipDisputes.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ total: count() }).from(payslipDisputes).where(whereClause),
  ]);

  // Tổng hợp badge count theo status (cho sidebar badge)
  const statusCounts = await db
    .select({ status: payslipDisputes.status, cnt: count() })
    .from(payslipDisputes)
    .groupBy(payslipDisputes.status);

  const badges = Object.fromEntries(statusCounts.map(r => [r.status, r.cnt]));

  return NextResponse.json({
    rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    badges,   // { OPEN: 2, UNDER_REVIEW: 1, RESOLVED: 1, CLOSED: 1 }
  });
}
