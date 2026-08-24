import { NextResponse } from "next/server";
import { db } from "@/db";
import { pwrChecklists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, ALL_ROLES } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const body = await request.json();
  const [item] = await db.update(pwrChecklists)
    .set({ isDone: body.isDone, content: body.content })
    .where(eq(pwrChecklists.id, parseInt(params.id)))
    .returning();
  return NextResponse.json(item);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  await db.delete(pwrChecklists).where(eq(pwrChecklists.id, parseInt(params.id)));
  return NextResponse.json({ ok: true });
}