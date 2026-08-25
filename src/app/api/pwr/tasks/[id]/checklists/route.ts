import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrChecklists } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

// GET: Lấy danh sách checklist của 1 task
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const taskId = parseInt(params.id);
  if (isNaN(taskId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  const items = await db.select().from(pwrChecklists)
    .where(eq(pwrChecklists.taskId, taskId))
    .orderBy(asc(pwrChecklists.position));

  // Map to consistent frontend field names
  return NextResponse.json(items.map(i => ({
    id: i.id,
    taskId: i.taskId,
    title: i.content,
    isCompleted: i.isDone,
    orderIndex: i.position,
  })));
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

  // Tính position tiếp theo
  const existing = await db.select().from(pwrChecklists).where(eq(pwrChecklists.taskId, taskId));
  const nextPos = existing.length;

  const [item] = await db.insert(pwrChecklists).values({
    taskId,
    content: title.trim(),
    isDone: false,
    position: nextPos,
  }).returning();

  return NextResponse.json({
    id: item.id,
    taskId: item.taskId,
    title: item.content,
    isCompleted: item.isDone,
    orderIndex: item.position,
  }, { status: 201 });
}
