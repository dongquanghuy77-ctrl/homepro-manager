import { db } from '@/db';
import { pwrTasks, pwrWorkLogs } from '@/db/schema';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { getTodayVN, TERMINAL_STATUSES } from './constants';
import type { PwrTask, PwrWorkLog } from '@/db/schema';

// ============================================================
// HELPERS
// ============================================================

/** Get VN midnight boundaries for a YYYY-MM-DD date */
function dayBounds(yyyyMmDd: string): { start: Date; end: Date } {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, -7, 0, 0, 0));   // 00:00 VN = 17:00 prev UTC
  const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/** ISO week number (Mon=1, Sun=7) and year */
function getISOWeek(dateStr: string): { week: number; year: number; mon: string; sun: string } {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  const day = d.getUTCDay() || 7;                    // 1=Mon … 7=Sun
  d.setUTCDate(d.getUTCDate() + 4 - day);            // Thursday of ISO week
  const year = d.getUTCFullYear();
  const weekStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - weekStart.getTime()) / 86400000 + 1) / 7);

  // Monday of the week
  const mon = new Date(dateStr + 'T00:00:00+07:00');
  mon.setUTCDate(mon.getUTCDate() - (mon.getUTCDay() || 7) + 1);
  const monStr = mon.toISOString().split('T')[0];
  const sunStr = new Date(mon.getTime() + 6 * 86400000).toISOString().split('T')[0];
  return { week, year, mon: monStr, sun: sunStr };
}

// ============================================================
// DAILY REPORT
// ============================================================

export interface DailyReport {
  date:         string;
  done:         PwrTask[];
  inProgress:   PwrTask[];
  waiting:      PwrTask[];
  overdue:      PwrTask[];
  workLogs:     PwrWorkLog[];
  totalMinutes: number;
  summary: {
    doneCount:      number;
    logCount:       number;
    overdueCount:   number;
    waitingCount:   number;
    inProgressCount: number;
  };
}

export async function buildDailyReport(userId: number, date?: string): Promise<DailyReport> {
  const reportDate = date || getTodayVN();
  const { start, end } = dayBounds(reportDate);

  const allTasks = await db.select().from(pwrTasks)
    .where(and(eq(pwrTasks.userId, userId), isNull(pwrTasks.deletedAt)));

  const dayLogs = await db.select().from(pwrWorkLogs)
    .where(and(
      eq(pwrWorkLogs.userId, userId),
      gte(pwrWorkLogs.createdAt, start),
      lte(pwrWorkLogs.createdAt, end),
    ));

  const done       = allTasks.filter(t => t.status === 'DONE' && t.completedAt && new Date(t.completedAt) >= start && new Date(t.completedAt) <= end);
  const inProgress = allTasks.filter(t => t.status === 'IN_PROGRESS');
  const waiting    = allTasks.filter(t => t.status === 'WAITING');
  const overdue    = allTasks.filter(t => !TERMINAL_STATUSES.includes(t.status as any) && t.dueDate && t.dueDate < reportDate);
  const userLogs   = dayLogs.filter(l => !l.isSystemLog);
  const totalMin   = userLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);

  return {
    date:       reportDate,
    done,
    inProgress,
    waiting,
    overdue,
    workLogs:   dayLogs,
    totalMinutes: totalMin,
    summary: {
      doneCount:       done.length,
      logCount:        userLogs.length,
      overdueCount:    overdue.length,
      waitingCount:    waiting.length,
      inProgressCount: inProgress.length,
    },
  };
}

// ============================================================
// WEEKLY REPORT (ISO week, starts Monday)
// ============================================================

export interface WeeklyReport {
  week:         number;
  year:         number;
  mon:          string;
  sun:          string;
  doneThisWeek: PwrTask[];
  createdThisWeek: PwrTask[];
  stillActive:  PwrTask[];
  overdue:      PwrTask[];
  workLogs:     PwrWorkLog[];
  totalMinutes: number;
  summary: {
    doneCount:    number;
    createdCount: number;
    activeCount:  number;
    overdueCount: number;
    logCount:     number;
  };
}

export async function buildWeeklyReport(userId: number, date?: string): Promise<WeeklyReport> {
  const refDate    = date || getTodayVN();
  const { week, year, mon, sun } = getISOWeek(refDate);
  const { start: weekStart } = dayBounds(mon);
  const { end:   weekEnd   } = dayBounds(sun);

  const allTasks = await db.select().from(pwrTasks)
    .where(and(eq(pwrTasks.userId, userId), isNull(pwrTasks.deletedAt)));

  const weekLogs = await db.select().from(pwrWorkLogs)
    .where(and(
      eq(pwrWorkLogs.userId, userId),
      gte(pwrWorkLogs.createdAt, weekStart),
      lte(pwrWorkLogs.createdAt, weekEnd),
    ));

  const doneThisWeek    = allTasks.filter(t => t.status === 'DONE' && t.completedAt && new Date(t.completedAt) >= weekStart && new Date(t.completedAt) <= weekEnd);
  const createdThisWeek = allTasks.filter(t => t.createdAt && new Date(t.createdAt) >= weekStart && new Date(t.createdAt) <= weekEnd);
  const stillActive     = allTasks.filter(t => !TERMINAL_STATUSES.includes(t.status as any));
  const overdue         = stillActive.filter(t => t.dueDate && t.dueDate < refDate);
  const userLogs        = weekLogs.filter(l => !l.isSystemLog);
  const totalMin        = userLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);

  return {
    week, year, mon, sun,
    doneThisWeek,
    createdThisWeek,
    stillActive,
    overdue,
    workLogs:     weekLogs,
    totalMinutes: totalMin,
    summary: {
      doneCount:    doneThisWeek.length,
      createdCount: createdThisWeek.length,
      activeCount:  stillActive.length,
      overdueCount: overdue.length,
      logCount:     userLogs.length,
    },
  };
}

// ============================================================
// MONTHLY REPORT
// ============================================================

export interface MonthlyReport {
  year:         number;
  month:        number;
  monthLabel:   string;
  doneThisMonth: PwrTask[];
  createdThisMonth: PwrTask[];
  stillActive:  PwrTask[];
  overdue:      PwrTask[];
  workLogs:     PwrWorkLog[];
  totalMinutes: number;
  categoryBreakdown: Record<string, number>;
  summary: {
    doneCount:    number;
    createdCount: number;
    activeCount:  number;
    overdueCount: number;
    logCount:     number;
    totalHours:   number;
  };
}

export async function buildMonthlyReport(userId: number, date?: string): Promise<MonthlyReport> {
  const refDate = date || getTodayVN();
  const [y, m]  = refDate.split('-').map(Number);
  const { start: monthStart } = dayBounds(`${y}-${String(m).padStart(2,'0')}-01`);
  const lastDay  = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const { end: monthEnd } = dayBounds(`${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`);

  const allTasks = await db.select().from(pwrTasks)
    .where(and(eq(pwrTasks.userId, userId), isNull(pwrTasks.deletedAt)));

  const monthLogs = await db.select().from(pwrWorkLogs)
    .where(and(
      eq(pwrWorkLogs.userId, userId),
      gte(pwrWorkLogs.createdAt, monthStart),
      lte(pwrWorkLogs.createdAt, monthEnd),
    ));

  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

  const doneThisMonth    = allTasks.filter(t => t.status === 'DONE' && t.completedAt && new Date(t.completedAt) >= monthStart && new Date(t.completedAt) <= monthEnd);
  const createdThisMonth = allTasks.filter(t => t.createdAt && new Date(t.createdAt) >= monthStart && new Date(t.createdAt) <= monthEnd);
  const stillActive      = allTasks.filter(t => !TERMINAL_STATUSES.includes(t.status as any));
  const overdue          = stillActive.filter(t => t.dueDate && t.dueDate < refDate);
  const userLogs         = monthLogs.filter(l => !l.isSystemLog);
  const totalMin         = userLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);

  // Category breakdown of done tasks
  const categoryBreakdown: Record<string, number> = {};
  for (const t of doneThisMonth) {
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + 1;
  }

  return {
    year: y, month: m,
    monthLabel: `${monthNames[m - 1]} ${y}`,
    doneThisMonth,
    createdThisMonth,
    stillActive,
    overdue,
    workLogs: monthLogs,
    totalMinutes: totalMin,
    categoryBreakdown,
    summary: {
      doneCount:    doneThisMonth.length,
      createdCount: createdThisMonth.length,
      activeCount:  stillActive.length,
      overdueCount: overdue.length,
      logCount:     userLogs.length,
      totalHours:   Math.round(totalMin / 60 * 10) / 10,
    },
  };
}
