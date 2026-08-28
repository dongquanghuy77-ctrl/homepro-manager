import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrMaterials, pwrMaterialTransactions, pwrTasks, pwrTaskResources, pwrTaskDependencies } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { batchId } = await req.json();
    const commonProjectRef = `BATCH_${batchId}`;
    
    // 1. Kiểm tra xem có Task nào đã In Progress chưa
    const tasks = await db.select().from(pwrTasks).where(eq(pwrTasks.projectRef, commonProjectRef));
    if (tasks.length === 0) return NextResponse.json({ error: 'Không tìm thấy Lô này' }, { status: 404 });
    
    const hasStarted = tasks.some(t => t.status !== 'TODO' && t.status !== 'INBOX' && t.status !== 'WAITING');
    if (hasStarted) {
      return NextResponse.json({ error: 'Không thể Hủy nổ! Thợ đã bắt đầu làm việc trên Lô này.' }, { status: 400 });
    }

    // 2. Tìm các giao dịch Reserve của Lô này để Hoàn tiền (Un-reserve)
    const transactions = await db.select().from(pwrMaterialTransactions)
      .where(eq(pwrMaterialTransactions.notes, `Giam lỏng (Reserve) cho Batch Nổ: ${batchId} - File: ${tasks.find(t => t.title.includes('CNC'))?.title.split(' - ')[1] + '.xlsx' || 'Unknown'}`)); // simplified search for demo, in real app use batchId column in transactions

    // Tạm thời để Rollback chính xác, ta quét lại các dòng transactions có chứa batchId
    // Do LIKE operator cần setup thêm, ta lọc bằng js cho nhanh vì số lượng transaction ít:
    const allTrans = await db.select().from(pwrMaterialTransactions);
    const batchTrans = allTrans.filter(t => t.notes && t.notes.includes(`Batch Nổ: ${batchId}`));

    for (const t of batchTrans) {
      if (t.transactionType === 'RESERVE') {
        // Nhả tồn kho giam lỏng
        await db.update(pwrMaterials)
          .set({ reservedLevel: sql`${pwrMaterials.reservedLevel} - ${t.quantity}` })
          .where(eq(pwrMaterials.id, t.materialId));
        
        // Ghi Audit Log nhả tồn kho
        await db.insert(pwrMaterialTransactions).values({
          materialId: t.materialId,
          userId: 1, // System / Admin
          transactionType: 'UNRESERVE',
          quantity: t.quantity,
          balanceAfter: t.balanceAfter, 
          notes: `Hủy Nổ Khẩn Cấp (Rollback) Lô: ${batchId}`
        });
      }
    }

    // 3. Xóa phân bổ tải trọng máy (pwrTaskResources) cho các Task trong Lô
    const taskIds = tasks.map(t => t.id);
    for (const taskId of taskIds) {
      await db.delete(pwrTaskResources).where(eq(pwrTaskResources.taskId, taskId));
    }

    // 4. Xóa dependencies giữa các Task trong Lô
    for (const taskId of taskIds) {
      await db.delete(pwrTaskDependencies).where(eq(pwrTaskDependencies.taskId, taskId));
      await db.delete(pwrTaskDependencies).where(eq(pwrTaskDependencies.dependsOnId, taskId));
    }

    // 5. Xóa sổ các Task đã tạo
    await db.delete(pwrTasks).where(eq(pwrTasks.projectRef, commonProjectRef));

    return NextResponse.json({ success: true, message: 'Đã hủy nổ hoàn toàn! Task + Vật tư + Tải trọng máy đã được giải phóng.' });

  } catch (error: any) {
    console.error('ROLLBACK ERR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
