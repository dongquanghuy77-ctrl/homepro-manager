import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productionOrders, projects, workOrders } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, inArray, sql } from "drizzle-orm";

const MANAGER_ROLES = ["ADMIN", "MANAGER", "HR"];

// GET /api/pwr/erp/production-orders
// Tr? v? danh sách production_orders status=RELEASED chua import h?t vào pwr_tasks
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, MANAGER_ROLES);
  if (auth.error) return auth.error;

  try {
    // L?y production orders ? tr?ng thái có th? dispatch xu?ng xu?ng
    const orders = await db
      .select({
        id: productionOrders.id,
        code: productionOrders.code,
        status: productionOrders.status,
        priority: productionOrders.priority,
        plannedQuantity: productionOrders.plannedQuantity,
        completedQuantity: productionOrders.completedQuantity,
        plannedStart: productionOrders.plannedStart,
        plannedEnd: productionOrders.plannedEnd,
        projectId: productionOrders.projectId,
      })
      .from(productionOrders)
      .where(inArray(productionOrders.status, ["RELEASED", "IN_PROGRESS", "PLANNED"]))
      .limit(50);

    // V?i m?i order, l?y work_orders con
    const result = await Promise.all(orders.map(async (o) => {
      const wos = await db
        .select({
          id: workOrders.id,
          operation: workOrders.operation,
          sequence: workOrders.sequence,
          plannedQuantity: workOrders.plannedQuantity,
          completedQuantity: workOrders.completedQuantity,
          status: workOrders.status,
          workCenterId: workOrders.workCenterId,
        })
        .from(workOrders)
        .where(eq(workOrders.productionOrderId, o.id))
        .orderBy(workOrders.sequence);

      // Check xem dã import vào pwr_tasks chua (qua sourceRef)
      const alreadyImported = await db.execute(
        sql`SELECT COUNT(*) AS cnt FROM pwr_tasks WHERE source_ref = ANY(ARRAY[${wos.map(w => 'WO-' + w.id).join(',')}]::text[]) AND deleted_at IS NULL`
      );

      return {
        ...o,
        workOrders: wos,
        importedCount: parseInt((alreadyImported.rows?.[0] as any)?.cnt ?? "0"),
      };
    }));

    return NextResponse.json({ orders: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
