export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAuth, ADMIN_ONLY, ADMIN_OR_MANAGER, ALL_ROLES } from '@/lib/auth';
import { eq, or, ilike, and, desc } from 'drizzle-orm';
import { generateEmployeeCode, writeHrAuditLog } from '@/lib/hr';
import bcrypt from 'bcryptjs';

// ─── GET: Danh sách nhân viên (VIEWER được xem, không thêm/sửa) ───────────────
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  try {
    const { getEmployeeReadScope } = await import('@/lib/permissions/checker');
    const readScope = await getEmployeeReadScope(session);
    
    if (readScope === 'NONE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department')?.trim() || null;
    const status = searchParams.get('status')?.trim() || null;
    const search = searchParams.get('search')?.trim() || null;
    const role = searchParams.get('role')?.trim() || null;

    const conditions = [];
    
    if (readScope === 'DEPARTMENT') {
      conditions.push(eq(users.departmentId, session.departmentId!));
    } else if (readScope === 'SELF') {
      conditions.push(eq(users.id, session.id));
    }

    // Ignore frontend department filter if readScope is DEPARTMENT or SELF
    if (department && readScope === 'ALL') conditions.push(eq(users.department, department));
    
    if (status)     conditions.push(eq(users.employeeStatus, status));
    if (role)       conditions.push(eq(users.role, role));
    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.employeeCode, `%${search}%`),
          ilike(users.phone, `%${search}%`)
        )
      );
    }

    const employeeList = await db.select({
      id:             users.id,
      username:       users.username,
      name:           users.name,
      position:       users.position,
      role:           users.role,
      phone:          users.phone,
      email:          users.email,
      active:         users.active,
      employeeCode:   users.employeeCode,
      department:     users.department,
      employmentType: users.employmentType,
      joinDate:       users.joinDate,
      managerId:      users.managerId,
      employeeStatus: users.employeeStatus,
      birthDate:      users.birthDate,
      note:           users.note,
      createdAt:      users.createdAt,
      updatedAt:      users.updatedAt,
      // password is intentionally NOT selected
    })
      .from(users)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(users.createdAt));

    return NextResponse.json(employeeList);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Tạo nhân viên mới (ADMIN only) ────────────────────────────────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const { canWriteEmployee } = await import('@/lib/permissions/checker');
  if (!(await canWriteEmployee(session, 0, null))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();

    // ── Input validation ──────────────────────────────────────────────────────
    const { name, username, password, position, role, phone, email,
            birthDate, department, employmentType, joinDate, managerId, note } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Họ tên không được để trống' }, { status: 400 });
    }
    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Tên đăng nhập không được để trống' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }
    if (phone && !/^[0-9+\-\s()]{8,15}$/.test(phone.trim())) {
      return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 });
    }

    // ── Check duplicate username ──────────────────────────────────────────────
    const [existing] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.username, username.trim().toLowerCase()));
    if (existing) {
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 409 });
    }

    // ── Hash password + generate employee code ────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);
    const employeeCode   = await generateEmployeeCode();

    const validRoles = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'WORKER', 'VIEWER'];
    const safeRole = validRoles.includes(role) ? role : 'WORKER';

    const validEmploymentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT'];
    const safeEmploymentType = validEmploymentTypes.includes(employmentType)
      ? employmentType : 'FULL_TIME';

    const [newUser] = await db.insert(users).values({
      name:           name.trim(),
      username:       username.trim().toLowerCase(),
      password:       hashedPassword,
      position:       position?.trim() || null,
      role:           safeRole,
      phone:          phone?.trim() || null,
      email:          email?.trim().toLowerCase() || null,
      birthDate:      birthDate || null,
      department:     department || null,
      employmentType: safeEmploymentType,
      joinDate:       joinDate || null,
      managerId:      managerId ? Number(managerId) : null,
      note:           note?.trim() || null,
      employeeCode,
      active:         true,
      employeeStatus: 'ACTIVE',
    }).returning({ id: users.id, employeeCode: users.employeeCode });

    await writeHrAuditLog({
      action:     'EMPLOYEE_CREATED',
      entityType: 'employee',
      entityId:   newUser.id,
      actorId:    session.id,
      actorName:  session.name,
      newValue:   { name, username, department, position, role },
      ipAddress:  req.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(
      { success: true, id: newUser.id, employeeCode: newUser.employeeCode },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    // Catch unique constraint violation (username or employee_code)
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
