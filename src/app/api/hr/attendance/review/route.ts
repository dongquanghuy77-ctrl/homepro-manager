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
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { eq, and, inArray }          from 'drizzle-orm';
import { getTodayVN }                from '@/lib/hr';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const { getAttendanceApprovalLevel } = await import('@/lib/permissions/checker');
  const approvalLevel = await getAttendanceApprovalLevel(session);
  if (approvalLevel === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url   = new URL(req.url);
  const date  = url.searchParams.get('date') || getTodayVN();
  const statusFilter = url.searchParams.get('status'); // optional override

  const isAdmin   = approvalLevel === 2;
  const isManager = approvalLevel === 1;

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
          isManager && session.departmentId ? eq(users.departmentId, session.departmentId) : undefined
        )
      )
      .orderBy(attendance.workDate);

    return NextResponse.json({ records, date, statuses });

  } catch (err) {
    console.error('[AttendanceReview GET]', err);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
