import { NextResponse } from "next/server";
import { db } from "@/db";
import { pwrChecklists } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth, ALL_ROLES } from "@/lib/auth";

export async function GET(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
  const items = await db.select().from(pwrChecklists)
    .where(eq(pwrChecklists.taskId, parseInt(taskId)))
    .orderBy(asc(pwrChecklists.position));
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const body = await request.json();
  const { taskId, content, position } = body;
  const [item] = await db.insert(pwrChecklists)
    .values({ taskId, content, position: position ?? 0 })
    .returning();
  return NextResponse.json(item, { status: 201 });
}
