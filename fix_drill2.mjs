import fs from 'fs';

const filepath = 'src/app/api/pwr/ingestion/explode/route.ts';
let content = fs.readFileSync(filepath, 'utf-8');

const anchorRegex = /\/\/ Nếu thiếu nẹp, Dán cạnh còn phụ thuộc Mua Hàng/g;

const drillCode = `// 4. TẠO TASK KHOAN CAM
      const totalPhuKien = items.filter((i) => i.type === 'HARDWARE' || i.category === 'HARDWARE').reduce((sum, i) => sum + i.quantity, 0);
      const estimatedPhuKien = totalPhuKien > 0 ? totalPhuKien : Math.ceil(totalVan * 6); 
      const drillMachine = machines.find((m) => m.name.includes('Khoan')) || machines[0];
      
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

      // Nếu thiếu nẹp, Dán cạnh còn phụ thuộc Mua Hàng`;

if (content.includes('TẠO TASK KHOAN CAM')) {
  console.log("Already added");
} else {
  content = content.replace(anchorRegex, drillCode);
  fs.writeFileSync(filepath, content);
  console.log("Drill task ACTUALLY added!");
}
