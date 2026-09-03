import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrWorkLogs, pwrUserStats } from '@/db/schema';
import { getToken } from 'next-auth/jwt';
import { eq, and, desc, gte, isNotNull, sql } from 'drizzle-orm';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_for_homepro_12345!@#';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: SECRET });
  if (!token?.id) return NextResponse.json({ error: 'Chua dang nh?p' }, { status: 401 });
  const userId = parseInt(token.id as string);

  try {
    // 7 ngày g?n nh?t
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    // Tasks completed by this worker in last 7 days
    const completedTasks = await db
      .select({
        id: pwrTasks.id,
        title: pwrTasks.title,
        completedAt: pwrTasks.completedAt,
        stationTeam: pwrTasks.stationTeam,
        quantityDone: pwrTasks.quantityDone,
      })
      .from(pwrTasks)
      .where(and(
        eq(pwrTasks.completedBy, userId),
        gte(pwrTasks.completedAt, sevenDaysAgo),
      ))
      .orderBy(desc(pwrTasks.completedAt))
      .limit(50);

    // Group by date for chart
    const byDate: Record<string, number> = {};
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      // VN timezone adjust
      const vnDate = new Date(d.getTime() + 7 * 3600 * 1000);
      const key = vnDate.toISOString().split('T')[0];
      const dayName = dayNames[vnDate.getUTCDay()];
      byDate[key] = 0;
    }
    for (const task of completedTasks) {
      if (!task.completedAt) continue;
      const vnDate = new Date(task.completedAt.getTime() + 7 * 3600 * 1000);
      const key = vnDate.toISOString().split('T')[0];
      if (key in byDate) byDate[key] = (byDate[key] || 0) + 1;
    }

    const chartData = Object.entries(byDate).map(([date, count]) => {
      const d = new Date(date + 'T00:00:00Z');
      const dayName = dayNames[d.getUTCDay()];
      return { name: dayName, sp: count, date };
    });

    // User stats
    const [stats] = await db.select().from(pwrUserStats).where(eq(pwrUserStats.userId, userId));

    return NextResponse.json({
      chartData,
      recentTasks: completedTasks.slice(0, 10),
      totalPoints: stats?.totalPoints ?? 0,
      level: stats?.currentLevel ?? 1,
      tasksCompleted: stats?.tasksCompleted ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
