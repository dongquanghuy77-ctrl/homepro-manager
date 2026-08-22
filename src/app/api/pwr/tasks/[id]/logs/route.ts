import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrWorkLogs, pwrTasks } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const taskId = parseInt(params.id);
    if (isNaN(taskId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [task] = await db.select().from(pwrTasks)
      .where(and(eq(pwrTasks.id, taskId), eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));

    if (!task) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });

    const body = await request.json();
    const { logType, content, result, issue, nextAction, waitingFor, durationMinutes } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Nội dung ghi chú không được để trống' }, { status: 400 });
    }

    const [newLog] = await db.insert(pwrWorkLogs).values({
      taskId,
      userId:          session.id,
      logType:         logType || 'NOTE',
      content:         content.trim(),
      result:          result     || null,
      issue:           issue      || null,
      nextAction:      nextAction || null,
      waitingFor:      waitingFor || null,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      isSystemLog:     false,
    }).returning();

    return NextResponse.json(newLog, { status: 201 });
  } catch (error) {
    console.error('[POST /api/pwr/tasks/:id/logs]', error);
    return NextResponse.json({ error: 'Không thể ghi log' }, { status: 500 });
  }
}
