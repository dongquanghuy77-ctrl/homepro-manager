import { NextResponse } from 'next/server';
import { db } from '@/db';
import { boqs, opportunities } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const opportunityId = searchParams.get('opportunityId');

    if (projectId) {
      const items = await db.select().from(boqs).where(eq(boqs.projectId, parseInt(projectId)));
      return NextResponse.json(items);
    }

    if (opportunityId) {
      // Find projects linked to this opportunity
      const opps = await db
        .select({ projectId: opportunities.projectId })
        .from(opportunities)
        .where(eq(opportunities.id, parseInt(opportunityId)));

      const pIds = opps.map(o => o.projectId).filter((id): id is number => id !== null);

      if (pIds.length > 0) {
        const items = await db.select().from(boqs).where(inArray(boqs.projectId, pIds));
        return NextResponse.json(items);
      }
      return NextResponse.json([]);
    }

    // Default: return all BOQs (paginated or limited)
    const items = await db.select().from(boqs).limit(100);
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
