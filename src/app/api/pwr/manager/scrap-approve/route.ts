import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pwrScrapRequests } from "@/db/schema";
import { requireAuth, ADMIN_OR_MANAGER } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.update(pwrScrapRequests).set({
      status: "APPROVED",
      approvedBy: parseInt(auth.session.id),
      updatedAt: new Date()
    } as any).where(eq(pwrScrapRequests.id, id));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
