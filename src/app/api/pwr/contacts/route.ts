import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrContacts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;

    const contacts = await db.query.pwrContacts.findMany({
      where: eq(pwrContacts.userId, session.id),
      orderBy: [desc(pwrContacts.createdAt)]
    });

    return NextResponse.json({ contacts });
  } catch (err) {
    console.error('Error GET /api/pwr/contacts:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;

    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const [contact] = await db.insert(pwrContacts).values({
      userId: session.id,
      name: body.name.trim(),
    }).returning();

    return NextResponse.json({ contact });
  } catch (err) {
    console.error('Error POST /api/pwr/contacts:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
