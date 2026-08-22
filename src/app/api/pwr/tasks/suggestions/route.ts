import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks } from '@/db/schema';
import { getSession } from '@/lib/session';
import { eq, isNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Lấy top 7 công việc được tạo nhiều nhất
    const suggestions = await db
      .select({
        title: pwrTasks.title,
        category: pwrTasks.category,
        count: sql<number>`count(*)::int`.as('count'),
        lastUsed: sql<Date>`max(${pwrTasks.createdAt})`.as('last_used')
      })
      .from(pwrTasks)
      .where(
        sql`${pwrTasks.userId} = ${session.id} AND ${pwrTasks.deletedAt} IS NULL`
      )
      .groupBy(pwrTasks.title, pwrTasks.category)
      .having(sql`count(*) > 1`)
      .orderBy(sql`count(*) DESC`, sql`max(${pwrTasks.createdAt}) DESC`)
      .limit(7);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error fetching task suggestions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
