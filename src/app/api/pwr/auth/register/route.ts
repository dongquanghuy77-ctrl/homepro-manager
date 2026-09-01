import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, username, password } = await req.json();

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc' }, { status: 400 });
    }

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.username, username));
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Tài khoản (Số điện thoại/Username) đã tồn tại' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await db.insert(users).values({
      name,
      email: email || null,
      username,
      password: hashedPassword,
      role: 'WORKER',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
