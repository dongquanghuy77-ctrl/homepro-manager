// src/app/api/hr/employees/[id]/reset-credentials/route.ts
// Reset password hoac PIN cho nhan vien boi HR/Admin
// Dat requirePasswordChange = true, bat buoc doi o lan login tiep theo
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/db";
import { users }                     from "@/db/schema";
import { eq }                        from "drizzle-orm";
import bcrypt                        from "bcryptjs";
import { requireAuth, HR_AND_ABOVE } from "@/lib/auth";
import { writeHrAuditLog }           from "@/lib/hr";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth(req, HR_AND_ABOVE);
  if (error) return error;

  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID nhan vien khong hop le" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { type } = body; // 'PASSWORD' | 'PIN'

    if (type !== "PASSWORD" && type !== "PIN") {
      return NextResponse.json({ error: "Loai reset khong hop le (PASSWORD hoac PIN)" }, { status: 400 });
    }

    const [employee] = await db.select().from(users).where(eq(users.id, id));
    if (!employee) {
      return NextResponse.json({ error: "Nhan vien khong ton tai" }, { status: 404 });
    }

    let generatedValue = "";
    const updates: any = {
      requirePasswordChange: true, // Ep buoc doi mat khau khi dang nhap lai
      updatedAt: new Date(),
    };

    if (type === "PIN") {
      // Sinh ngau nhien PIN 6 so
      generatedValue = Math.floor(100000 + Math.random() * 900000).toString();
      updates.pinHash = await bcrypt.hash(generatedValue, 10);
    } else {
      // Sinh ngau nhien mat khau 8 ky tu
      const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
      for (let i = 0; i < 8; i++) {
        generatedValue += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      updates.password = await bcrypt.hash(generatedValue, 10);
    }

    await db.update(users).set(updates).where(eq(users.id, id));

    await writeHrAuditLog({
      action: "EMPLOYEE_CREDENTIALS_RESET",
      entityType: "employee",
      entityId: id,
      actorId: session.id,
      actorName: session.name,
      newValue: { type, requirePasswordChange: true },
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({
      success: true,
      type,
      generatedValue, // Tra ve gia tri chua ma hoa de HR copy gui cho nhan vien
    });
  } catch (err: any) {
    console.error("Reset credentials error:", err);
    return NextResponse.json({ error: "Loi he thong khi cap lai mat khau/PIN" }, { status: 500 });
  }
}