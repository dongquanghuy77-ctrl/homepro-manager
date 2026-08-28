import { NextResponse } from "next/server";
import { db } from "@/db";
import { pwrProjects, pwrTasks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
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
  const { session, error } = await requireAuth(req as any, ALL_ROLES);
  if (error) return error;
  const id     = parseInt(params.id, 10);
  const url    = new URL(req.url);
  const action = url.searchParams.get("action") ?? "archive";
  const deleteTasks = url.searchParams.get("deleteTasks") === "true";
  const [proj] = await db.select().from(pwrProjects)
    .where(and(eq(pwrProjects.id, id), eq(pwrProjects.userId, session.id)));
  if (!proj) return NextResponse.json({ error: "Khong tim thay du an" }, { status: 404 });
  const now = new Date();
  if (action === "archive") {
    await db.update(pwrProjects)
      .set({ status: "ARCHIVED", updatedAt: now } as any)
      .where(and(eq(pwrProjects.id, id), eq(pwrProjects.userId, session.id)));
    return NextResponse.json({ archived: true, projectId: id });
  }
  let deletedTaskCount = 0;
  if (deleteTasks) {
    const taskResult = await db.update(pwrTasks)
      .set({ deletedAt: now, updatedAt: now } as any)
      .where(and(
        eq(pwrTasks.userId, session.id),
        isNull(pwrTasks.deletedAt),
        eq(pwrTasks.projectRef, (proj as any).name),
      ))
      .returning({ id: pwrTasks.id });
    deletedTaskCount = taskResult.length;
  }
  await db.update(pwrProjects)
    .set({ status: "DELETED", updatedAt: now } as any)
    .where(and(eq(pwrProjects.id, id), eq(pwrProjects.userId, session.id)));
  return NextResponse.json({ deleted: true, projectId: id, deletedTaskCount });
}