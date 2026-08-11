// src/app/api/hr/disputes/[id]/route.ts
// PATCH /api/hr/disputes/[id]  — HR review: đổi status + ghi hr_response
// GET   /api/hr/disputes/[id]  — Chi tiết 1 dispute
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }      from 'next/server';
import { db }                             from '@/db';
import { payslipDisputes, monthlyPayroll, users } from '@/db/schema';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';
import { eq }                             from 'drizzle-orm';

// State machine: các transition hợp lệ
const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN:         ['UNDER_REVIEW', 'RESOLVED', 'CLOSED'],
  UNDER_REVIEW: ['RESOLVED', 'CLOSED'],
  RESOLVED:     ['CLOSED'],   // Có thể đóng lại nếu cần
  CLOSED:       [],            // Terminal state
};

// ─────────────────────────────────────────────────────────────────────────────
// GET: Chi tiết 1 dispute (kèm lineItems của payroll để HR đối chiếu)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  const [row] = await db
    .select({
      id:           payslipDisputes.id,
      payrollId:    payslipDisputes.payrollId,
      employeeId:   payslipDisputes.employeeId,
      month:        payslipDisputes.month,
      year:         payslipDisputes.year,
      reason:       payslipDisputes.reason,
      status:       payslipDisputes.status,
      hrResponse:   payslipDisputes.hrResponse,
      reviewedBy:   payslipDisputes.reviewedBy,
      reviewedAt:   payslipDisputes.reviewedAt,
      createdAt:    payslipDisputes.createdAt,
      employeeName: users.name,
      employeeCode: users.employeeCode,
      dept:         users.department,
      // Toàn bộ chi tiết payroll để HR đối chiếu
      netSalary:       monthlyPayroll.netSalary,
      grossEarnings:   monthlyPayroll.grossEarnings,
      totalDeductions: monthlyPayroll.totalDeductions,
      lineItemsJson:   monthlyPayroll.lineItemsJson,
      regularWorkedDays: monthlyPayroll.regularWorkedDays,
      eveningOtHours:  monthlyPayroll.eveningOtHours,
      nightOtHours:    monthlyPayroll.nightOtHours,
      totalLateEarlyMins: monthlyPayroll.totalLateEarlyMins,
      attendanceAllowance: monthlyPayroll.attendanceAllowance,
    })
    .from(payslipDisputes)
    .innerJoin(users,          eq(payslipDisputes.employeeId, users.id))
    .innerJoin(monthlyPayroll, eq(payslipDisputes.payrollId,  monthlyPayroll.id))
    .where(eq(payslipDisputes.id, id));

  if (!row) return NextResponse.json({ error: 'Không tìm thấy khiếu nại' }, { status: 404 });

  return NextResponse.json(row);
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH: HR xử lý dispute — đổi status + ghi phản hồi
// Body: { status: 'UNDER_REVIEW'|'RESOLVED'|'CLOSED', hrResponse?: string }
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  const body = await req.json().catch(() => ({})) as { status?: string; hrResponse?: string };
  const newStatus  = body.status?.trim();
  const hrResponse = body.hrResponse?.trim().slice(0, 2000) ?? undefined;

  if (!newStatus) return NextResponse.json({ error: 'Thiếu trường status' }, { status: 400 });

  // Lấy dispute hiện tại
  const [dispute] = await db
    .select({ status: payslipDisputes.status })
    .from(payslipDisputes)
    .where(eq(payslipDisputes.id, id));

  if (!dispute) return NextResponse.json({ error: 'Không tìm thấy khiếu nại' }, { status: 404 });

  // Kiểm tra state machine
  const allowed = VALID_TRANSITIONS[dispute.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Không thể chuyển từ ${dispute.status} → ${newStatus}. Trạng thái cho phép: ${allowed.join(', ') || 'không có'}` },
      { status: 400 }
    );
  }

  // RESOLVED/CLOSED bắt buộc phải có hr_response
  if ((newStatus === 'RESOLVED' || newStatus === 'CLOSED') && !hrResponse) {
    return NextResponse.json(
      { error: 'Vui lòng điền phản hồi của HR trước khi đóng/giải quyết khiếu nại' },
      { status: 400 }
    );
  }

  const now = new Date();
  const [updated] = await db
    .update(payslipDisputes)
    .set({
      status:      newStatus,
      hrResponse:  hrResponse ?? undefined,
      reviewedBy:  session.id,
      reviewedAt:  now,
      updatedAt:   now,
    })
    .where(eq(payslipDisputes.id, id))
    .returning();

  return NextResponse.json({
    ...updated,
    message: `✅ Đã cập nhật: ${dispute.status} → ${newStatus}`,
  });
}
