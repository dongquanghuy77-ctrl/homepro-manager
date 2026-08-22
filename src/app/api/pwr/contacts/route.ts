import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrContacts } from '@/db/schema';
import { getSession } from '@/lib/session';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contacts = await db.query.pwrContacts.findMany({
      where: eq(pwrContacts.userId, session.id),
      orderBy: [desc(pwrContacts.createdAt)]
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error GET /api/pwr/contacts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const [contact] = await db.insert(pwrContacts).values({
      userId: session.id,
      name: body.name.trim(),
    }).returning();

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error POST /api/pwr/contacts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
