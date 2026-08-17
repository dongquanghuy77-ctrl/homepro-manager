import { NextResponse } from 'next/server';
import { db } from '@/db';
import { businessDecisions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { error } = await requireAuth(request as any, ALL_ROLES);
  if (error) return error;

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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching business decisions:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (error) return error;

  try {
    const body = await request.json();
    const result = await db.insert(businessDecisions).values(body).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
