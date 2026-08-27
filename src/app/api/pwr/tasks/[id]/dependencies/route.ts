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

// ─── Deep cycle detection (DFS) ──────────────────────────────────────────────
// Given we want to add: taskId=A dependsOn=B (B must finish before A)
// We must ensure there is NO path from A to B in existing dependency graph.
// (If A can reach B via existing deps, adding B→A would create a cycle)
async function hasCycleDFS(
  startId: number,    // A: the task that will depend on targetId
  targetId: number,   // B: the blocker we're about to add
  client: typeof db
): Promise<boolean> {
  // BFS from startId through dependsOnId chains
  // If we reach targetId → cycle detected
  const visited = new Set<number>();
  const queue: number[] = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find all tasks that 'current' depends on (current → depends_on_id)
    const children = await client.select({ id: pwrTaskDependencies.dependsOnId })
      .from(pwrTaskDependencies)
      .where(eq(pwrTaskDependencies.taskId, current));

    for (const c of children) {
      if (!visited.has(c.id)) queue.push(c.id);
    }
  }
  return false;
}

// POST: Thêm dependency (task này bị khóa bởi blockingTaskId)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const taskId = parseInt(params.id); // task bị khóa (A)
  const body = await request.json();
  const blockingTaskId = parseInt(body.blockingTaskId); // task phải xong trước (B)
  const depType = body.depType || 'BLOCKED_BY';
  const timeWindowDays = body.timeWindowDays ? parseInt(body.timeWindowDays) : null;

  // Validate dep_type values
  const VALID_DEP_TYPES = ['BLOCKED_BY', 'RESOURCE_LOCK', 'GATE', 'TRIGGER', 'PRECONDITION'];

  if (isNaN(taskId) || isNaN(blockingTaskId)) {
    return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
  }
  if (taskId === blockingTaskId) {
    return NextResponse.json({ error: 'Không thể tự khóa chính mình' }, { status: 400 });
  }
  if (!VALID_DEP_TYPES.includes(depType)) {
    return NextResponse.json({ error: `depType phải là một trong: ${VALID_DEP_TYPES.join(', ')}` }, { status: 400 });
  }

  // ── Deep cycle detection (DFS) ──────────────────────────────────────────────
  // We're adding: A(taskId) depends on B(blockingTaskId)
  // Check: does A already have a path to B via existing deps? (Would create cycle)
  const cycle = await hasCycleDFS(taskId, blockingTaskId, db);
  if (cycle) {
    return NextResponse.json({
      error: 'Tạo vòng lặp phụ thuộc! Task này đã phụ thuộc (gián tiếp) vào blocker được chọn.',
      hint: 'Kiểm tra chuỗi phụ thuộc hiện tại của task này.'
    }, { status: 409 });
  }

  // ── Duplicate check ──────────────────────────────────────────────────────────
  const existing = await db.select().from(pwrTaskDependencies)
    .where(and(eq(pwrTaskDependencies.taskId, taskId), eq(pwrTaskDependencies.dependsOnId, blockingTaskId)));
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Ràng buộc này đã tồn tại' }, { status: 409 });
  }

  const [dep] = await db.insert(pwrTaskDependencies).values({
    taskId,
    dependsOnId: blockingTaskId,
    depType,
    ...(timeWindowDays ? { timeWindowDays } : {}),
  } as any).returning();

  return NextResponse.json(dep, { status: 201 });
}

