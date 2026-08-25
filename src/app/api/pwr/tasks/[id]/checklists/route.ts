import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrChecklists, pwrTasks } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

function mapItem(i: any) {
  return {
    id:            i.id,
    taskId:        i.taskId,
    title:         i.content,
    isCompleted:   i.isDone,
    orderIndex:    i.position,
    status:        (i as any).status ?? (i.isDone ? 'DONE' : 'UNDONE'),
    linkedTaskId:  (i as any).linked_task_id ?? null,
  };
}

// GET: Lấy danh sách checklist của 1 task
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const taskId = parseInt(params.id);
  if (isNaN(taskId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  const items = await db.select().from(pwrChecklists)
    .where(eq(pwrChecklists.taskId, taskId))
    .orderBy(asc(pwrChecklists.position));

  return NextResponse.json(items.map(mapItem));
}

// POST: Thêm 1 checklist item mới
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const taskId = parseInt(params.id);
  if (isNaN(taskId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  const body = await request.json();
  const { title } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Tên bước không được để trống' }, { status: 400 });

  const existing = await db.select().from(pwrChecklists).where(eq(pwrChecklists.taskId, taskId));
  const nextPos = existing.length;

  const [item] = await db.insert(pwrChecklists).values({
    taskId,
    content:  title.trim(),
    isDone:   false,
    position: nextPos,
  } as any).returning();

  return NextResponse.json(mapItem(item), { status: 201 });
}
