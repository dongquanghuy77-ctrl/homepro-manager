import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrTaskAuditLog } from '@/db/schema';
import { eq, and, isNull, desc, or, isNotNull } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { getTodayVN, TERMINAL_STATUSES } from '@/lib/pwr/constants';

export async function GET(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status          = searchParams.get('status');
    const category        = searchParams.get('category');
    const overdueParam    = searchParams.get('overdue');
    const q               = searchParams.get('q');
    const dueDate         = searchParams.get('dueDate');
    const assignedTo      = searchParams.get('assignedTo');
    const projectRef      = searchParams.get('projectRef');
    const stationDispatch = searchParams.get('stationDispatch'); // Manager dispatch view — hiển thị ALL tasks có thể dispatch

    const conditions: any[] = [ isNull(pwrTasks.deletedAt) ];
    if (stationDispatch !== 'true') {
      conditions.push(eq(pwrTasks.userId, session.id));
    }
    if (status)     conditions.push(eq(pwrTasks.status,     status));
    if (category)   conditions.push(eq(pwrTasks.category,   category));
    if (dueDate)    conditions.push(eq(pwrTasks.dueDate,    dueDate));
    if (assignedTo) conditions.push(eq(pwrTasks.assignedTo, assignedTo));
    if (projectRef) conditions.push(eq(pwrTasks.projectRef, projectRef));

    // stationDispatch=true: chỉ lấy task ACTIVE (chưa DONE/CANCELLED) để show trên board giao việc
    if (stationDispatch === 'true') {
      const { notInArray } = await import('drizzle-orm');
      conditions.push(notInArray(pwrTasks.status, ['DONE', 'CANCELLED']));
    }

    let tasks = await db
      .select()
      .from(pwrTasks)
      .where(and(...conditions))
      .orderBy(desc(pwrTasks.createdAt));

    if (q) {
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q.toLowerCase()));
    }

    const todayVN = getTodayVN();

    if (overdueParam === 'true') {
      tasks = tasks.filter(t =>
        t.dueDate && t.dueDate < todayVN && !TERMINAL_STATUSES.includes(t.status as any)
      );
    }

    const allNonDeleted = await db.select().from(pwrTasks).where(
      stationDispatch === 'true' 
        ? isNull(pwrTasks.deletedAt) 
        : and(eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt))
    );

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
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const body = await request.json();
    const {
      title, category, priority, status, description,
      projectRef, dueDate, startDate, assignedTo,
      relatedPerson, source, waitingFor, deferredTo, tags,
      sourceType, startTime, endTime, taskType, projectId,
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
        priority:      priority    || 'MEDIUM',
        status:        status      || 'INBOX',
        projectRef:    projectRef  || null,
        dueDate:       dueDate     || null,
        startDate:     startDate   || null,
        assignedTo:    assignedTo  || null,
        relatedPerson: relatedPerson || null,
        source:        source      || 'SELF',
        waitingFor:    waitingFor  || null,
        deferredTo:    deferredTo  || null,
        tags:          Array.isArray(tags) ? tags : [],
        startTime:     startTime   || null,
        endTime:       endTime     || null,
        ...(sourceType ? { source_type: sourceType } as any : {}),
        ...(taskType   ? { task_type:   taskType   } as any : {}),
        ...(projectId  ? { project_id:  projectId  } as any : {}),
      } as any)
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

// ─── DELETE: Soft-delete 1 hoặc nhiều task (bulk) ────────────────────────────
// Body: { ids: number[] }  OR  query: ?id=123
// Action: CANCEL = chuyển sang CANCELLED (giữ trong DB, ẩn khỏi active view)
// Action: DELETE = đánh dấu deletedAt (soft delete, ẩn hoàn toàn)
export async function DELETE(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get('id');
    const action   = (searchParams.get('action') ?? 'delete') as 'cancel' | 'delete';

    let ids: number[] = [];

    if (singleId) {
      ids = [parseInt(singleId, 10)];
    } else {
      const body = await request.json().catch(() => ({}));
      ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Không có task nào được chọn' }, { status: 400 });
    }

    // Security: chỉ được xóa task của chính mình
    const { inArray } = await import('drizzle-orm');
    const ownedTasks = await db
      .select({ id: pwrTasks.id })
      .from(pwrTasks)
      .where(and(eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt), inArray(pwrTasks.id, ids)));

    const ownedIds = ownedTasks.map(t => t.id);
    if (ownedIds.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy task hợp lệ' }, { status: 404 });
    }

    const now = new Date();

    if (action === 'cancel') {
      // Cancel = chuyển sang CANCELLED, giữ trong DB cho lịch sử
      await db.update(pwrTasks)
        .set({ status: 'CANCELLED', updatedAt: now } as any)
        .where(and(eq(pwrTasks.userId, session.id), inArray(pwrTasks.id, ownedIds)));
    } else {
      // Delete = soft delete — đánh dấu deletedAt
      await db.update(pwrTasks)
        .set({ deletedAt: now, updatedAt: now } as any)
        .where(and(eq(pwrTasks.userId, session.id), inArray(pwrTasks.id, ownedIds)));
    }

    return NextResponse.json({ deleted: ownedIds.length, ids: ownedIds, action });
  } catch (error) {
    console.error('[DELETE /api/pwr/tasks]', error);
    return NextResponse.json({ error: 'Không thể xóa task' }, { status: 500 });
  }
}
