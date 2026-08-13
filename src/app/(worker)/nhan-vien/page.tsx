import { db } from '@/db';
import { attendance, leaveBalances, leaveTypes, projects } from '@/db/schema';
import { getSession } from '@/lib/session';
import { getTodayVN } from '@/lib/hr';
import { eq, and, desc, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import EmployeeDashboardClient from '@/components/worker/EmployeeDashboardClient';

export const metadata = {
  title: 'Cổng thông tin Nhân viên — HomePro',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmployeeDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const todayStr = getTodayVN();
  const currentYear = new Date().getFullYear();

  // Concurrency optimization: fetch all required tables at once on the server
  // to avoid serial roundtrips (under 1s page load speed)
  const [todayRecord, balances, history, allProjects] = await Promise.all([
    // 1. Today's attendance status
    db
      .select({
        id: attendance.id,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        totalHours: attendance.totalHours,
      })
      .from(attendance)
      .where(and(eq(attendance.employeeId, session.id), eq(attendance.workDate, todayStr)))
      .limit(1)
      .then(rows => rows[0] || null),

    // 2. Leave balances for current year (Resilient Fallback)
    db.select({
      id: leaveBalances.id,
      leaveTypeId: leaveBalances.leaveTypeId,
      totalDays: leaveBalances.totalDays,
      usedDays: leaveBalances.usedDays,
    })
    .from(leaveBalances)
    .where(and(eq(leaveBalances.employeeId, session.id), eq(leaveBalances.year, currentYear)))
    .then(rows => rows as any[])
    .catch(() => [] as any[]), // Fallback an toàn nếu bảng chưa được migrate

    // 3. Last 5 attendance records
    db
      .select({
        id: attendance.id,
        workDate: attendance.workDate,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        totalHours: attendance.totalHours,
      })
      .from(attendance)
      .where(eq(attendance.employeeId, session.id))
      .orderBy(desc(attendance.workDate))
      .limit(5),

    // 4. Projects list for daily report
    db
      .select({
        id: projects.id,
        name: projects.name,
        code: projects.code,
        manager: projects.manager,
      })
      .from(projects),
  ]);

  const { canWriteAttendance } = await import('@/lib/permissions/checker');
  const canEdit = await canWriteAttendance(session, session.id, session.departmentId ?? null);

  return (
    <EmployeeDashboardClient
      session={session}
      todayRecord={todayRecord}
      leaveBalances={balances}
      attendanceHistory={history}
      projects={allProjects}
      canEditAttendance={canEdit}
    />
  );
}
