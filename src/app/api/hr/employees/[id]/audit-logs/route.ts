// src/app/api/hr/employees/[id]/audit-logs/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse }  from 'next/server';
import { db }                          from '@/db';
import { hrAuditLogs, users }          from '@/db/schema';
import { eq, and, desc }               from 'drizzle-orm';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import type { AuditLogEntry }          from '@/lib/audit-log-types';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hr/employees/:id/audit-logs
// Lấy lịch sử thay đổi của 1 nhân viên (100 entries mới nhất)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req:     NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  const employeeId = parseInt(params.id, 10);
  if (isNaN(employeeId)) {
    return NextResponse.json({ error: 'ID nhân viên không hợp lệ' }, { status: 400 });
  }

  try {
    // ── Kiểm tra nhân viên tồn tại ─────────────────────────────────────────
    const [employee] = await db
      .select({ id: users.id, name: users.name, employeeCode: users.employeeCode })
      .from(users)
      .where(eq(users.id, employeeId))
      .limit(1);

    if (!employee) {
      return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 });
    }

    // ── Query audit logs ────────────────────────────────────────────────────
    const logs = await db
      .select({
        id:         hrAuditLogs.id,
        action:     hrAuditLogs.action,
        entityType: hrAuditLogs.entityType,
        actorId:    hrAuditLogs.actorId,
        actorName:  hrAuditLogs.actorName,
        oldValue:   hrAuditLogs.oldValue,
        newValue:   hrAuditLogs.newValue,
        createdAt:  hrAuditLogs.createdAt,
      })
      .from(hrAuditLogs)
      .where(
        and(
          eq(hrAuditLogs.entityType, 'employee'),
          eq(hrAuditLogs.entityId,   employeeId)
        )
      )
      .orderBy(desc(hrAuditLogs.createdAt))
      .limit(100);

    // ── Format response ─────────────────────────────────────────────────────
    const entries: AuditLogEntry[] = logs.map((log) => ({
      id:         log.id,
      action:     log.action,
      entityType: log.entityType,
      actorId:    log.actorId   ?? null,
      actorName:  log.actorName ?? null,
      oldValue:   safeParseJson(log.oldValue),
      newValue:   safeParseJson(log.newValue),
      createdAt:  log.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    return NextResponse.json({
      employee: { id: employee.id, name: employee.name, code: employee.employeeCode },
      logs:     entries,
      total:    entries.length,
    });

  } catch (err) {
    console.error(`[HR AuditLog] GET /api/hr/employees/${employeeId}/audit-logs:`, err);
    return NextResponse.json({ error: 'Lỗi server khi lấy lịch sử' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function safeParseJson(str: string | null | undefined): Record<string, unknown> | null {
  if (!str) return null;
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}
