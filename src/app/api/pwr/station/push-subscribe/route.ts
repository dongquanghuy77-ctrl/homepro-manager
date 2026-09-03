import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getToken } from "next-auth/jwt";
import { eq } from "drizzle-orm";
import webpush from "web-push";

const SECRET = process.env.NEXTAUTH_SECRET || "fallback_secret_for_homepro_12345!@#";

webpush.setVapidDetails(
  "mailto:admin@homepro.vn",
  process.env.NEXT_PUBLIC_VAPID_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: SECRET });
  if (!token?.id) return NextResponse.json({ error: "Chua dang nh?p" }, { status: 401 });

  try {
    const { subscription } = await req.json();
    if (!subscription) return NextResponse.json({ error: "Missing subscription" }, { status: 400 });

    const userId = parseInt(token.id as string);
    await db.update(users).set({ pushSubscription: subscription } as any).where(eq(users.id, userId));

    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: "Ðã b?t thông báo",
        body: "B?n s? nh?n du?c thông báo khi có công vi?c m?i du?c giao.",
        icon: "/icon-192x192.png",
      }));
    } catch (pushErr) {}

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
