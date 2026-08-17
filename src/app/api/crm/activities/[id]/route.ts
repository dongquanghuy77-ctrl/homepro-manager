import { NextResponse } from 'next/server';
import { db } from '@/db';
import { crmActivities } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const [item] = await db.select().from(crmActivities).where(eq(crmActivities.id, id));
    if (!item) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
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
    const [updatedItem] = await db.update(crmActivities)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(crmActivities.id, id))
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
    const [item] = await db.select().from(crmActivities).where(eq(crmActivities.id, id));
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    await db.delete(crmActivities).where(eq(crmActivities.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
