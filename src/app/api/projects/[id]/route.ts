import { NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';


export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireAuth(request as any, ALL_ROLES);
  if (authError) return authError;

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
  const { error: authError } = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (authError) return authError;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const body = await request.json();
    const { code, name, customer, location, manager, startDate, deadline,
            contractValue, targetMaterialCost, targetLaborCost, status, notes } = body;

    const [updated] = await db
      .update(projects)
      .set({
        code, name, customer, location, manager,
        startDate, deadline, contractValue,
        targetMaterialCost: targetMaterialCost ?? 0,
        targetLaborCost:    targetLaborCost    ?? 0,
        status, notes,
        updatedAt: new Date(),
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
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (authError) return authError;

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
