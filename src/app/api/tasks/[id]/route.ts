import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });

    return NextResponse.json(task);
  } catch (error) {
    console.error('[GET /api/tasks/:id]', error);
    return NextResponse.json({ error: 'Không thể tải công việc' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const body = await request.json();
    const { category, title, assignee, startDate, endDate, status, priority, progress, notes } = body;

    // Auto-detect overdue
    let finalStatus = status;
    if (status !== 'COMPLETED' && endDate) {
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (end < today && status !== 'PAUSED') {
        finalStatus = 'OVERDUE';
      }
    }

    // Auto progress for completed
    const finalProgress = finalStatus === 'COMPLETED' ? 100 : (progress ?? 0);

    const [updated] = await db
      .update(tasks)
      .set({
        category, title, assignee, startDate, endDate,
        status: finalStatus, priority,
        progress: finalProgress,
        notes,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(tasks.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PUT /api/tasks/:id]', error);
    return NextResponse.json({ error: 'Không thể cập nhật công việc' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    await db.delete(tasks).where(eq(tasks.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/tasks/:id]', error);
    return NextResponse.json({ error: 'Không thể xóa công việc' }, { status: 500 });
  }
}
