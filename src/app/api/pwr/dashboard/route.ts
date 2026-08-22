import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrWorkLogs } from '@/db/schema';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';
import { getTodayVN, TERMINAL_STATUSES, WAITING_ALERT_DAYS } from '@/lib/pwr/constants';

export async function GET(request: Request) {
  const authResult = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const todayVN  = getTodayVN();
    const nowUTC   = new Date();
    // Start/end of today in VN time expressed as UTC
    const startOfDayVN = new Date(nowUTC.getTime() - ((nowUTC.getUTCHours() - 7 + 24) % 24) * 60 * 60 * 1000);
    startOfDayVN.setUTCHours(startOfDayVN.getUTCHours() - startOfDayVN.getUTCHours() % 24);
    // Simpler: build from VN midnight
    const [y, m, d] = todayVN.split('-').map(Number);
    const dayStartVN = new Date(Date.UTC(y, m - 1, d, -7, 0, 0, 0)); // midnight VN = 17:00 prev day UTC
    const dayEndVN   = new Date(dayStartVN.getTime() + 24 * 60 * 60 * 1000 - 1);

    // All non-deleted tasks
    const allTasks = await db.select().from(pwrTasks)
      .where(and(eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));

    // Today's work logs
    const todayLogs = await db.select().from(pwrWorkLogs)
      .where(and(
        eq(pwrWorkLogs.userId, session.id),
        gte(pwrWorkLogs.createdAt, dayStartVN),
        lte(pwrWorkLogs.createdAt, dayEndVN),
      ));

    // Tasks done today
    const doneTodayTasks = allTasks.filter(t =>
      t.completedAt &&
      new Date(t.completedAt) >= dayStartVN &&
      new Date(t.completedAt) <= dayEndVN
    );

    // Active tasks
    const activeTasks = allTasks.filter(t => !TERMINAL_STATUSES.includes(t.status as any));

    // Overdue
    const overdueTasks = activeTasks.filter(t => t.dueDate && t.dueDate < todayVN);

    // WAITING > WAITING_ALERT_DAYS
    const waitingAlertDate = new Date(Date.now() - WAITING_ALERT_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const longWaitingTasks = allTasks.filter(t =>
      t.status === 'WAITING' &&
      t.updatedAt &&
      new Date(t.updatedAt).toISOString().split('T')[0] <= waitingAlertDate
    );

    // Today's todo/in-progress
    const todayFocus = activeTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'TODO');

    const stats = {
      total:      allTasks.filter(t => !TERMINAL_STATUSES.includes(t.status as any)).length,
      inProgress: activeTasks.filter(t => t.status === 'IN_PROGRESS').length,
      waiting:    activeTasks.filter(t => t.status === 'WAITING').length,
      overdue:    overdueTasks.length,
      doneToday:  doneTodayTasks.length,
      inbox:      activeTasks.filter(t => t.status === 'INBOX').length,
    };

    return NextResponse.json({
      todayVN,
      stats,
      todayFocus,
      doneTodayTasks,
      overdueTasks,
      longWaitingTasks,
      workLogCountToday: todayLogs.filter(l => !l.isSystemLog).length,
    });
  } catch (error) {
    console.error('[GET /api/pwr/dashboard]', error);
    return NextResponse.json({ error: 'Không thể tải dashboard' }, { status: 500 });
  }
}
