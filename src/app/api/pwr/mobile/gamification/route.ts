import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrUserStats, users } from '@/db/schema';
import { getToken } from 'next-auth/jwt';
import { desc, sql, eq } from 'drizzle-orm';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_for_homepro_12345!@#';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: SECRET });
    const currentUserId = token?.id ? parseInt(token.id as string) : null;

    const rows = await db
      .select({
        userId: pwrUserStats.userId,
        totalPoints: pwrUserStats.totalPoints,
        currentLevel: pwrUserStats.currentLevel,
        tasksCompleted: pwrUserStats.tasksCompleted,
        name: users.name,
      })
      .from(pwrUserStats)
      .innerJoin(users, eq(pwrUserStats.userId, users.id))
      .orderBy(desc(pwrUserStats.totalPoints))
      .limit(20);

    const leaderboard = rows.map((r, idx) => ({
      rank: idx + 1,
      name: r.name || 'Thành viên',
      points: r.totalPoints,
      level: r.currentLevel,
      tasksCompleted: r.tasksCompleted,
      isMe: currentUserId !== null && r.userId === currentUserId,
    }));

    return NextResponse.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('[Gamification GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: SECRET });
    if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = parseInt(token.id as string);

    const body = await req.json();
    const { pointsToAdd = 15 } = body;

    await db.execute(sql`
      INSERT INTO pwr_user_stats (user_id, total_points, tasks_completed, current_level)
      VALUES (${userId}, ${pointsToAdd}, 1, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        total_points = pwr_user_stats.total_points + ${pointsToAdd},
        tasks_completed = pwr_user_stats.tasks_completed + 1,
        current_level = GREATEST(1, (pwr_user_stats.total_points + ${pointsToAdd}) / 100 + 1),
        updated_at = NOW()
    `);

    const [stats] = await db.select().from(pwrUserStats).where(eq(pwrUserStats.userId, userId));
    return NextResponse.json({ success: true, newTotal: stats?.totalPoints, level: stats?.currentLevel });
  } catch (error: any) {
    console.error('[Gamification POST]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
