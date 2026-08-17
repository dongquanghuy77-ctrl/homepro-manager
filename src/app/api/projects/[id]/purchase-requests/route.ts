import { NextResponse } from 'next/server';
import { db } from '@/db';
import { purchaseRequests, purchaseRequestItems } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { requireAuth, ALL_ROLES } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth(request as any, ALL_ROLES);
  if (error) return error;

  try {
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const prs = await db.select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.projectId, projectId));

    const prIds = prs.map(pr => pr.id);
    let items: typeof purchaseRequestItems.$inferSelect[] = [];
    
    if (prIds.length > 0) {
      items = await db.select()
        .from(purchaseRequestItems)
        .where(inArray(purchaseRequestItems.requestId, prIds));
    }

    const result = prs.map(pr => ({
      ...pr,
      items: items.filter(item => item.requestId === pr.id),
    }));

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to fetch purchase requests:', msg);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
