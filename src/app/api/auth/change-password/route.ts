import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { checkChangePasswordRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // ── Rate Limiting: 3 attempts / 5 min per user ID ──────────
    const { success, reset } = await checkChangePasswordRateLimit(`user:${session.id}`);
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Quá nhiều lần đổi mật khẩu. Vui lòng thử lại sau ${Math.ceil(retryAfter / 60)} phút.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }
    // ─────────────────────────────────────────────────────────────

    const body = await req.json();
    const { currentPassword, newPassword, newPin } = body;

    if (!newPassword && !newPin) {
      return NextResponse.json({ error: 'Vui lòng cung cấp mật khẩu mới hoặc mã PIN mới' }, { status: 400 });
    }

    // Fetch current user from DB
    const [user] = await db.select().from(users).where(eq(users.id, session.id));

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    const updates: any = {
      requirePasswordChange: false,
      updatedAt: new Date(),
    };

    if (newPassword) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
      }
      
      // Verify current password if currentPassword is provided
      if (currentPassword) {
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
      }

      // Hash the new password before saving
      updates.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    if (newPin) {
      const pinStr = String(newPin).trim();
      if (pinStr.length !== 6 || /\D/.test(pinStr)) {
        return NextResponse.json({ error: 'Mã PIN mới phải gồm đúng 6 chữ số' }, { status: 400 });
      }
      updates.pinHash = await bcrypt.hash(pinStr, 10);
    }

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, session.id));

    return NextResponse.json({ success: true, message: 'Cập nhật thông tin xác thực thành công!' });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Không thể cập nhật thông tin xác thực' }, { status: 500 });
  }
}
