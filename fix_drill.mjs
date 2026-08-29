import fs from 'fs';

const filepath = 'src/app/api/pwr/ingestion/explode/route.ts';
let content = fs.readFileSync(filepath, 'utf-8');

const anchor = `      // Dán cạnh phụ thuộc CNC
      await tx.insert(pwrTaskDependencies).values({
        taskId: edgeTask.id,
        dependsOnId: cncTask.id,
        depType: 'PRECONDITION',
        timeWindowDays: 0
      });`;

const drillCode = `

      // 4. TẠO TASK KHOAN CAM
      const totalPhuKien = items.filter((i:any) => i.type === 'HARDWARE' || i.category === 'HARDWARE').reduce((sum:number, i:any) => sum + i.quantity, 0);
      const estimatedPhuKien = totalPhuKien > 0 ? totalPhuKien : Math.ceil(totalVan * 6); // Nội suy: 1 tấm ván ~ 6 phụ kiện cam chốt
      const drillMachine = machines.find((m:any) => m.name.includes('Khoan')) || machines[0];
      
      const isNoDrilling = estimatedPhuKien <= 0 && totalVan <= 0;
      const drillStatus = isNoDrilling ? 'DONE' : 'TODO';

      const [drillTask] = await tx.insert(pwrTasks).values({
        userId,
        title: isNoDrilling ? \`[KHOAN CAM] Bỏ qua\` : \`[KHOAN CAM] Khoan \${estimatedPhuKien} mũi/chi tiết - \${fileName.replace('.xlsx', '')}\`,
        description: isNoDrilling ? \`Không có dữ liệu ván để nội suy cam chốt.\` : \`Nội suy từ tổng \${totalVan} tấm ván (tỷ lệ 1 tấm : 6 chi tiết).\nĐịnh mức ước tính: 0.8 phút/chi tiết khoan.\`,
        category: 'PRODUCTION',
        priority: isNoDrilling ? 'LOW' : 'HIGH',
        status: drillStatus,
        projectRef: commonProjectRef,
        projectId: finalProjectId || null,
        taskType: 'PROJECT_TASK',
        tags: ['EXPLOSION', 'KHOAN_CAM', batchTag],
        source: 'SYSTEM_EXPLOSION'
      }).returning();

      if (drillMachine && !isNoDrilling) {
         await tx.insert(pwrTaskResources).values({
           taskId: drillTask.id,
           resourceId: drillMachine.id,
           // 0.8 phút / chi tiết = 0.8 / 60 giờ = 0.0133 giờ
           estimatedHours: (estimatedPhuKien * 0.0133).toFixed(2),
           reservedDate: todayStr
         });
      }

      if (!isNoDrilling) {
        await tx.insert(pwrTaskDependencies).values({
          taskId: drillTask.id,
          dependsOnId: isNoEdgeBanding ? cncTask.id : edgeTask.id,
          depType: 'PRECONDITION',
          timeWindowDays: 0
        });
      }
`;

if (content.includes('TẠO TASK KHOAN CAM')) {
  console.log("Already added");
} else {
  content = content.replace(anchor, anchor + drillCode);
  fs.writeFileSync(filepath, content);
  console.log("Drill task added!");
}
