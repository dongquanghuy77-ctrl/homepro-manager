export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance } from '@/db/schema';
import { requireAuth, ADMIN_ONLY } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { getWorkHours, calculateAttendanceStats, writeHrAuditLog } from '@/lib/hr';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ADMIN_ONLY);
  if (error || !session) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    const body = await req.json();
    let { checkIn, checkOut, note, status } = body;
    
    checkIn = checkIn ? new Date(checkIn) : null;
    checkOut = checkOut ? new Date(checkOut) : null;
    const now = new Date();

    const [oldRecord] = await db.select().from(attendance).where(eq(attendance.id, id));
    if (!oldRecord) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const { start, end } = await getWorkHours();
    const stats = calculateAttendanceStats(checkIn, checkOut, start, end);

    const [updatedRecord] = await db.update(attendance).set({
      checkIn,
      checkOut,
      note,
      status: status || stats.status,
      lateMinutes: stats.lateMinutes,
      earlyLeaveMinutes: stats.earlyLeaveMinutes,
      totalHours: stats.totalHours,
      correctedBy: session.id,
      correctedAt: now,
      updatedAt: now
    }).where(eq(attendance.id, id)).returning();

    await writeHrAuditLog({
      action: 'ATTENDANCE_CORRECTED',
      entityType: 'attendance',
      entityId: id,
      actorId: session.id,
      actorName: session.name,
      oldValue: oldRecord,
      newValue: updatedRecord,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json(updatedRecord);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
