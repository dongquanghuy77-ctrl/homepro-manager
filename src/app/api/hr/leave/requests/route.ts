// src/app/api/hr/leave/requests/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// GET  /api/hr/leave/requests  — Danh sách đơn nghỉ (role-based)
// POST /api/hr/leave/requests  — NV tạo đơn xin nghỉ
// ══════════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }       from 'next/server';
import { db }                              from '@/db';
import { leaveRequests, leaveTypes, leaveBalances, users } from '@/db/schema';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';
import { eq, and, desc, gte, lte, or, sql } from 'drizzle-orm';
import {
  calcTotalLeaveDays,
  checkLeaveOverlap,
  getOrCreateLeaveBalance,
} from '@/lib/leave';
import { writeHrAuditLogInTx }             from '@/lib/hr';

// ─────────────────────────────────────────────────────────────────────────────
// GET — Danh sách đơn nghỉ
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const url    = new URL(req.url);
  const status = url.searchParams.get('status');      // filter by status
  const month  = url.searchParams.get('month');       // YYYY-MM
  const empId  = url.searchParams.get('employeeId');  // Admin/Manager: xem đơn của NV cụ thể

  const isAdmin   = session.role === 'ADMIN';
  const isManager = session.role === 'MANAGER';

  // Role-based filter:
  //   WORKER/VIEWER → chỉ xem đơn của mình
  //   MANAGER       → xem đơn PENDING của nhân viên dưới quyền + đơn của mình
  //   ADMIN         → xem tất cả
  const conditions = [];

  if (!isAdmin) {
    if (isManager) {
      // Manager: đơn của mình + đơn PENDING cần duyệt
      conditions.push(
        or(
          eq(leaveRequests.employeeId, session.id),
          or(
            eq(leaveRequests.status, 'PENDING'),
            eq(leaveRequests.status, 'PENDING_HR'),
          )
        )
      );
    } else {
      // Worker: chỉ đơn của mình
      conditions.push(eq(leaveRequests.employeeId, session.id));
    }
  }

  // Optional filters
  if (empId && (isAdmin || isManager)) {
    conditions.push(eq(leaveRequests.employeeId, parseInt(empId)));
  }
  if (status) {
    conditions.push(eq(leaveRequests.status, status));
  }
  if (month) {
    // Đơn có bất kỳ ngày nào trong tháng này
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    conditions.push(
      and(
        lte(leaveRequests.startDate, `${month}-${String(lastDay).padStart(2, '0')}`),
        gte(leaveRequests.endDate,   `${month}-01`),
      )
    );
  }

  const rows = await db
    .select({
      request:      leaveRequests,
      employeeName: users.name,
      employeeCode: users.employeeCode,
      department:   users.department,
      leaveTypeName: leaveTypes.name,
      payrollImpact: leaveTypes.payrollImpact,
    })
    .from(leaveRequests)
    .leftJoin(users,       eq(leaveRequests.employeeId,  users.id))
    .leftJoin(leaveTypes,  eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leaveRequests.createdAt))
    .limit(200);

  return NextResponse.json({ requests: rows });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Tạo đơn xin nghỉ
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 }); }

  const {
    leaveTypeId,
    startDate, endDate,
    period    = 'FULL_DAY',
    reason,
    attachmentUrl,
    // Admin/Manager có thể tạo đơn hộ nhân viên khác
    onBehalfOfEmployeeId,
  } = body as {
    leaveTypeId?: number; startDate: string; endDate: string;
    period?: string; reason: string; attachmentUrl?: string;
    onBehalfOfEmployeeId?: number;
  };

  // Validation cơ bản
  if (!startDate || !endDate || !reason?.trim()) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc: startDate, endDate, reason' }, { status: 400 });
  }
  if (startDate > endDate) {
    return NextResponse.json({ error: 'startDate phải trước hoặc bằng endDate' }, { status: 400 });
  }

  // Xác định employee: Worker chỉ được tạo đơn của mình
  const targetEmployeeId = (session.role === 'ADMIN' || session.role === 'MANAGER')
    && onBehalfOfEmployeeId
      ? onBehalfOfEmployeeId
      : session.id;

  // Tính số ngày
  const totalDays = calcTotalLeaveDays(
    startDate, endDate,
    period as 'FULL_DAY' | 'MORNING' | 'AFTERNOON'
  );

  if (totalDays <= 0) {
    return NextResponse.json({ error: 'Khoảng thời gian không có ngày làm việc nào (chỉ cuối tuần)' }, { status: 400 });
  }

  // ── Check overlap ────────────────────────────────────────────────────────
  const hasOverlap = await checkLeaveOverlap(targetEmployeeId, startDate, endDate);
  if (hasOverlap) {
    return NextResponse.json({
      error: 'Đã có đơn nghỉ phép trùng ngày. Vui lòng kiểm tra lại lịch nghỉ.',
    }, { status: 409 });
  }

  // ── Lấy thông tin loại phép ──────────────────────────────────────────────
  let leaveTypeRow: typeof leaveTypes.$inferSelect | null = null;
  let leaveCode = 'ANNUAL';

  if (leaveTypeId) {
    const [lt] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, leaveTypeId)).limit(1);
    if (!lt) return NextResponse.json({ error: 'Loại phép không tồn tại' }, { status: 400 });
    if (!lt.isActive) return NextResponse.json({ error: 'Loại phép này đã ngừng sử dụng' }, { status: 400 });
    leaveTypeRow = lt;
    leaveCode    = lt.code;
  }

  // ── Check quỹ phép (nếu có giới hạn) ────────────────────────────────────
  if (leaveTypeRow && leaveTypeRow.maxDaysPerYear !== null && leaveTypeRow.isPaid) {
    const year = new Date().getFullYear();
    const [balance] = await db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.employeeId,  targetEmployeeId),
          eq(leaveBalances.leaveTypeId, leaveTypeId!),
          eq(leaveBalances.year,        year),
        )
      )
      .limit(1);

    const totalEntitlement = (balance?.totalDays ?? leaveTypeRow.maxDaysPerYear) + (balance?.carryOverDays ?? 0);
    const alreadyUsed      = (balance?.usedDays ?? 0) + (balance?.pendingDays ?? 0);
    const remaining        = totalEntitlement - alreadyUsed;

    if (totalDays > remaining) {
      return NextResponse.json({
        error: `Quỹ phép không đủ. Còn lại: ${remaining} ngày, cần: ${totalDays} ngày.`,
        remaining,
        required: totalDays,
      }, { status: 422 });
    }
  }

  // ── Xác định số cấp duyệt ────────────────────────────────────────────────
  // Phép ốm ≤3 ngày: approvalLevels = 1 → tự động vào PENDING (1 cấp)
  // Phép năm, không lương: 2 cấp → PENDING → PENDING_HR → APPROVED
  const approvalLevels = leaveTypeRow?.approvalLevels ?? 2;
  const initialStatus  = 'PENDING';

  // ── Tạo đơn trong transaction + cập nhật pendingDays ────────────────────
  const year = new Date().getFullYear();

  const [newRequest] = await db.transaction(async (tx) => {
    // ① Insert đơn nghỉ
    const result = await tx.insert(leaveRequests).values({
      employeeId:   targetEmployeeId,
      leaveType:    leaveCode,
      leaveTypeId:  leaveTypeId ?? null,
      startDate, endDate,
      period,
      totalDays,
      reason,
      attachmentUrl: attachmentUrl ?? null,
      status:       initialStatus,
    }).returning();

    // ② Cập nhật pendingDays trong leaveBalances (nếu có loại phép)
    if (leaveTypeId && leaveTypeRow?.isPaid) {
      await getOrCreateLeaveBalance(
        tx, targetEmployeeId, leaveTypeId, year,
        leaveTypeRow.maxDaysPerYear ?? 12
      );
      // Dùng raw SQL để increment pendingDays một cách chắc chắn
      // tx.execute chấp nhận tagged template literals từ drizzle sql helper
      await tx.execute(
        sql`UPDATE leave_balances
            SET pending_days = pending_days + ${totalDays},
                updated_at   = NOW()
            WHERE employee_id   = ${targetEmployeeId}
              AND leave_type_id = ${leaveTypeId}
              AND year          = ${year}`
      );
    }

    // ③ Audit log
    await writeHrAuditLogInTx(tx, {
      action:     'LEAVE_REQUEST_CREATED',
      entityType: 'leave_request',
      entityId:   result[0].id,
      actorId:    session.id,
      actorName:  session.name,
      newValue:   { leaveType: leaveCode, startDate, endDate, totalDays, status: initialStatus },
    });

    return result;
  });

  return NextResponse.json({
    request: newRequest,
    message: `Đơn nghỉ phép đã được tạo thành công (${totalDays} ngày)`,
    approvalLevels,
  }, { status: 201 });
}
