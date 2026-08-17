import { NextResponse } from 'next/server';
import { db } from '@/db';
import { surveys } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const opportunityId = searchParams.get('opportunityId');
    const projectId = searchParams.get('projectId');

    let items;
    if (opportunityId && projectId) {
      items = await db.select().from(surveys)
        .where(and(eq(surveys.opportunityId, parseInt(opportunityId)), eq(surveys.projectId, parseInt(projectId))))
        .orderBy(desc(surveys.createdAt));
    } else if (opportunityId) {
      items = await db.select().from(surveys)
        .where(eq(surveys.opportunityId, parseInt(opportunityId)))
        .orderBy(desc(surveys.createdAt));
    } else if (projectId) {
      items = await db.select().from(surveys)
        .where(eq(surveys.projectId, parseInt(projectId)))
        .orderBy(desc(surveys.createdAt));
    } else {
      items = await db.select().from(surveys).orderBy(desc(surveys.createdAt)).limit(100);
    }

    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.opportunityId && !body.projectId) {
      return NextResponse.json({ error: 'Missing required field: opportunityId or projectId' }, { status: 400 });
    }
    const [newItem] = await db.insert(surveys).values(body).returning();
    return NextResponse.json(newItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
