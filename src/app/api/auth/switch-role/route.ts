import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession, createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getSession();

    if (!currentUser) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Only ADMIN (or someone using Admin's original session) can switch role
    const effectiveRole = (currentUser as any).originalRole || currentUser.role;
    if (effectiveRole !== 'ADMIN') {
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
      originalRole: effectiveRole, // Preserve Admin's original identity
    };

    // Re-issue signed JWT cookie
    await createSession(userPayload);

    return NextResponse.json({ success: true, user: userPayload });
  } catch (err) {
    console.error('Switch role error:', err);
    return NextResponse.json({ error: 'Lỗi khi chuyển đổi vai trò' }, { status: 500 });
  }
}
