import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' }, { status: 400 });
    }

    if (newPassword.trim().length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    // Fetch current user from DB
    const [user] = await db.select().from(users).where(eq(users.id, session.id));

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    // Verify current password — support both bcrypt and legacy plain-text
    let passwordMatch = false;
    const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
    if (isHashed) {
      passwordMatch = await bcrypt.compare(currentPassword.trim(), user.password);
    } else {
      passwordMatch = user.password === currentPassword.trim();
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 400 });
    }

    // Hash the new password before saving
    const hashedNew = await bcrypt.hash(newPassword.trim(), 10);

    await db
      .update(users)
      .set({ password: hashedNew, updatedAt: new Date() })
      .where(eq(users.id, session.id));

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Không thể đổi mật khẩu' }, { status: 500 });
  }
}
