const fs = require('fs');
let code = fs.readFileSync('src/app/api/pwr/station/qc/route.ts', 'utf8');

const importReplacement = `import { pwrTasks, pwrQcLogs, pwrScrapRequests, pwrWorkLogs, pwrNotifications, pwrScrapLogs } from "@/db/schema";`;
code = code.replace(/import \{ pwrTasks, pwrQcLogs, pwrScrapRequests, pwrWorkLogs \} from "@\/db\/schema";/, importReplacement);

const failLogicReplacement = `// 1. Mark Failed on current task
      await db.update(pwrTasks).set({
        qcStatus: "QC_FAILED",
        status: "DONE", // Original task is done, but failed
        completedAt: now
      } as any).where(eq(pwrTasks.id, taskId));

      // 2. Log QC
      await db.insert(pwrQcLogs).values({
        taskId, qcBy, status: "FAILED", reason
      });

      // 3. Dynamic Rework Engine (Reverse Routing)
      let targetStation = task.stationTeam;
      let reworkTitlePrefix = "[LÀM LẠI] ";
      
      if (needScrap) {
        // If need scrap, must route back to CNC to cut a new board!
        targetStation = "CNC";
        reworkTitlePrefix = "[CẮT BÙ] ";
        
        // Auto-log scrap to trigger inventory deduction
        if (scrapItems && scrapItems.length > 0) {
          for (const item of scrapItems) {
            await db.insert(pwrScrapLogs).values({
              taskId,
              reporterId: qcBy,
              materialId: item.material ? parseInt(item.material) || null : null,
              quantity: item.qty ? parseFloat(item.qty) : 1,
              reason: \`Lỗi từ trạm \${task.stationTeam}: \${reason}\`
            });
          }
        }
      }

      // Create new Rework Task
      const [newReworkTask] = await db.insert(pwrTasks).values({
        userId: task.userId, // owner
        title: reworkTitlePrefix + task.title,
        description: \`Lý do: \${reason}. Xử lý ngay!\`,
        category: "PRODUCTION",
        priority: "CRITICAL",
        status: "TODO",
        stationTeam: targetStation,
        reworkRefId: taskId,
        defectBy: task.completedBy, // The person who did it wrong
        tags: task.tags ? [...task.tags, "REWORK"] : ["REWORK"],
        projectRef: task.projectRef,
      }).returning();

      // 4. Real-time Notification Engine (Ring the Bell!)
      await db.insert(pwrNotifications).values({
        stationTeam: targetStation,
        title: "🚨 LỆNH REWORK KHẨN CẤP",
        content: \`Cần xử lý \${reworkTitlePrefix.trim()} cho: \${task.title}\`,
        priority: "CRITICAL",
        relatedTaskId: newReworkTask.id
      });

      // Log issue
      await db.insert(pwrWorkLogs).values({
        taskId: newReworkTask.id,
        userId: qcBy,
        logType: "ISSUE_LOG",
        content: \`Tạo task bù do QC FAILED từ task #\${taskId}: \${reason}\`,
        isSystemLog: true
      });`;

// We must replace the 'else' block inside POST
const regex = /\/\/ 1\. Mark Failed \(Rework\) -> Send back to INBOX or KEEP AT STATION but TODO[\s\S]*isSystemLog: true\r?\n      \}\);/;
code = code.replace(regex, failLogicReplacement);

fs.writeFileSync('src/app/api/pwr/station/qc/route.ts', code, 'utf8');
