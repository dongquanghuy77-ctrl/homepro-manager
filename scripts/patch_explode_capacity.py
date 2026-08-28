import re

with open("src/app/api/pwr/ingestion/explode/route.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure pwrResources and pwrTaskResources are imported
if "pwrResources" not in content:
    content = content.replace("import { pwrMaterials, pwrMaterialTransactions, pwrTasks, pwrTaskDependencies }", "import { pwrMaterials, pwrMaterialTransactions, pwrTasks, pwrTaskDependencies, pwrTaskResources, pwrResources }")

# Update the Explosion Logic to include Capacity
new_explosion_logic = """
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
        description: `Hệ thống tự động phát hiện thiếu vật tư khi nổ Task:\\n${shortageNotes.join('\\n')}`,
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
      description: `Lệnh xuất từ file Ingestion.\\nTổng ván: ${totalVan} Tấm.\\nYêu cầu quét mã vạch sau khi xong.`,
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
"""

content = re.sub(r'// ==========================================\s*// 3\. NỔ TASK.*?timeWindowDays: 0\s*\}\);', new_explosion_logic.strip(), content, flags=re.DOTALL)

with open("src/app/api/pwr/ingestion/explode/route.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched Explode API to support Capacity allocation")