import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' }, { status: 400 });
    }

    if (newPassword.trim().length < 4) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 4 ký tự' }, { status: 400 });
    }

    // Verify current password
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, currentUser.id), eq(users.password, currentPassword.trim())));

    if (!user) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 400 });
    }

    // Update password
    await db
      .update(users)
      .set({
        password: newPassword.trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.id));

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Không thể đổi mật khẩu' }, { status: 500 });
  }
}
