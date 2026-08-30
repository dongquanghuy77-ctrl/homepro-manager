import { NextResponse } from "next/server";
import { db } from "@/db";
import { pwrProjects, pwrTasks, pwrMaterialTransactions, pwrMaterials } from "@/db/schema";
import { sql, inArray } from "drizzle-orm";
import { eq, and, isNull, or } from "drizzle-orm";
import { requireAuth, ALL_ROLES } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req as any, ALL_ROLES);
  if (error) return error;
  const id = parseInt(params.id, 10);
  const [proj] = await db.select().from(pwrProjects)
    .where(and(eq(pwrProjects.id, id), eq(pwrProjects.userId, session.id)));
  if (!proj) return NextResponse.json({ error: "Khong tim thay du an" }, { status: 404 });
  return NextResponse.json({ project: proj });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req as any, ALL_ROLES);
  if (error) return error;
  const id   = parseInt(params.id, 10);
  const body = await req.json();
  const { name, customer, deadline, notes, color, status } = body;
  const [proj] = await db.select({ id: pwrProjects.id }).from(pwrProjects)
    .where(and(eq(pwrProjects.id, id), eq(pwrProjects.userId, session.id)));
  if (!proj) return NextResponse.json({ error: "Khong tim thay du an" }, { status: 404 });
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (name     !== undefined) updates.name     = name;
  if (customer !== undefined) updates.customer = customer;
  if (deadline !== undefined) updates.deadline = deadline;
  if (notes    !== undefined) updates.notes    = notes;
  if (color    !== undefined) updates.color    = color;
  if (status   !== undefined) updates.status   = status;
  const [updated] = await db.update(pwrProjects).set(updates as any)
    .where(and(eq(pwrProjects.id, id), eq(pwrProjects.userId, session.id)))
    .returning();
  return NextResponse.json({ project: updated });
}


export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;
    const id     = parseInt(params.id, 10);
    const url    = new URL(req.url);
    const action = url.searchParams.get("action") ?? "archive";
    
    const projectNameParam = url.searchParams.get("name");
    let projName = "";
    if (id === 0 && projectNameParam) {
      projName = projectNameParam;
    } else {
      const [proj] = await db.select().from(pwrProjects)
        .where(and(eq(pwrProjects.id, id), eq(pwrProjects.userId, session.id)));
      if (!proj) return NextResponse.json({ error: "Khong tim thay du an" }, { status: 404 });
      projName = proj.name;
    }
    
    if (action === "hard_delete") {
      let deletedTaskCount = 0;
      let revertedMaterialsCount = 0;
      
      await db.transaction(async (tx) => {
        const tasksInProj = await tx.select({ id: pwrTasks.id }).from(pwrTasks)
          .where(or(
            eq(pwrTasks.projectId, id),
            and(eq(pwrTasks.projectRef, projName), isNull(pwrTasks.projectId))
          ));
          
        if (tasksInProj.length > 0) {
          const taskIds = tasksInProj.map(t => t.id);
          
          const transactions = await tx.select().from(pwrMaterialTransactions)
            .where(and(
              inArray(pwrMaterialTransactions.taskId, taskIds),
              inArray(pwrMaterialTransactions.transactionType, ['RESERVE', 'PENDING_IMPORT'])
            ));
            
          const revertMap = new Map<number, number>();
          for (const tr of transactions) {
            if (tr.transactionType === 'RESERVE' && tr.quantity) {
              revertMap.set(tr.materialId, (revertMap.get(tr.materialId) || 0) + tr.quantity);
            }
          }
          
          for (const [matId, qty] of revertMap.entries()) {
            await tx.update(pwrMaterials)
              .set({ reservedLevel: sql`${pwrMaterials.reservedLevel} - ${qty}` })
              .where(eq(pwrMaterials.id, matId));
            revertedMaterialsCount++;
          }
          
          // Manual cascading delete to prevent foreign key constraint violations
          await tx.delete(pwrMaterialTransactions).where(inArray(pwrMaterialTransactions.taskId, taskIds));
          
          // Delete all dependent task entities first
          const { pwrTaskAuditLog, pwrWorkLogs, pwrTaskDependencies, pwrTaskResources } = await import('@/db/schema');
          await tx.delete(pwrTaskAuditLog).where(inArray(pwrTaskAuditLog.taskId, taskIds));
          await tx.delete(pwrWorkLogs).where(inArray(pwrWorkLogs.taskId, taskIds));
          await tx.delete(pwrTaskDependencies).where(inArray(pwrTaskDependencies.taskId, taskIds));
          await tx.delete(pwrTaskDependencies).where(inArray(pwrTaskDependencies.dependsOnId, taskIds));
          await tx.delete(pwrTaskResources).where(inArray(pwrTaskResources.taskId, taskIds));

          await tx.delete(pwrTasks).where(inArray(pwrTasks.id, taskIds));
          deletedTaskCount = taskIds.length;
        }
        
        await tx.delete(pwrProjects).where(eq(pwrProjects.id, id));
      });
      
      return NextResponse.json({ deleted: true, projectId: id, deletedTaskCount, revertedMaterialsCount });
    }

    const now = new Date();
    await db.update(pwrProjects)
      .set({ status: "ARCHIVED", updatedAt: now } as any)
      .where(and(eq(pwrProjects.id, id), eq(pwrProjects.userId, session.id)));
    return NextResponse.json({ archived: true, projectId: id });
  } catch (err: any) {
    console.error("DELETE PROJECT ERR:", err);
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
