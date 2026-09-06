import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrMaterials, pwrMaterialTransactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

// PATCH /api/pwr/materials/[id]/stock
// Body: { stockLevel: number, reservedLevel: number, reason?: string }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req as any, ALL_ROLES);
  if (auth.error) return auth.error;
  const { session } = auth;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const body = await req.json();
    const { stockLevel, reservedLevel, reason } = body;

    if (typeof stockLevel !== 'number' || typeof reservedLevel !== 'number') {
      return NextResponse.json({ error: 'stockLevel và reservedLevel phải là số' }, { status: 400 });
    }

    // Lấy giá trị hiện tại
    const [current] = await db.select().from(pwrMaterials).where(eq(pwrMaterials.id, id));
    if (!current) return NextResponse.json({ error: 'Không tìm thấy vật tư' }, { status: 404 });

    const stockDiff  = stockLevel  - parseFloat(String(current.stockLevel  ?? 0));
    const reserveDiff = reservedLevel - parseFloat(String(current.reservedLevel ?? 0));
    const note = reason || 'Kiểm kê điều chỉnh thủ công';

    // Ghi transaction điều chỉnh nếu có thay đổi
    if (stockDiff !== 0) {
      await db.insert(pwrMaterialTransactions).values({
        materialId: id,
        userId: session.id,
        taskId: null,
        transactionType: 'ADJUSTMENT' as any,
        quantity: Math.abs(stockDiff),
        balanceAfter: stockLevel,
        notes: `${note} | Điều chỉnh tồn: ${stockDiff > 0 ? '+' : ''}${stockDiff.toFixed(2)} → ${stockLevel}`,
      } as any);
    }

    if (reserveDiff !== 0) {
      await db.insert(pwrMaterialTransactions).values({
        materialId: id,
        userId: session.id,
        taskId: null,
        transactionType: 'ADJUSTMENT' as any,
        quantity: Math.abs(reserveDiff),
        balanceAfter: reservedLevel,
        notes: `${note} | Điều chỉnh giam lỏng: ${reserveDiff > 0 ? '+' : ''}${reserveDiff.toFixed(2)} → ${reservedLevel}`,
      } as any);
    }

    // Cập nhật trực tiếp vào bảng
    const [updated] = await db.update(pwrMaterials)
      .set({
        stockLevel:    Math.round(stockLevel * 100) / 100 as any,
        reservedLevel: Math.round(reservedLevel * 100) / 100 as any,
      })
      .where(eq(pwrMaterials.id, id))
      .returning();

    return NextResponse.json({ success: true, material: updated });
  } catch (e: any) {
    console.error('[PATCH /materials/stock]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
