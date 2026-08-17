import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { crmActivities } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function GET(req: Request) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const leadId = searchParams.get('leadId');
    const opportunityId = searchParams.get('opportunityId');

    let items;
    if (customerId) {
      items = await db.select().from(crmActivities)
        .where(eq(crmActivities.customerId, parseInt(customerId)))
        .orderBy(desc(crmActivities.createdAt));
    } else if (leadId) {
      items = await db.select().from(crmActivities)
        .where(eq(crmActivities.leadId, parseInt(leadId)))
        .orderBy(desc(crmActivities.createdAt));
    } else if (opportunityId) {
      items = await db.select().from(crmActivities)
        .where(eq(crmActivities.opportunityId, parseInt(opportunityId)))
        .orderBy(desc(crmActivities.createdAt));
    } else {
      items = await db.select().from(crmActivities)
        .orderBy(desc(crmActivities.createdAt))
        .limit(100);
    }

    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const body = await req.json();
    if (!body.type || !body.title) {
      return NextResponse.json({ error: 'Missing required fields: type, title' }, { status: 400 });
    }
    const [newItem] = await db.insert(crmActivities).values(body).returning();
    return NextResponse.json(newItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
