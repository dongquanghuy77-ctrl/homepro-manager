import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/db";
import { pwrTasks, pwrQcLogs, pwrScrapRequests, pwrWorkLogs } from "@/db/schema";
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
      // 1. Mark Failed (Rework) -> Send back to INBOX or KEEP AT STATION but TODO
      await db.update(pwrTasks).set({
        qcStatus: "QC_FAILED",
        status: "TODO", // Cần làm lại
        reworkCount: (task.reworkCount || 0) + 1,
        waitingQcSince: null
      } as any).where(eq(pwrTasks.id, taskId));

      // 2. Log QC
      await db.insert(pwrQcLogs).values({
        taskId, qcBy, status: "FAILED", reason
      });

      // 3. Scrap Request if needed
      if (needScrap) {
        await db.insert(pwrScrapRequests).values({
          taskId,
          requestedBy: qcBy,
          itemsRequested: scrapItems || [],
          reason: `Rework cho task #${taskId}: ${reason}`
        });
      }

      // Log issue
      await db.insert(pwrWorkLogs).values({
        taskId,
        userId: qcBy,
        logType: "ISSUE_LOG",
        content: `QC FAILED: ${reason}`,
        isSystemLog: true
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
