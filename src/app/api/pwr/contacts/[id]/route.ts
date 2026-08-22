import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrContacts } from '@/db/schema';
import { getSession } from '@/lib/session';
import { eq, and } from 'drizzle-orm';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contactId = parseInt(params.id, 10);
    if (isNaN(contactId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await db.delete(pwrContacts).where(
      and(
        eq(pwrContacts.id, contactId),
        eq(pwrContacts.userId, session.id)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error DELETE /api/pwr/contacts/[id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
