import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrMaterials, pwrMaterialTransactions, pwrWorkLogs, pwrTasks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const taskId = parseInt(params.id);
    const body = await req.json();
    const { materialId, quantity, reason, faultCategory, costEstimate } = body;
    const userId = 1; // Giả lập User ID (Thợ CNC)

    // 1. Lấy thông tin Vật tư & Task
    const [material] = await db.select().from(pwrMaterials).where(eq(pwrMaterials.id, materialId));
    if (!material) throw new Error("Vật tư không tồn tại.");

    if (material.stockLevel - material.reservedLevel < quantity) {
      return NextResponse.json({ error: 'Kho không đủ vật tư khả dụng để cấp bù! Vui lòng báo Quản lý nhập thêm hàng.' }, { status: 400 });
    }

    // 2. Thực thi Trừ Tồn Kho (Ghi nhận HAO HỤT)
    await db.update(pwrMaterials)
      .set({ stockLevel: sql`${pwrMaterials.stockLevel} - ${quantity}` }) // Trừ thẳng vào tồn thực tế
      .where(eq(pwrMaterials.id, materialId));

    // 3. Ghi Log Giao Dịch Chống Thất Thoát (Phân loại: SCRAP)
    await db.insert(pwrMaterialTransactions).values({
      materialId: material.id,
      userId: userId,
      taskId: taskId,
      transactionType: 'SCRAP',
      quantity: quantity,
      balanceAfter: material.stockLevel - quantity,
      notes: `[BÁO HỎNG CẤP BÙ] Lỗi: ${faultCategory}. Lý do: ${reason}`
    });

    // 4. Ghi Sổ Nhật Ký Vận Hành (Đưa lên Báo Cáo Ngày của Quản Lý)
    await db.insert(pwrWorkLogs).values({
      taskId: taskId,
      userId: userId,
      logType: 'ISSUE_LOG',
      content: `[CẤP BÙ VẬT TƯ] Xin cấp thêm ${quantity} ${material.unit} ${material.name}. 
Nguyên nhân: ${reason}. Phân loại lỗi: ${faultCategory}. Ước tính thiệt hại: ${costEstimate} VNĐ`,
      issue: faultCategory
    });

    // Tùy chọn: Chuyển task sang trạng thái WAITING nếu cần quản lý duyệt (ở demo này auto-duyệt trừ kho)

    return NextResponse.json({ success: true, message: 'Đã báo hỏng và cấp bù thành công!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
