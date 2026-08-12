export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { attendance, users } from '@/db/schema';
import { requireAuth, ADMIN_OR_MANAGER, ALL_ROLES, getEffectiveTeamMemberIds } from '@/lib/auth';
import { eq, and, desc, like, inArray } from 'drizzle-orm';
import { getWorkHours, calculateAttendanceStats, writeHrAuditLog } from '@/lib/hr';

// ─── GET: Danh sách chấm công (lọc theo quyền) ────────────
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES); // ALL_ROLES includes VIEWER
  if (error) return error;

  try {
    const { getAttendanceReadScope } = await import('@/lib/permissions/checker');
    const readScope = await getAttendanceReadScope(session);

    if (readScope === 'NONE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const conditions = [];
    if (readScope === 'DEPARTMENT') {
      conditions.push(eq(users.departmentId, session.departmentId!));
    } else if (readScope === 'SELF') {
      conditions.push(eq(attendance.employeeId, session.id));
    }

    const { searchParams } = new URL(req.url);
    const date       = searchParams.get('date')?.trim()       || null;
    const employeeId = searchParams.get('employeeId')?.trim() || null;
    const department = searchParams.get('department')?.trim() || null;
    const month      = searchParams.get('month')?.trim()      || null; // YYYY-MM

    if (date)       conditions.push(eq(attendance.workDate, date));
    if (employeeId) conditions.push(eq(attendance.employeeId, parseInt(employeeId, 10)));
    
    // Ignore frontend department filter if readScope is DEPARTMENT or SELF
    if (department && readScope === 'ALL') conditions.push(eq(users.department, department));
    
    if (month)      conditions.push(like(attendance.workDate, `${month}-%`));

    const records = await db
      .select({
        id:                attendance.id,
        employeeId:        attendance.employeeId,
        workDate:          attendance.workDate,
        checkIn:           attendance.checkIn,
        checkOut:          attendance.checkOut,
        status:            attendance.status,
        lateMinutes:       attendance.lateMinutes,
        earlyLeaveMinutes: attendance.earlyLeaveMinutes,
        totalHours:        attendance.totalHours,
        note:              attendance.note,
        location:          attendance.location,
        correctedBy:       attendance.correctedBy,
        correctedAt:       attendance.correctedAt,
        updatedAt:         attendance.updatedAt,
        // Employee info from JOIN
        employeeName:      users.name,
        employeeCode:      users.employeeCode,
        department:        users.department,
      })
      .from(attendance)
      .leftJoin(users, eq(attendance.employeeId, users.id))
      .where(and(...conditions))
      .orderBy(desc(attendance.workDate), attendance.employeeId);

    return NextResponse.json(records);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Admin/Manager tạo bản ghi chấm công cho nhân viên bất kỳ ──────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  try {
    const body = await req.json();
    const { employeeId, workDate, checkIn, checkOut, status, note, location } = body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!employeeId || isNaN(Number(employeeId))) {
      return NextResponse.json({ error: 'employeeId bắt buộc và phải là số' }, { status: 400 });
    }
    if (!workDate || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
      return NextResponse.json({ error: 'workDate bắt buộc, định dạng YYYY-MM-DD' }, { status: 400 });
    }

    const empIdNum = Number(employeeId);

    // ── Check employee exists ──────────────────────────────────────────────────
    const [employee] = await db.select({ id: users.id, name: users.name, departmentId: users.departmentId })
      .from(users).where(eq(users.id, empIdNum));
    if (!employee) {
      return NextResponse.json({ error: 'Nhân viên không tồn tại' }, { status: 404 });
    }

    // ── RBAC Authorization Check ──────────────────────────────────────────────
    const { canWriteAttendance } = await import('@/lib/permissions/checker');
    if (!(await canWriteAttendance(session, employee.id, employee.departmentId))) {
      return NextResponse.json({ error: 'Bạn không có quyền quản lý nhân viên này' }, { status: 403 });
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `status không hợp lệ. Cho phép: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // ── Check duplicate (employee_id + work_date UNIQUE) ──────────────────────
    const [existing] = await db.select({ id: attendance.id })
      .from(attendance)
      .where(and(eq(attendance.employeeId, empIdNum), eq(attendance.workDate, workDate)));
    if (existing) {
      return NextResponse.json(
        { error: `Nhân viên ${employee.name} đã có bản ghi chấm công ngày ${workDate}` },
        { status: 409 }
      );
    }

    // ── Compute stats if check times provided ─────────────────────────────────
    const now = new Date();
    const checkInDate  = checkIn  ? new Date(checkIn)  : null;
    const checkOutDate = checkOut ? new Date(checkOut) : null;

    let computedStatus = status || 'NOT_CHECKED';
    let lateMinutes       = 0;
    let earlyLeaveMinutes = 0;
    let totalHours        = 0;

    if (checkInDate) {
      const workHours = await getWorkHours();
      const stats     = calculateAttendanceStats(
        checkInDate, checkOutDate,
        workHours.start, workHours.end,
        workHours.breakStart, workHours.breakEnd   // truyền giờ nghỉ trưa
      );
      lateMinutes       = stats.lateMinutes;
      earlyLeaveMinutes = stats.earlyLeaveMinutes;
      totalHours        = stats.totalHours;
      // Only auto-compute status if not manually set
      if (!status) computedStatus = stats.status;
    }

    // ABSENT override: no check-in means absent
    if (!checkInDate && !status) computedStatus = 'ABSENT';

    const [newRecord] = await db.insert(attendance).values({
      employeeId:        empIdNum,
      workDate,
      checkIn:           checkInDate,
      checkOut:          checkOutDate,
      status:            computedStatus,
      lateMinutes,
      earlyLeaveMinutes,
      totalHours,
      note:              note?.trim() || null,
      location:          location?.trim() || null,
      createdAt:         now,
      updatedAt:         now,
    }).returning();

    await writeHrAuditLog({
      action:     'ATTENDANCE_CREATED',
      entityType: 'attendance',
      entityId:   newRecord.id,
      actorId:    session.id,
      actorName:  session.name,
      newValue:   { employeeId: empIdNum, workDate, status: computedStatus },
      ipAddress:  req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(newRecord, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'Bản ghi chấm công đã tồn tại cho ngày này' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

