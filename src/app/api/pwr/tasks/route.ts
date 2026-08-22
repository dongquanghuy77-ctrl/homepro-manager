import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrTaskAuditLog } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { requireAuth, MANAGER_AND_ABOVE } from '@/lib/auth';
import { getTodayVN, TERMINAL_STATUSES } from '@/lib/pwr/constants';

export async function GET(request: Request) {
  const authResult = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status       = searchParams.get('status');
    const category     = searchParams.get('category');
    const overdueParam = searchParams.get('overdue');
    const q            = searchParams.get('q');

    // Build base conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [
      eq(pwrTasks.userId, session.id),
      isNull(pwrTasks.deletedAt),
    ];
    if (status)   conditions.push(eq(pwrTasks.status,   status));
    if (category) conditions.push(eq(pwrTasks.category, category));

    let tasks = await db
      .select()
      .from(pwrTasks)
      .where(and(...conditions))
      .orderBy(desc(pwrTasks.createdAt));

    // Client-side filters
    if (q) {
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q.toLowerCase()));
    }

    const todayVN = getTodayVN();

    if (overdueParam === 'true') {
      tasks = tasks.filter(t =>
        t.dueDate && t.dueDate < todayVN && !TERMINAL_STATUSES.includes(t.status as any)
      );
    }

    // Quick stats
    const allNonDeleted = await db
      .select()
      .from(pwrTasks)
      .where(and(eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));

    const stats = {
      total:      tasks.length,
      overdue:    allNonDeleted.filter(t => t.dueDate && t.dueDate < todayVN && !TERMINAL_STATUSES.includes(t.status as any)).length,
      waiting:    allNonDeleted.filter(t => t.status === 'WAITING').length,
      inProgress: allNonDeleted.filter(t => t.status === 'IN_PROGRESS').length,
    };

    return NextResponse.json({ tasks, stats });
  } catch (error) {
    console.error('[GET /api/pwr/tasks]', error);
    return NextResponse.json({ error: 'Không thể tải danh sách công việc' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const body = await request.json();
    const {
      title, category, priority, status, description,
      projectRef, dueDate, startDate, assignedTo,
      relatedPerson, source, waitingFor, deferredTo, tags,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Tiêu đề không được để trống' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Danh mục là bắt buộc' }, { status: 400 });
    }
    if (status === 'WAITING' && !waitingFor?.trim()) {
      return NextResponse.json({ error: 'Cần ghi rõ đang chờ ai/gì khi chuyển sang WAITING' }, { status: 400 });
    }
    if (status === 'DEFERRED' && !deferredTo) {
      return NextResponse.json({ error: 'Cần chọn ngày dời lại khi chuyển sang DEFERRED' }, { status: 400 });
    }

    const [newTask] = await db
      .insert(pwrTasks)
      .values({
        userId:        session.id,
        title:         title.trim(),
        description:   description || null,
        category,
        priority:      priority  || 'MEDIUM',
        status:        status    || 'INBOX',
        projectRef:    projectRef || null,
        dueDate:       dueDate    || null,
        startDate:     startDate  || null,
        assignedTo:    assignedTo || null,
        relatedPerson: relatedPerson || null,
        source:        source    || 'SELF',
        waitingFor:    waitingFor || null,
        deferredTo:    deferredTo || null,
        tags:          Array.isArray(tags) ? tags : [],
      })
      .returning();

    await db.insert(pwrTaskAuditLog).values({
      taskId:   newTask.id,
      userId:   session.id,
      action:   'CREATED',
      newValue: newTask.status,
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('[POST /api/pwr/tasks]', error);
    return NextResponse.json({ error: 'Không thể tạo công việc' }, { status: 500 });
  }
}
