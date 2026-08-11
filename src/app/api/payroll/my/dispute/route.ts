// src/app/api/payroll/my/dispute/route.ts
// POST /api/payroll/my/dispute
// Body: { payrollId: number, reason: string }
// ──────────────────────────────────────────────────────────────────────────────
// Cho phép nhân viên gửi khiếu nại về phiếu lương.
// SECURITY (TẦNG 5): Cross-reference verification — xác minh payrollId
//   thuộc về session.id trước khi INSERT vào payslip_disputes.
// ──────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }        from 'next/server';
import { db }                               from '@/db';
import { monthlyPayroll, payslipDisputes }  from '@/db/schema';
import { requireAuth, ALL_ROLES }           from '@/lib/auth';
import { eq, and }                          from 'drizzle-orm';

const MAX_REASON_LEN = 1000;

export async function POST(req: NextRequest) {
  // SECURITY: Nhân viên không truyền employeeId — server tự lấy từ JWT
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const empId = session.id;
  const body  = await req.json().catch(() => ({}));
  const { payrollId, reason } = body as { payrollId: number; reason: string };

  // ── Input validation ────────────────────────────────────────────────────────
  if (!payrollId || typeof payrollId !== 'number') {
    return NextResponse.json({ error: 'payrollId không hợp lệ' }, { status: 400 });
  }
  if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
    return NextResponse.json({ error: 'Lý do khiếu nại cần ít nhất 10 ký tự' }, { status: 400 });
  }
  const sanitizedReason = reason.trim().slice(0, MAX_REASON_LEN);

  // ── TẦNG 5: Cross-reference verification ────────────────────────────────────
  // Xác minh payrollId thuộc về session.id VÀ đang PUBLISHED
  // (Nhân viên không thể gửi khiếu nại giả cho phiếu lương của người khác)
  const [payroll] = await db
    .select({ id: monthlyPayroll.id, month: monthlyPayroll.month, year: monthlyPayroll.year })
    .from(monthlyPayroll)
    .where(
      and(
        eq(monthlyPayroll.id,         payrollId),
        eq(monthlyPayroll.employeeId, empId),           // ← SECURITY GATE
        eq(monthlyPayroll.status,     'PUBLISHED'),     // ← Chỉ khiếu nại PUBLISHED
      )
    );

  if (!payroll) {
    // Trả 404 thay vì 403 để không lộ rằng payrollId tồn tại nhưng không phải của họ
    return NextResponse.json(
      { error: 'Phiếu lương không tìm thấy hoặc chưa được công bố' },
      { status: 404 }
    );
  }

  // ── Kiểm tra đã có khiếu nại OPEN/UNDER_REVIEW chưa ──────────────────────
  // Tránh spam: 1 phiếu lương chỉ có 1 khiếu nại đang mở tại 1 thời điểm
  const existing = await db
    .select({ id: payslipDisputes.id, status: payslipDisputes.status })
    .from(payslipDisputes)
    .where(
      and(
        eq(payslipDisputes.payrollId,  payrollId),
        eq(payslipDisputes.employeeId, empId),
      )
    );

  const activeDispute = existing.find(d => ['OPEN','UNDER_REVIEW'].includes(d.status));
  if (activeDispute) {
    return NextResponse.json(
      { error: 'Bạn đã có khiếu nại đang được xử lý cho phiếu lương này. Vui lòng chờ HR phản hồi.' },
      { status: 409 }
    );
  }

  // ── INSERT khiếu nại ────────────────────────────────────────────────────────
  const [created] = await db
    .insert(payslipDisputes)
    .values({
      payrollId,
      employeeId: empId,           // ← Luôn dùng session.id, không từ body
      month:      payroll.month,
      year:       payroll.year,
      reason:     sanitizedReason,
      status:     'OPEN',
    })
    .returning();

  return NextResponse.json({
    success:   true,
    message:   'Khiếu nại đã được gửi. HR sẽ xem xét và phản hồi trong 2-3 ngày làm việc.',
    disputeId: created.id,
    status:    'OPEN',
  }, { status: 201 });
}

// GET /api/payroll/my/dispute — Lấy danh sách khiếu nại của nhân viên
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const disputes = await db
    .select()
    .from(payslipDisputes)
    .where(eq(payslipDisputes.employeeId, session.id))  // ← SECURITY: session only
    .orderBy(payslipDisputes.createdAt);

  return NextResponse.json({ disputes });
}
