import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, pwrUserStats } from '@/db/schema';
import { requireAuth, ADMIN_OR_MANAGER } from '@/lib/auth';
import { eq, or, desc, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const MANAGER_ROLES = ['ADMIN', 'MANAGER', 'HR'];

// GET /api/pwr/workers — Danh sách tất cả worker
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, MANAGER_ROLES);
  if (auth.error) return auth.error;

  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        totalPoints: pwrUserStats.totalPoints,
        currentLevel: pwrUserStats.currentLevel,
        tasksCompleted: pwrUserStats.tasksCompleted,
      })
      .from(users)
      .leftJoin(pwrUserStats, eq(pwrUserStats.userId, users.id))
      .where(eq(users.role, 'WORKER'))
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ workers: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/pwr/workers — Tạo worker mới (shortcut, tái dùng logic register)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, MANAGER_ROLES);
  if (auth.error) return auth.error;

  try {
    const { name, phone, password } = await req.json() as { name: string; phone: string; password: string };

    if (!name?.trim() || !phone?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ: Tên, SĐT, Mật khẩu' }, { status: 400 });
    }

    // Check trùng phone
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone.trim()));
    if (existing) return NextResponse.json({ error: 'Số điện thoại đã được đăng ký' }, { status: 409 });

    const hashed = await bcrypt.hash(password, 10);
    const username = 'worker_' + phone.replace(/\D/g, '').slice(-8);

    const [newWorker] = await db.insert(users).values({
      name: name.trim(),
      phone: phone.trim(),
      username,
      password: hashed,
      role: 'WORKER',
    } as any).returning({ id: users.id, name: users.name, phone: users.phone, role: users.role });

    return NextResponse.json({ success: true, worker: newWorker }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
