import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks, pwrWorkLogs, pwrTaskAuditLog } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { validateTransition, isReopen as checkReopen } from '@/lib/pwr/task-transitions';
import type { PwrStatus } from '@/db/schema';

const MUTABLE_FIELDS = [
  'title', 'description', 'category', 'priority',
  'dueDate', 'startDate', 'assignedTo', 'relatedPerson',
  'projectRef', 'tags', 'waitingFor', 'deferredTo',
  'result', 'cancelReason', 'source',
  'startTime', 'endTime',
] as const;

const AUDITABLE_FIELD_MAP: Partial<Record<string, string>> = {
  title:      'title',
  category:   'category',
  priority:   'priority',
  dueDate:    'due_date',
  assignedTo: 'assigned_to',
  waitingFor: 'waiting_for',
  deferredTo: 'deferred_to',
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [task] = await db.select().from(pwrTasks)
      .where(and(eq(pwrTasks.id, id), eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));

    if (!task) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });

    const workLogs = await db.select().from(pwrWorkLogs)
      .where(eq(pwrWorkLogs.taskId, id))
      .orderBy(asc(pwrWorkLogs.createdAt));

    const auditLog = await db.select().from(pwrTaskAuditLog)
      .where(eq(pwrTaskAuditLog.taskId, id))
      .orderBy(asc(pwrTaskAuditLog.createdAt));

    return NextResponse.json({ task, workLogs, auditLog });
  } catch (error) {
    console.error('[GET /api/pwr/tasks/:id]', error);
    return NextResponse.json({ error: 'Không thể tải công việc' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [existing] = await db.select().from(pwrTasks)
      .where(and(eq(pwrTasks.id, id), eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));

    if (!existing) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });

    const body = await request.json();
    const { status: newStatus, reason, ...rest } = body;

    // Explicit mutable field allowlist — no spread
    const updatePayload: Partial<typeof pwrTasks.$inferInsert> = { updatedAt: new Date() };
    for (const field of MUTABLE_FIELDS) {
      if (field in rest) (updatePayload as Record<string, unknown>)[field] = rest[field];
    }

    // Collect FIELD_UPDATED audit entries (before update)
    const fieldAudits: Array<{ fieldName: string; oldValue: string; newValue: string }> = [];
    for (const [camel, dbField] of Object.entries(AUDITABLE_FIELD_MAP)) {
      if (camel in rest && rest[camel] !== undefined) {
        const oldVal = String((existing as Record<string, unknown>)[camel] ?? '');
        const newVal = String(rest[camel] ?? '');
        if (oldVal !== newVal) {
          fieldAudits.push({ fieldName: dbField!, oldValue: oldVal, newValue: newVal });
        }
      }
    }

    // Status transition
    if (newStatus && newStatus !== existing.status) {
      if (!validateTransition(existing.status as PwrStatus, newStatus as PwrStatus)) {
        return NextResponse.json(
          { error: `Không thể chuyển từ ${existing.status} sang ${newStatus}` },
          { status: 400 }
        );
      }
      if (newStatus === 'WAITING' && !rest.waitingFor?.trim()) {
        return NextResponse.json({ error: 'Cần ghi rõ đang chờ ai/gì' }, { status: 400 });
      }
      if (newStatus === 'DEFERRED' && !rest.deferredTo) {
        return NextResponse.json({ error: 'Cần chọn ngày dời lại' }, { status: 400 });
      }

      const reopening = checkReopen(existing.status as PwrStatus, newStatus as PwrStatus);
      if (reopening && !reason?.trim()) {
        return NextResponse.json({ error: 'Cần ghi rõ lý do mở lại task' }, { status: 400 });
      }

      updatePayload.status = newStatus;

      if (newStatus === 'DONE') {
        updatePayload.completedAt = new Date();
        if (rest.result) updatePayload.result = rest.result;
      }
      if (reopening) updatePayload.completedAt = null;
      if (newStatus === 'CANCELLED' && reason) updatePayload.cancelReason = reason;

      // System work log
      await db.insert(pwrWorkLogs).values({
        taskId:      id,
        userId:      session.id,
        logType:     'SYSTEM',
        content:     `Trạng thái: ${existing.status} → ${newStatus}${reason ? '. Lý do: ' + reason : ''}`,
        statusFrom:  existing.status,
        statusTo:    newStatus,
        isSystemLog: true,
      });

      // Status audit
      await db.insert(pwrTaskAuditLog).values({
        taskId:    id,
        userId:    session.id,
        action:    reopening ? 'REOPENED' : 'STATUS_CHANGED',
        fieldName: 'status',
        oldValue:  existing.status,
        newValue:  newStatus,
        reason:    reason || null,
      });
    }

    // FIELD_UPDATED audit entries
    for (const entry of fieldAudits) {
      await db.insert(pwrTaskAuditLog).values({
        taskId:    id,
        userId:    session.id,
        action:    'FIELD_UPDATED',
        fieldName: entry.fieldName,
        oldValue:  entry.oldValue,
        newValue:  entry.newValue,
      });
    }

    const [updated] = await db
      .update(pwrTasks)
      .set(updatePayload)
      .where(eq(pwrTasks.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PATCH /api/pwr/tasks/:id]', error);
    return NextResponse.json({ error: 'Không thể cập nhật công việc' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const [existing] = await db.select().from(pwrTasks)
      .where(and(eq(pwrTasks.id, id), eq(pwrTasks.userId, session.id), isNull(pwrTasks.deletedAt)));

    if (!existing) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });

    await db.update(pwrTasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(pwrTasks.id, id));

    await db.insert(pwrTaskAuditLog).values({
      taskId:   id,
      userId:   session.id,
      action:   'DELETED',
      oldValue: existing.status,
      newValue: 'DELETED',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/pwr/tasks/:id]', error);
    return NextResponse.json({ error: 'Không thể xóa công việc' }, { status: 500 });
  }
}
