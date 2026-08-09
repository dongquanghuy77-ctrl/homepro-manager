import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('homepro_user');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const currentUser = JSON.parse(sessionCookie.value);

    // Only ADMIN or existing session can switch role
    if (currentUser.role !== 'ADMIN' && currentUser.originalRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền chuyển đổi vai trò kiểm thử' }, { status: 403 });
    }

    const body = await req.json();
    const { targetUsername } = body;

    if (!targetUsername) {
      return NextResponse.json({ error: 'Thiếu thông tin tài khoản đích' }, { status: 400 });
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, targetUsername.trim()));

    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản đích' }, { status: 404 });
    }

    const userPayload = {
      id: targetUser.id,
      username: targetUser.username,
      name: targetUser.name,
      role: targetUser.role,
      originalRole: currentUser.originalRole || currentUser.role, // Remember Admin original identity
    };

    cookieStore.set('homepro_user', JSON.stringify(userPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ success: true, user: userPayload });
  } catch (err) {
    console.error('Switch role error:', err);
    return NextResponse.json({ error: 'Lỗi khi chuyển đổi vai trò' }, { status: 500 });
  }
}
