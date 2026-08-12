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
    const { getEmployeeProfile } = await import('@/lib/repositories/hr-core');
    let employee = await getEmployeeProfile(id);

    // Fallback for unmapped (MANUAL_INPUT) or SYSTEM accounts
    if (!employee) {
      const legacyResult = await db.select({
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

      if (legacyResult.length > 0) {
        employee = legacyResult[0] as any; // Cast safely since it matches LegacyEmployeeDTO shape
      }
    }

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

    const { updateEmployeeTransaction } = await import('@/lib/services/hr-core');
    await updateEmployeeTransaction(id, {
      name: body.name?.trim(),
      position: body.position?.trim(),
      phone: body.phone?.trim(),
      email: body.email?.trim().toLowerCase(),
      birthDate: body.birthDate,
      department: body.department,
      employmentType: body.employmentType,
      joinDate: body.joinDate,
      managerId: body.managerId,
      note: body.note?.trim(),
      role: body.role,
      officialSalary: body.officialSalary,
      password: body.password,
      employeeCode: body.employeeCode,
      actorId: session.id,
      actorName: session.name,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ success: true, id });
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
    
    const { changeEmployeeStatusTransaction } = await import('@/lib/services/hr-core');
    
    await changeEmployeeStatusTransaction(id, {
      active,
      employeeStatus,
      actorId: session.id,
      actorName: session.name,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
