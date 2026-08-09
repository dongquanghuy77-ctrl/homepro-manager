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

  if (session.role !== 'ADMIN' && session.role !== 'MANAGER' && session.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [employee] = await db.select({
      id: users.id,
      username: users.username,
      name: users.name,
      position: users.position,
      role: users.role,
      phone: users.phone,
      active: users.active,
      employeeCode: users.employeeCode,
      department: users.department,
      employmentType: users.employmentType,
      joinDate: users.joinDate,
      managerId: users.managerId,
      employeeStatus: users.employeeStatus,
      note: users.note,
      birthDate: users.birthDate,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).where(eq(users.id, id));

    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(employee);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ADMIN_ONLY);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

  try {
    const body = await req.json();
    const updateData: any = { ...body };
    delete updateData.password;
    delete updateData.username;
    delete updateData.employeeCode;
    
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }
    
    updateData.updatedAt = new Date();

    const [oldUser] = await db.select().from(users).where(eq(users.id, id));

    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning({ id: users.id });

    await writeHrAuditLog({
      action: 'EMPLOYEE_UPDATED',
      entityType: 'user',
      entityId: id,
      actorId: session.id,
      actorName: session.name,
      oldValue: { ...oldUser, password: '[REDACTED]' },
      newValue: body,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ success: true, id: updatedUser.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, ADMIN_ONLY);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
