import re

with open("src/app/api/pwr/ingestion/explode/route.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the direct db calls with db.transaction
new_transaction_logic = """
    // ==========================================
    // KIỂM DUYỆT ĐỘC LẬP (UAT): Chống Race-Condition bằng Transaction
    // ==========================================
    await db.transaction(async (tx) => {
      // 1. KIỂM TRA CHÉO TỒN KHO (HARD-RESERVE CHECK)
      const materialIds = items.map((i: any) => i.dbMaterialId);
      const dbMats = await tx.select().from(pwrMaterials).where(inArray(pwrMaterials.id, materialIds));
      
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

      const initialStatus = isShortage ? 'WAITING' : 'TODO';
      const waitingReason = isShortage ? `Chờ Vật Tư: ${shortageNotes.join(', ')}` : null;

      // 2. THỰC THI GIỮ CHỖ VẬT TƯ VÀ GHI LOG (RESERVE)
      for (const plan of reservationPlan) {
        await tx.update(pwrMaterials)
          .set({ reservedLevel: sql`${pwrMaterials.reservedLevel} + ${plan.quantity}` })
          .where(eq(pwrMaterials.id, plan.dbMaterialId));

        await tx.insert(pwrMaterialTransactions).values({
          materialId: plan.dbMaterialId,
          userId: userId,
          transactionType: 'RESERVE',
          quantity: plan.quantity,
          balanceAfter: plan.material.stockLevel, 
          notes: `Giam lỏng (Reserve) cho Batch Nổ: ${batchId} - File: ${fileName}`
        });
      }

      // 3. NỔ TASK & THIẾT LẬP DÒNG CHẢY (TASK EXPLOSION)
      const totalVan = items.filter((i:any) => i.type === 'VÁN').reduce((sum:number, i:any) => sum + i.quantity, 0);
      const totalNep = items.filter((i:any) => i.type === 'NẸP').reduce((sum:number, i:any) => sum + i.quantity, 0);

      const commonProjectRef = `BATCH_${batchId}`; 
      const todayStr = new Date().toISOString().split('T')[0];

      const machines = await tx.select().from(pwrResources);
      const cncMachine = machines.find((m:any) => m.name.includes('CNC')) || machines[0];
      const edgeMachine = machines.find((m:any) => m.name.includes('Dán')) || machines[0];

      if (isShortage) {
        await tx.insert(pwrTasks).values({
          userId,
          title: `🔴 YÊU CẦU MUA HÀNG KHẨN CẤP: Lô ${fileName}`,
          description: `Hệ thống tự động phát hiện thiếu vật tư khi nổ Task:\\n${shortageNotes.join('\\n')}`,
          category: 'MATERIAL',
          priority: 'CRITICAL',
          status: 'TODO',
          projectRef: commonProjectRef,
          source: 'SYSTEM_EXPLOSION'
        });
      }

      const [cncTask] = await tx.insert(pwrTasks).values({
        userId,
        title: `[CNC] Cắt ${totalVan} Tấm ván - ${fileName.replace('.xlsx', '')}`,
        description: `Lệnh xuất từ file Ingestion.\\nTổng ván: ${totalVan} Tấm.\\nYêu cầu quét mã vạch sau khi xong.`,
        category: 'PRODUCTION',
        priority: 'HIGH',
        status: initialStatus,
        waitingFor: waitingReason,
        projectRef: commonProjectRef,
        tags: ['EXPLOSION', 'CNC'],
        source: 'SYSTEM_EXPLOSION'
      }).returning();

      if (cncMachine) {
         await tx.insert(pwrTaskResources).values({
           taskId: cncTask.id,
           resourceId: cncMachine.id,
           estimatedHours: (totalVan * 0.15).toFixed(2),
           reservedDate: todayStr
         });
      }

      const [edgeTask] = await tx.insert(pwrTasks).values({
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

      if (edgeMachine) {
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
    }); // Kết thúc Transaction block

    return NextResponse.json({ 
      success: true, 
      batchId, 
      // Note: isShortage state logic needs to be preserved carefully, but for brevity in this patch we will assume it succeeds or throws.
      // Wait, let's keep the return simple for the patch
"""

# I will just write a script to completely rewrite the explode route safely