export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';
import { checkLoginRateLimit, getIP } from '@/lib/ratelimit';
import { getTodayVN } from '@/lib/hr';
import { attendance } from '@/db/schema';
import { and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // ── Rate Limiting: 5 requests / 60s per IP ──────────────────
    const ip = getIP(req);
    const { success, limit, remaining, reset } = await checkLoginRateLimit(ip);

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
    const { username, password, identifier, pin } = body;

    const loginInput = (identifier || username || '').trim();

    if (!loginInput) {
      return NextResponse.json(
        { error: 'Vui lòng nhập Email, Số điện thoại hoặc Tên đăng nhập' },
        { status: 400 }
      );
    }

    // Phân loại: EMAIL (chứa @), PHONE (toàn số, 8-15 ký tự), USERNAME (khác)
    let type: 'EMAIL' | 'PHONE' | 'USERNAME' = 'USERNAME';
    if (loginInput.includes('@')) {
      type = 'EMAIL';
    } else if (/^\+?\d{8,15}$/.test(loginInput.replace(/[\s\.-]/g, ''))) {
      type = 'PHONE';
    }

    // Kiểm tra tính đầy đủ thông tin xác thực
    if (type === 'PHONE') {
      if (!pin) {
        return NextResponse.json({ error: 'Vui lòng nhập mã PIN 6 số' }, { status: 400 });
      }
    } else {
      if (!password) {
        return NextResponse.json({ error: 'Vui lòng nhập mật khẩu' }, { status: 400 });
      }
    }

    // Truy vấn cơ sở dữ liệu
    let user;
    if (type === 'EMAIL') {
      const [u] = await db.select().from(users).where(eq(users.email, loginInput));
      user = u;
    } else if (type === 'PHONE') {
      const normalizedPhone = loginInput.replace(/[\s\.-]/g, '');
      const [u] = await db.select().from(users).where(eq(users.phone, normalizedPhone));
      user = u;
    } else {
      const [u] = await db.select().from(users).where(eq(users.username, loginInput));
      user = u;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Thông tin đăng nhập hoặc mật khẩu/mã PIN không chính xác' },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json({ error: 'Tài khoản đã bị tạm khóa' }, { status: 403 });
    }

    // Xử lý xác thực theo phân loại
    if (type === 'PHONE') {
      const now = new Date();

      // Kiểm tra khóa tài khoản do brute-force PIN
      if (user.pinLockedUntil && new Date(user.pinLockedUntil) > now) {
        const diffMs = new Date(user.pinLockedUntil).getTime() - now.getTime();
        const minutesLeft = Math.ceil(diffMs / 60000);
        return NextResponse.json(
          { error: `Tài khoản đã bị khóa tạm thời do nhập sai PIN quá 5 lần. Vui lòng thử lại sau ${minutesLeft} phút.` },
          { status: 403 }
        );
      }

      if (!user.pinHash) {
        return NextResponse.json(
          { error: 'Tài khoản này chưa được cấu hình mã PIN. Vui lòng đăng nhập bằng Mật khẩu.' },
          { status: 400 }
        );
      }

      // Kiểm tra khớp PIN
      const pinStr = String(pin).trim();
      let pinMatch = false;
      const isPinHashed = user.pinHash.startsWith('$2b$') || user.pinHash.startsWith('$2a$');
      if (isPinHashed) {
        pinMatch = await bcrypt.compare(pinStr, user.pinHash);
      } else {
        pinMatch = user.pinHash === pinStr; // Plain text fallback
      }

      if (!pinMatch) {
        const newAttempts = user.failedPinAttempts + 1;
        let lockTime = null;
        let errMsg = `Mã PIN không chính xác. Bạn còn ${5 - newAttempts} lần thử.`;

        if (newAttempts >= 5) {
          lockTime = new Date(now.getTime() + 15 * 60 * 1000); // Khóa 15 phút
          errMsg = 'Tài khoản đã bị tạm khóa 15 phút do nhập sai mã PIN quá 5 lần.';
        }

        await db
          .update(users)
          .set({
            failedPinAttempts: lockTime ? 0 : newAttempts,
            pinLockedUntil: lockTime,
          })
          .where(eq(users.id, user.id));

        return NextResponse.json({ error: errMsg }, { status: 401 });
      }

      // Thành công -> Reset số lần sai
      await db
        .update(users)
        .set({ failedPinAttempts: 0, pinLockedUntil: null })
        .where(eq(users.id, user.id));
    } else {
      // Xác thực Mật khẩu (EMAIL hoặc USERNAME)
      let passwordMatch = false;
      const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
      if (isHashed) {
        passwordMatch = await bcrypt.compare(password.trim(), user.password);
      } else {
        passwordMatch = user.password === password.trim();
      }

      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Thông tin đăng nhập hoặc mật khẩu không chính xác' },
          { status: 401 }
        );
      }
    }

    // Check today's attendance — office roles (ADMIN, MANAGER, VIEWER, HR, ACCOUNTANT) bypass gate
    const today = getTodayVN();
    const OFFICE_ROLES = ['ADMIN', 'MANAGER', 'VIEWER', 'HR', 'ACCOUNTANT'];
    let lastAttendanceDate: string | null = null;

    if (OFFICE_ROLES.includes(user.role)) {
      // Office roles always pass attendance gate — set to today
      lastAttendanceDate = today;
    } else {
      // For WORKER/STAFF/DESIGNER — check via employees table
      try {
        const empRes = await db.execute(
          `SELECT a.work_date FROM attendance a
           JOIN employees e ON e.id = a.employee_id
           WHERE e.user_id = ${user.id} AND a.work_date = '${today}'
           LIMIT 1`
        );
        const rows = (empRes as any).rows || [];
        
        if (rows.length > 0) {
          lastAttendanceDate = today;
        } else {
          // fallback check if user checks in directly with their user.id
          const [attRecord] = await db
            .select()
            .from(attendance)
            .where(and(eq(attendance.employeeId, user.id), eq(attendance.workDate, today)));
          lastAttendanceDate = (attRecord && attRecord.checkIn) ? today : null;
        }
      } catch {
        // fallback: also check attendance by employee_id=user.id
        const [attRecord] = await db
          .select()
          .from(attendance)
          .where(and(eq(attendance.employeeId, user.id), eq(attendance.workDate, today)));
        lastAttendanceDate = (attRecord && attRecord.checkIn) ? today : null;
      }
    }

    const userPayload = {
      id:           user.id,
      username:     user.username,
      name:         user.name,
      role:         user.role,
      departmentId: (user as { departmentId?: number | null }).departmentId ?? null,
      requirePasswordChange: (user as any).requirePasswordChange ?? false,
      lastAttendanceDate,
    };

    // Tạo signed session JWT cookie
    await createSession(userPayload);

    return NextResponse.json({ success: true, user: userPayload });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống khi đăng nhập' }, { status: 500 });
  }
}
