import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/db';
import { pwrTasks, pwrWorkLogs, pwrUserStats } from '@/db/schema';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_for_homepro_12345!@#';

// GET /api/pwr/station/tasks?team=CNC
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: SECRET });
  if (!token?.id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const team = req.nextUrl.searchParams.get('team');
  if (!team) return NextResponse.json({ error: 'Thiếu team param' }, { status: 400 });

  try {
    const tasks = await db
      .select({
        id: pwrTasks.id,
        title: pwrTasks.title,
        description: pwrTasks.description,
        status: pwrTasks.status,
        priority: pwrTasks.priority,
        stationTeam: pwrTasks.stationTeam,
        quantityDone: pwrTasks.quantityDone,
        completedAt: pwrTasks.completedAt,
        dueDate: pwrTasks.dueDate,
      })
      .from(pwrTasks)
      .where(and(
        eq(pwrTasks.stationTeam, team),
        inArray(pwrTasks.status, ['TODO', 'IN_PROGRESS']),
        isNull(pwrTasks.deletedAt),
      ))
      .orderBy(pwrTasks.priority);

    return NextResponse.json({ tasks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/pwr/station/tasks — mark task done + award points
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: SECRET });
  if (!token?.id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const userId = parseInt(token.id as string);
  const { taskId, quantityDone = 1 } = await req.json() as { taskId: number; quantityDone?: number };

  if (!taskId) return NextResponse.json({ error: 'Thiếu taskId' }, { status: 400 });

  try {
    const now = new Date();

    // 1. Mark task DONE
    await db.update(pwrTasks).set({
      status: 'DONE',
      completedAt: now,
      completedBy: userId,
      quantityDone,
    }).where(eq(pwrTasks.id, taskId));

    // 2. Ghi work log
    await db.insert(pwrWorkLogs).values({
      taskId,
      userId,
      logType: 'COMPLETED',
      content: `Hoàn thành tại trạm. Số lượng: ${quantityDone}`,
      statusFrom: 'IN_PROGRESS',
      statusTo: 'DONE',
      isSystemLog: true,
    });

    // 3. Cộng điểm vào pwr_user_stats (upsert)
    const POINTS_PER_TASK = 15;
    await db.execute(sql`
      INSERT INTO pwr_user_stats (user_id, total_points, tasks_completed, current_level)
      VALUES (${userId}, ${POINTS_PER_TASK}, 1, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        total_points = pwr_user_stats.total_points + ${POINTS_PER_TASK},
        tasks_completed = pwr_user_stats.tasks_completed + 1,
        current_level = GREATEST(1, (pwr_user_stats.total_points + ${POINTS_PER_TASK}) / 100 + 1),
        updated_at = NOW()
    `);

    return NextResponse.json({ success: true, pointsAwarded: POINTS_PER_TASK });
  } catch (e: any) {
    console.error('[Station PATCH task]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
