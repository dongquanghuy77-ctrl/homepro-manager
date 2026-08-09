import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu' }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username.trim()), eq(users.password, password.trim())));

    if (!user) {
      return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: 'Tài khoản đã bị tạm khóa' }, { status: 403 });
    }

    const userPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    const cookieStore = cookies();
    cookieStore.set('homepro_user', JSON.stringify(userPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true, user: userPayload });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống khi đăng nhập' }, { status: 500 });
  }
}
