// src/app/api/hr/leave/requests/[id]/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/hr/leave/requests/:id — Approve | Reject | Cancel
//
// ══════════════════════════════════════════════════════════════════════════════
// LUỒNG DỮ LIỆU ATOMIC KHI APPROVE:
//
//   db.transaction(async (tx) => {
//     ① UPDATE leave_requests SET status = 'APPROVED'
//     ② LOOP mỗi workDate trong [startDate..endDate]:
//          INSERT INTO attendance (status='ON_LEAVE', leaveRequestId)
//          ON CONFLICT (idempotencyKey)
//          DO UPDATE SET status='ON_LEAVE', leaveRequestId, lateMinutes=0
//          → Ghi đè ABSENT hiện có → Rule Engine hiểu "nghỉ có phép"
//     ③ UPDATE leave_balances: usedDays += N, pendingDays -= N
//     ④ writeHrAuditLogInTx (cùng tx → atomic rollback)
//   })
// ══════════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }    from 'next/server';
import { db }                           from '@/db';
import { leaveRequests, leaveTypes, leaveBalances, attendance } from '@/db/schema';
import { requireAuth, MANAGER_AND_ABOVE, ALL_ROLES } from '@/lib/auth';
import { eq, and, sql }                 from 'drizzle-orm';
import { getWorkDaysBetween, getOrCreateLeaveBalance } from '@/lib/leave';
import { writeHrAuditLogInTx }          from '@/lib/hr';

type ReviewAction = 'APPROVE' | 'REJECT' | 'CANCEL';

// ─────────────────────────────────────────────────────────────────────────────
// State machine: valid transitions per (currentStatus, role, action)
// ─────────────────────────────────────────────────────────────────────────────
function getNextStatus(
  current: string, action: ReviewAction, role: string, approvalLevels: number
): string | null {
  if (action === 'CANCEL') {
    // NV có thể hủy đơn của mình (PENDING hoặc PENDING_HR trước khi ngày nghỉ)
    if (current === 'PENDING' || current === 'PENDING_HR') return 'CANCELLED';
    if (current === 'APPROVED') return 'CANCELLED'; // Admin/HR mới được hủy đơn đã duyệt
    return null;
  }

  if (action === 'REJECT') {
    if (current === 'PENDING' || current === 'PENDING_HR') return 'REJECTED';
    return null;
  }

  if (action === 'APPROVE') {
    if (current === 'PENDING') {
      // 1 cấp duyệt (ốm, bù, thai sản): Manager approve → APPROVED ngay
      if (approvalLevels === 1) return 'APPROVED';
      // 2 cấp: Manager → PENDING_HR
      if (role === 'MANAGER') return 'PENDING_HR';
      // Admin có thể approve thẳng từ PENDING
      if (role === 'ADMIN') return 'APPROVED';
    }
    if (current === 'PENDING_HR' && role === 'ADMIN') return 'APPROVED';
    return null;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  const requestId = parseInt(params.id, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 }); }

  const { action, note } = body as { action: ReviewAction; note?: string };

  if (!['APPROVE', 'REJECT', 'CANCEL'].includes(action)) {
    return NextResponse.json({ error: 'action phải là APPROVE | REJECT | CANCEL' }, { status: 400 });
  }

  // ── Lấy đơn nghỉ hiện tại ────────────────────────────────────────────────
  const [existing] = await db
    .select({
      request:       leaveRequests,
      approvalLevels: leaveTypes.approvalLevels,
      maxDaysPerYear: leaveTypes.maxDaysPerYear,
      isPaid:         leaveTypes.isPaid,
    })
    .from(leaveRequests)
    .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(eq(leaveRequests.id, requestId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Không tìm thấy đơn nghỉ phép' }, { status: 404 });
  }

  const req2 = existing.request;
  const approvalLevels = existing.approvalLevels ?? 2;

  // NV chỉ được CANCEL đơn của mình
  if (action === 'CANCEL' && req2.employeeId !== session.id && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ được hủy đơn của chính mình' }, { status: 403 });
  }

  // ── Xác định trạng thái tiếp theo ────────────────────────────────────────
  const nextStatus = getNextStatus(req2.status, action, session.role, approvalLevels);
  if (nextStatus === null) {
    return NextResponse.json({
      error: `Không thể thực hiện "${action}" từ trạng thái "${req2.status}"`,
    }, { status: 422 });
  }

  const now  = new Date();
  const year = new Date().getFullYear();
  const isApproved  = nextStatus === 'APPROVED';
  const isCancelled = nextStatus === 'CANCELLED';
  const isRejected  = nextStatus === 'REJECTED';

  try {
    const [updated] = await db.transaction(async (tx) => {
      // ════════════════════════════════════════════════════════════════════
      // ① UPDATE leave_requests
      // ════════════════════════════════════════════════════════════════════
      const updateData: Partial<typeof leaveRequests.$inferInsert> = {
        status:    nextStatus,
        updatedAt: now,
      };

      if (session.role === 'MANAGER' && action === 'APPROVE') {
        updateData.approvedByManager   = session.id;
        updateData.approvedByManagerAt = now;
        updateData.managerNote         = note ?? null;
        // Backwards compat
        updateData.reviewedBy = session.id;
        updateData.reviewedAt = now;
        updateData.reviewNote = note ?? null;
      }
      if (session.role === 'ADMIN' && action === 'APPROVE') {
        updateData.approvedByHr   = session.id;
        updateData.approvedByHrAt = now;
        updateData.hrNote         = note ?? null;
        updateData.reviewedBy     = session.id;
        updateData.reviewedAt     = now;
        updateData.reviewNote     = note ?? null;
      }
      if (action === 'REJECT') {
        updateData.reviewedBy = session.id;
        updateData.reviewedAt = now;
        updateData.reviewNote = note ?? null;
        if (session.role === 'MANAGER') updateData.managerNote = note ?? null;
        if (session.role === 'ADMIN')   updateData.hrNote      = note ?? null;
      }
      if (action === 'CANCEL') {
        updateData.cancelledAt  = now;
        updateData.cancelReason = note ?? null;
      }

      const result = await tx
        .update(leaveRequests)
        .set(updateData)
        .where(eq(leaveRequests.id, requestId))
        .returning();

      // ════════════════════════════════════════════════════════════════════
      // ② UPSERT ATTENDANCE → status='ON_LEAVE' (chỉ khi APPROVED)
      //    Đây là cơ chế kết nối với Rule Engine:
      //    attendance.status = 'ON_LEAVE' + attendance.leaveRequestId = id
      //    → calculateDailyAttendance() thấy ON_LEAVE → lateMinutes = 0
      //    → KPI dashboard count ON_LEAVE as "present" (excused absence)
      // ════════════════════════════════════════════════════════════════════
      if (isApproved) {
        const workDays = getWorkDaysBetween(req2.startDate, req2.endDate);

        for (const workDate of workDays) {
          const idempotencyKey = `${req2.employeeId}:${workDate}`;

          await tx
            .insert(attendance)
            .values({
              employeeId:     req2.employeeId,
              workDate,
              checkIn:        null,
              checkOut:       null,
              status:         'ON_LEAVE',
              lateMinutes:    0,
              earlyLeaveMinutes: 0,
              totalHours:     0,
              clockInSource:  'MANUAL',
              clockOutSource: 'MANUAL',
              approvalStatus: 'APPROVED',  // Auto-approved vì có đơn duyệt
              idempotencyKey,
              confirmSources: '[]',
              leaveRequestId: requestId,   // FK liên kết → traceability
              createdAt:      now,
              updatedAt:      now,
            })
            .onConflictDoUpdate({
              target: attendance.idempotencyKey,
              set: {
                // Ghi đè ABSENT → ON_LEAVE (đây là thay đổi quan trọng nhất!)
                status:         'ON_LEAVE',
                leaveRequestId: requestId,
                lateMinutes:    0,
                earlyLeaveMinutes: 0,
                approvalStatus: 'APPROVED',
                updatedAt:      now,
              },
            });
        }
      }

      // ── Reverse ON_LEAVE khi CANCEL đơn đã APPROVED ───────────────────
      if (isCancelled && req2.status === 'APPROVED') {
        const workDays = getWorkDaysBetween(req2.startDate, req2.endDate);
        for (const workDate of workDays) {
          const idempotencyKey = `${req2.employeeId}:${workDate}`;
          // Đặt lại thành ABSENT (để Rule Engine hoặc admin xử lý)
          await tx
            .update(attendance)
            .set({
              status:         'ABSENT',
              leaveRequestId: null,
              approvalStatus: 'PENDING_MANAGER',
              updatedAt:      now,
            })
            .where(eq(attendance.idempotencyKey, idempotencyKey));
        }
      }

      // ════════════════════════════════════════════════════════════════════
      // ③ CẬP NHẬT LEAVE BALANCES
      // ════════════════════════════════════════════════════════════════════
      if (req2.leaveTypeId && existing.isPaid) {
        const totalDays = req2.totalDays;

        if (isApproved) {
          // Đảm bảo balance tồn tại
          await getOrCreateLeaveBalance(
            tx, req2.employeeId, req2.leaveTypeId, year,
            existing.maxDaysPerYear ?? 12
          );
          // usedDays += totalDays, pendingDays -= totalDays
          await tx.execute(sql`
            UPDATE leave_balances
            SET used_days    = used_days    + ${totalDays},
                pending_days = GREATEST(0, pending_days - ${totalDays}),
                updated_at   = NOW()
            WHERE employee_id  = ${req2.employeeId}
              AND leave_type_id = ${req2.leaveTypeId}
              AND year          = ${year}
          `);
        }

        if (isRejected || isCancelled) {
          // Hoàn trả pendingDays
          await tx.execute(sql`
            UPDATE leave_balances
            SET pending_days = GREATEST(0, pending_days - ${totalDays}),
                ${isApproved ? sql`used_days = GREATEST(0, used_days - ${totalDays}),` : sql``}
                updated_at   = NOW()
            WHERE employee_id   = ${req2.employeeId}
              AND leave_type_id = ${req2.leaveTypeId}
              AND year          = ${year}
          `);
        }
      }

      // ════════════════════════════════════════════════════════════════════
      // ④ AUDIT LOG — cùng transaction → rollback nếu lỗi
      // ════════════════════════════════════════════════════════════════════
      await writeHrAuditLogInTx(tx, {
        action:     `LEAVE_${action}`,
        entityType: 'leave_request',
        entityId:   requestId,
        actorId:    session.id,
        actorName:  session.name,
        oldValue:   { status: req2.status, totalDays: req2.totalDays },
        newValue:   { status: nextStatus, note, attendanceSynced: isApproved },
      });

      return result;
    });

    const actionLabel = action === 'APPROVE' ? 'Duyệt' : action === 'REJECT' ? 'Từ chối' : 'Hủy';
    return NextResponse.json({
      request:      updated,
      message:      `${actionLabel} thành công — ${req2.status} → ${nextStatus}`,
      attendanceSynced: isApproved
        ? `${getWorkDaysBetween(req2.startDate, req2.endDate).length} ngày attendance đã được đánh dấu ON_LEAVE`
        : null,
      _transaction: 'atomic',
    });

  } catch (err) {
    console.error('[Leave Review PATCH]', err);
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
