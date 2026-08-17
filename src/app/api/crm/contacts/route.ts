import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function GET(req: Request) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (customerId) {
      const items = await db.select().from(contacts)
        .where(eq(contacts.customerId, parseInt(customerId)))
        .orderBy(desc(contacts.createdAt));
      return NextResponse.json(items);
    }

    const items = await db.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(200);
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
    if (!body.name || !body.customerId) {
      return NextResponse.json({ error: 'Missing required fields: name, customerId' }, { status: 400 });
    }
    const [newItem] = await db.insert(contacts).values(body).returning();
    return NextResponse.json(newItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
