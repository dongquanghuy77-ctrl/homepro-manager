// src/app/api/hr/attendance/review/[id]/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/hr/attendance/review/:id
//
// 3 hành động:
//   APPROVE  → Manager: PENDING_MANAGER → PENDING_HR
//              HR:      PENDING_HR      → APPROVED
//   REJECT   → Bất kỳ cấp nào         → REJECTED
//   EDIT     → HR: điều chỉnh giờ công (adjustedHours + adjustReason)
//
// ══════════════════════════════════════════════════════════════════════════════
// THIẾT KẾ TRANSACTION VÀ ĐẢM BẢO TOÀN VẸN DỮ LIỆU:
//
//   VẤNTỀ: Nếu STATUS UPDATE thành công nhưng AUDIT LOG thất bại:
//   → Hệ thống có trạng thái mới (PENDING_HR) nhưng không có vết audit
//   → Không ai biết ai đã duyệt, khi nào, với dữ liệu gì
//   → Vi phạm nguyên tắc Traceability tuyệt đối
//
//   GIẢI PHÁP: db.transaction() — Wrap cả 2 operations trong 1 transaction:
//
//   await db.transaction(async (tx) => {
//     // Cả 2 dùng cùng tx object — cùng DB connection, cùng transaction context
//     await tx.update(attendance).set({approvalStatus}).where(eq(attendance.id, id))
//     await writeHrAuditLogInTx(tx, params)  // Không có try/catch → throw on error
//   });
//   // PostgreSQL: nếu bất kỳ statement nào throw → tự động ROLLBACK toàn bộ
//   // Kết quả: HOẶC cả 2 thành công, HOẶC không cái nào được persist
// ══════════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db }                        from '@/db';
import { attendance }                from '@/db/schema';
import { eq }                        from 'drizzle-orm';
import { requireAuth, MANAGER_AND_ABOVE, ADMIN_OR_HR } from '@/lib/auth';
import { writeHrAuditLogInTx }       from '@/lib/hr';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ReviewAction = 'APPROVE' | 'REJECT' | 'EDIT';

interface ReviewPayload {
  action:        ReviewAction;
  note?:         string;           // Ghi chú khi duyệt/từ chối
  adjustedHours?: number;          // Chỉ dùng khi action = EDIT
  adjustReason?:  string;          // Lý do điều chỉnh
}

// ─────────────────────────────────────────────────────────────────────────────
// State Machine: approval transitions hợp lệ theo role
// ─────────────────────────────────────────────────────────────────────────────
const VALID_TRANSITIONS: Record<string, Record<ReviewAction, string | null>> = {
  // Manager (MANAGER role)
  PENDING_MANAGER: {
    APPROVE: 'PENDING_HR',  // Chuyển lên HR
    REJECT:  'REJECTED',
    EDIT:    null,          // Manager không được EDIT (chỉ HR)
  },
  // HR (ADMIN role)
  PENDING_HR: {
    APPROVE: 'APPROVED',    // Chốt công
    REJECT:  'REJECTED',
    EDIT:    'PENDING_HR',  // Điều chỉnh và giữ nguyên stage
  },
  // Đã approved — chỉ ADMIN có thể reopen
  APPROVED: {
    APPROVE: null,
    REJECT:  'REJECTED',    // Rút approval
    EDIT:    'PENDING_HR',  // Sửa và gửi lại HR
  },
  // Rejected — có thể reopen
  REJECTED: {
    APPROVE: null,
    REJECT:  null,
    EDIT:    'PENDING_MANAGER',  // Admin reopen về đầu
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH Handler
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  req:     NextRequest,
  { params }: { params: { id: string } }
) {
  // Cả MANAGER và ADMIN đều có thể gọi endpoint này
  const { session, error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  const recordId = parseInt(params.id, 10);
  if (isNaN(recordId)) {
    return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
  }

  // Parse body
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 }); }

  const { action, note, adjustedHours, adjustReason } = body as ReviewPayload;

  if (!['APPROVE', 'REJECT', 'EDIT'].includes(action)) {
    return NextResponse.json({ error: 'action không hợp lệ' }, { status: 400 });
  }

  // EDIT chỉ dành cho ADMIN (HR)
  if (action === 'EDIT' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ HR mới được điều chỉnh giờ công' }, { status: 403 });
  }

  // EDIT bắt buộc có adjustedHours
  if (action === 'EDIT') {
    if (typeof adjustedHours !== 'number' || adjustedHours < 0 || adjustedHours > 24) {
      return NextResponse.json({ error: 'adjustedHours phải là số từ 0 đến 24' }, { status: 400 });
    }
    if (!adjustReason?.trim()) {
      return NextResponse.json({ error: 'Phải ghi lý do điều chỉnh' }, { status: 400 });
    }
  }

  try {
    // ── Lấy record hiện tại ─────────────────────────────────────────────────
    const [existing] = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, recordId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy bản ghi chấm công' }, { status: 404 });
    }

    const currentStatus = existing.approvalStatus;

    // ── Kiểm tra transition hợp lệ theo state machine ──────────────────────
    const transitions = VALID_TRANSITIONS[currentStatus];
    if (!transitions) {
      return NextResponse.json({ error: `Trạng thái "${currentStatus}" không hỗ trợ duyệt` }, { status: 422 });
    }

    const nextStatus = transitions[action];
    if (nextStatus === null) {
      return NextResponse.json({
        error: `Không thể thực hiện "${action}" từ trạng thái "${currentStatus}"`,
      }, { status: 422 });
    }

    // ── Kiểm tra quyền theo trạng thái ─────────────────────────────────────
    // Manager chỉ xử lý được PENDING_MANAGER
    if (session.role === 'MANAGER' && currentStatus !== 'PENDING_MANAGER') {
      return NextResponse.json({
        error: `Manager chỉ có thể duyệt bản ghi ở trạng thái PENDING_MANAGER (hiện tại: ${currentStatus})`,
      }, { status: 403 });
    }

    // ── Build update data theo action ────────────────────────────────────────
    const now = new Date();
    const isManager = session.role === 'MANAGER';
    const isAdmin   = session.role === 'ADMIN';

    const updateData: Partial<typeof attendance.$inferInsert> = {
      approvalStatus: nextStatus,
      updatedAt:      now,
    };

    if (isManager && (action === 'APPROVE' || action === 'REJECT')) {
      updateData.approvedByManager   = session.id;
      updateData.approvedByManagerAt = now;
      updateData.managerNote         = note ?? null;
    }

    if (isAdmin && (action === 'APPROVE' || action === 'REJECT')) {
      updateData.approvedByHr   = session.id;
      updateData.approvedByHrAt = now;
      updateData.hrNote         = note ?? null;
    }

    if (action === 'EDIT') {
      updateData.adjustedHours = adjustedHours;
      updateData.adjustReason  = adjustReason;
      updateData.approvedByHr   = session.id;
      updateData.approvedByHrAt = now;
      updateData.hrNote         = note ?? null;
    }

    // ════════════════════════════════════════════════════════════════════════
    // ATOMIC TRANSACTION: Status Update + Audit Log trong cùng transaction
    //
    // KHÔNG thể tách rời: nếu audit log fail, status phải rollback.
    // Dùng writeHrAuditLogInTx (không có try/catch) thay vì writeHrAuditLogAsync.
    // ════════════════════════════════════════════════════════════════════════
    const [updated] = await db.transaction(async (tx) => {
      // Statement 1: Cập nhật approval status
      const result = await tx
        .update(attendance)
        .set(updateData)
        .where(eq(attendance.id, recordId))
        .returning();

      // Statement 2: Ghi audit log (cùng tx → atomic)
      // Nếu lỗi → throw → PostgreSQL ROLLBACK cả 2 statements
      await writeHrAuditLogInTx(tx, {
        action:     `ATTENDANCE_${action}`,  // ATTENDANCE_APPROVE | ATTENDANCE_REJECT | ATTENDANCE_EDIT
        entityType: 'attendance',
        entityId:   recordId,
        actorId:    session.id,
        actorName:  session.name,
        oldValue:   {
          approvalStatus: currentStatus,
          totalHours:     existing.totalHours,
          adjustedHours:  existing.adjustedHours,
        },
        newValue:   {
          approvalStatus: nextStatus,
          totalHours:     existing.totalHours,
          adjustedHours:  action === 'EDIT' ? adjustedHours : existing.adjustedHours,
          note:           note,
          adjustReason:   adjustReason,
        },
      });

      return result;
    });
    // ════════════════════════════════════════════════════════════════════════
    // Tại đây: cả status update VÀ audit log đều đã commit thành công
    // HOẶC: cả 2 đã bị rollback (nếu có exception)
    // ════════════════════════════════════════════════════════════════════════

    const actionLabel = action === 'APPROVE' ? 'Duyệt' : action === 'REJECT' ? 'Từ chối' : 'Điều chỉnh';

    return NextResponse.json({
      record:  updated,
      message: `${actionLabel} thành công — Trạng thái: ${currentStatus} → ${nextStatus}`,
      _transaction: 'atomic', // Confirm transaction was used
    });

  } catch (err) {
    console.error('[AttendanceReview PATCH]', err);
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
