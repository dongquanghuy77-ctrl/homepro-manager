import { NextResponse } from 'next/server';
import { db } from '@/db';
import { businessDecisions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('project_id');
    
    let query = db.select().from(businessDecisions).orderBy(desc(businessDecisions.createdAt));
    
    // Type checking for the Drizzle query: if project_id is provided, filter by it
    if (projectIdParam) {
      // Need to typecast or handle properly but for now a simple where clause works
      const results = await db.select()
        .from(businessDecisions)
        .where(eq(businessDecisions.projectId, parseInt(projectIdParam, 10)))
        .orderBy(desc(businessDecisions.createdAt));
      return NextResponse.json(results);
    }
    
    const results = await query;
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error fetching business decisions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
