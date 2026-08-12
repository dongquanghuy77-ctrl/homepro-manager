export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAuth, ADMIN_ONLY, ALL_ROLES } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { writeHrAuditLog } from '@/lib/hr';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  // Get target user to check permissions against their department
  const [target] = await db.select({ id: users.id, departmentId: users.departmentId }).from(users).where(eq(users.id, id));
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { canReadEmployee } = await import('@/lib/permissions/checker');
  if (!(await canReadEmployee(session, target.id, target.departmentId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [employee] = await db.select({
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
      note:           users.note,
      birthDate:      users.birthDate,
      createdAt:      users.createdAt,
      updatedAt:      users.updatedAt,
    }).from(users).where(eq(users.id, id));

    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(employee);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  const [target] = await db.select({ id: users.id, departmentId: users.departmentId }).from(users).where(eq(users.id, id));
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { canWriteEmployee } = await import('@/lib/permissions/checker');
  if (!(await canWriteEmployee(session, target.id, target.departmentId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Fix 3: Typed update payload — chỉ cho phép các field hợp lệ từ schema users
    // Không nhận: password (handled separately), username, employeeCode (immutable)
    interface EmployeeUpdatePayload {
      name?: string;
      position?: string;
      phone?: string;
      email?: string | null;
      birthDate?: string;
      department?: string;
      employmentType?: string;
      joinDate?: string;
      managerId?: number | null;
      note?: string;
      role?: string;
      active?: boolean;
      employeeStatus?: string;
      password?: string;
      updatedAt?: Date;
    }

    const updateData: EmployeeUpdatePayload = {
      updatedAt: new Date(),
    };

    if (typeof body.name === 'string')           updateData.name = body.name.trim();
    if (typeof body.position === 'string')       updateData.position = body.position.trim() || null;
    if (typeof body.phone === 'string')          updateData.phone = body.phone.trim() || null;
    if (typeof body.email === 'string')          updateData.email = body.email.trim().toLowerCase() || null;
    if (body.email === null)                     updateData.email = null;
    if (typeof body.birthDate === 'string')      updateData.birthDate = body.birthDate || null;
    if (typeof body.department === 'string')     updateData.department = body.department || null;
    if (typeof body.employmentType === 'string') updateData.employmentType = body.employmentType;
    if (typeof body.joinDate === 'string')       updateData.joinDate = body.joinDate || null;
    if (body.managerId !== undefined)            updateData.managerId = body.managerId === null ? null : Number(body.managerId);
    if (typeof body.note === 'string')           updateData.note = body.note.trim() || null;
    if (typeof body.role === 'string')           updateData.role = body.role;
    if (typeof body.active === 'boolean')        updateData.active = body.active;
    if (typeof body.employeeStatus === 'string') updateData.employeeStatus = body.employeeStatus;

    // Password hash riêng nếu được cung cấp
    if (typeof body.password === 'string' && body.password.trim()) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const [oldUser] = await db.select().from(users).where(eq(users.id, id));
    if (!oldUser) return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 });

    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning({ id: users.id });

    await writeHrAuditLog({
      action: 'EMPLOYEE_UPDATED',
      entityType: 'user',
      entityId: id,
      actorId: session.id,
      actorName: session.name,
      oldValue: { ...oldUser, password: '[REDACTED]' },
      newValue: { ...body, password: body.password ? '[REDACTED]' : undefined },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ success: true, id: updatedUser.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ALL_ROLES);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  const [target] = await db.select({ id: users.id, departmentId: users.departmentId }).from(users).where(eq(users.id, id));
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { canWriteEmployee } = await import('@/lib/permissions/checker');
  if (!(await canWriteEmployee(session, target.id, target.departmentId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { active, employeeStatus } = body;
    
    const [oldUser] = await db.select().from(users).where(eq(users.id, id));

    const [updatedUser] = await db.update(users).set({ 
      active, 
      employeeStatus,
      updatedAt: new Date()
    }).where(eq(users.id, id)).returning({ id: users.id });

    await writeHrAuditLog({
      action: 'EMPLOYEE_STATUS_CHANGED',
      entityType: 'user',
      entityId: id,
      actorId: session.id,
      actorName: session.name,
      oldValue: { active: oldUser.active, employeeStatus: oldUser.employeeStatus },
      newValue: { active, employeeStatus },
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
