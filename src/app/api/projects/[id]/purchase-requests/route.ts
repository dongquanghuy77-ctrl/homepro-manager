import { NextResponse } from 'next/server';
import { db } from '@/db';
import { purchaseRequests, purchaseRequestItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const prs = await db.select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.projectId, projectId));

    const prIds = prs.map(pr => pr.id);
    let items: any[] = [];
    
    if (prIds.length > 0) {
      items = await db.select()
        .from(purchaseRequestItems)
        .where(eq(purchaseRequestItems.projectId, projectId)); // Alternatively 'inArray(purchaseRequestItems.requestId, prIds)' but this works too if schema matches
    }

    // Attach items to their respective PRs
    const result = prs.map(pr => {
      return {
        ...pr,
        items: items.filter(item => item.requestId === pr.id)
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch purchase requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
