import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrChecklists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

function mapItem(i: any) {
  return {
    id:           i.id,
    taskId:       i.taskId,
    title:        i.content,
    isCompleted:  i.isDone,
    orderIndex:   i.position,
    status:       (i as any).status ?? (i.isDone ? 'DONE' : 'UNDONE'),
    linkedTaskId: (i as any).linked_task_id ?? null,
  };
}

// PATCH: Cập nhật trạng thái / nội dung / linked_task_id
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const itemId = parseInt(params.itemId);
  if (isNaN(itemId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  const body = await request.json();

  const setPayload: Record<string, unknown> = {};
  if (body.isCompleted !== undefined) setPayload.isDone = body.isCompleted;
  if (body.title)                      setPayload.content = body.title.trim();
  // New fields
  if (body.status !== undefined)       (setPayload as any).status = body.status;
  if (body.linkedTaskId !== undefined) (setPayload as any).linked_task_id = body.linkedTaskId;

  // Keep isDone in sync with status
  if (body.status === 'DONE')    setPayload.isDone = true;
  if (body.status === 'UNDONE')  setPayload.isDone = false;
  if (body.status === 'SCHEDULED') setPayload.isDone = false;

  const [updated] = await db.update(pwrChecklists)
    .set(setPayload as any)
    .where(eq(pwrChecklists.id, itemId))
    .returning();

  return NextResponse.json(mapItem(updated));
}

// DELETE: Xóa 1 checklist item
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const itemId = parseInt(params.itemId)
  if (isNaN(itemId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  await db.delete(pwrChecklists).where(eq(pwrChecklists.id, itemId));
  return NextResponse.json({ ok: true });
}
