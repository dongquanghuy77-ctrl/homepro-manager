export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { getTodayVN } from '@/lib/hr';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;  // Return the actual error NextResponse

  try {
    const today = getTodayVN();

    const [record] = await db.select().from(attendance)
      .where(and(eq(attendance.employeeId, session.id), eq(attendance.workDate, today)));

    if (!record) {
      return NextResponse.json({
        hasCheckedIn:  false,
        hasCheckedOut: false,
        checkIn:       null,
        checkOut:      null,
        status:        null,
        lateMinutes:   0,
        totalHours:    0,
      });
    }

    return NextResponse.json({
      hasCheckedIn:  !!record.checkIn,
      hasCheckedOut: !!record.checkOut,
      checkIn:       record.checkIn,
      checkOut:      record.checkOut,
      status:        record.status,
      lateMinutes:   record.lateMinutes,
      totalHours:    record.totalHours,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
