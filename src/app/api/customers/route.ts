import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const list = await db.select().from(customers).orderBy(desc(customers.id));
    return NextResponse.json(list);
  } catch (err) {
    console.error('GET /api/customers error:', err);
    return NextResponse.json({ error: 'Không thể tải danh sách khách hàng' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const body = await req.json();
    const { name, phone, email, address, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập Họ tên Khách hàng' }, { status: 400 });
    }

    const [newCustomer] = await db
      .insert(customers)
      .values({
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        notes: notes ? notes.trim() : null,
      })
      .returning();

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (err) {
    console.error('POST /api/customers error:', err);
    return NextResponse.json({ error: 'Không thể tạo thông tin khách hàng' }, { status: 500 });
  }
}
