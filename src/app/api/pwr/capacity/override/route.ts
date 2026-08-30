import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrResourceCalendar } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { resourceId, dateStr, capacityHours, reason } = await req.json();

    if (!resourceId || !dateStr || capacityHours === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await db.select().from(pwrResourceCalendar).where(
      and(
        eq(pwrResourceCalendar.resourceId, resourceId),
        eq(pwrResourceCalendar.dateStr, dateStr)
      )
    );

    if (existing.length > 0) {
      if (capacityHours === null) {
          await db.delete(pwrResourceCalendar).where(eq(pwrResourceCalendar.id, existing[0].id));
      } else {
          await db.update(pwrResourceCalendar).set({ capacityHours: capacityHours.toString(), reason })
            .where(eq(pwrResourceCalendar.id, existing[0].id));
      }
    } else {
      if (capacityHours !== null) {
          await db.insert(pwrResourceCalendar).values({
            resourceId,
            dateStr,
            capacityHours: capacityHours.toString(),
            reason
          });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
