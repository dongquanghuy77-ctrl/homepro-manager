import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrMaterials, pwrMaterialTransactions, pwrTasks, pwrTaskDependencies, pwrTaskResources, pwrResources } from '@/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, fileName, batchId } = body;
    const userId = 1; // Giả lập User ID của Quản lý

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Không có vật tư để Nổ Task' }, { status: 400 });
    }

    // ==========================================
    // 1. KIỂM TRA CHÉO TỒN KHO (HARD-RESERVE CHECK)
    // ==========================================
    const materialIds = items.map((i: any) => i.dbMaterialId);
    const dbMats = await db.select().from(pwrMaterials).where(inArray(pwrMaterials.id, materialIds));
    
    let isShortage = false;
    let shortageNotes: string[] = [];

    const reservationPlan = items.map((item: any) => {
      const mat = dbMats.find(m => m.id === item.dbMaterialId);
      const available = mat ? mat.stockLevel - mat.reservedLevel : 0;
      if (available < item.quantity) {
        isShortage = true;
        shortageNotes.push(`${mat?.name} (Thiếu ${item.quantity - available} ${mat?.unit})`);
      }
      return { ...item, material: mat };
    });

    // Quyết định trạng thái khởi điểm của luồng Task
    const initialStatus = isShortage ? 'WAITING' : 'TODO';
    const waitingReason = isShortage ? `Chờ Vật Tư: ${shortageNotes.join(', ')}` : null;

    // ==========================================
    // 2. THỰC THI GIỮ CHỖ VẬT TƯ VÀ GHI LOG (RESERVE)
    // ==========================================
    for (const plan of reservationPlan) {
      // Cập nhật tồn kho (Tăng số lượng giam lỏng)
      await db.update(pwrMaterials)
        .set({ reservedLevel: sql`${pwrMaterials.reservedLevel} + ${plan.quantity}` })
        .where(eq(pwrMaterials.id, plan.dbMaterialId));

      // Ghi Audit Log chống thất thoát
      await db.insert(pwrMaterialTransactions).values({
        materialId: plan.dbMaterialId,
        userId: userId,
        transactionType: 'RESERVE',
        quantity: plan.quantity,
        balanceAfter: plan.material.stockLevel, // Tồn thực không đổi, chỉ thay đổi khả dụng
        notes: `Giam lỏng (Reserve) cho Batch Nổ: ${batchId} - File: ${fileName}`
      });
    }

    // ==========================================
    // 3. NỔ TASK & THIẾT LẬP DÒNG CHẢY (TASK EXPLOSION)
    // ==========================================
    // Tách tổng Ván và Nẹp để ghi chú
    const totalVan = items.filter((i:any) => i.type === 'VÁN').reduce((sum:number, i:any) => sum + i.quantity, 0);
    const totalNep = items.filter((i:any) => i.type === 'NẸP').reduce((sum:number, i:any) => sum + i.quantity, 0);

    const commonProjectRef = `BATCH_${batchId}`; 
    const todayStr = new Date().toISOString().split('T')[0];

    // [TƯ DUY NGƯỢC] Lấy danh sách máy móc để phân bổ tải trọng
    const machines = await db.select().from(pwrResources);
    const cncMachine = machines.find((m:any) => m.name.includes('CNC')) || machines[0];
    const edgeMachine = machines.find((m:any) => m.name.includes('Dán')) || machines[0];

    if (isShortage) {
      await db.insert(pwrTasks).values({
        userId,
        title: `🔴 YÊU CẦU MUA HÀNG KHẨN CẤP: Lô ${fileName}`,
        description: `Hệ thống tự động phát hiện thiếu vật tư khi nổ Task:\n${shortageNotes.join('\n')}`,
        category: 'MATERIAL',
        priority: 'CRITICAL',
        status: 'TODO',
        projectRef: commonProjectRef,
        source: 'SYSTEM_EXPLOSION'
      });
    }

    const [cncTask] = await db.insert(pwrTasks).values({
      userId,
      title: `[CNC] Cắt ${totalVan} Tấm ván - ${fileName.replace('.xlsx', '')}`,
      description: `Lệnh xuất từ file Ingestion.
Tổng ván: ${totalVan} Tấm.
Yêu cầu quét mã vạch sau khi xong.`,
      category: 'PRODUCTION',
      priority: 'HIGH',
      status: initialStatus,
      waitingFor: waitingReason,
      projectRef: commonProjectRef,
      tags: ['EXPLOSION', 'CNC'],
      source: 'SYSTEM_EXPLOSION'
    }).returning();

    // Phân bổ Tải trọng Máy CNC (Quy đổi 1 Tấm = 0.15 Giờ ~ 9 phút)
    if (cncMachine) {
       await db.insert(pwrTaskResources).values({
         taskId: cncTask.id,
         resourceId: cncMachine.id,
         estimatedHours: (totalVan * 0.15).toFixed(2),
         reservedDate: todayStr
       });
    }

    const [edgeTask] = await db.insert(pwrTasks).values({
      userId,
      title: `[DÁN CẠNH] Dán ${totalNep} Mét nẹp - ${fileName.replace('.xlsx', '')}`,
      description: `Làm cuốn chiếu: Không cần đợi CNC xong 100%. CNC cắt được 20% là có thể tiến hành dán ngay.`,
      category: 'PRODUCTION',
      priority: 'HIGH',
      status: 'TODO',
      projectRef: commonProjectRef,
      tags: ['EXPLOSION', 'DÁN_CẠNH'],
      source: 'SYSTEM_EXPLOSION'
    }).returning();

    // Phân bổ Tải trọng Dán Cạnh (Quy đổi 10 Mét = 0.1 Giờ ~ 6 phút)
    if (edgeMachine) {
       await db.insert(pwrTaskResources).values({
         taskId: edgeTask.id,
         resourceId: edgeMachine.id,
         estimatedHours: ((totalNep / 10) * 0.1).toFixed(2),
         reservedDate: todayStr
       });
    }

    await db.insert(pwrTaskDependencies).values({
      taskId: edgeTask.id,
      dependsOnId: cncTask.id,
      depType: 'PRECONDITION',
      timeWindowDays: 0
    });

    return NextResponse.json({ 
      success: true, 
      batchId, 
      isShortage,
      tasksGenerated: isShortage ? 3 : 2
    });

  } catch (error: any) {
    console.error('EXPLOSION ERR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
