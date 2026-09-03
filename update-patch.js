const fs = require('fs');
let c = fs.readFileSync('src/app/api/pwr/station/tasks/route.ts', 'utf8');

const replaceFn = `    const isEndOfLine = task.stationTeam === 'DONG_GOI';
    const nextStatus = isEndOfLine ? 'DONE' : 'DONE';
    const nextQcStatus = isEndOfLine ? 'WAITING_QC' : 'QC_PASSED';
    
    // 2. Cập nhật task
    await db.update(pwrTasks).set({
      status: nextStatus,
      qcStatus: nextQcStatus,
      waitingQcSince: isEndOfLine ? now : null,
      completedAt: isEndOfLine ? null : now, // Chưa hoàn thành thực sự nếu chờ QC
      completedBy: userId,
      quantityDone,
    }).where(eq(pwrTasks.id, taskId));

    // 3. ERP Bridge: Chỉ update nếu không phải chờ QC (hoặc đã passed)
    if (!isEndOfLine && task.sourceRef && task.sourceRef.startsWith('WO-')) {
      const woId = parseInt(task.sourceRef.split('-')[1]);
      if (!isNaN(woId)) {
        await db.execute(sql\`
          UPDATE work_orders 
          SET completed_quantity = completed_quantity + \${quantityDone},
              status = CASE WHEN completed_quantity + \${quantityDone} >= planned_quantity THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
              updated_at = NOW()
          WHERE id = \${woId}
        \`);
      }
    }`;

c = c.replace(/\/\/ 2\. Mark task DONE[\s\S]*?(?=\/\/ 2\. Ghi work log)/, replaceFn + '\n\n    ');
fs.writeFileSync('src/app/api/pwr/station/tasks/route.ts', c, 'utf8');
