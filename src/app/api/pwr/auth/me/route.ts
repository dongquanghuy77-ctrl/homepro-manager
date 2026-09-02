import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Lấy session từ NextAuth (dành riêng cho Kiosk Station)
  const session = await getServerSession();

  if (!session?.user?.email && !session?.user?.name) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }

  // Tìm user theo username (username = số điện thoại) hoặc email
  // NextAuth authorize() trả về { id, name, email } — dùng name (= username/phone) để lookup
  let user = null;

  // Thử tìm theo email trước
  if (session.user.email) {
    const rows = await db.select({
      id:       users.id,
      username: users.username,
      name:     users.name,
      role:     users.role,
      phone:    users.phone,
    }).from(users).where(eq(users.email, session.user.email));
    user = rows[0] ?? null;
  }

  // Nếu không có email hoặc không tìm được, tìm theo session.user.name (là username/SĐT)
  if (!user && session.user.name) {
    const rows = await db.select({
      id:       users.id,
      username: users.username,
      name:     users.name,
      role:     users.role,
      phone:    users.phone,
    }).from(users).where(eq(users.username, session.user.name));
    user = rows[0] ?? null;
  }

  if (!user) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
  }

  return NextResponse.json({ user });
}
