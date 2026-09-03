import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pwrTasks, workOrders } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, inArray, sql } from "drizzle-orm";

const MANAGER_ROLES = ["ADMIN", "MANAGER", "HR"];

// Map workCenterId -> stationTeam
const WC_TO_STATION: Record<number, string> = {
  1: "CNC",
  2: "DAN_CANH",
  3: "KHOAN_CAM",
  4: "DONG_GOI",
};
const PRIORITY_MAP: Record<string, string> = {
  HIGH: "HIGH", NORMAL: "MEDIUM", LOW: "LOW",
};

// POST /api/pwr/erp/import-work-orders
// Body: { workOrderIds: number[], productionOrderCode: string, priority?: string }
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, MANAGER_ROLES);
  if (auth.error) return auth.error;
  const session = auth.session;

  try {
    const body = await req.json() as { workOrderIds: number[]; productionOrderCode?: string; priority?: string };
    const { workOrderIds, productionOrderCode, priority = "MEDIUM" } = body;

    if (!workOrderIds?.length) {
      return NextResponse.json({ error: "Ch?n ít nh?t 1 công do?n" }, { status: 400 });
    }

    // L?y thông tin work orders du?c ch?n
    const wos = await db.select().from(workOrders).where(inArray(workOrders.id, workOrderIds));

    const created: number[] = [];
    const skipped: number[] = [];

    for (const wo of wos) {
      const sourceRef = `WO-${wo.id}`;

      // Check trùng
      const existing = await db.execute(sql`SELECT id FROM pwr_tasks WHERE source_ref = ${sourceRef} AND deleted_at IS NULL`);
      if ((existing.rows?.length ?? 0) > 0) { skipped.push(wo.id); continue; }

      const stationTeam = WC_TO_STATION[wo.workCenterId ?? 0] ?? null;
      const title = productionOrderCode
        ? `[${productionOrderCode}] ${wo.operation}`
        : wo.operation;

      await db.insert(pwrTasks).values({
        title,
        status: "TODO",
        priority: PRIORITY_MAP[priority] ?? "MEDIUM",
        category: "OPERATIONAL_TASK",
        userId: session.id,
        stationTeam,
        sourceRef,
      } as any);

      created.push(wo.id);
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      message: `Đã t?o ${created.length} task${skipped.length > 0 ? `, b? qua ${skipped.length} (dã import tru?c dó)` : ""}`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
