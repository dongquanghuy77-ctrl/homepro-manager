import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pwrProjects } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;

    const projects = await db.query.pwrProjects.findMany({
      where: eq(pwrProjects.userId, session.id),
      orderBy: [desc(pwrProjects.createdAt)]
    });

    return NextResponse.json({ projects });
  } catch (err) {
    console.error('Error GET /api/pwr/projects:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireAuth(req as any, ALL_ROLES);
    if (error) return error;

    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const [project] = await db.insert(pwrProjects).values({
      userId: session.id,
      name: body.name.trim(),
    }).returning();

    return NextResponse.json({ project });
  } catch (err) {
    console.error('Error POST /api/pwr/projects:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
