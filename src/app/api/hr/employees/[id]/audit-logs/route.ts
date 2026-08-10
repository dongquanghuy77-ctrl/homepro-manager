// src/app/api/hr/employees/[id]/audit-logs/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// GET /api/hr/employees/:id/audit-logs
//   → Lấy toàn bộ lịch sử thay đổi của 1 nhân viên
//   → Trả về: AuditLogEntry[] sắp xếp mới nhất trước (created_at DESC)
//   → Giới hạn: 100 entries gần nhất để tránh over-fetch
//   → Join: actor name (tên người thực hiện) từ bảng users
// ══════════════════════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hrAuditLogs, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Type response
// ─────────────────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id:         number;
  action:     string;       // EMPLOYEE_CREATED | EMPLOYEE_UPDATED | ...
  entityType: string;
  actorId:    number | null;
  actorName:  string | null; // Tên người thực hiện tại thời điểm đó
  oldValue:   Record<string, unknown> | null; // Giá trị cũ (JSON parsed)
  newValue:   Record<string, unknown> | null; // Giá trị mới (JSON parsed)
  createdAt:  string;       // ISO string
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping action → nhãn tiếng Việt
// ─────────────────────────────────────────────────────────────────────────────
export const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  EMPLOYEE_CREATED:         { label: 'Tạo mới nhân viên',        color: '#10B981', icon: '🟢' },
  EMPLOYEE_UPDATED:         { label: 'Cập nhật thông tin',        color: '#F59E0B', icon: '✏️' },
  EMPLOYEE_DEACTIVATED:     { label: 'Ngừng hoạt động',          color: '#EF4444', icon: '🔴' },
  EMPLOYEE_REACTIVATED:     { label: 'Kích hoạt lại',            color: '#10B981', icon: '🔄' },
  ATTENDANCE_CORRECTED:     { label: 'Điều chỉnh chấm công',     color: '#8B5CF6', icon: '📋' },
  LEAVE_APPROVED:           { label: 'Duyệt nghỉ phép',          color: '#10B981', icon: '✅' },
  LEAVE_REJECTED:           { label: 'Từ chối nghỉ phép',        color: '#EF4444', icon: '❌' },
  OVERTIME_APPROVED:        { label: 'Duyệt tăng ca',            color: '#10B981', icon: '⏰' },
  OVERTIME_REJECTED:        { label: 'Từ chối tăng ca',          color: '#EF4444', icon: '⏰' },
  PASSWORD_RESET:           { label: 'Đặt lại mật khẩu',         color: '#6B7280', icon: '🔑' },
};

// ─────────────────────────────────────────────────────────────────────────────
// GET Handler
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

    // ── Query audit logs với LEFT JOIN actor ────────────────────────────────
    // Dùng alias để phân biệt users (actor) với bảng chính
    const actorAlias = db.select({
      actorId:   users.id,
      actorName: users.name,
    }).from(users).as('actor');

    const logs = await db
      .select({
        id:         hrAuditLogs.id,
        action:     hrAuditLogs.action,
        entityType: hrAuditLogs.entityType,
        actorId:    hrAuditLogs.actorId,
        actorName:  hrAuditLogs.actorName,   // Tên đã lưu tại thời điểm log
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

    // ── Parse JSON values + format response ─────────────────────────────────
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
// Helper: Parse JSON string an toàn
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
