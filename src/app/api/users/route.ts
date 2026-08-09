import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { requireAuth, ADMIN_ONLY } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, ADMIN_ONLY);
  if (error) return error;

  try {
    const list = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        position: users.position,
        birthDate: users.birthDate,
        role: users.role,
        phone: users.phone,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.id));

    return NextResponse.json(list);
  } catch (err) {
    console.error('GET /api/users error:', err);
    return NextResponse.json({ error: 'Không thể tải danh sách tài khoản' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req, ADMIN_ONLY);
  if (error) return error;

  try {
    const body = await req.json();
    const { username, password, name, position, birthDate, role, phone } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (Tên đăng nhập, Mật khẩu, Họ tên)' }, { status: 400 });
    }

    // Check duplicate username
    const existing = await db.select().from(users).where(eq(users.username, username.trim()));
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại trong hệ thống' }, { status: 400 });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const [newUser] = await db
      .insert(users)
      .values({
        username: username.trim(),
        password: hashedPassword,
        name: name.trim(),
        position: position ? position.trim() : null,
        birthDate: birthDate ? birthDate.trim() : null,
        role: role || 'WORKER',
        phone: phone ? phone.trim() : null,
      })
      .returning({ id: users.id, username: users.username, name: users.name, role: users.role, active: users.active });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err) {
    console.error('POST /api/users error:', err);
    return NextResponse.json({ error: 'Không thể tạo tài khoản' }, { status: 500 });
  }
}
