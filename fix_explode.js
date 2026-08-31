const fs = require('fs');

let content = fs.readFileSync('src/app/api/pwr/ingestion/explode/route.ts', 'utf-8');

const startToken = "// 2. TẠO TASK CNC";
const endToken = "// 4. CẬP NHẬT KHO & TẠO PENDING TRANSACTIONS";
const startIndex = content.indexOf(startToken);
const endIndex = content.indexOf(endToken);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find tokens");
    process.exit(1);
}

const replacement = `// --- AUTO-SPLIT ENGINE (BĂM LÔ) ---
      const MAX_H = 8;
      const generateChunks = (totalQty, totalHours) => {
        if (totalQty <= 0 || totalHours <= 0) return [];
        const numChunks = Math.ceil(totalHours / MAX_H);
        const chunks = [];
        let remQty = totalQty;
        let remH = totalHours;
        
        let d = new Date();
        // Bỏ qua Chủ Nhật ngay từ ngày đầu
        if (d.getDay() === 0) d.setDate(d.getDate() + 1);
        
        for (let i = 0; i < numChunks; i++) {
          const h = Math.min(MAX_H, remH);
          const q = (i === numChunks - 1) ? remQty : Math.round(totalQty * (h / totalHours));
          remH -= h;
          remQty -= q;
          
          const dateStr = d.toISOString().split('T')[0];
          chunks.push({ partIndex: i + 1, numChunks, qty: q, hours: h, dateStr });
          
          // Tăng ngày lên 1, bỏ qua Chủ Nhật
          d.setDate(d.getDate() + 1);
          if (d.getDay() === 0) d.setDate(d.getDate() + 1);
        }
        return chunks;
      };

      // 2. TẠO TASK CNC (AUTO-SPLIT)
      const cncTotalHours = totalVan * 0.15;
      const cncChunks = generateChunks(totalVan, cncTotalHours);
      const cncTaskIds = [];

      for (const chunk of cncChunks) {
         const partLabel = chunk.numChunks > 1 ? \` - Phần \${chunk.partIndex}/\${chunk.numChunks}\` : '';
         const [cncTask] = await tx.insert(pwrTasks).values({
            userId,
            title: \`[CNC] Cắt \${chunk.qty} Tấm ván - \${fileName.replace('.xlsx', '')}\${partLabel}\`,
            description: \`Lệnh xuất từ file Ingestion.\\nTổng lô: \${totalVan} Tấm. Phần này: \${chunk.qty} Tấm.\\nYêu cầu quét mã vạch sau khi xong.\`,
            category: 'PRODUCTION',
            priority: 'HIGH',
            status: cncStatus,
            waitingFor: cncWaitingReason,
            projectRef: commonProjectRef,
            projectId: finalProjectId || null,
            taskType: 'PROJECT_TASK',
            tags: ['EXPLOSION', 'CNC', batchTag],
            source: 'SYSTEM_EXPLOSION'
         }).returning();
         cncTaskIds.push(cncTask.id);

         if (purchaseTask && isBoardShortage && chunk.partIndex === 1) {
            await tx.insert(pwrTaskDependencies).values({
               taskId: cncTask.id, dependsOnId: purchaseTask.id, depType: 'PRECONDITION', timeWindowDays: 0
            });
         }

         if (cncMachine) {
            await tx.insert(pwrTaskResources).values({
               taskId: cncTask.id,
               resourceId: cncMachine.id,
               estimatedHours: chunk.hours.toFixed(2),
               reservedDate: chunk.dateStr
            });
         }
      }

      // 3. TẠO TASK DÁN CẠNH (AUTO-SPLIT)
      const isNoEdgeBanding = totalNep <= 0;
      const edgeStatus = isNoEdgeBanding ? 'DONE' : 'TODO';
      const edgeWaitingReason = (!isNoEdgeBanding && isEdgeShortage) ? \`Chờ Nẹp: \${edgeShortageNotes.join(', ')}\` : null;
      const edgeTotalHours = isNoEdgeBanding ? 0 : (totalNep / 10) * 0.1;
      const edgeChunks = generateChunks(totalNep, edgeTotalHours);
      const edgeTaskIds = [];

      if (isNoEdgeBanding) {
         const [edgeTask] = await tx.insert(pwrTasks).values({
            userId,
            title: \`[DÁN CẠNH] Bỏ qua (Lô không có nẹp)\`,
            description: \`Hệ thống tự động bỏ qua vì file Excel không có mét nẹp nào.\`,
            category: 'PRODUCTION', priority: 'LOW', status: 'DONE',
            projectRef: commonProjectRef, projectId: finalProjectId || null, taskType: 'PROJECT_TASK',
            tags: ['EXPLOSION', 'DAN_CANH', batchTag], source: 'SYSTEM_EXPLOSION'
         }).returning();
         edgeTaskIds.push(edgeTask.id);
      } else {
         for (const chunk of edgeChunks) {
            const partLabel = chunk.numChunks > 1 ? \` - Phần \${chunk.partIndex}/\${chunk.numChunks}\` : '';
            const [edgeTask] = await tx.insert(pwrTasks).values({
               userId,
               title: \`[DÁN CẠNH] Dán \${chunk.qty} Mét nẹp - \${fileName.replace('.xlsx', '')}\${partLabel}\`,
               description: \`Tổng lô: \${totalNep} Mét. Phần này: \${chunk.qty} Mét.\`,
               category: 'PRODUCTION', priority: 'HIGH', status: edgeStatus, waitingFor: edgeWaitingReason,
               projectRef: commonProjectRef, projectId: finalProjectId || null, taskType: 'PROJECT_TASK',
               tags: ['EXPLOSION', 'DAN_CANH', batchTag, \`⏰ Chờ CNC \${chunk.numChunks > 1 ? 'Phần ' + chunk.partIndex : '30p'}\`],
               source: 'SYSTEM_EXPLOSION'
            }).returning();
            edgeTaskIds.push(edgeTask.id);

            if (edgeMachine) {
               await tx.insert(pwrTaskResources).values({
                 taskId: edgeTask.id, resourceId: edgeMachine.id, estimatedHours: chunk.hours.toFixed(2), reservedDate: chunk.dateStr
               });
            }

            // Dán cạnh phụ thuộc CNC tương ứng (nếu có)
            const correspondingCncId = cncTaskIds[Math.min(chunk.partIndex - 1, cncTaskIds.length - 1)];
            if (correspondingCncId) {
               await tx.insert(pwrTaskDependencies).values({
                 taskId: edgeTask.id, dependsOnId: correspondingCncId, depType: 'PRECONDITION', timeWindowDays: 0
               });
            }

            // Nếu thiếu nẹp, Dán cạnh 1 phụ thuộc Mua Hàng
            if (purchaseTask && isEdgeShortage && chunk.partIndex === 1) {
               await tx.insert(pwrTaskDependencies).values({
                 taskId: edgeTask.id, dependsOnId: purchaseTask.id, depType: 'PRECONDITION', timeWindowDays: 0
               });
            }
         }
      }

      // 4. TẠO TASK KHOAN CAM (AUTO-SPLIT)
      const totalPhuKien = items.filter((i) => i.type === 'HARDWARE' || i.category === 'HARDWARE').reduce((sum, i) => sum + i.quantity, 0);
      const estimatedPhuKien = totalPhuKien > 0 ? totalPhuKien : Math.ceil(totalVan * 6); 
      const drillMachine = machines.find((m) => m.name.includes('Khoan')) || machines[0];
      const drillTotalHours = estimatedPhuKien * 0.0133;
      const isNoDrilling = estimatedPhuKien <= 0 && totalVan <= 0;
      const drillChunks = generateChunks(estimatedPhuKien, drillTotalHours);

      if (isNoDrilling) {
         await tx.insert(pwrTasks).values({
            userId, title: \`[KHOAN CAM] Bỏ qua\`, description: \`Không có dữ liệu\`,
            category: 'PRODUCTION', priority: 'LOW', status: 'DONE',
            projectRef: commonProjectRef, projectId: finalProjectId || null, taskType: 'PROJECT_TASK',
            tags: ['EXPLOSION', 'KHOAN_CAM', batchTag], source: 'SYSTEM_EXPLOSION'
         });
      } else {
         for (const chunk of drillChunks) {
            const partLabel = chunk.numChunks > 1 ? \` - Phần \${chunk.partIndex}/\${chunk.numChunks}\` : '';
            const [drillTask] = await tx.insert(pwrTasks).values({
               userId,
               title: \`[KHOAN CAM] Khoan \${chunk.qty} mũi/chi tiết - \${fileName.replace('.xlsx', '')}\${partLabel}\`,
               description: \`Tổng lô: \${estimatedPhuKien}. Phần này: \${chunk.qty}.\`,
               category: 'PRODUCTION', priority: 'HIGH', status: 'TODO',
               projectRef: commonProjectRef, projectId: finalProjectId || null, taskType: 'PROJECT_TASK',
               tags: ['EXPLOSION', 'KHOAN_CAM', batchTag, \`⏰ Chờ Dán Cạnh \${chunk.numChunks > 1 ? 'Phần ' + chunk.partIndex : '1h'}\`],
               source: 'SYSTEM_EXPLOSION'
            }).returning();

            if (drillMachine) {
               await tx.insert(pwrTaskResources).values({
                 taskId: drillTask.id, resourceId: drillMachine.id, estimatedHours: chunk.hours.toFixed(2), reservedDate: chunk.dateStr
               });
            }

            // Khoan cam phụ thuộc Dán Cạnh (hoặc CNC nếu bỏ qua dán cạnh)
            let dependsOnId = null;
            if (!isNoEdgeBanding && edgeTaskIds.length > 0) {
                dependsOnId = edgeTaskIds[Math.min(chunk.partIndex - 1, edgeTaskIds.length - 1)];
            } else if (cncTaskIds.length > 0) {
                dependsOnId = cncTaskIds[Math.min(chunk.partIndex - 1, cncTaskIds.length - 1)];
            }

            if (dependsOnId) {
               await tx.insert(pwrTaskDependencies).values({
                 taskId: drillTask.id, dependsOnId, depType: 'PRECONDITION', timeWindowDays: 0
               });
            }
         }
      }

      // `;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('src/app/api/pwr/ingestion/explode/route.ts', newContent);
