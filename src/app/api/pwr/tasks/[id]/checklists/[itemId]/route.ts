import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrChecklists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

// PATCH: Toggle hoàn thành / Sửa nội dung
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const itemId = parseInt(params.itemId);
  if (isNaN(itemId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  const body = await request.json();

  const [updated] = await db.update(pwrChecklists)
    .set({
      ...(body.isCompleted !== undefined && { isDone: body.isCompleted }),
      ...(body.title && { content: body.title.trim() }),
    })
    .where(eq(pwrChecklists.id, itemId))
    .returning();

  return NextResponse.json({
    id: updated.id,
    taskId: updated.taskId,
    title: updated.content,
    isCompleted: updated.isDone,
    orderIndex: updated.position,
  });
}

// DELETE: Xóa 1 checklist item
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  const itemId = parseInt(params.itemId);
  if (isNaN(itemId)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  await db.delete(pwrChecklists).where(eq(pwrChecklists.id, itemId));
  return NextResponse.json({ ok: true });
}
