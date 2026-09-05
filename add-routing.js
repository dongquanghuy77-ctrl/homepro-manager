const fs = require('fs');
let code = fs.readFileSync('src/app/api/pwr/station/tasks/route.ts', 'utf8');

// Ensure pwrTaskDependencies is imported
if (!code.includes('pwrTaskDependencies')) {
  code = code.replace(/pwrTasks, pwrWorkLogs, pwrUserStats/, 'pwrTasks, pwrWorkLogs, pwrUserStats, pwrTaskDependencies');
}

// Add Auto-Unlock logic after Gamification
const unlockLogic = `
    // 4. THUẬT TOÁN AUTO-UNLOCK DÂY CHUYỀN (ROUTING)
    // Tìm các task phụ thuộc vào task vừa hoàn thành
    const deps = await db.select().from(pwrTaskDependencies).where(eq(pwrTaskDependencies.dependsOnId, taskId));
    if (deps.length > 0) {
      for (const dep of deps) {
        // Lấy task con
        const [childTask] = await db.select().from(pwrTasks).where(eq(pwrTasks.id, dep.taskId));
        if (childTask && childTask.status === 'WAITING') {
          // Tự động chuyển status sang TODO, và gán đúng stationTeam dựa trên Tag hoặc Title
          let autoStation = childTask.stationTeam;
          if (!autoStation) {
            if (childTask.title.includes('[DÁN CẠNH]')) autoStation = 'DAN_CANH';
            else if (childTask.title.includes('[KHOAN CAM]')) autoStation = 'KHOAN_CAM';
            else if (childTask.title.includes('[CNC]')) autoStation = 'CNC';
          }
          
          await db.update(pwrTasks).set({
            status: 'TODO',
            waitingFor: null,
            stationTeam: autoStation || null,
            updatedAt: new Date()
          }).where(eq(pwrTasks.id, childTask.id));

          // Log unlock
          await db.insert(pwrWorkLogs).values({
            taskId: childTask.id,
            userId: userId,
            logType: 'SYSTEM_EVENT',
            content: \`Tự động mở khóa (Chuyển đến trạm \${autoStation}) do công đoạn trước (\${task.title}) đã hoàn thành.\`,
            statusFrom: 'WAITING',
            statusTo: 'TODO',
            isSystemLog: true,
          });
        }
      }
    }
`;

const insertPoint = `return NextResponse.json({ success: true, pointsAwarded: POINTS_PER_TASK });`;
if (!code.includes('THUẬT TOÁN AUTO-UNLOCK')) {
  code = code.replace(insertPoint, unlockLogic + '\n    ' + insertPoint);
}

fs.writeFileSync('src/app/api/pwr/station/tasks/route.ts', code, 'utf8');
