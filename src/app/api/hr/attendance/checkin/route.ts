export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { getTodayVN, getWorkHours, calculateAttendanceStats } from '@/lib/hr';
import { createSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  try {
    const today = getTodayVN();
    const now = new Date();

    const body = await req.json().catch(() => ({}));
    const { location } = body;

    const [existing] = await db.select().from(attendance)
      .where(and(eq(attendance.employeeId, session.id), eq(attendance.workDate, today)));

    if (existing && existing.checkIn) {
      const hhmm = existing.checkIn.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return NextResponse.json({ error: `Bạn đã chấm công vào lúc ${hhmm}` }, { status: 409 });
    }

    const { start, end } = await getWorkHours();
    const stats = calculateAttendanceStats(now, null, start, end);

    const recordData = {
      employeeId:        session.id,
      workDate:          today,
      checkIn:           now,
      status:            stats.status,
      lateMinutes:       stats.lateMinutes,
      earlyLeaveMinutes: stats.earlyLeaveMinutes,
      totalHours:        stats.totalHours,
      location:          location ? String(location).trim() : null,
      createdAt:         now,
      updatedAt:         now,
    };

    let newRecord;
    if (existing) {
      [newRecord] = await db.update(attendance).set(recordData).where(eq(attendance.id, existing.id)).returning();
    } else {
      [newRecord] = await db.insert(attendance).values(recordData).returning();
    }

    // INVALIDATE & REFRESH SESSION JWT
    // So that middleware knows the user has checked in today
    await createSession({
      id: session.id,
      username: session.username,
      name: session.name,
      role: session.role,
      departmentId: session.departmentId,
      originalRole: session.originalRole,
      requirePasswordChange: session.requirePasswordChange,
      lastAttendanceDate: today
    });

    return NextResponse.json(newRecord);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
