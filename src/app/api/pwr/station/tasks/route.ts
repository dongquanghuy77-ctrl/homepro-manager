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

// PATCH /api/pwr/station/tasks — start task (IN_PROGRESS) or mark done (DONE)
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: SECRET });
  if (!token?.id) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const userId = parseInt(token.id as string);
  const body = await req.json() as { taskId: number; quantityDone?: number; status?: string };
  const { taskId, quantityDone = 1, status } = body;

  if (!taskId) return NextResponse.json({ error: 'Thiếu taskId' }, { status: 400 });

  // Nhánh 1: Chỉ chuyển sang IN_PROGRESS (thợ bấm "Bắt Đầu")
  if (status === 'IN_PROGRESS') {
    await db.update(pwrTasks).set({
      status: 'IN_PROGRESS',
      updatedAt: new Date(),
    } as any).where(eq(pwrTasks.id, taskId));
    return NextResponse.json({ success: true, status: 'IN_PROGRESS' });
  }

  // Nhánh 2: Hoàn Thành (DONE) — chạy full logic
  try {
    const now = new Date();

    // 1. Fetch task to check sourceRef
    const [task] = await db.select().from(pwrTasks).where(eq(pwrTasks.id, taskId));
    if (!task) return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });

        const isEndOfLine = task.stationTeam === 'DONG_GOI';
    const nextStatus = isEndOfLine ? 'DONE' : 'DONE';
    const nextQcStatus = isEndOfLine ? 'WAITING_QC' : 'QC_PASSED';
    
    // 2. Cập nhật task
    await db.update(pwrTasks).set({
      status: nextStatus,
      qcStatus: nextQcStatus,
      waitingQcSince: isEndOfLine ? now : null,
      completedAt: isEndOfLine ? null : now, // Chưa hoàn thành thực sự nếu chờ QC
      completedBy: userId,
      quantityDone,
    }).where(eq(pwrTasks.id, taskId));

    // 3. ERP Bridge: Chỉ update nếu không phải chờ QC (hoặc đã passed)
    if (!isEndOfLine && task.sourceRef && task.sourceRef.startsWith('WO-')) {
      const woId = parseInt(task.sourceRef.split('-')[1]);
      if (!isNaN(woId)) {
        await db.execute(sql`
          UPDATE work_orders 
          SET completed_quantity = completed_quantity + ${quantityDone},
              status = CASE WHEN completed_quantity + ${quantityDone} >= planned_quantity THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
              updated_at = NOW()
          WHERE id = ${woId}
        `);
      }
    }

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
