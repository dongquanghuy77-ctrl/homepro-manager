import { NextResponse } from 'next/server';
import { db } from '@/db';
import { designs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const opportunityId = searchParams.get('opportunityId');
    const projectId = searchParams.get('projectId');
    
    let conditions = [];
    if (opportunityId) conditions.push(eq(designs.opportunityId, parseInt(opportunityId)));
    if (projectId) conditions.push(eq(designs.projectId, parseInt(projectId)));
    
    let query = db.select().from(designs);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }
    
    const items = await query;
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.projectId && !body.opportunityId) {
      return NextResponse.json({ error: 'Missing required field: projectId or opportunityId' }, { status: 400 });
    }
    if (!body.version) {
      body.version = '1.0';
    }
    const [newItem] = await db.insert(designs).values(body).returning();
    return NextResponse.json(newItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
