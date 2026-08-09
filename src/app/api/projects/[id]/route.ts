import { NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id));

    return NextResponse.json({ ...project, tasks: projectTasks });
  } catch (error) {
    console.error('[GET /api/projects/:id]', error);
    return NextResponse.json({ error: 'Không thể tải dự án' }, { status: 500 });
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
    const { code, name, customer, location, manager, startDate, deadline, contractValue, status, notes } = body;

    const [updated] = await db
      .update(projects)
      .set({
        code, name, customer, location, manager,
        startDate, deadline, contractValue, status, notes,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(projects.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PUT /api/projects/:id]', error);
    return NextResponse.json({ error: 'Không thể cập nhật dự án' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    await db.delete(projects).where(eq(projects.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/projects/:id]', error);
    return NextResponse.json({ error: 'Không thể xóa dự án' }, { status: 500 });
  }
}
