import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { surveys } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req as any, ALL_ROLES);
  if (authResult.error) return authResult.error;

  try {
    const data = await db.select().from(surveys).orderBy(desc(surveys.createdAt));
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authResult = await requireAuth(req as any, MANAGER_AND_ABOVE);
  if (authResult.error) return authResult.error;

  try {
    const body = await req.json();
    const [newItem] = await db.insert(surveys).values(body).returning();
    return NextResponse.json(newItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
