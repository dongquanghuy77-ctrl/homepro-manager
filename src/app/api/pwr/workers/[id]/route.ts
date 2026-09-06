import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/lib/auth';

const MANAGER_ROLES = ['ADMIN', 'MANAGER', 'HR'];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, MANAGER_ROLES);
  if (auth.error) return auth.error;
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'ID khong hop le' }, { status: 400 });
    const { name, phone, newPassword } = await req.json();
    const [worker] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id));
    if (!worker) return NextResponse.json({ error: 'Khong tim thay tho' }, { status: 404 });
    if (worker.role !== 'WORKER') return NextResponse.json({ error: 'Chi duoc sua tai khoan tho' }, { status: 403 });
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name?.trim()) updates.name = name.trim();
    if (phone?.trim()) {
      const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone.trim()));
      if (dup && dup.id !== id) return NextResponse.json({ error: 'So dien thoai da dang ky boi tai khoan khac' }, { status: 409 });
      updates.phone = phone.trim();
    }
    if (newPassword?.trim()) {
      if (newPassword.trim().length < 6) return NextResponse.json({ error: 'Mat khau toi thieu 6 ky tu' }, { status: 400 });
      updates.password = await bcrypt.hash(newPassword.trim(), 10);
    }
    const [updated] = await db.update(users).set(updates as any).where(eq(users.id, id))
      .returning({ id: users.id, name: users.name, phone: users.phone, role: users.role });
    return NextResponse.json({ success: true, worker: updated });
  } catch (e: any) {
    console.error('[PATCH /api/pwr/workers/:id]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, MANAGER_ROLES);
  if (auth.error) return auth.error;
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'ID khong hop le' }, { status: 400 });
    const [worker] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id));
    if (!worker) return NextResponse.json({ error: 'Khong tim thay tho' }, { status: 404 });
    if (worker.role !== 'WORKER') return NextResponse.json({ error: 'Chi duoc xoa tai khoan tho' }, { status: 403 });
    await db.update(users).set({ role: 'INACTIVE' as any, updatedAt: new Date() } as any).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
