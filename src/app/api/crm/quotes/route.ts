import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const list = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Fetch quotes error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const body = await req.json();
    const newQuote = await db.insert(quotes).values({
      quoteNumber: body.quoteNumber || `QO-${Date.now()}`,
      version: body.version || 1,
      customerId: body.customerId,
      opportunityId: body.opportunityId,
      projectId: body.projectId,
      totalAmount: body.totalAmount || 0,
      costAmount: body.costAmount || 0,
      margin: body.margin || 0,
      vat: body.vat || 0,
      paymentTerms: body.paymentTerms,
      deliveryTime: body.deliveryTime,
      productionTime: body.productionTime,
      status: body.status || 'DRAFT',
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      notes: body.notes,
    }).returning();
    
    return NextResponse.json(newQuote[0]);
  } catch (error: any) {
    console.error('Create quote error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
