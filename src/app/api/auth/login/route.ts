import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';
import { loginRatelimit, getIP } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // ── Rate Limiting: 5 requests / 60s per IP ──────────────────
    const ip = getIP(req);
    const { success, limit, remaining, reset } = await loginRatelimit.limit(ip);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: `Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau ${retryAfter} giây.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'Retry-After': String(retryAfter),
          },
        }
      );
    }
    // ────────────────────────────────────────────────────────────

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu' }, { status: 400 });
    }

    // Fetch user by username only (password compare happens via bcrypt)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim()));

    if (!user) {
      return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, { status: 401 });
    }

    // Compare password: supports both bcrypt hashes and legacy plain-text
    let passwordMatch = false;
    const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
    if (isHashed) {
      passwordMatch = await bcrypt.compare(password.trim(), user.password);
    } else {
      // Legacy plain-text fallback (temporary until full migration)
      passwordMatch = user.password === password.trim();
    }

    if (!passwordMatch) {
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

    // Create signed JWT session cookie
    await createSession(userPayload);

    return NextResponse.json({ success: true, user: userPayload });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống khi đăng nhập' }, { status: 500 });
  }
}
