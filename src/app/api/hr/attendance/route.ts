export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { attendance, users } from '@/db/schema';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import { eq, and, desc, like } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employeeId');
    const department = searchParams.get('department');
    const month = searchParams.get('month');

    const conditions = [];
    if (date) conditions.push(eq(attendance.workDate, date));
    if (employeeId) conditions.push(eq(attendance.employeeId, parseInt(employeeId)));
    if (department) conditions.push(eq(users.department, department));
    if (month) conditions.push(like(attendance.workDate, `${month}-%`));

    const records = await db
      .select({
        id: attendance.id,
        employeeId: attendance.employeeId,
        workDate: attendance.workDate,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
        earlyLeaveMinutes: attendance.earlyLeaveMinutes,
        totalHours: attendance.totalHours,
        note: attendance.note,
        employeeName: users.name,
        employeeCode: users.employeeCode,
        department: users.department
      })
      .from(attendance)
      .leftJoin(users, eq(attendance.employeeId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(attendance.workDate), desc(attendance.checkIn));

    return NextResponse.json(records);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
