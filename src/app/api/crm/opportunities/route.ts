import { NextResponse } from 'next/server';
import { db } from '@/db';
import { opportunities } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const list = await db.select().from(opportunities).orderBy(desc(opportunities.createdAt));
    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Fetch opportunities error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newOpp = await db.insert(opportunities).values({
      name: body.name,
      code: body.code,
      customerId: body.customerId,
      leadId: body.leadId,
      projectId: body.projectId,
      projectType: body.projectType,
      location: body.location,
      area: body.area,
      budget: body.budget,
      estimatedValue: body.estimatedValue || 0,
      probability: body.probability || 0,
      status: body.status || body.stage || 'NEW',
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      assignedTo: body.assignedTo,
      source: body.source,
      notes: body.notes,
    }).returning();
    
    return NextResponse.json(newOpp[0]);
  } catch (error: any) {
    console.error('Create opportunity error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
