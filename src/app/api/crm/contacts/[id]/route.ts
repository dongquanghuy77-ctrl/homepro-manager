import { NextResponse } from 'next/server';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const [item] = await db.select().from(contacts).where(eq(contacts.id, id));
    if (!item) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const [updatedItem] = await db.update(contacts)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    
    if (!updatedItem) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updatedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const [item] = await db.select().from(contacts).where(eq(contacts.id, id));
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    await db.delete(contacts).where(eq(contacts.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
