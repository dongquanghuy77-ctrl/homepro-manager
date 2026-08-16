import { NextResponse } from 'next/server';
import { db } from '@/db';
import { kcsRecords } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const [updatedItem] = await db.update(kcsRecords)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(kcsRecords.id, id))
      .returning();
    return NextResponse.json(updatedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await db.delete(kcsRecords).where(eq(kcsRecords.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
