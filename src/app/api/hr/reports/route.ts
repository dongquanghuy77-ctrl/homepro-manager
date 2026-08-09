import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, leaveRequests, overtimeRequests, users } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import { getTodayVN } from '@/lib/hr';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || getTodayVN();
    const endDate = searchParams.get('endDate') || getTodayVN();
    const department = searchParams.get('department');
    const employeeId = searchParams.get('employeeId');
    const format = searchParams.get('format'); // 'csv' for export

    // Get all active employees
    let empQuery = db.select({
      id: users.id,
      name: users.name,
      employeeCode: users.employeeCode,
      department: users.department,
      position: users.position,
    }).from(users).where(eq(users.active, true));

    const allEmployees = await empQuery;
    const filteredEmployees = allEmployees.filter((e) => {
      if (department && e.department !== department) return false;
      if (employeeId && String(e.id) !== employeeId) return false;
      return true;
    });

    const employeeIds = filteredEmployees.map((e) => e.id);

    // Get attendance in date range
    const attendanceRecords = employeeIds.length > 0
      ? await db.select().from(attendance)
          .where(and(gte(attendance.workDate, startDate), lte(attendance.workDate, endDate)))
      : [];

    // Get approved leaves in date range
    const leaveRecords = employeeIds.length > 0
      ? await db.select().from(leaveRequests)
          .where(and(
            eq(leaveRequests.status, 'APPROVED'),
            lte(leaveRequests.startDate, endDate),
            gte(leaveRequests.endDate, startDate)
          ))
      : [];

    // Get approved overtime in date range
    const overtimeRecords = employeeIds.length > 0
      ? await db.select().from(overtimeRequests)
          .where(and(
            eq(overtimeRequests.status, 'APPROVED'),
            gte(overtimeRequests.workDate, startDate),
            lte(overtimeRequests.workDate, endDate)
          ))
      : [];

    // Aggregate per employee
    const report = filteredEmployees.map((emp) => {
      const empAttendance = attendanceRecords.filter((a) => a.employeeId === emp.id);
      const empLeaves = leaveRecords.filter((l) => l.employeeId === emp.id);
      const empOvertime = overtimeRecords.filter((o) => o.employeeId === emp.id);

      const present = empAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
      const late = empAttendance.filter((a) => a.status === 'LATE').length;
      const absent = empAttendance.filter((a) => a.status === 'ABSENT').length;
      const totalHours = empAttendance.reduce((sum, a) => sum + (a.totalHours || 0), 0);
      const lateMinutesTotal = empAttendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
      const overtimeHours = empOvertime.reduce((sum, o) => sum + (o.totalHours || 0), 0);
      const leaveDays = empLeaves.reduce((sum, l) => sum + (l.totalDays || 0), 0);

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        presentDays: present,
        lateDays: late,
        absentDays: absent,
        leaveDays,
        totalWorkHours: Math.round(totalHours * 100) / 100,
        totalLateMinutes: lateMinutesTotal,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
      };
    });

    // CSV export
    if (format === 'csv') {
      const headers = [
        'Mã NV', 'Họ tên', 'Bộ phận', 'Chức vụ',
        'Ngày có mặt', 'Đi trễ (ngày)', 'Vắng', 'Nghỉ phép (ngày)',
        'Tổng giờ làm', 'Tổng trễ (phút)', 'Giờ tăng ca'
      ];
      const rows = report.map((r) => [
        r.employeeCode || '', r.name, r.department || '', r.position || '',
        r.presentDays, r.lateDays, r.absentDays, r.leaveDays,
        r.totalWorkHours, r.totalLateMinutes, r.overtimeHours,
      ]);
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
      return new NextResponse('\uFEFF' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="bao-cao-nhan-su-${startDate}-${endDate}.csv"`,
        },
      });
    }

    return NextResponse.json({
      report,
      meta: { startDate, endDate, totalEmployees: filteredEmployees.length },
    });
  } catch (err) {
    console.error('GET /api/hr/reports error:', err);
    return NextResponse.json({ error: 'Không thể tạo báo cáo' }, { status: 500 });
  }
}
