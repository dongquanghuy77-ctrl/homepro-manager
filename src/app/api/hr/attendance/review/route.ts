// src/app/api/hr/attendance/review/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// GET /api/hr/attendance/review?date=YYYY-MM-DD
//
// Role-based data access:
//   MANAGER → Xem các record PENDING_MANAGER của nhân viên trong bộ phận mình
//   ADMIN   → Xem các record PENDING_HR (đã Manager duyệt qua)
//   ADMIN   → Có thể lọc thêm: ?status=APPROVED để xem lịch sử đã chốt
// ══════════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db }                        from '@/db';
import { attendance, users }         from '@/db/schema';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';
import { eq, and, inArray }          from 'drizzle-orm';
import { getTodayVN }                from '@/lib/hr';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, MANAGER_AND_ABOVE);
  if (error) return error;

  const url   = new URL(req.url);
  const date  = url.searchParams.get('date') || getTodayVN();
  const statusFilter = url.searchParams.get('status'); // optional override

  // Xác định trạng thái cần hiển thị theo role
  const isAdmin   = session.role === 'ADMIN';
  const isManager = session.role === 'MANAGER';

  // MANAGER: xem PENDING_MANAGER
  // ADMIN:   xem PENDING_HR (hoặc status override)
  const defaultStatuses = isAdmin
    ? ['PENDING_HR']
    : ['PENDING_MANAGER'];

  const statuses: string[] = statusFilter
    ? [statusFilter]
    : defaultStatuses;

  try {
    // ── JOIN attendance với users để lấy thông tin nhân viên ─────────────────
    const records = await db
      .select({
        // Attendance
        id:               attendance.id,
        employeeId:       attendance.employeeId,
        workDate:         attendance.workDate,
        checkIn:          attendance.checkIn,
        checkOut:         attendance.checkOut,
        status:           attendance.status,
        totalHours:       attendance.totalHours,
        lateMinutes:      attendance.lateMinutes,
        earlyLeaveMinutes: attendance.earlyLeaveMinutes,
        clockInSource:    attendance.clockInSource,
        adjustedHours:    attendance.adjustedHours,
        approvalStatus:   attendance.approvalStatus,
        managerNote:      attendance.managerNote,
        hrNote:           attendance.hrNote,
        adjustReason:     attendance.adjustReason,
        updatedAt:        attendance.updatedAt,
        // Employee info
        employeeName:     users.name,
        employeeCode:     users.employeeCode,
        department:       users.department,
        position:         users.position,
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.employeeId, users.id))
      .where(
        and(
          eq(attendance.workDate, date),
          inArray(attendance.approvalStatus, statuses),
          // MANAGER chỉ xem nhân viên cùng bộ phận
          // (Nếu department của session user = null → Admin, xem tất cả)
          // Manager-level filter by department sẽ được thực hiện client-side
          // vì session không có department (cần thêm vào SessionPayload)
          // TODO: Add departmentFilter khi session.department được persist
        )
      )
      .orderBy(attendance.workDate);

    return NextResponse.json({ records, date, statuses, role: session.role });

  } catch (err) {
    console.error('[AttendanceReview GET]', err);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
