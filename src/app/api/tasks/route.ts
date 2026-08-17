import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function GET(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    let allTasks;
    if (projectId) {
      allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, parseInt(projectId)))
        .orderBy(desc(tasks.createdAt));
    } else {
      allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    }

    return NextResponse.json(allTasks);
  } catch (error) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json({ error: 'Không thể tải danh sách công việc' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { projectId, category, title, assignee, startDate, endDate, status, priority, progress, notes } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        projectId: parseInt(projectId),
        category,
        title,
        assignee,
        startDate,
        endDate,
        status: status || 'NOT_STARTED',
        priority: priority || 'MEDIUM',
        progress: progress || 0,
        notes,
      })
      .returning();

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('[POST /api/tasks]', error);
    return NextResponse.json({ error: 'Không thể tạo công việc' }, { status: 500 });
  }
}
