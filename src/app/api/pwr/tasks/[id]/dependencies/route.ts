import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTaskDependencies, pwrTasks } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

// GET: Lấy dependencies của 1 task
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const taskId = parseInt(params.id);
  if (isNaN(taskId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  // Task này phụ thuộc vào (bị khóa bởi) ai
  // Schema: taskId = task bị block, dependsOnId = task phải xong trước
  const deps = await db
    .select({ dep: pwrTaskDependencies, task: pwrTasks })
    .from(pwrTaskDependencies)
    .innerJoin(pwrTasks, eq(pwrTasks.id, pwrTaskDependencies.dependsOnId))
    .where(eq(pwrTaskDependencies.taskId, taskId));

  // Task này đang khóa ai (các task khác phụ thuộc vào task này)
  const blocking = await db
    .select({ dep: pwrTaskDependencies, task: pwrTasks })
    .from(pwrTaskDependencies)
    .innerJoin(pwrTasks, eq(pwrTasks.id, pwrTaskDependencies.taskId))
    .where(eq(pwrTaskDependencies.dependsOnId, taskId));

  // Task này có thực sự bị block không (blocker nào chưa xong)
  const isBlocked = deps.some(d => !['DONE', 'CANCELLED'].includes(d.task.status));

  return NextResponse.json({
    blockedBy: deps.map(d => ({ dep: d.dep, task: d.task })),
    blocking:  blocking.map(d => ({ dep: d.dep, task: d.task })),
    isBlocked,
  });
}

// POST: Thêm dependency (task này bị khóa bởi blockingTaskId)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const taskId = parseInt(params.id); // task bị khóa
  const body = await request.json();
  const blockingTaskId = parseInt(body.blockingTaskId); // task phải xong trước

  if (isNaN(taskId) || isNaN(blockingTaskId)) {
    return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
  }
  if (taskId === blockingTaskId) {
    return NextResponse.json({ error: 'Không thể tự khóa chính mình' }, { status: 400 });
  }

  // Kiểm tra vòng lặp đơn giản
  const circular = await db.select().from(pwrTaskDependencies)
    .where(
      and(
        eq(pwrTaskDependencies.taskId, blockingTaskId),
        eq(pwrTaskDependencies.dependsOnId, taskId)
      )
    );
  if (circular.length > 0) {
    return NextResponse.json({ error: 'Tạo vòng lặp phụ thuộc! Không cho phép.' }, { status: 409 });
  }

  // Kiểm tra đã tồn tại chưa
  const existing = await db.select().from(pwrTaskDependencies)
    .where(and(eq(pwrTaskDependencies.taskId, taskId), eq(pwrTaskDependencies.dependsOnId, blockingTaskId)));
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Ràng buộc này đã tồn tại' }, { status: 409 });
  }

  const [dep] = await db.insert(pwrTaskDependencies).values({
    taskId,
    dependsOnId: blockingTaskId,
    depType: 'BLOCKED_BY',
  }).returning();

  return NextResponse.json(dep, { status: 201 });
}
