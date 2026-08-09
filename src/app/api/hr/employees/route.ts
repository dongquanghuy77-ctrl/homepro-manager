export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAuth, ADMIN_ONLY, ADMIN_OR_MANAGER } from '@/lib/auth';
import { eq, or, ilike, and, desc } from 'drizzle-orm';
import { generateEmployeeCode, writeHrAuditLog } from '@/lib/hr';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req, ADMIN_OR_MANAGER);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const conditions = [];
    if (department) conditions.push(eq(users.department, department));
    if (status) conditions.push(eq(users.employeeStatus, status));
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
    }).from(users).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(users.createdAt));

    return NextResponse.json(employeeList);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req, ADMIN_ONLY);
  if (error) return error;

  try {
    const body = await req.json();
    const { name, username, password, position, role, phone, birthDate, department, employmentType, joinDate, managerId, note } = body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const employeeCode = await generateEmployeeCode();

    const [newUser] = await db.insert(users).values({
      name,
      username,
      password: hashedPassword,
      position,
      role,
      phone,
      birthDate,
      department,
      employmentType,
      joinDate,
      managerId,
      note,
      employeeCode,
      active: true,
      employeeStatus: 'ACTIVE'
    }).returning({ id: users.id });

    await writeHrAuditLog({
      action: 'EMPLOYEE_CREATED',
      entityType: 'user',
      entityId: newUser.id,
      actorId: session.id,
      actorName: session.name,
      oldValue: undefined,
      newValue: body,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ success: true, id: newUser.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
