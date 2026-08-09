export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, attendance, leaveRequests, overtimeRequests } from '@/db/schema';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import { getTodayVN } from '@/lib/hr';
import { eq, and, or, sql, lte, gte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth(req, ADMIN_OR_MANAGER);
    if (error) return error;
    
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getTodayVN();
    const department = searchParams.get('department');

    let userConds: any[] = [];
    if (department) userConds.push(eq(users.department, department));

    // Get total employees
    const [userRes] = await db.select({ count: sql<number>`count(*)` }).from(users)
      .where(userConds.length ? and(...userConds) : undefined);
    const totalEmployees = Number(userRes?.count || 0);

    // Get present today (PRESENT or LATE)
    const presentRes = await db.select({ count: sql<number>`count(*)` })
      .from(attendance)
      .leftJoin(users, eq(attendance.employeeId, users.id))
      .where(
        and(
          eq(attendance.workDate, date),
          or(eq(attendance.status, 'PRESENT'), eq(attendance.status, 'LATE')),
          ...(userConds.length ? userConds : [])
        )
      );
    const presentToday = Number(presentRes[0]?.count || 0);

    // Get late today
    const lateRes = await db.select({ count: sql<number>`count(*)` })
      .from(attendance)
      .leftJoin(users, eq(attendance.employeeId, users.id))
      .where(
        and(
          eq(attendance.workDate, date),
          eq(attendance.status, 'LATE'),
          ...(userConds.length ? userConds : [])
        )
      );
    const lateToday = Number(lateRes[0]?.count || 0);

    // Get absent today
    const absentRes = await db.select({ count: sql<number>`count(*)` })
      .from(attendance)
      .leftJoin(users, eq(attendance.employeeId, users.id))
      .where(
        and(
          eq(attendance.workDate, date),
          eq(attendance.status, 'ABSENT'),
          ...(userConds.length ? userConds : [])
        )
      );
    const absentToday = Number(absentRes[0]?.count || 0);

    // Get checked in today (PRESENT, LATE) + ABSENT
    const attendanceRes = await db.select({ count: sql<number>`count(*)` })
      .from(attendance)
      .leftJoin(users, eq(attendance.employeeId, users.id))
      .where(
        and(
          eq(attendance.workDate, date),
          ...(userConds.length ? userConds : [])
        )
      );
    const checkedInToday = Number(attendanceRes[0]?.count || 0);
    const notCheckedIn = Math.max(0, totalEmployees - checkedInToday);

    // Get on leave (APPROVED, overlapping date)
    const leaveRes = await db.select({ count: sql<number>`count(*)` })
      .from(leaveRequests)
      .leftJoin(users, eq(leaveRequests.employeeId, users.id))
      .where(
        and(
          eq(leaveRequests.status, 'APPROVED'),
          lte(leaveRequests.startDate, date),
          gte(leaveRequests.endDate, date),
          ...(userConds.length ? userConds : [])
        )
      );
    const onLeave = Number(leaveRes[0]?.count || 0);

    // Get pending leave
    const pendingLeaveRes = await db.select({ count: sql<number>`count(*)` })
      .from(leaveRequests)
      .leftJoin(users, eq(leaveRequests.employeeId, users.id))
      .where(
        and(
          eq(leaveRequests.status, 'PENDING'),
          ...(userConds.length ? userConds : [])
        )
      );
    const pendingLeave = Number(pendingLeaveRes[0]?.count || 0);

    // Get pending overtime
    const pendingOvertimeRes = await db.select({ count: sql<number>`count(*)` })
      .from(overtimeRequests)
      .leftJoin(users, eq(overtimeRequests.employeeId, users.id))
      .where(
        and(
          eq(overtimeRequests.status, 'PENDING'),
          ...(userConds.length ? userConds : [])
        )
      );
    const pendingOvertime = Number(pendingOvertimeRes[0]?.count || 0);

    return NextResponse.json({
      totalEmployees,
      presentToday,
      lateToday,
      absentToday,
      notCheckedIn,
      onLeave,
      pendingLeave,
      pendingOvertime
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
