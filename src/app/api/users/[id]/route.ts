import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { requireAuth, ADMIN_ONLY } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(req, ADMIN_ONLY);
  if (error) return error;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const body = await req.json();
    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.position !== undefined) updateData.position = body.position ? body.position.trim() : null;
    if (body.birthDate !== undefined) updateData.birthDate = body.birthDate ? body.birthDate.trim() : null;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.phone !== undefined) updateData.phone = body.phone ? body.phone.trim() : null;
    if (body.active !== undefined) updateData.active = Boolean(body.active);
    if (body.password) {
      // Hash the new password before saving
      updateData.password = await bcrypt.hash(body.password.trim(), 10);
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id, username: users.username, name: users.name,
        role: users.role, active: users.active, phone: users.phone,
        position: users.position, birthDate: users.birthDate,
      });

    if (!updated) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/users/:id error:', err);
    return NextResponse.json({ error: 'Không thể cập nhật người dùng' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(req, ADMIN_ONLY);
  if (error) return error;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    await db.update(users).set({ active: false, employeeStatus: 'TERMINATED' }).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err);
    return NextResponse.json({ error: 'Không thể xóa người dùng' }, { status: 500 });
  }
}
