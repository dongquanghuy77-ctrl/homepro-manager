import { NextResponse } from 'next/server';
import { db } from '@/db';
import { purchaseRequests } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';


export async function GET(req: Request) {
  const { error: authError } = await requireAuth(req as any, ALL_ROLES);
  if (authError) return authError;

  try {
    const data = await db.select().from(purchaseRequests).orderBy(desc(purchaseRequests.createdAt));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error: authError } = await requireAuth(req as any, ALL_ROLES);
  if (authError) return authError;

  try {
    const body = await req.json();
    const [newItem] = await db.insert(purchaseRequests).values(body).returning();
    return NextResponse.json(newItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
