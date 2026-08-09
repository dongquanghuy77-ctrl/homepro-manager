import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { costs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    const body = await req.json();
    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount) || 0;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.costDate !== undefined) updateData.costDate = body.costDate.trim();
    if (body.notes !== undefined) updateData.notes = body.notes ? body.notes.trim() : null;

    const [updated] = await db
      .update(costs)
      .set(updateData)
      .where(eq(costs.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Không tìm thấy khoản chi' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/costs/:id error:', err);
    return NextResponse.json({ error: 'Không thể cập nhật chi phí' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });

    await db.delete(costs).where(eq(costs.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/costs/:id error:', err);
    return NextResponse.json({ error: 'Không thể xóa khoản chi' }, { status: 500 });
  }
}
