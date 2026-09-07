import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks } from '@/db/schema';
import { eq, and, isNull, desc, inArray, sql } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';
import { getTodayVN } from '@/lib/pwr/constants';

export async function GET(request: Request) {
  const authResult = await requireAuth(request as any, ALL_ROLES);
  if (authResult.error) return authResult.error;
  const { session } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'personal' | 'production'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const stationTeam = searchParams.get('stationTeam');
    const userIdFilter = searchParams.get('userId');

    const conditions: any[] = [
      isNull(pwrTasks.deletedAt),
      inArray(pwrTasks.status, ['DONE', 'CANCELLED'])
    ];

    const todayVN = getTodayVN();
    // Archive rule: updatedAt < today_midnight
    conditions.push(sql`${pwrTasks.updatedAt} < ${todayVN}::date`);

    if (type === 'personal') {
      conditions.push(eq(pwrTasks.userId, session.id));
    } else if (type === 'production') {
      // Production board history
      if (stationTeam) {
        conditions.push(eq(pwrTasks.stationTeam, stationTeam));
      }
      if (userIdFilter) {
        conditions.push(eq(pwrTasks.userId, parseInt(userIdFilter)));
      }
    }

    const tasks = await db
      .select()
      .from(pwrTasks)
      .where(and(...conditions))
      .orderBy(desc(pwrTasks.updatedAt))
      .limit(limit)
      .offset(offset);

    // Also get total count for pagination
    const [countRes] = await db
      .select({ count: sql`count(*)` })
      .from(pwrTasks)
      .where(and(...conditions));
    const total = countRes ? Number(countRes.count) : 0;

    return NextResponse.json({ tasks, total });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
