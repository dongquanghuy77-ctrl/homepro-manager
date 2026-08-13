export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, users } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { getWorkHours, calculateAttendanceStats, writeHrAuditLog } from '@/lib/hr';
import { getEffectiveTeamMemberIds } from '@/lib/rbac';

// ── Shared update logic for PUT and PATCH ─────────────────────────────────────
async function updateAttendanceRecord(
  req: NextRequest,
  params: { id: string }
): Promise<NextResponse> {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    const body = await req.json();
    const { checkIn, checkOut, note, status, location, correctionReason } = body;

    const checkInDate  = checkIn  ? new Date(checkIn)  : null;
    const checkOutDate = checkOut ? new Date(checkOut) : null;
    const now          = new Date();

    const [oldRecord] = await db.select({
      id: attendance.id,
      employeeId: attendance.employeeId,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      note: attendance.note,
      location: attendance.location,
      status: attendance.status,
      lateMinutes: attendance.lateMinutes,
      earlyLeaveMinutes: attendance.earlyLeaveMinutes,
      totalHours: attendance.totalHours,
      correctionReason: attendance.correctionReason,
      departmentId: users.departmentId
    }).from(attendance).innerJoin(users, eq(attendance.employeeId, users.id)).where(eq(attendance.id, id));
    if (!oldRecord) {
      return NextResponse.json({ error: 'Không tìm thấy bản ghi chấm công' }, { status: 404 });
    }

    const { canWriteAttendance } = await import('@/lib/permissions/checker');
    if (!(await canWriteAttendance(session, oldRecord.employeeId, oldRecord.departmentId))) {
      return NextResponse.json({ error: 'Bạn không có quyền sửa bản ghi của nhân viên này' }, { status: 403 });
    }

    // Validate status nếu được cung cấp
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'NOT_CHECKED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `status không hợp lệ. Cho phép: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // Recalculate stats từ giờ check nếu được cung cấp
    let computedLateMinutes       = oldRecord.lateMinutes       ?? 0;
    let computedEarlyLeaveMinutes = oldRecord.earlyLeaveMinutes ?? 0;
    let computedTotalHours        = oldRecord.totalHours        ?? 0;
    let computedStatus            = status ?? oldRecord.status;

    if (checkInDate) {
      const { start, end, breakStart, breakEnd } = await getWorkHours();
      const stats = calculateAttendanceStats(
        checkInDate, checkOutDate,
        start, end,
        breakStart, breakEnd   // truyền giờ nghỉ trưa
      );
      computedLateMinutes       = stats.lateMinutes;
      computedEarlyLeaveMinutes = stats.earlyLeaveMinutes;
      computedTotalHours        = stats.totalHours;
      if (!status) computedStatus = stats.status;
    }

    const [updatedRecord] = await db.update(attendance).set({
      // Chỉ update các field được gửi lên, giữ nguyên nếu không gửi
      checkIn:           checkIn  !== undefined ? checkInDate  : oldRecord.checkIn,
      checkOut:          checkOut !== undefined ? checkOutDate : oldRecord.checkOut,
      note:              note     !== undefined ? (note?.trim() || null) : oldRecord.note,
      location:          location !== undefined ? (location?.trim() || null) : oldRecord.location,
      correctionReason:  correctionReason !== undefined ? (correctionReason?.trim() || null) : oldRecord.correctionReason,
      status:            computedStatus,
      lateMinutes:       computedLateMinutes,
      earlyLeaveMinutes: computedEarlyLeaveMinutes,
      totalHours:        computedTotalHours,
      correctedBy:       session.id,
      correctedAt:       now,
      updatedAt:         now,
    }).where(eq(attendance.id, id)).returning();

    await writeHrAuditLog({
      action:     'ATTENDANCE_CORRECTED',
      entityType: 'attendance',
      entityId:   id,
      actorId:    session.id,
      actorName:  session.name,
      oldValue:   { status: oldRecord.status, checkIn: oldRecord.checkIn, checkOut: oldRecord.checkOut, totalHours: oldRecord.totalHours, correctionReason: oldRecord.correctionReason },
      newValue:   { status: computedStatus, checkIn: checkInDate, checkOut: checkOutDate, totalHours: computedTotalHours, correctionReason: correctionReason !== undefined ? (correctionReason?.trim() || null) : oldRecord.correctionReason },
      ipAddress:  req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(updatedRecord);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT và PATCH đều dùng cùng logic update
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return updateAttendanceRecord(req, params);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return updateAttendanceRecord(req, params);
}
