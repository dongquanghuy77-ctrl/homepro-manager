import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrProjects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await db.delete(pwrProjects).where(and(
      eq(pwrProjects.id, id),
      eq(pwrProjects.userId, session.id)
    ));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error DELETE /api/pwr/projects/[id]:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
