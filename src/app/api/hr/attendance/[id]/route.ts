export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance } from '@/db/schema';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { getWorkHours, calculateAttendanceStats, writeHrAuditLog } from '@/lib/hr';

// ── Shared update logic for PUT and PATCH ─────────────────────────────────────
async function updateAttendanceRecord(
  req: NextRequest,
  params: { id: string }
): Promise<NextResponse> {
  const { session, error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    const body = await req.json();
    const { checkIn, checkOut, note, status, location } = body;

    const checkInDate  = checkIn  ? new Date(checkIn)  : null;
    const checkOutDate = checkOut ? new Date(checkOut) : null;
    const now          = new Date();

    const [oldRecord] = await db.select().from(attendance).where(eq(attendance.id, id));
    if (!oldRecord) {
      return NextResponse.json({ error: 'Không tìm thấy bản ghi chấm công' }, { status: 404 });
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
      oldValue:   { status: oldRecord.status, checkIn: oldRecord.checkIn, checkOut: oldRecord.checkOut },
      newValue:   { status: computedStatus, checkIn: checkInDate, checkOut: checkOutDate },
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
