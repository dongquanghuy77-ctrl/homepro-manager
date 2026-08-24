import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrTasks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ titles: [] }, { status: 401 });

  try {
    const tasks = await db.select({ title: pwrTasks.title })
      .from(pwrTasks)
      .where(eq(pwrTasks.userId, session.id))
      .orderBy(desc(pwrTasks.createdAt))
      .limit(500); // Only look at recent 500 tasks to keep it fast

    const uniqueTitles = Array.from(new Set(tasks.map(t => t.title.trim()))).filter(Boolean);
    
    return NextResponse.json({ titles: uniqueTitles });
  } catch (e) {
    return NextResponse.json({ titles: [] }, { status: 500 });
  }
}
