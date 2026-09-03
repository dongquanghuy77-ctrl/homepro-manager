import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrWorkLogs, users, pwrUserStats } from '@/db/schema';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import { isNull, sql, desc, gte, and, eq, isNotNull } from 'drizzle-orm';

const MANAGER_ROLES = ['ADMIN', 'MANAGER', 'HR'];

import { pwrScrapRequests } from '@/db/schema';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, MANAGER_ROLES);
  if (auth.error) return auth.error;

  try {
    // Timezone VN: UTC+7
    const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
    const todayStr = nowVN.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayStartUTC = new Date(Date.UTC(
      parseInt(todayStr.split('-')[0]),
      parseInt(todayStr.split('-')[1]) - 1,
      parseInt(todayStr.split('-')[2]),
      -7, 0, 0, 0  // midnight VN = 17:00 prev UTC
    ));

    // 1. T?ng task theo tr?m (aggregate to�n b?, kh�ng filter userId)
    const stationStats = await db.execute(sql`
      SELECT
        COALESCE(station_team, 'INBOX') AS station,
        COUNT(*) FILTER (WHERE status NOT IN ('DONE','CANCELLED') AND deleted_at IS NULL) AS active,
        COUNT(*) FILTER (WHERE status = 'DONE' AND deleted_at IS NULL) AS done,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS' AND deleted_at IS NULL) AS in_progress
      FROM pwr_tasks
      GROUP BY COALESCE(station_team, 'INBOX')
      ORDER BY station
    `);

    // 2. Worker active h�m nay (c� �t nh?t 1 task done h�m nay)
    const activeWorkers = await db.execute(sql`
      SELECT DISTINCT u.id, u.name, u.phone,
        COUNT(t.id) FILTER (WHERE t.status = 'DONE') AS tasks_done_today
      FROM users u
      JOIN pwr_tasks t ON t.completed_by = u.id
        AND t.completed_at >= ${dayStartUTC}
      WHERE u.role = 'WORKER'
      GROUP BY u.id, u.name, u.phone
      ORDER BY tasks_done_today DESC
    `);

    // 3. T?ng task done h�m nay
    const doneTodayResult = await db.execute(sql`
      SELECT COUNT(*) AS count FROM pwr_tasks
      WHERE status = 'DONE' AND completed_at >= ${dayStartUTC} AND deleted_at IS NULL
    `);
    const doneToday = parseInt((doneTodayResult.rows?.[0] as any)?.count ?? '0');

    // 4. T?ng task dang ch?/active
    const pendingResult = await db.execute(sql`
      SELECT COUNT(*) AS count FROM pwr_tasks
      WHERE status NOT IN ('DONE','CANCELLED') AND deleted_at IS NULL
    `);
    const totalPending = parseInt((pendingResult.rows?.[0] as any)?.count ?? '0');

    // 5. Defects h�m nay
    const defectsResult = await db.execute(sql`
      SELECT COUNT(*) AS count FROM pwr_work_logs
      WHERE log_type = 'ISSUE_LOG' AND created_at >= ${dayStartUTC}
    `);
    const defectsToday = parseInt((defectsResult.rows?.[0] as any)?.count ?? '0');

    // 6. Top workers (leaderboard)
    const topWorkers = await db
      .select({
        userId: pwrUserStats.userId,
        name: users.name,
        totalPoints: pwrUserStats.totalPoints,
        tasksCompleted: pwrUserStats.tasksCompleted,
        currentLevel: pwrUserStats.currentLevel,
      })
      .from(pwrUserStats)
      .innerJoin(users, eq(pwrUserStats.userId, users.id))
      .orderBy(desc(pwrUserStats.totalPoints))
      .limit(5);

    const completionRate = totalPending > 0
      ? Math.round((doneToday / (doneToday + totalPending)) * 100)
      : doneToday > 0 ? 100 : 0;

    const scrapRequests = await db
      .select({
        id: pwrScrapRequests.id,
        taskId: pwrScrapRequests.taskId,
        itemsRequested: pwrScrapRequests.itemsRequested,
        reason: pwrScrapRequests.reason,
        status: pwrScrapRequests.status,
        createdAt: pwrScrapRequests.createdAt,
      })
      .from(pwrScrapRequests)
      .where(eq(pwrScrapRequests.status, 'PENDING'));

    return NextResponse.json({
      scrapRequests,
      stationStats: stationStats.rows || stationStats,
      activeWorkers: activeWorkers.rows || activeWorkers,
      activeWorkerCount: (activeWorkers.rows || activeWorkers).length,
      doneToday,
      totalPending,
      defectsToday,
      completionRate,
      topWorkers,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[Manager Dashboard]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
