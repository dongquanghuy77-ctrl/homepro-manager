import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/db";
import { pwrTasks, pwrQcLogs, pwrScrapRequests, pwrWorkLogs, pwrNotifications, pwrScrapLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const SECRET = process.env.NEXTAUTH_SECRET || "fallback_secret_for_homepro_12345!@#";

// Fetch WAITING_QC tasks
export async function GET(req: NextRequest) {
  try {
    const tasks = await db
      .select()
      .from(pwrTasks)
      .where(eq(pwrTasks.qcStatus, "WAITING_QC"))
      .orderBy(desc(pwrTasks.waitingQcSince));
    return NextResponse.json({ tasks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Process QC PASS or FAIL
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: SECRET });
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const qcBy = parseInt(token.id as string);

  try {
    const body = await req.json();
    const { taskId, isPass, reason, needScrap, scrapItems } = body;

    const [task] = await db.select().from(pwrTasks).where(eq(pwrTasks.id, taskId));
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const now = new Date();

    if (isPass) {
      // 1. Mark Passed
      await db.update(pwrTasks).set({
        qcStatus: "QC_PASSED",
        completedAt: now,
      } as any).where(eq(pwrTasks.id, taskId));

      // 2. Log QC
      await db.insert(pwrQcLogs).values({
        taskId, qcBy, status: "PASSED"
      });

      // 3. Update ERP Bridge
      if (task.sourceRef && task.sourceRef.startsWith("WO-")) {
        const woId = parseInt(task.sourceRef.split("-")[1]);
        if (!isNaN(woId) && task.quantityDone) {
          await db.execute(sql`
            UPDATE work_orders 
            SET completed_quantity = completed_quantity + ${task.quantityDone},
                status = CASE WHEN completed_quantity + ${task.quantityDone} >= planned_quantity THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
                updated_at = NOW()
            WHERE id = ${woId}
          `);
        }
      }
    } else {
      // 1. Mark Failed on current task
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
              reason: `Lỗi từ trạm ${task.stationTeam}: ${reason}`
            });
          }
        }
      }

      // Create new Rework Task
      const [newReworkTask] = await db.insert(pwrTasks).values({
        userId: task.userId, // owner
        title: reworkTitlePrefix + task.title,
        description: `Lý do: ${reason}. Xử lý ngay!`,
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
        content: `Cần xử lý ${reworkTitlePrefix.trim()} cho: ${task.title}`,
        priority: "CRITICAL",
        relatedTaskId: newReworkTask.id
      });

      // Log issue
      await db.insert(pwrWorkLogs).values({
        taskId: newReworkTask.id,
        userId: qcBy,
        logType: "ISSUE_LOG",
        content: `Tạo task bù do QC FAILED từ task #${taskId}: ${reason}`,
        isSystemLog: true
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
