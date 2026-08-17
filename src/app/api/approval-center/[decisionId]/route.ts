import { NextResponse } from 'next/server';
import { db } from '@/db';
import { businessDecisions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, ALL_ROLES, MANAGER_AND_ABOVE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { decisionId: string } }
) {
  const { error } = await requireAuth(request as any, ALL_ROLES);
  if (error) return error;

  try {
    const results = await db.select()
      .from(businessDecisions)
      .where(eq(businessDecisions.decisionId, params.decisionId))
      .limit(1);
      
    if (results.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(results[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { decisionId: string } }
) {
  const { session, error } = await requireAuth(request as any, MANAGER_AND_ABOVE);
  if (error) return error;

  try {
    const body = await request.json();
    const { status, resolutionNote, rejectionReason, auditTrailAppend } = body;
    
    const currentResults = await db.select()
      .from(businessDecisions)
      .where(eq(businessDecisions.decisionId, params.decisionId))
      .limit(1);
      
    if (currentResults.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    const current = currentResults[0];
    const now = new Date();

    // Build audit trail server-side — never trust client for who/when
    let updatedAuditTrail = Array.isArray(current.auditTrail) ? current.auditTrail as object[] : [];
    if (auditTrailAppend) {
      updatedAuditTrail = [
        ...updatedAuditTrail,
        {
          action: String(auditTrailAppend.action || 'UPDATE'),
          by: session?.name || session?.username || 'unknown',
          userId: session?.id,
          timestamp: now.toISOString(),
          reason: String(auditTrailAppend.reason || ''),
          note: String(auditTrailAppend.note || ''),
        },
      ];
    }
    
    const updateData: Record<string, unknown> = {
      updatedAt: now,
      auditTrail: updatedAuditTrail,
    };
    
    if (status !== undefined) updateData.status = status;
    // Always set reviewer from session, not from client body
    updateData.reviewedBy = session?.id ?? null;
    updateData.reviewedAt = now;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (resolutionNote !== undefined) updateData.resolutionNote = resolutionNote;
    
    const updated = await db.update(businessDecisions)
      .set(updateData)
      .where(eq(businessDecisions.decisionId, params.decisionId))
      .returning();
      
    return NextResponse.json(updated[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
