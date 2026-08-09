export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { getTodayVN, getWorkHours, calculateAttendanceStats } from '@/lib/hr';

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error || !session) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  try {
    const today = getTodayVN();
    const now = new Date();

    const [existing] = await db.select().from(attendance)
      .where(and(eq(attendance.employeeId, session.id), eq(attendance.workDate, today)));

    if (!existing || !existing.checkIn) {
      return NextResponse.json({ error: 'Bạn chưa chấm công vào hôm nay' }, { status: 400 });
    }

    if (existing.checkOut) {
      const hhmm = existing.checkOut.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return NextResponse.json({ error: `Bạn đã chấm công ra lúc ${hhmm}` }, { status: 409 });
    }

    const { start, end } = await getWorkHours();
    const stats = calculateAttendanceStats(existing.checkIn, now, start, end);

    const [updatedRecord] = await db.update(attendance).set({
      checkOut: now,
      status: stats.status,
      lateMinutes: stats.lateMinutes,
      earlyLeaveMinutes: stats.earlyLeaveMinutes,
      totalHours: stats.totalHours,
      updatedAt: now
    }).where(eq(attendance.id, existing.id)).returning();

    return NextResponse.json(updatedRecord);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
