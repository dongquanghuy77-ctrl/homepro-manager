import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pwrNotifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stationTeam = searchParams.get('stationTeam');
    
    if (!stationTeam) {
      return NextResponse.json({ notifications: [] });
    }

    const notifications = await db.select()
      .from(pwrNotifications)
      .where(
        and(
          eq(pwrNotifications.stationTeam, stationTeam),
          eq(pwrNotifications.isRead, false)
        )
      )
      .orderBy(desc(pwrNotifications.createdAt))
      .limit(10);
      
    return NextResponse.json({ notifications });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
