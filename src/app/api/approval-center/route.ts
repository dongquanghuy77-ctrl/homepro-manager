import { NextResponse } from 'next/server';
import { db } from '@/db';
import { businessDecisions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('project_id');

    if (projectIdParam) {
      const results = await db
        .select()
        .from(businessDecisions)
        .where(eq(businessDecisions.projectId, parseInt(projectIdParam, 10)))
        .orderBy(desc(businessDecisions.createdAt));
      return NextResponse.json(results);
    }

    const results = await db
      .select()
      .from(businessDecisions)
      .orderBy(desc(businessDecisions.createdAt));
    return NextResponse.json(results);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error fetching business decisions:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
