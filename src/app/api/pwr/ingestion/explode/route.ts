import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrMaterials, pwrMaterialTransactions, pwrTasks, pwrTaskDependencies, pwrTaskResources, pwrResources } from '@/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const body = await req.json();
    const { items, fileName, batchId, projectId, projectName } = body;
    const userId = session.id;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Không có vật tư để Nổ Task' }, { status: 400 });
    }

    let isShortageOut = false;

    // [UAT INDEPENDENT AUDIT] SỬ DỤNG TRANSACTION ĐỂ CHỐNG RACE-CONDITION
    await db.transaction(async (tx) => {
      let materialIds = items.map((i: any) => i.dbMaterialId).filter(Boolean);
      let dbMats = materialIds.length > 0 
        ? await tx.select().from(pwrMaterials).where(inArray(pwrMaterials.id, materialIds))
        : [];
      
      // AUTO-MASTER DATA (Phương án B): Tự động tạo mã vật tư nếu chưa có trong DB
      const uniqueMissingMap = new Map();
      for (const item of items) {
        if (!item.dbMaterialId) {
          const key = (item.parsedName || item.rawName || 'Unknown').toLowerCase();
          if (!uniqueMissingMap.has(key)) {
            const [newMat] = await tx.insert(pwrMaterials).values({
              name: item.parsedName || item.rawName || 'Vật tư không tên',
              category: item.type || 'OTHER',
              unit: item.unit || 'Cái',
              stockLevel: 0,
              reservedLevel: 0,
              skuCode: `AUTO_${Date.now()}_${Math.floor(Math.random() * 1000)}`
            }).returning();
            uniqueMissingMap.set(key, newMat);
            dbMats.push(newMat);
          }
          item.dbMaterialId = uniqueMissingMap.get(key).id;
        }
      }
      
      let isShortage = false;
      let shortageNotes: string[] = [];

      const reservationPlan = items.map((item: any) => {
        const mat = dbMats.find(m => m.id === item.dbMaterialId);
        const available = mat ? mat.stockLevel - mat.reservedLevel : 0;
        const missing = available < item.quantity ? item.quantity - available : 0;
        if (missing > 0) {
          isShortage = true;
          shortageNotes.push(`${mat?.name} (Thiếu ${missing} ${mat?.unit})`);
        }
        return { ...item, material: mat, missing };
      });
      
      isShortageOut = isShortage;

      const initialStatus = isShortage ? 'WAITING' : 'TODO';
      const waitingReason = isShortage ? `Chờ Vật Tư: ${shortageNotes.join(', ')}` : null;

      const totalVan = items.filter((i:any) => i.type === 'BOARD').reduce((sum:number, i:any) => sum + i.quantity, 0);
      const totalNep = items.filter((i:any) => i.type === 'EDGE_BAND').reduce((sum:number, i:any) => sum + i.quantity, 0);

      const commonProjectRef = projectName || `BATCH_${batchId}`; 
      const batchTag = `BATCH_${batchId}`;
      const todayStr = new Date().toISOString().split('T')[0];

      const machines = await tx.select().from(pwrResources);
      const cncMachine = machines.find((m:any) => m.name.includes('CNC')) || machines[0];
      const edgeMachine = machines.find((m:any) => m.name.includes('Dán')) || machines[0];

      // 1. TẠO TASK MUA HÀNG (Nếu thiếu)
      let purchaseTask = null;
      if (isShortage) {
        const [pt] = await tx.insert(pwrTasks).values({
          userId,
          title: `🔴 YÊU CẦU MUA HÀNG KHẨN CẤP: Lô ${fileName}`,
          description: `Hệ thống tự động phát hiện thiếu vật tư khi nổ Task:\n${shortageNotes.join('\n')}`,
          category: 'MATERIAL',
          priority: 'CRITICAL',
          status: 'TODO',
          projectRef: commonProjectRef,
          projectId: projectId || null,
          taskType: 'PROJECT_TASK',
          tags: ['EXPLOSION', 'MUA_HANG', batchTag],
          source: 'SYSTEM_EXPLOSION'
        }).returning();
        purchaseTask = pt;
      }

      // 2. TẠO TASK CNC
      const [cncTask] = await tx.insert(pwrTasks).values({
        userId,
        title: `[CNC] Cắt ${totalVan} Tấm ván - ${fileName.replace('.xlsx', '')}`,
        description: `Lệnh xuất từ file Ingestion.\nTổng ván: ${totalVan} Tấm.\nYêu cầu quét mã vạch sau khi xong.`,
        category: 'PRODUCTION',
        priority: 'HIGH',
        status: initialStatus,
        waitingFor: waitingReason,
        projectRef: commonProjectRef,
        projectId: projectId || null,
        taskType: 'PROJECT_TASK',
        tags: ['EXPLOSION', 'CNC', batchTag],
        source: 'SYSTEM_EXPLOSION'
      }).returning();

      // Nối dây Dependency từ Mua Hàng sang CNC để Auto-Unblock hoạt động
      if (purchaseTask) {
        await tx.insert(pwrTaskDependencies).values({
          taskId: cncTask.id,
          dependsOnId: purchaseTask.id,
          depType: 'PRECONDITION',
          timeWindowDays: 0
        });
      }

      if (cncMachine) {
         await tx.insert(pwrTaskResources).values({
           taskId: cncTask.id,
           resourceId: cncMachine.id,
           estimatedHours: (totalVan * 0.15).toFixed(2),
           reservedDate: todayStr
         });
      }

      // 3. TẠO TASK DÁN CẠNH (Hoặc hủy nếu không có nẹp)
      const isNoEdgeBanding = totalNep <= 0;
      const [edgeTask] = await tx.insert(pwrTasks).values({
        userId,
        title: isNoEdgeBanding ? `[DÁN CẠNH] Bỏ qua (Lô không có nẹp)` : `[DÁN CẠNH] Dán ${totalNep} Mét nẹp - ${fileName.replace('.xlsx', '')}`,
        description: isNoEdgeBanding ? `Hệ thống tự động bỏ qua vì file Excel không có mét nẹp nào.` : `Làm cuốn chiếu: Không cần đợi CNC xong 100%. CNC cắt được 20% là có thể tiến hành dán ngay.`,
        category: 'PRODUCTION',
        priority: isNoEdgeBanding ? 'LOW' : 'HIGH',
        status: isNoEdgeBanding ? 'DONE' : 'TODO', // Tự động DONE nếu không có nẹp để luồng trơn tru
        projectRef: commonProjectRef,
        projectId: projectId || null,
        taskType: 'PROJECT_TASK',
        tags: ['EXPLOSION', 'DÁN_CẠNH', batchTag],
        source: 'SYSTEM_EXPLOSION'
      }).returning();

      if (edgeMachine && !isNoEdgeBanding) {
         await tx.insert(pwrTaskResources).values({
           taskId: edgeTask.id,
           resourceId: edgeMachine.id,
           estimatedHours: ((totalNep / 10) * 0.1).toFixed(2),
           reservedDate: todayStr
         });
      }

      await tx.insert(pwrTaskDependencies).values({
        taskId: edgeTask.id,
        dependsOnId: cncTask.id,
        depType: 'PRECONDITION',
        timeWindowDays: 0
      });

      // 4. CẬP NHẬT KHO & TẠO PENDING TRANSACTIONS (Auto-Inventory Engine)
      for (const plan of reservationPlan) {
        // Giam lỏng tồn kho
        await tx.update(pwrMaterials)
          .set({ reservedLevel: sql`${pwrMaterials.reservedLevel} + ${plan.quantity}` })
          .where(eq(pwrMaterials.id, plan.dbMaterialId));

        // Tạo Transaction Reserve link với CNC Task
        await tx.insert(pwrMaterialTransactions).values({
          materialId: plan.dbMaterialId,
          userId: userId,
          taskId: cncTask.id, // Link với CNC
          transactionType: 'RESERVE',
          quantity: plan.quantity,
          balanceAfter: plan.material.stockLevel, 
          notes: `Giam lỏng (Reserve) cho Batch Nổ: ${batchId} - File: ${fileName}`
        });

        // Tạo Transaction PENDING_IMPORT link với Mua Hàng Task (nếu thiếu vật tư)
        if (plan.missing > 0 && purchaseTask) {
          await tx.insert(pwrMaterialTransactions).values({
            materialId: plan.dbMaterialId,
            userId: userId,
            taskId: purchaseTask.id, // Link với Mua Hàng
            transactionType: 'PENDING_IMPORT',
            quantity: plan.missing,
            balanceAfter: plan.material.stockLevel, // Chưa cộng thật
            notes: `Auto-Engine: Chờ nhập kho khi Task Mua Hàng hoàn thành`
          });
        }
      }

    });

    return NextResponse.json({ 
      success: true, 
      batchId, 
      isShortage: isShortageOut,
      tasksGenerated: isShortageOut ? 3 : 2
    });

  } catch (error: any) {
    console.error('EXPLOSION ERR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
