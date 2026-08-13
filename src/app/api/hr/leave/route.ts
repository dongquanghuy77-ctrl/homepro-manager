export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaveRequests, users } from '@/db/schema';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { calculateLeaveDays, writeHrAuditLog } from '@/lib/hr';
import { eq, and, desc, gte, lte, inArray, or } from 'drizzle-orm';
import { getEffectiveTeamMemberIds } from '@/lib/rbac';

// ── Valid leave types and statuses ────────────────────────────────────────────
const VALID_LEAVE_TYPES = ['ANNUAL', 'SICK', 'PERSONAL', 'UNPAID', 'OTHER'] as const;
type LeaveTypeValue = typeof VALID_LEAVE_TYPES[number];

// ── GET: Danh sách đơn nghỉ ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const status     = searchParams.get('status')?.trim()     || null;
    const employeeId = searchParams.get('employeeId')?.trim() || null;
    const startDate  = searchParams.get('startDate')?.trim()  || null;
    const endDate    = searchParams.get('endDate')?.trim()    || null;

    const conditions = [];

    const { getLeaveApprovalLevel } = await import('@/lib/permissions/checker');
    const approvalLevel = await getLeaveApprovalLevel(session);

    if (approvalLevel === 2) {
      if (employeeId) conditions.push(eq(leaveRequests.employeeId, Number(employeeId)));
    } else if (approvalLevel === 1) {
      if (employeeId) {
        conditions.push(eq(leaveRequests.employeeId, Number(employeeId)));
        conditions.push(eq(users.departmentId, session.departmentId!));
      } else {
        conditions.push(
          or(
            eq(leaveRequests.employeeId, session.id),
            eq(users.departmentId, session.departmentId!)
          )
        );
      }
    } else {
      conditions.push(eq(leaveRequests.employeeId, session.id));
    }

    if (status) conditions.push(eq(leaveRequests.status, status));
    if (startDate) conditions.push(gte(leaveRequests.startDate, startDate));
    if (endDate)   conditions.push(lte(leaveRequests.endDate,   endDate));

    const records = await db
      .select({
        id:          leaveRequests.id,
        employeeId:  leaveRequests.employeeId,
        leaveType:   leaveRequests.leaveType,
        startDate:   leaveRequests.startDate,
        endDate:     leaveRequests.endDate,
        totalDays:   leaveRequests.totalDays,
        reason:      leaveRequests.reason,
        status:      leaveRequests.status,
        reviewedBy:  leaveRequests.reviewedBy,
        reviewedAt:  leaveRequests.reviewedAt,
        reviewNote:  leaveRequests.reviewNote,
        createdAt:   leaveRequests.createdAt,
        updatedAt:   leaveRequests.updatedAt,
        // Employee info via JOIN
        employeeName: users.name,
        department:   users.department,
        employeeCode: users.employeeCode,
      })
      .from(leaveRequests)
      .leftJoin(users, eq(leaveRequests.employeeId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(leaveRequests.createdAt));

    // Return records + caller's identity so client knows what buttons to show
    return NextResponse.json({
      records,
      myRole: session.role,
      myId:   session.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST: Tạo đơn nghỉ ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { leaveType, startDate, endDate, reason } = body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!leaveType || !VALID_LEAVE_TYPES.includes(leaveType as LeaveTypeValue)) {
      return NextResponse.json(
        { error: `leaveType không hợp lệ. Cho phép: ${VALID_LEAVE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: 'startDate bắt buộc, định dạng YYYY-MM-DD' }, { status: 400 });
    }
    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json({ error: 'endDate bắt buộc, định dạng YYYY-MM-DD' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu' }, { status: 400 });
    }

    const totalDays = calculateLeaveDays(startDate, endDate);

    const [newRequest] = await db.insert(leaveRequests).values({
      employeeId: session.id,
      leaveType:  leaveType as LeaveTypeValue,
      startDate,
      endDate,
      totalDays,
      reason:     reason?.trim() || null,
      status:     'PENDING',
    }).returning();

    await writeHrAuditLog({
      action:     'LEAVE_CREATED',
      actorId:    session.id,
      actorName:  session.name,
      entityType: 'leave',
      entityId:   newRequest.id,
      newValue:   { leaveType, startDate, endDate, totalDays },
      ipAddress:  req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (err: unknown) {
    console.error("SQL ERROR LEAVE ROUTE:", err);
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
