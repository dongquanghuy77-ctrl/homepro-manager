import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrWorkLogs, pwrTasks } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { LOG_GRACE_PERIOD_MS } from '@/lib/pwr/constants';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; logId: string } }
) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const taskId = parseInt(params.id);
    const logId  = parseInt(params.logId);
    if (isNaN(taskId) || isNaN(logId)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }

    // Verify task ownership
    const [task] = await db.select().from(pwrTasks)
      .where(and(eq(pwrTasks.id, taskId), eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));
    if (!task) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });

    // Fetch log
    const [log] = await db.select().from(pwrWorkLogs)
      .where(and(eq(pwrWorkLogs.id, logId), eq(pwrWorkLogs.taskId, taskId)));
    if (!log) return NextResponse.json({ error: 'Không tìm thấy log' }, { status: 404 });

    // System logs cannot be edited
    if (log.isSystemLog) {
      return NextResponse.json({ error: 'Log hệ thống không thể chỉnh sửa' }, { status: 403 });
    }

    // Grace period check — 15 minutes
    const createdAt  = log.createdAt ? new Date(log.createdAt).getTime() : 0;
    const age        = Date.now() - createdAt;
    if (age > LOG_GRACE_PERIOD_MS) {
      return NextResponse.json({ error: 'Chỉ có thể sửa trong 15 phút đầu sau khi tạo' }, { status: 403 });
    }

    const body = await request.json();
    const { content, logType, result, issue, nextAction, waitingFor, durationMinutes } = body;

    const [updated] = await db.update(pwrWorkLogs)
      .set({
        content:         content         ?? log.content,
        logType:         logType         ?? log.logType,
        result:          result          ?? log.result,
        issue:           issue           ?? log.issue,
        nextAction:      nextAction      ?? log.nextAction,
        waitingFor:      waitingFor      ?? log.waitingFor,
        durationMinutes: durationMinutes ?? log.durationMinutes,
        editedAt:        new Date(),
      })
      .where(eq(pwrWorkLogs.id, logId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PATCH /api/pwr/tasks/:id/logs/:logId]', error);
    return NextResponse.json({ error: 'Không thể cập nhật log' }, { status: 500 });
  }
}
